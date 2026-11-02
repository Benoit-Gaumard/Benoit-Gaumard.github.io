import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { readCatalogue, combineWebsites, validateCatalogue } from "../../friends-websites/catalogue.mjs";

const script = resolve("friends-websites/catalogue.mjs");
const site = { name: "Example, Author", url: "https://example.org/", category: "Blog", subcategory: "", country: "France", enabled: true, dateAdded: "2026-08-18", description: "Recorded description", faviconUrl: "https://example.org/icon.png" };
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "friends-catalogue-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, "websites-meta.json"), submissions = join(dir, "submissions");
  mkdirSync(submissions);
  writeFileSync(source, JSON.stringify({ sites: [site] }));
  return { dir, source, submissions };
}
test("single catalogue preserves all unique links, disabled entries and metadata", () => {
  const catalogue = readCatalogue("friends-websites/websites-meta.json");
  assert.equal(catalogue.sites.length, 27);
  assert.ok(catalogue.sites.find(site => site.url === "https://jlou.eu/"));
  assert.equal(catalogue.sites.find(site => site.url === "https://davidsantiago.fr/").subcategory, "Network");
  assert.throws(() => validateCatalogue({ sites: [site, { ...site, url: "http://www.example.org" }] }), /Duplicate/);
  assert.throws(() => validateCatalogue({ sites: [{ ...site, enabled: "TRUE" }] }), /Invalid/);
  assert.throws(() => validateCatalogue({ sites: [{ ...site, url: "javascript:alert(1)" }] }), /Invalid website URL/);
});
test("JSON build and fold deduplicate proposals and keep them disabled", t => {
  const { dir, source, submissions } = fixture(t);
  const extra = { ...site, name: "New author", url: "https://new.example.org/", enabled: false };
  writeFileSync(join(submissions, "issue-1.json"), JSON.stringify(extra));
  writeFileSync(join(submissions, "issue-2.json"), JSON.stringify({ ...extra, url: "http://www.new.example.org" }));
  const original = readFileSync(source, "utf8");
  const output = join(dir, "built.json");
  const build = spawnSync(process.execPath, [script, "build", source, submissions, output], { encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  assert.equal(readCatalogue(output).sites.length, 2);
  assert.equal(readCatalogue(output).sites[1].enabled, false);
  assert.equal(readFileSync(source, "utf8"), original);
  const fold = spawnSync(process.execPath, [script, "fold", source, submissions], { encoding: "utf8" });
  assert.equal(fold.status, 0, fold.stderr);
  assert.deepEqual(readCatalogue(source), readCatalogue(output));
  assert.deepEqual(readdirSync(submissions), []);
  assert.equal(readCatalogue(source).sites[0].description, site.description);
});
test("invalid community files fail without partially folding the catalogue", t => {
  const { source, submissions } = fixture(t);
  writeFileSync(join(submissions, "issue-1.json"), JSON.stringify({ ...site, url: "https://new.example.org/", enabled: true }));
  assert.throws(() => combineWebsites(source, submissions), /must remain disabled/);
  assert.equal(readCatalogue(source).sites.length, 1);
  assert.equal(readdirSync(submissions).length, 1);
});
test("metadata refresh preserves identity, activation and last known metadata on HTTP failure", t => {
  const { dir, source } = fixture(t);
  for (const file of ["fetch-updates.mjs", "catalogue.mjs"]) copyFileSync(resolve("friends-websites", file), join(dir, file));
  const mock = join(dir, "mock.mjs");
  writeFileSync(mock, 'globalThis.fetch = async () => new Response("Blocked", {status:403});');
  const result = spawnSync(process.execPath, ["--import", pathToFileURL(mock).href, join(dir, "fetch-updates.mjs")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Metadata unavailable/);
  const updated = readCatalogue(source).sites[0];
  for (const key of ["name", "category", "subcategory", "country", "enabled", "dateAdded", "description", "faviconUrl"]) assert.equal(updated[key], site[key]);
  assert.equal(updated.ok, false);
  assert.equal(updated.error, "HTTP 403");
});
