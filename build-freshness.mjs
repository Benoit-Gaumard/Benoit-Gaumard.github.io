// The six pages this feeds have no generation timestamp in their data, and the
// host's Last-Modified header reports the deploy, not the update -- it would
// claim a hand-curated list was refreshed today because an unrelated page
// changed. Git knows when each data file actually last changed, so stamp that
// at build time into one small manifest the pages can read.
//
// Usage: node build-freshness.mjs [outputPath]
// Runs git from this script's own directory, so the deploy workflow can call it
// from blog/ without the paths shifting underneath it.
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] || join(REPO, "freshness.json"));

const FILES = [
  "azure-naming-convention/abbreviations.json",
  "azure-regions/regions.json",
  "favorite-links/favorite-links.csv",
  "friends-websites/friends-websites.csv",
  "microsoft-portals/portals-urls.csv",
  "it-images/images.json",
  // added so /tools/ can show a per-card "updated" date
  "icons/icons.json",
  "azure-release-updates/updates.json",
  "m365-release-updates/updates.json",
  "aws-release-updates/updates.json",
  "rss-watcher/updates.json",
  "microsoft-techcommunity-rss-feeds/feeds-status.json",
  "github-ip-ranges/ip-ranges.json",
  "azure-ip-ranges/ip-ranges.json",
  "emoji-sheet/emojis.json",
  "azure-taggable-resources/tag-support.json",
  "azure-policy-aliases/policy-aliases.json",
  "azure-policies/policydefinitions.json",
  "azure-built-in-roles/roles.json",
  "entra-built-in-roles/roles.json",
  "graph-permissions/permissions.json",
];

const manifest = {};
let missing = 0;

for (const file of FILES) {
  if (!existsSync(join(REPO, file))) { console.warn(`  skipped (absent): ${file}`); missing++; continue; }
  let iso = "";
  try {
    iso = execFileSync("git", ["-C", REPO, "log", "-1", "--format=%cI", "--", file], { encoding: "utf8" }).trim();
  } catch { /* not a git checkout; fall through to build time */ }
  if (!iso) {
    // shallow clones and tarball builds have no history for the file
    iso = new Date().toISOString();
    console.warn(`  no git history, using build time: ${file}`);
  }
  manifest[file] = iso;
}

writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`${OUT} written with ${Object.keys(manifest).length} entr(ies)${missing ? `, ${missing} skipped` : ""}`);
