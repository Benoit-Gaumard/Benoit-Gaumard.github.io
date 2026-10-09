import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sniffExtension } from "../build-favicons.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = 2 * 1024 * 1024;
const LOCAL_ICON = /^[a-f0-9]{64}\.(png|jpg|gif|ico|webp)$/;
const FAVICON_FILE = /^[a-z0-9._-]+\.(png|jpg|gif|ico|webp)$/i;

export function resolveFeedIcon(value, base) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")
      || /^(?:127|10|0)\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)
      || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host) || host.startsWith("[")) return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function iconDomain(value) {
  const url = resolveFeedIcon(value);
  if (!url) return null;
  const parsed = new URL(url);
  if (["google.com", "www.google.com"].includes(parsed.hostname) && parsed.pathname === "/s2/favicons") {
    const domain = parsed.searchParams.get("domain");
    const site = domain ? resolveFeedIcon("https://" + domain) : null;
    return site ? new URL(site).hostname : null;
  }
  return null;
}

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function exists(path) {
  try { await access(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function downloadIcon(url, fetcher) {
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "User-Agent": "RSSWatcherIconCache/1.0 (+https://benoit-gaumard.io/rss-watcher/)", Accept: "image/png,image/jpeg,image/gif,image/webp,image/x-icon;q=0.9,*/*;q=0.1" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.url && !resolveFeedIcon(response.url)) throw new Error("Unsupported redirected icon URL");
  if (Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error("Icon exceeds the 2 MiB limit");
  if (!response.body) throw new Error("Empty image response");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > MAX_BYTES) throw new Error("Icon exceeds the 2 MiB limit");
    chunks.push(Buffer.from(chunk));
  }
  const image = Buffer.concat(chunks);
  const extension = sniffExtension(image);
  if (!extension || image.length < 60) throw new Error("Unsupported or empty image; using a local favicon instead");
  return { image, file: `${createHash("sha256").update(image).digest("hex")}.${extension}` };
}

export async function cacheFeedIcons(items, {
  directory = HERE,
  faviconDirectory = join(HERE, "..", "favicons"),
  fetcher = fetch,
  warn = message => console.warn(message),
} = {}) {
  if (!Array.isArray(items)) throw new Error("Missing RSS items for the icon cache");
  const output = join(directory, "source-icons");
  const manifestPath = join(directory, "source-icons.json");
  const previous = await readJson(manifestPath, { version: 1, sources: {} });
  if (previous.version !== 1 || !previous.sources || typeof previous.sources !== "object" || Array.isArray(previous.sources)) {
    throw new Error("Invalid existing RSS icon manifest");
  }
  const favicons = await readJson(join(faviconDirectory, "lookup.json"), null);
  if (!favicons || typeof favicons !== "object" || Array.isArray(favicons)) throw new Error("Local favicon lookup is unavailable");
  await mkdir(output, { recursive: true });
  const groups = new Map();
  for (const item of items) {
    if (!item || typeof item.source !== "string" || !item.source || typeof item.link !== "string") throw new Error("Invalid RSS source metadata");
    if (!groups.has(item.source)) groups.set(item.source, { source: item.source, icons: new Set(), domains: new Set() });
    const group = groups.get(item.source);
    const icon = resolveFeedIcon(item.icon, item.link);
    const legacyDomain = iconDomain(icon);
    if (legacyDomain) group.domains.add(legacyDomain);
    else if (icon) group.icons.add(icon);
    const article = resolveFeedIcon(item.link);
    if (article) group.domains.add(new URL(article).hostname);
  }
  const pending = new Map(), cachedSources = new Map();
  const download = url => {
    if (!pending.has(url)) {
      pending.set(url, (async () => {
        let result;
        try { result = await downloadIcon(url, fetcher); }
        catch (error) {
          const message = `${url}: ${error.message}`;
          warn("RSS icon download failed: " + message);
          return { error: message };
        }
        await writeFile(join(output, result.file), result.image);
        return { src: `/rss-watcher/source-icons/${result.file}`, sourceUrl: url, via: "feed" };
      })());
    }
    return pending.get(url);
  };
  const queue = [...groups.values()];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (cursor < queue.length) {
      const group = queue[cursor++];
      const errors = [];
      let selected = null;
      for (const url of group.icons) {
        const result = await download(url);
        if (result.src) { selected = { ...result }; break; }
        errors.push(result.error);
      }
      if (!selected) {
        const old = previous.sources[group.source];
        const file = typeof old?.src === "string" && old.src.startsWith("/rss-watcher/source-icons/") ? old.src.split("/").at(-1) : "";
        if (LOCAL_ICON.test(file) && group.icons.has(old.sourceUrl) && await exists(join(output, file))) {
          selected = { src: old.src, sourceUrl: old.sourceUrl, via: "cached-feed" };
        }
      }
      if (!selected) {
        for (const domain of group.domains) {
          const bare = domain.toLowerCase().replace(/^www\./, "");
          const file = favicons[bare] || favicons[domain.toLowerCase()];
          if (typeof file === "string" && FAVICON_FILE.test(file) && await exists(join(faviconDirectory, file))) {
            selected = { src: "/favicons/" + file, via: "favicon" };
            break;
          }
        }
      }
      if (!selected) {
        for (const domain of group.domains) {
          const url = resolveFeedIcon("/favicon.ico", "https://" + domain);
          if (!url) continue;
          const result = await download(url);
          if (result.src) { selected = { ...result, via: "site-favicon" }; break; }
          errors.push(result.error);
        }
      }
      if (!selected) {
        const old = previous.sources[group.source];
        const file = typeof old?.src === "string" && old.src.startsWith("/rss-watcher/source-icons/") ? old.src.split("/").at(-1) : "";
        if (["site-favicon", "cached-site-favicon"].includes(old?.via) && LOCAL_ICON.test(file)
          && [...group.domains].some(domain => resolveFeedIcon("/favicon.ico", "https://" + domain) === old.sourceUrl)
          && await exists(join(output, file))) {
          selected = { src: old.src, sourceUrl: old.sourceUrl, via: "cached-site-favicon" };
        }
      }
      if (!selected) {
        warn(`RSS source icon unavailable: ${group.source}; initials will be displayed.`);
        selected = { src: null, via: "initials" };
      }
      if (errors.length) selected.errors = errors;
      cachedSources.set(group.source, selected);
    }
  }));
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sources: Object.fromEntries([...cachedSources].sort(([a], [b]) => a.localeCompare(b, "en"))),
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const payload = JSON.parse(await readFile(join(HERE, "updates.json"), "utf8"));
    const manifest = await cacheFeedIcons(payload.items);
    const entries = Object.values(manifest.sources);
    console.log(`${entries.length} RSS sources: ${entries.filter(entry => ["feed", "cached-feed"].includes(entry.via)).length} feed logos, ${entries.filter(entry => ["favicon", "site-favicon", "cached-site-favicon"].includes(entry.via)).length} site favicons, ${entries.filter(entry => !entry.src).length} initials.`);
  } catch (error) {
    console.error("RSS icon caching failed:", error);
    process.exitCode = 1;
  }
}
