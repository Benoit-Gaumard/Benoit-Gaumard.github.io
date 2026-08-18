import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const csvPath = join(HERE, "friends-websites.csv");
const outputPath = join(HERE, "websites-meta.json");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((header, index) => { row[header] = cells[index] ?? ""; });
    return row;
  });
}

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
  return description ? decodeEntities(description).replace(/\s+/g, " ").slice(0, 220) : null;
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

const csvText = await readFile(csvPath, "utf8");
const rows = parseCsv(csvText).filter((row) => row.enabled?.toUpperCase() === "TRUE");
const results = await Promise.all(rows.map((row) => fetchSiteMeta(row.url)));

const payload = {
  generatedAt: new Date().toISOString(),
  sites: results,
};

await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
const okCount = results.filter((r) => r.ok).length;
console.log(`Fetched metadata for ${okCount}/${results.length} friends' websites into ${outputPath}`);
