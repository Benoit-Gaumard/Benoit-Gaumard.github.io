import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// websites-meta.json is the only maintained catalogue. Each site includes name,
// URL, category, subcategory, country, boolean enabled, dateAdded and optional
// description/faviconUrl. Run fetch-updates.mjs to refresh remote metadata.
// Issue-scoped JSON files are temporary proposals, folded into this catalogue.
export function websiteKey(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error(`Invalid website URL: ${value}`);
  return url.hostname.toLowerCase().replace(/^www\./, "") + url.pathname.replace(/\/+$/, "").toLowerCase() + url.search;
}

export function validateCatalogue(payload) {
  if (!payload || !Array.isArray(payload.sites)) throw new Error("Missing website catalogue sites.");
  const urls = new Set();
  for (const site of payload.sites) {
    if (!site || ["name", "category", "country", "url"].some(field => typeof site[field] !== "string" || !site[field].trim())
      || typeof site.subcategory !== "string" || typeof site.enabled !== "boolean"
      || typeof site.dateAdded !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(site.dateAdded)
      || (site.description != null && typeof site.description !== "string")
      || (site.faviconUrl != null && typeof site.faviconUrl !== "string")) {
      throw new Error(`Invalid website entry: ${site?.url || "unknown"}`);
    }
    const key = websiteKey(site.url);
    if (urls.has(key)) throw new Error(`Duplicate website: ${site.url}`);
    urls.add(key);
  }
  return payload;
}

export function readCatalogue(path) {
  return validateCatalogue(JSON.parse(readFileSync(path, "utf8")));
}

export function readWebsiteSubmissions(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter(file => /^issue-\d+\.json$/.test(file))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map(file => {
      const path = join(directory, file);
      const site = JSON.parse(readFileSync(path, "utf8"));
      validateCatalogue({ sites: [site] });
      if (site.enabled !== false) throw new Error(`Community website must remain disabled: ${path}`);
      return { file, site };
    });
}

export function combineWebsites(path, directory) {
  const payload = readCatalogue(path);
  const urls = new Set(payload.sites.map(site => websiteKey(site.url)));
  const submissions = readWebsiteSubmissions(directory);
  const added = [];
  for (const { file, site } of submissions) {
    const key = websiteKey(site.url);
    if (urls.has(key)) continue;
    urls.add(key);
    payload.sites.push(site);
    added.push(file);
  }
  return { payload: validateCatalogue(payload), submissions, added };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, source, directory, output] = process.argv.slice(2);
  if (!["build", "fold"].includes(mode) || !source || !directory || (mode === "build" && !output)) {
    throw new Error("Usage: node catalogue.mjs <build|fold> <websites-meta.json> <submissions-dir> [output.json]");
  }
  const { payload, submissions, added } = combineWebsites(source, directory);
  if (mode === "build" || added.length) writeFileSync(mode === "build" ? output : source, JSON.stringify(payload, null, 2) + "\n");
  if (mode === "fold") submissions.forEach(({ file }) => unlinkSync(join(directory, file)));
  console.log(`${added.length} website submission(s) added; ${payload.sites.length} sites total.`);
}
