import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const csvPath = join(HERE, "microsoft-rss-feeds.csv");
const outputPath = join(HERE, "feeds-status.json");

const CONCURRENCY = 15;
const FEED_TIMEOUT_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (compatible; MicrosoftTechCommunityWatcherBot/1.0; +https://benoit-gaumard.io/microsoft-techcommunity-rss-feeds/)";

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

function unwrapCdata(text) {
  const match = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return match ? match[1].trim() : text;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return "";
  return decodeEntities(unwrapCdata(match[1].trim()));
}

function extractDate(xml) {
  const raw = extractTag(xml, "pubDate") || extractTag(xml, "published") || extractTag(xml, "updated") || extractTag(xml, "dc:date");
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function extractTitle(xml) {
  const title = extractTag(xml, "title");
  return title.replace(/\s+/g, " ").trim();
}

function extractLink(xml) {
  // RSS: <link>https://example.com/post</link> (plain text content).
  const rssLink = extractTag(xml, "link");
  if (rssLink) return rssLink;
  // Atom: <link rel="alternate" href="https://example.com/post" /> (self-closing, no text content).
  const atomLinks = [...xml.matchAll(/<link\b([^>]*)\/?>/gi)];
  for (const [, attrs] of atomLinks) {
    const relMatch = attrs.match(/\brel=["']([^"']*)["']/i);
    if (relMatch && relMatch[1] !== "alternate") continue;
    const hrefMatch = attrs.match(/\bhref=["']([^"']*)["']/i);
    if (hrefMatch) return decodeEntities(hrefMatch[1]);
  }
  return "";
}

function parseItems(xml) {
  const itemBlocks = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)];
  const entryBlocks = [...xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry>/gi)];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;
  return blocks.map((match) => ({
    pubDate: extractDate(match[1]),
    title: extractTitle(match[1]),
    link: extractLink(match[1]),
  }));
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
    const items = parseItems(xml)
      .filter((item) => item.pubDate)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    const latest = items[0];
    return {
      name: feed.name,
      category: feed.category,
      url: feed.url,
      ok: true,
      error: null,
      lastPublication: latest?.pubDate ?? null,
      latestTitle: latest?.title || null,
      latestLink: latest?.link || null,
    };
  } catch (error) {
    return {
      name: feed.name,
      category: feed.category,
      url: feed.url,
      ok: false,
      error: error.message,
      lastPublication: null,
      latestTitle: null,
      latestLink: null,
    };
  }
}

const csvText = await readFile(csvPath, "utf8");
const feeds = parseCsv(csvText).filter((row) => row.url && row.enabled?.toLowerCase() === "true");

const results = await mapLimit(feeds, CONCURRENCY, fetchFeed);

const payload = {
  generatedAt: new Date().toISOString(),
  feeds: results,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
const okCount = results.filter((r) => r.ok).length;
console.log(`Fetched status for ${okCount}/${results.length} Microsoft Tech Community RSS feeds into ${outputPath}`);
