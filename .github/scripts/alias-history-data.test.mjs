import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { test } from "node:test";
import { aliasIndex, createAliasHistory, publishAliasSnapshot } from "../../azure-policy-aliases/alias-history.mjs";

const root = new URL("../../", import.meta.url);
const source = JSON.parse(readFileSync(new URL("azure-policy-aliases/policy-aliases.json", root), "utf8"));
const day1 = "2026-10-07T06:00:00.000Z", day2 = "2026-10-08T06:00:00.000Z";
const resource = (pairs, resourceType = "Microsoft.Example/accounts") => ({ provider: "Microsoft.Example", resourceType, aliases: pairs });
const snapshot = (resources, generatedAt = day2) => ({ generatedAt, resources });
const a = "Microsoft.Example/accounts/items[*].id";
const previous = snapshot([resource([["properties.items[*].id", a], [null, "legacy"]])], day1);
const current = snapshot([resource([["properties.items[*].name", a], ["properties.new", "new"]])]);

test("alias identities include the exact resource type and preserve every recorded value", () => {
  const index = aliasIndex(source);
  assert.equal(index.size, source.resources.reduce((sum, resource) => sum + resource.aliases.length, 0));
  const first = source.resources[0];
  assert.deepEqual(index.get(JSON.stringify([first.resourceType, first.aliases[0][1]])), {
    name: first.aliases[0][1], resourceType: first.resourceType, provider: first.provider, defaultPath: first.aliases[0][0],
  });
  assert.equal(aliasIndex(snapshot([resource([["one", "same"]]), resource([["two", "same"]], "Microsoft.Example/accounts/children")])).size, 2);
  assert.throws(() => aliasIndex(snapshot([resource([["one", a], ["two", a]])])), /Duplicate alias/);
});

test("baseline has no invented additions; later changes include exact before and after evidence", () => {
  const beforeJSON = JSON.stringify(previous), currentJSON = JSON.stringify(current);
  const baseline = createAliasHistory(null, previous);
  assert.equal(baseline.totalEntries, 0);
  assert.equal(baseline.baselineAt, day1);
  const history = createAliasHistory(previous, current, baseline, { beforeCommit: "before", afterCommit: "after" });
  assert.equal(history.totalEntries, 3);
  assert.equal(history.lastRunEntries, 3);
  const modified = history.entries.find(entry => entry.change === "modified");
  assert.equal(modified.name, a);
  assert.deepEqual(modified.fields, [{ field: "defaultPath", from: "properties.items[*].id", to: "properties.items[*].name" }]);
  assert.equal(modified.comparedFrom, day1);
  assert.equal(modified.detectedAt, day2);
  assert.equal(modified.snapshots.afterCommit, "after");
  assert.equal(history.entries.find(entry => entry.change === "removed").defaultPath, null);
  assert.equal(history.entries.find(entry => entry.change === "added").name, "new");
  assert.equal(JSON.stringify(previous), beforeJSON);
  assert.equal(JSON.stringify(current), currentJSON);
  assert.equal(createAliasHistory(previous, current, history).totalEntries, 3, "Replay must not duplicate events");
});

test("path nulls, empty strings, exact case and alias renames remain distinguishable", () => {
  const start = snapshot([resource([[null, a]])], day1);
  const empty = snapshot([resource([["", a]])]);
  const changed = createAliasHistory(start, empty).entries[0];
  assert.deepEqual(changed.fields[0], { field: "defaultPath", from: null, to: "" });
  const pathCase = createAliasHistory(snapshot([resource([["Properties.Id", a]])], day1), snapshot([resource([["properties.id", a]])]));
  assert.equal(pathCase.entries[0].change, "modified");
  const renamed = createAliasHistory(start, snapshot([resource([[null, a.toUpperCase()]])]));
  assert.deepEqual(renamed.entries.map(entry => entry.change).sort(), ["added", "removed"]);
  const reordered = snapshot([resource([...previous.resources[0].aliases].reverse())]);
  assert.equal(createAliasHistory(previous, reordered).totalEntries, 0);
});

test("known empty snapshots can be compared but a live empty collection cannot overwrite data", () => {
  assert.equal(createAliasHistory(snapshot([], day1), current).entries.length, 2);
  assert.equal(createAliasHistory(previous, snapshot([])).entries.length, 2);
  const dir = mkdtempSync(join(tmpdir(), "alias-history-empty-"));
  try {
    writeFileSync(join(dir, "policy-aliases.json"), JSON.stringify(previous));
    assert.throws(() => publishAliasSnapshot(snapshot([]), dir), /empty collection/);
    assert.equal(readFileSync(join(dir, "policy-aliases.json"), "utf8"), JSON.stringify(previous));
    assert.equal(existsSync(join(dir, "alias-changes.json")), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("malformed snapshots and inconsistent history fail rather than dropping evidence", () => {
  assert.throws(() => aliasIndex({ resources: [] }), /timestamp/);
  assert.throws(() => aliasIndex(snapshot([resource([["path"]])])), /pair/);
  assert.throws(() => aliasIndex(snapshot([{ ...resource([]), provider: "Wrong.Provider" }])), /resource type/);
  assert.throws(() => aliasIndex({ ...previous, totalAliases: 9 }), /totals/);
  assert.throws(() => createAliasHistory(current, previous), /chronological/);
  assert.throws(() => createAliasHistory(previous, current, { entries: [] }), /existing alias history/);
  const history = createAliasHistory(previous, current);
  assert.throws(() => createAliasHistory(null, current, history), /previous alias snapshot/);
  assert.throws(() => createAliasHistory(previous, current, { ...history, generatedAt: "2026-10-06T00:00:00Z" }), /inconsistent/);
  const damaged = structuredClone(history);
  damaged.entries.find(entry => entry.change === "modified").fields[0].from = undefined;
  assert.throws(() => createAliasHistory(current, current, damaged), /evidence/);
});

test("retention keeps the newest 3000 events and removes only events older than 180 days", () => {
  const history = createAliasHistory(previous, current);
  const extended = { ...history, entries: Array.from({ length: 3002 }, (_, i) => ({ ...history.entries[0], name: `event-${i}`, change: "added" })) };
  assert.equal(createAliasHistory(current, current, extended).totalEntries, 3000);
  const newer = { ...current, generatedAt: "2027-04-07T06:00:00Z" };
  assert.equal(createAliasHistory(current, newer, history).totalEntries, 0);
});

test("the collector's Node handoff writes consistent files and propagates failures without a live Azure call", () => {
  const dir = mkdtempSync(join(tmpdir(), "alias-history-cli-"));
  const script = fileURLToPath(new URL("azure-policy-aliases/alias-history.mjs", root));
  try {
    writeFileSync(join(dir, "policy-aliases.json"), JSON.stringify(previous));
    const result = spawnSync(process.execPath, [script, dir], { input: JSON.stringify(current), encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const written = JSON.parse(readFileSync(join(dir, "policy-aliases.json"), "utf8"));
    const history = JSON.parse(readFileSync(join(dir, "alias-changes.json"), "utf8"));
    assert.equal(written.generatedAt, history.generatedAt);
    assert.equal(history.entries.length, 3);
    const bad = spawnSync(process.execPath, [script, dir], { input: "{", encoding: "utf8" });
    assert.notEqual(bad.status, 0);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, "alias-changes.json"), "utf8")), history);
    const collector = readFileSync(new URL("azure-policy-aliases/fetch-updates.ps1", root), "utf8");
    assert.match(collector, /ConvertTo-Json -Depth 10 -Compress \| node/);
    assert.match(collector, /if \(\$LASTEXITCODE -ne 0\) \{ throw/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
