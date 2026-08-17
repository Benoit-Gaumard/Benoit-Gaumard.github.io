import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const csvPath = join(HERE, "rss-feeds.csv");
const outputPath = join(HERE, "updates.json");

const CONCURRENCY = 20;
const FEED_TIMEOUT_MS = 15000;
const MAX_ITEMS_PER_FEED = 12;
const MAX_TOTAL_ITEMS = 600;
const USER_AGENT = "Mozilla/5.0 (compatible; RSSWatcherBot/1.0; +https://benoit-gaumard.io/rss-watcher/)";

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

function stripHtml(text) {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function unwrapCdata(text) {
  const match = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return match ? match[1].trim() : text;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return decodeEntities(stripHtml(unwrapCdata(match[1].trim())));
}

function extractAtomLink(xml) {
  const links = [...xml.matchAll(/<link\b([^>]*)\/?>/gi)];
  let fallback = "";
  for (const link of links) {
    const attrs = link[1];
    const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const relMatch = attrs.match(/rel=["']([^"']+)["']/i);
    if (!relMatch || relMatch[1] === "alternate") return hrefMatch[1];
    if (!fallback) fallback = hrefMatch[1];
  }
  return fallback;
}

function extractLink(xml) {
  const textLink = extractTag(xml, "link");
  if (/^https?:\/\//i.test(textLink)) return textLink;
  return extractAtomLink(xml) || textLink;
}

function extractDate(xml) {
  const raw = extractTag(xml, "pubDate") || extractTag(xml, "published") || extractTag(xml, "updated") || extractTag(xml, "dc:date");
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractDescription(xml) {
  const raw = extractTag(xml, "description") || extractTag(xml, "summary") || extractTag(xml, "content");
  return raw.length > 320 ? `${raw.slice(0, 317).trim()}…` : raw;
}

function parseItems(xml) {
  const itemBlocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const entryBlocks = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;
  return blocks.map((match) => {
    const itemXml = match[1];
    const link = extractLink(itemXml);
    return {
      id: extractTag(itemXml, "guid") || extractTag(itemXml, "id") || link,
      title: extractTag(itemXml, "title"),
      link,
      description: extractDescription(itemXml),
      pubDate: extractDate(itemXml),
    };
  });
}

function extractFeedIcon(xml, feedUrl) {
  // Only look at channel/feed-level metadata, not per-item images.
  const channelXml = xml.replace(/<item\b[^>]*>[\s\S]*?<\/item>/gi, "").replace(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi, "");
  const imageBlock = channelXml.match(/<image\b[^>]*>([\s\S]*?)<\/image>/i);
  const imageUrl = imageBlock ? extractTag(imageBlock[1], "url") : "";
  const icon = imageUrl || extractTag(channelXml, "icon") || extractTag(channelXml, "logo");
  if (icon) return icon;
  try {
    const { hostname } = new URL(feedUrl);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return "";
  }
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = parseCsvLine(lines[0]).map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    header.forEach((key, index) => { row[key] = (cells[index] ?? "").trim(); });
    return row;
  });
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function fetchFeed(feed) {
  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const icon = extractFeedIcon(xml, feed.url);
    const items = parseItems(xml)
      .filter((item) => item.title && item.link && item.pubDate)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, MAX_ITEMS_PER_FEED)
      .map((item) => ({ ...item, source: feed.name, categories: feed.categories, icon }));
    return { ok: true, name: feed.name, count: items.length, items };
  } catch (error) {
    return { ok: false, name: feed.name, error: error.message };
  }
}

const csvText = await readFile(csvPath, "utf8");
const feeds = parseCsv(csvText)
  .filter((row) => row.url && row.enabled?.toUpperCase() === "TRUE")
  .map((row) => ({
    name: row.name,
    url: row.url,
    categories: (row.category || "").split(",").map((c) => c.trim()).filter(Boolean),
  }));

const results = await mapLimit(feeds, CONCURRENCY, fetchFeed);
const succeeded = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);

const items = succeeded
  .flatMap((r) => r.items)
  .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
  .slice(0, MAX_TOTAL_ITEMS)
  .map((item, index) => ({ ...item, id: item.id || `${item.link}#${index}` }));

const payload = {
  generatedAt: new Date().toISOString(),
  feedCount: feeds.length,
  succeededCount: succeeded.length,
  failedCount: failed.length,
  count: items.length,
  items,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Fetched ${items.length} items from ${succeeded.length}/${feeds.length} feeds (${failed.length} failed).`);
if (failed.length) {
  console.log("Failed feeds:", failed.map((f) => `${f.name} (${f.error})`).join("; "));
}
