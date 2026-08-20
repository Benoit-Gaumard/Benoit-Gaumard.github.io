import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FEED_URL = "https://aws.amazon.com/about-aws/whats-new/recent/feed/";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "updates.json");

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

// AWS categories look like "general:products/amazon-ec2,marketing:marchitecture/compute"
// packed comma-separated inside a single <category> tag (sometimes several tags, sometimes none).
function extractCategories(xml) {
  return [...xml.matchAll(/<category>([\s\S]*?)<\/category>/gi)]
    .flatMap((match) => decodeEntities(match[1]).split(","))
    .map((raw) => raw.trim())
    .filter(Boolean);
}

function humanizeSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => {
    const itemXml = match[1];
    const products = [];
    const topics = [];
    extractCategories(itemXml).forEach((raw) => {
      const slug = raw.includes("/") ? raw.split("/").pop() : raw;
      if (!slug) return;
      const label = humanizeSlug(slug);
      if (raw.startsWith("general:products/")) products.push(label);
      else topics.push(label);
    });
    const pubDate = extractTag(itemXml, "pubDate");

    return {
      id: extractTag(itemXml, "guid"),
      title: extractTag(itemXml, "title"),
      link: extractTag(itemXml, "link"),
      description: extractDescription(itemXml),
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      products: [...new Set(products)],
      topics: [...new Set(topics)],
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
console.log(`Fetched ${items.length} AWS updates into ${outputPath}`);
