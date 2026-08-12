import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FEED_URL = "https://www.microsoft.com/releasecommunications/api/v2/m365/rss";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "updates.json");

const STATUS_TONES = {
  "Launched": "ga",
  "Rolling out": "preview",
  "In development": "dev",
  "Cancelled": "retirement",
};
const NOISE_TAGS = new Set([
  "General Availability", "Preview", "Targeted Release", "Current Channel", "Developer",
  "Worldwide (Standard Multi-Tenant)", "GCC", "GCC High", "DoD",
  "Web", "Desktop", "Mac", "Android", "iOS", "Linux",
]);

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

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(match[1].trim()) : "";
}

function extractDescription(xml) {
  const raw = extractTag(xml, "description");
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractCategories(xml) {
  return [...xml.matchAll(/<category>([\s\S]*?)<\/category>/gi)]
    .map((match) => decodeEntities(match[1].trim()))
    .filter(Boolean);
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const itemXml = match[1];
    const categories = extractCategories(itemXml);
    const statusLabel = categories[0] || "Update";
    const statusTone = STATUS_TONES[statusLabel] || "default";
    const tags = categories.slice(1).filter((category) => !NOISE_TAGS.has(category));
    const rawTitle = extractTag(itemXml, "title");
    const title = rawTitle.replace(/^\[[^\]]*\]\s*/, "").trim();
    const pubDate = extractTag(itemXml, "pubDate");

    return {
      id: extractTag(itemXml, "guid"),
      title,
      link: extractTag(itemXml, "link"),
      description: extractDescription(itemXml),
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      statusLabel,
      statusTone,
      tags,
    };
  });
}

const response = await fetch(FEED_URL);
if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
const xml = await response.text();
const items = parseItems(xml)
  .filter((item) => item.pubDate)
  .sort((left, right) => new Date(right.pubDate) - new Date(left.pubDate));

const payload = {
  generatedAt: new Date().toISOString(),
  source: FEED_URL,
  count: items.length,
  items,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Fetched ${items.length} M365 updates into ${outputPath}`);
