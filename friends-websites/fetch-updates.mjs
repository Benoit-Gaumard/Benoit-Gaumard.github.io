import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const outputPath = join(HERE, "websites-meta.json");
import { validateCatalogue } from "./catalogue.mjs";

function parseAttributes(tagText) {
  const attrs = {};
  const regex = /([\w-]+)\s*=\s*"([^"]*)"|([\w-]+)\s*=\s*'([^']*)'/g;
  let match;
  while ((match = regex.exec(tagText))) {
    const name = (match[1] || match[3]).toLowerCase();
    const value = match[2] !== undefined ? match[2] : match[4];
    attrs[name] = value;
  }
  return attrs;
}

const ENTITY_MAP = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const codePoint = entity[1].toLowerCase() === "x"
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? match;
  });
}

function findFaviconUrl(html, baseUrl) {
  const linkTags = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => parseAttributes(m[0]));
  const iconLinks = linkTags.filter((attrs) => attrs.rel && /icon/i.test(attrs.rel) && attrs.href);
  const preferred = iconLinks.find((attrs) => /^(shortcut icon|icon)$/i.test(attrs.rel.trim())) || iconLinks[0];
  const href = preferred?.href || "/favicon.ico";
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function findDescription(html) {
  const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => parseAttributes(m[0]));
  const byName = metaTags.find((attrs) => attrs.name?.toLowerCase() === "description" && attrs.content);
  const byProperty = metaTags.find((attrs) => attrs.property?.toLowerCase() === "og:description" && attrs.content);
  const description = (byName || byProperty)?.content?.trim();
  const cleaned = description ? decodeEntities(description).replace(/\s+/g, " ").slice(0, 220) : "";
  return cleaned && !/^(description|todo|tbd)[.!]?$/i.test(cleaned) ? cleaned : null;
}

async function fetchSiteMeta(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; benoit-gaumard-friends-websites/1.0)" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return {
      url,
      ok: true,
      faviconUrl: findFaviconUrl(html, response.url),
      description: findDescription(html),
    };
  } catch (error) {
    return { url, ok: false, faviconUrl: null, description: null, error: error.message };
  }
}

const catalogue = validateCatalogue(JSON.parse(await readFile(outputPath, "utf8")));
const results = await Promise.all(catalogue.sites.map(async (site) => {
  if (!site.enabled) return site;
  const meta = await fetchSiteMeta(site.url);
  if (!meta.ok) {
    console.warn(`Metadata unavailable for ${site.url}: ${meta.error}`);
    return { ...site, ok: false, error: meta.error };
  }
  const { error, ...previous } = site;
  return { ...previous, ...meta };
}));

const payload = {
  ...catalogue,
  generatedAt: new Date().toISOString(),
  sites: results,
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const okCount = results.filter((r) => r.ok).length;
console.log(`Fetched metadata for ${okCount}/${results.length} friends' websites into ${outputPath}`);
