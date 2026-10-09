import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TZDB = "https://data.iana.org/time-zones/tzdb/";
const FLAGS = "https://static.flowhunt.io/flags/";

export function countryCatalogue(zoneTab, countryTab, backward) {
  const names = Object.fromEntries(countryTab.split(/\r?\n/).filter(line => /^[A-Z]{2}\t/.test(line)).map(line => line.split("\t")));
  const zones = Object.fromEntries(zoneTab.split(/\r?\n/).filter(line => /^[A-Z]{2}\t/.test(line)).map(line => {
    const [country, , zone] = line.split("\t");
    if (!names[country] || !zone) throw new Error(`Invalid timezone country row: ${line}`);
    return [zone, country];
  }));
  const aliases = [...backward.matchAll(/^Link\s+(\S+)\s+(\S+)(?:[ \t]+#=[ \t]*(\S+))?/gm)]
    .filter(([, , alias, geographic]) => alias.includes("/") || geographic);
  let changed;
  do {
    changed = false;
    for (const [, target, alias, geographic] of aliases) {
      const country = zones[geographic || target];
      if (!zones[alias] && country) { zones[alias] = country; changed = true; }
    }
  } while (changed);
  const countries = Object.fromEntries([...new Set(Object.values(zones))].sort().map(code => [code, {
    name: names[code], flag: `/flags/${code.toLowerCase()}.png`,
  }]));
  return { countries, zones: Object.fromEntries(Object.entries(zones).sort(([a], [b]) => a.localeCompare(b))) };
}

export function validateFlag(bytes, label) {
  if (bytes.length < 45 || bytes.length > 16384 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || bytes.readUInt32BE(16) !== 24 || bytes.readUInt32BE(20) !== 18
    || bytes.subarray(-12).toString("hex") !== "0000000049454e44ae426082") {
    throw new Error(`Expected a 24 x 18 PNG flag: ${label}`);
  }
}

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const [zoneTab, countryTab, backward, version] = await Promise.all(
    ["zone.tab", "iso3166.tab", "backward", "version"].map(async file => (await download(TZDB + file)).toString("utf8")),
  );
  const catalogue = countryCatalogue(zoneTab, countryTab, backward);
  if (Object.keys(catalogue.zones).length < 400 || Object.keys(catalogue.countries).length < 200) {
    throw new Error("The downloaded timezone country catalogue is incomplete.");
  }
  const pending = Object.keys(catalogue.countries), prepared = [];
  let cached = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const code = pending.shift().toLowerCase(), file = join("flags", `${code}.png`);
      let existing;
      try { existing = await readFile(file); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
      if (existing) { validateFlag(existing, file); cached++; continue; }
      const bytes = await download(`${FLAGS}${code}.png`);
      validateFlag(bytes, code);
      prepared.push({ file, bytes });
    }
  }));
  for (const { file, bytes } of prepared) await writeFile(file, bytes);
  await writeFile(join("world-clock", "timezone-countries.json"), JSON.stringify({
    source: TZDB, version: version.trim(), retrievedAt: new Date().toISOString(),
    countryMapping: "zone.tab keeps a single country per location; backward geographic hints preserve aliases.",
    flagSource: "https://www.flowhunt.io/es/ai-leaderboard/",
    flagImages: FLAGS,
    ...catalogue,
  }, null, 2) + "\n");
  console.log(JSON.stringify({ countries: Object.keys(catalogue.countries).length, zones: Object.keys(catalogue.zones).length, downloaded: prepared.length, cached }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
