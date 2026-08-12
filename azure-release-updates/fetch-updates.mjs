import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FEED_URL = "https://www.microsoft.com/releasecommunications/api/v2/azure/rss";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "updates.json");

const STATUS_MAP = {
  "Launched": { label: "General Availability", tone: "ga" },
  "In preview": { label: "Public Preview", tone: "preview" },
  "In development": { label: "Private Preview", tone: "dev" },
  "Retirements": { label: "Retirement", tone: "retirement" },
  "Announcement": { label: "Announcement", tone: "announcement" },
};
const NOISE_TAGS = new Set(["Feature", "Features", "Service", "Services"]);

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

function extractCategories(xml) {
  return [...xml.matchAll(/<category>([\s\S]*?)<\/category>/gi)]
    .map((match) => decodeEntities(match[1].trim()))
    .filter(Boolean);
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const itemXml = match[1];
    const categories = extractCategories(itemXml);
    const statusKey = categories.find((category) => STATUS_MAP[category]);
    const status = STATUS_MAP[statusKey] || { label: "Update", tone: "default" };
    const tags = categories.filter((category) => category !== statusKey && !NOISE_TAGS.has(category));
    const rawTitle = extractTag(itemXml, "title");
    const title = rawTitle.replace(/^\[[^\]]*\]\s*/, "").trim();
    const pubDate = extractTag(itemXml, "pubDate");

    return {
      id: extractTag(itemXml, "guid"),
      title,
      link: extractTag(itemXml, "link"),
      description: extractTag(itemXml, "description").replace(/\s+/g, " ").trim(),
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      statusLabel: status.label,
      statusTone: status.tone,
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
console.log(`Fetched ${items.length} Azure updates into ${outputPath}`);
