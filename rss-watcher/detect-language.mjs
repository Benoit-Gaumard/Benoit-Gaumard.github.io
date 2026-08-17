import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const csvPath = join(HERE, "rss-feeds.csv");

const CONCURRENCY = 20;
const FEED_TIMEOUT_MS = 15000;
const USER_AGENT = "Mozilla/5.0 (compatible; RSSWatcherBot/1.0; +https://benoit-gaumard.io/rss-watcher/)";

const FRENCH_WORDS = [" le ", " la ", " les ", " des ", " une ", " est ", " pour ", " avec ", " dans ", " sur ", " qui ", " que ", " pas ", " plus ", " voici ", " comment "];
const ACCENTED = /[éèêëàâçîïôùûœ]/i;

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
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

function toCsvCell(value) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = parseCsvLine(lines[0]).map((cell) => cell.trim());
  return { header, rows: lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    header.forEach((key, index) => { row[key] = (cells[index] ?? "").trim(); });
    return row;
  }) };
}

function scoreFrench(text) {
  const lower = ` ${text.toLowerCase()} `;
  const wordHits = FRENCH_WORDS.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0);
  const accentHits = (text.match(ACCENTED) || []).length;
  return wordHits + accentHits;
}

async function detectLanguage(feed) {
  const nameMatch = feed.name.match(/\b(en|fr)$/i);
  if (nameMatch) return { name: feed.name, country: nameMatch[1].toUpperCase(), source: "name" };

  let isFrenchTld = false;
  try {
    isFrenchTld = new URL(feed.url).hostname.endsWith(".fr");
  } catch { /* ignore invalid URL */ }

  try {
    const response = await fetch(feed.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();

    const channelXml = xml.replace(/<item\b[^>]*>[\s\S]*?<\/item>/gi, "").replace(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi, "");
    const declaredLang = extractTag(channelXml, "language") || (xml.match(/<feed[^>]*\bxml:lang=["']([a-z]{2})/i) || [])[1] || "";
    if (declaredLang) return { name: feed.name, country: declaredLang.toLowerCase().startsWith("fr") ? "FR" : "EN", source: "declared" };
    if (isFrenchTld) return { name: feed.name, country: "FR", source: "tld" };

    const titles = [...xml.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/gi)].slice(1, 8).map((m) => m[1]);
    const sampleScore = titles.reduce((sum, title) => sum + scoreFrench(title), 0);
    return { name: feed.name, country: sampleScore >= 3 ? "FR" : "EN", source: "heuristic" };
  } catch (error) {
    return { name: feed.name, country: isFrenchTld ? "FR" : "EN", source: `fallback (${error.message})` };
  }
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

const csvText = await readFile(csvPath, "utf8");
const { header, rows } = parseCsv(csvText);
const feeds = rows.filter((row) => row.url && row.enabled?.toUpperCase() === "TRUE");

const results = await mapLimit(feeds, CONCURRENCY, detectLanguage);
const countryByName = new Map(results.map((r) => [r.name, r.country]));

const newHeader = header.includes("country") ? header : [...header.slice(0, 2), "country", ...header.slice(2)];
const outputLines = [newHeader.join(",")];
rows.forEach((row) => {
  const country = countryByName.get(row.name) || row.country || "EN";
  const cells = newHeader.map((key) => toCsvCell(key === "country" ? country : (row[key] ?? "")));
  outputLines.push(cells.join(","));
});

await writeFile(csvPath, `${outputLines.join("\r\n")}\r\n`, "utf8");

const frCount = results.filter((r) => r.country === "FR").length;
console.log(`Detected language for ${results.length} feeds: ${frCount} FR, ${results.length - frCount} EN.`);
const heuristics = results.filter((r) => r.source === "heuristic");
if (heuristics.length) console.log(`Used title heuristic for ${heuristics.length} feeds (no declared <language> tag or .fr domain).`);
