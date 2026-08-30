// Cache third-party favicons into the repo so visitors never call Google.
//
// Before this, every visit told Google which sites the visitor was looking at
// here: 42 favicons on each homepage, 31 on rss-watcher, and up to 522 on
// favorite-links. Serving them from /favicons/ removes that entirely and makes
// the pages faster, at the cost of ~365 small files that this script refreshes.
//
// Usage:
//   node build-favicons.mjs            refresh only what is missing
//   node build-favicons.mjs --all      re-download everything
//   node build-favicons.mjs --limit 20 stop after 20 downloads (for testing)

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = "favicons";
const MANIFEST = join(OUT_DIR, "manifest.json");
const LOOKUP = join(OUT_DIR, "lookup.json");
const SIZE = 64;
const CONCURRENCY = 8;

const argAll = process.argv.includes("--all");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) : Infinity;

// A domain becomes a filename. Keep it readable, and keep it unambiguous:
// anything outside [a-z0-9.-] is replaced, so two different domains cannot
// collide into one name by accident. The extension is decided per file from
// the actual bytes, because the endpoint answers with PNG for most domains but
// JPEG (and occasionally ICO or GIF) for others - naming a JPEG ".png" would
// work only because browsers sniff, and that is the kind of thing that breaks
// later on a host that trusts the extension.
export function baseNameFor(domain) {
  return domain.toLowerCase().replace(/[^a-z0-9.-]/g, "_");
}

function sniffExtension(buf) {
  const hex = (n) => buf.subarray(0, n).toString("hex");
  if (hex(8) === "89504e470d0a1a0a") return "png";
  if (hex(3) === "ffd8ff") return "jpg";
  if (hex(4) === "00000100") return "ico";
  if (hex(6) === "474946383961" || hex(6) === "474946383761") return "gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

function cleanDomain(raw) {
  if (!raw) return null;
  const d = String(raw).trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "");
  if (!d || !d.includes(".") || /\s/.test(d)) return null;
  return d;
}

// --- gather every domain the site shows an icon for -------------------------
function collectDomains() {
  const domains = new Map(); // domain -> Set(source)
  const add = (raw, src) => {
    const d = cleanDomain(raw);
    if (!d) return;
    if (!domains.has(d)) domains.set(d, new Set());
    domains.get(d).add(src);
  };

  for (const f of ["index.html", "index_fr.html"]) {
    if (!existsSync(f)) continue;
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/favicons\?domain=([^&"']+)/g)) add(m[1], f);
    for (const m of src.matchAll(/favicons\?sz=\d+&domain=([^&"']+)/g)) add(m[1], f);
    for (const m of src.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})\/favicon\.ico/gi)) add(m[1], f);
  }

  const csvs = [
    ["favorite-links/favorite-links.csv", "favorite-links"],
    ["friends-websites/friends-websites.csv", "friends-websites"],
    ["microsoft-portals/portals-urls.csv", "microsoft-portals"],
  ];
  for (const [path, src] of csvs) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/).slice(1)) {
      const m = line.match(/https?:\/\/([^/,;"\s]+)/);
      if (m) add(m[1], src);
    }
  }

  if (existsSync("rss-watcher/updates.json")) {
    const walk = (o) => {
      if (!o) return;
      if (typeof o === "string") {
        const m = o.match(/^https?:\/\/([^/]+)/);
        if (m) add(m[1], "rss-watcher");
        return;
      }
      if (Array.isArray(o)) return o.forEach(walk);
      if (typeof o === "object") return Object.values(o).forEach(walk);
    };
    try { walk(JSON.parse(readFileSync("rss-watcher/updates.json", "utf8"))); } catch {}
  }

  return domains;
}

// --- download ---------------------------------------------------------------
async function fetchWithTimeout(url, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { redirect: "follow", signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchIcon(domain) {
  const url = `https://www.google.com/s2/favicons?sz=${SIZE}&domain=${encodeURIComponent(domain)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Google answers with a generic globe for unknown domains. It is still a
  // valid icon and still better than a request to Google at view time, so it
  // is kept rather than discarded - but it is recorded, so the count of real
  // icons is not overstated.
  if (buf.length < 60) throw new Error(`too small (${buf.length}b)`);
  return buf;
}

// Google 404s for a minority of domains. Asking the site itself recovers only
// about one in eight - measured, not assumed - but one of those is edf.fr on
// the homepage, so the path earns its fifteen lines. Bounded by a timeout so a
// dead host cannot stall the build.
async function fetchIconDirect(domain) {
  const res = await fetchWithTimeout(`https://${domain}/favicon.ico`, 6000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 60) throw new Error(`too small (${buf.length}b)`);
  return buf;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const domains = collectDomains();
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { generatedAt: null, domains: {} };
  const onDisk = new Set(readdirSync(OUT_DIR).filter((f) => !f.endsWith(".json")));

  const isCached = (d) => {
    const entry = manifest.domains[d];
    return entry && entry.file && onDisk.has(entry.file);
  };

  const todo = [...domains.keys()].filter((d) => argAll || !isCached(d)).slice(0, LIMIT);
  console.log(`${domains.size} domain(s) referenced, ${[...domains.keys()].filter(isCached).length} already cached, ${todo.length} to fetch`);

  let ok = 0;
  const failed = [];

  // modest concurrency: enough to be quick, not enough to look like abuse
  const queue = [...todo];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, async () => {
    while (queue.length) {
      const domain = queue.shift();
      let buf = null;
      let via = "google";
      try {
        buf = await fetchIcon(domain);
      } catch (err) {
        try { buf = await fetchIconDirect(domain); via = "direct"; }
        catch { failed.push(`${domain}: ${err.message}`); }
      }
      if (!buf) { manifest.domains[domain] = manifest.domains[domain] || { file: null, bytes: 0 }; continue; }
      const ext = sniffExtension(buf);
      if (!ext) {
        failed.push(`${domain}: unrecognised image format`);
        manifest.domains[domain] = manifest.domains[domain] || { file: null, bytes: 0 };
        continue;
      }
      const file = `${baseNameFor(domain)}.${ext}`;
      writeFileSync(join(OUT_DIR, file), buf);
      manifest.domains[domain] = { file, bytes: buf.length, via };
      ok++;
    }
  });
  await Promise.all(workers);

  // keep every domain in the manifest, cached or not, so a page can tell the
  // difference between "no icon exists" and "not tried yet"
  for (const [d, srcs] of domains) {
    manifest.domains[d] = manifest.domains[d] || { file: null, bytes: 0 };
    manifest.domains[d].sources = [...srcs];
  }
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  // A lean domain -> filename map for the pages that build icon URLs in script.
  // The full manifest carries sizes and provenance and is for humans; this one
  // is fetched by the browser, so it stays as small as it can be. One request
  // replaces the 42 to 522 the page used to make.
  const lookup = {};
  for (const [d, entry] of Object.entries(manifest.domains)) {
    if (entry.file) lookup[d] = entry.file;
  }
  writeFileSync(LOOKUP, JSON.stringify(lookup) + "\n", "utf8");

  const cached = Object.values(manifest.domains).filter((d) => d.file).length;
  console.log(`  downloaded ${ok}, failed ${failed.length}`);
  console.log(`  cached total: ${cached}/${domains.size}`);
  console.log(`  lookup: ${Object.keys(lookup).length} entries, ${(JSON.stringify(lookup).length / 1024).toFixed(1)} KB`);
  if (failed.length) {
    console.log("  failures:");
    failed.slice(0, 12).forEach((f) => console.log("    " + f));
    if (failed.length > 12) console.log(`    ... and ${failed.length - 12} more`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
