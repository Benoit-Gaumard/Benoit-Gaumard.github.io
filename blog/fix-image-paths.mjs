// The Hugo blog is published under /blog/, so a root-relative "/images/..."
// reference resolves to https://benoit-gaumard.io/images/... and 404s.
// Rewrites those to "/blog/images/...", which is where the files are served.
//
// Run: node blog/fix-image-paths.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "content");

// Not preceded by a word character or a slash, so an already-correct
// "/blog/images/" or an "https://host/images/" is left alone.
const BROKEN = /(?<![\w/])\/images\//g;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith(".md")) out.push(p);
  }
  return out;
}

let files = 0;
let refs = 0;

for (const file of walk(CONTENT)) {
  const src = readFileSync(file, "utf8");
  const matches = src.match(BROKEN);
  if (!matches) continue;
  writeFileSync(file, src.replace(BROKEN, "/blog/images/"), "utf8");
  files++;
  refs += matches.length;
  console.log(`${relative(HERE, file).split(sep).join("/")}: ${matches.length} path(s)`);
}

console.log(`\n${refs} image path(s) rewritten across ${files} file(s).`);
