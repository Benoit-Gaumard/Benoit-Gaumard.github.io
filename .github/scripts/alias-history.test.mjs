import { readFileSync, existsSync } from "node:fs";
import { runInNewContext, Script } from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
const html = read("azure-policy-aliases/aliases-history/index.html");
const script = html.match(/<script data-history-script>([\s\S]*?)<\/script>/)[1];
const payload = JSON.parse(read("azure-policy-aliases/alias-changes.json"));
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf("\n    }", start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${script.match(/const CHANGE_LABELS = [^\n]+/)[0]}
  ${script.match(/const FIELD_LABELS = [^\n]+/)[0]}
  ${["normalize", "entryTimestamp", "dayKey", "validateHistory", "periodCutoff", "filterEntries", "formatValue", "summarizeChange", "catalogueUrl", "buildExport"].map(declaration).join("\n")}
  ({ validateHistory, dayKey, filterEntries, formatValue, summarizeChange, catalogueUrl, buildExport });
`, { URL, location: { href: "https://benoit-gaumard.io/azure-policy-aliases/aliases-history/" } });
const fixture = overrides => ({
  kind: "alias", change: "modified", name: "Microsoft.Example/accounts/items[*].id",
  resourceType: "Microsoft.Example/accounts", provider: "Microsoft.Example", defaultPath: "properties.items[*].id",
  detectedAt: "2026-10-08T06:00:00Z", comparedFrom: "2026-10-07T06:00:00Z",
  fields: [{ field: "defaultPath", from: null, to: "properties.items[*].id" }], ...overrides,
});
const filters = { search: "", change: "", provider: "", days: null };
const now = Date.parse("2026-10-08T13:00:00Z");

test("the retained source log validates and keeps bounded evidence rather than fabricated first-run additions", () => {
  assert.equal(payload.schemaVersion, 1);
  assert.equal(helpers.validateHistory(payload).length, payload.totalEntries);
  assert.ok(payload.totalEntries <= payload.maxEntries);
  assert.ok(payload.entries.every(entry => Date.parse(entry.detectedAt) > Date.parse(payload.baselineAt)));
  assert.ok(payload.entries.every(entry => Date.parse(entry.comparedFrom) <= Date.parse(entry.detectedAt)));
  for (const entry of payload.entries.filter(entry => entry.snapshots)) {
    assert.match(entry.snapshots.beforeCommit, /^[0-9a-f]{40}$/);
    assert.match(entry.snapshots.afterCommit, /^[0-9a-f]{40}$/);
  }
});

test("alias identities, resource types, providers and original default paths are required", () => {
  const entry = fixture();
  assert.equal(helpers.validateHistory({ entries: [entry] })[0], entry);
  assert.throws(() => helpers.validateHistory({}));
  for (const override of [{ kind: "role" }, { resourceType: null }, { provider: "" }, { defaultPath: 1 }, { fields: [{}] }, { change: "unknown" }]) {
    assert.throws(() => helpers.validateHistory({ entries: [fixture(override)] }));
  }
  assert.equal(helpers.formatValue(entry.fields[0], "from"), "null");
  assert.equal(helpers.formatValue({ to: "" }, "to"), "(empty string)");
  assert.equal(helpers.formatValue({}, "to"), "Not recorded");
  assert.match(helpers.summarizeChange(entry), /Default path/);
});

test("search includes exact aliases, resource types and historical before/after paths", () => {
  const entries = [fixture({ fields: [{ field: "defaultPath", from: "old-only-path", to: "properties.items[*].id" }] }), fixture({ change: "removed", provider: "Microsoft.Other" })];
  assert.equal(helpers.filterEntries(entries, { ...filters, search: "old-only-path", provider: "Microsoft.Example", change: "modified" }, now).length, 1);
  assert.equal(helpers.filterEntries(entries, { ...filters, search: "items[*]" }, now).length, 2);
  assert.equal(helpers.filterEntries(entries, { ...filters, search: "MICROSOFT.EXAMPLE/ACCOUNTS" }, now).length, 2);
  assert.equal(helpers.filterEntries(entries, { ...filters, provider: "Missing" }, now).length, 0);
});

test("UTC period filters and unknown dates preserve the established history contract", () => {
  const entries = [fixture({ detectedAt: "2026-10-01T23:00:00-02:00" }), fixture({ detectedAt: "2026-10-01T23:59:59Z" }), fixture({ detectedAt: null })];
  const sorted = helpers.validateHistory({ entries });
  assert.equal(helpers.dayKey(sorted[0]), "2026-10-02");
  assert.equal(helpers.dayKey(sorted.at(-1)), "undated");
  assert.equal(helpers.filterEntries(sorted, { ...filters, days: 7 }, now).length, 1);
  assert.equal(helpers.filterEntries(sorted, filters, now).length, 3);
});

test("catalogue links restore the alias query and exact provider/resource type", () => {
  const entry = fixture();
  const url = new URL(helpers.catalogueUrl(entry));
  assert.equal(url.pathname, "/azure-policy-aliases/");
  assert.equal(url.searchParams.get("search"), entry.name);
  assert.equal(url.searchParams.get("providerFilter"), entry.provider);
  assert.equal(url.searchParams.get("resourceTypeFilter"), entry.resourceType);
  assert.match(read("azure-policy-aliases/index.html"), /href="aliases-history\/"/);
});

test("full filtered exports preserve snapshot intervals, commit evidence and null paths", () => {
  const entries = Array.from({ length: 121 }, () => fixture({ snapshots: { beforeCommit: "before", afterCommit: "after" } }));
  const exported = helpers.buildExport(entries, filters, payload.generatedAt, 180, new Date(now).toISOString(), new Date(now).toISOString(), payload.baselineAt);
  assert.equal(exported.kind, "alias");
  assert.equal(exported.entries, entries);
  assert.equal(exported.totalMatchingEvents, 121);
  assert.equal(exported.baselineAt, payload.baselineAt);
  assert.match(exported.coverage, /not official publication or retirement dates/);
  assert.equal(exported.entries[0].fields[0].from, null);
});

test("page explains observation limits, safely renders comparisons and publishes through the existing workflow", () => {
  assert.doesNotMatch(script, /innerHTML|execCommand/);
  assert.match(script, /Compared with \(UTC\)/);
  assert.match(script, /Observed default path/);
  assert.match(html, /a removal does not prove that Microsoft retired the alias/);
  assert.match(html, /3,000 events/);
  assert.match(html, /API-version-specific paths, modifiability metadata/);
  assert.match(html, /\.field-pair \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(html, /name="robots" content="noindex, follow"/);
  const workflow = read(".github/workflows/azure-policy-aliases-updates.yaml");
  assert.match(workflow, /actions\/setup-node@v4/);
  assert.match(workflow, /alias-history-data\.test\.mjs/);
  assert.match(workflow, /git add azure-policy-aliases\/alias-changes\.json/);
  const deploy = read(".github/workflows/deploy-hugo.yaml");
  for (const file of ["alias-changes.json", "aliases-history/index.html"]) {
    assert.ok(deploy.includes(`cp ../azure-policy-aliases/${file} public/azure-policy-aliases/${file}`));
  }
});

test("standalone scripts, IDs, local links and shared shell configuration remain valid", () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes("application/ld+json")) JSON.parse(content);
    else new Script(content);
  }
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of markup.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
  for (const [, value] of markup.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    const url = new URL(value, "https://benoit-gaumard.io/azure-policy-aliases/aliases-history/");
    assert.ok(existsSync(new URL(url.pathname.replace(/^\//, "") + (url.pathname.endsWith("/") ? "index.html" : ""), root)), value);
    if (value.startsWith("#")) assert.ok(ids.includes(url.hash.slice(1)), value);
  }
  assert.match(html, /"path":"\/azure-policy-aliases\/aliases-history\/"/);
});
