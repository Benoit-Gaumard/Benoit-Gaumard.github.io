import { readFileSync, existsSync } from "node:fs";
import { runInNewContext, Script } from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");
const html = read("azure-built-in-roles/roles-history/index.html");
const script = html.match(/<script data-history-script>([\s\S]*?)<\/script>/)[1];
const payload = JSON.parse(read("azure-built-in-roles/role-changes.json"));
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
`, { URL, location: { href: "https://benoit-gaumard.io/azure-built-in-roles/roles-history/" } });
const fixture = overrides => ({
  kind: "role", change: "modified", name: "8e3af657-a8ff-443c-a75c-2fe8c4bcb635", displayName: "Example role",
  category: "General", detectedAt: "2026-10-08T06:15:00Z",
  fields: [{ field: "actions", from: [["a/read", "Read A"]], to: [["a/write", "Write A"]] }],
  ...overrides,
});
const filters = { search: "", change: "", category: "", days: null };
const now = Date.parse("2026-10-08T13:00:00Z");

test("the stored log is source-backed with baseline metadata and no invented first-run additions", () => {
  assert.equal(payload.schemaVersion, 1);
  assert.ok(Number.isFinite(Date.parse(payload.baselineAt)));
  assert.ok(Date.parse(payload.baselineAt) <= Date.parse(payload.generatedAt));
  assert.equal(helpers.validateHistory(payload).length, payload.totalEntries);
  assert.equal(payload.entries.filter(entry => entry.detectedAt === payload.baselineAt && entry.change === "added").length, 0);
  assert.match(html, /id="baselineAt"/);
  assert.match(html, /Last compared snapshot/);
  assert.match(html, /An empty log does not prove/);
});

test("history validates role events and preserves permission evidence, nulls and booleans", () => {
  const entry = fixture();
  assert.equal(helpers.validateHistory({ entries: [entry] })[0], entry);
  assert.throws(() => helpers.validateHistory({}));
  assert.throws(() => helpers.validateHistory({ entries: [fixture({ kind: "policy" })] }));
  assert.throws(() => helpers.validateHistory({ entries: [fixture({ change: "invalid" })] }));
  assert.throws(() => helpers.validateHistory({ entries: [fixture({ fields: [{}] })] }));
  assert.equal(helpers.formatValue({}, "from"), "Not recorded");
  assert.equal(helpers.formatValue({ from: null }, "from"), "null");
  assert.equal(helpers.formatValue({ from: false }, "from"), "false");
  assert.equal(helpers.formatValue({ from: [] }, "from"), "[]");
  assert.equal(helpers.formatValue({ from: "" }, "from"), "(empty string)");
  assert.equal(helpers.formatValue(entry.fields[0], "from"), JSON.stringify(entry.fields[0].from, null, 2));
  assert.match(helpers.summarizeChange(entry), /Actions/);
});

test("UTC dates, undated evidence, periods and filters retain the existing history behavior", () => {
  const entries = [fixture({ name: "undated", detectedAt: null }), fixture({ name: "earlier", detectedAt: "2026-10-01T23:59:59Z" }), fixture({ name: "newer", detectedAt: "2026-10-01T23:00:00-02:00" })];
  const result = helpers.validateHistory({ entries });
  assert.equal(result[0].name, "newer");
  assert.equal(result.at(-1).name, "undated");
  assert.equal(helpers.dayKey(result[0]), "2026-10-02");
  assert.equal(helpers.filterEntries(result, { ...filters, days: 7 }, now).length, 1);
  assert.equal(helpers.filterEntries(result, filters, now).length, 3);
  const composed = helpers.filterEntries([fixture(), fixture({ change: "added" })], { ...filters, search: "EXAMPLE", change: "modified", category: "General" }, now);
  assert.equal(composed.length, 1);
  assert.equal(helpers.filterEntries([fixture()], { ...filters, search: fixture().name }, now).length, 1);
});

test("role catalogue links use the existing role parameter, including removed IDs", () => {
  const url = new URL(helpers.catalogueUrl(fixture().name));
  assert.equal(url.pathname, "/azure-built-in-roles/");
  assert.equal(url.searchParams.get("role"), fixture().name);
  assert.equal(url.searchParams.has("definition"), false);
  assert.equal(url.searchParams.has("tab"), false);
  assert.match(read("azure-built-in-roles/index.html"), /href="roles-history\/"/);
});

test("export includes every matching event, baseline, original values and scope", () => {
  const entries = Array.from({ length: 121 }, (_, i) => fixture({ displayName: `Role ${i}` }));
  const exported = helpers.buildExport(entries, filters, payload.generatedAt, 180, new Date(now).toISOString(), new Date(now).toISOString(), payload.baselineAt);
  assert.equal(exported.kind, "role");
  assert.equal(exported.entries, entries);
  assert.equal(exported.totalMatchingEvents, 121);
  assert.equal(exported.baselineAt, payload.baselineAt);
  assert.equal(exported.source, "azure-built-in-roles/role-changes.json");
  assert.match(exported.coverage, /not an effective-access calculation/);
});

test("source values are rendered as text, with accessible disclosures and mobile comparisons", () => {
  assert.doesNotMatch(script, /innerHTML|execCommand/);
  assert.match(script, /details\.append\(metadata, copy\)/);
  assert.match(script, /\["from", "Before", "before"\], \["to", "After", "after"\]/);
  assert.match(html, /\.field-pair \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  assert.match(html, /id="resultCount" role="status" aria-live="polite"/);
  assert.match(html, /All retained/);
  assert.match(script, /elements\.retryHistory\.addEventListener\("click", init\)/);
  assert.match(script, /Clipboard access is unavailable/);
  assert.match(script, /azure-role-changes-/);
});

test("collector, workflow and publication include persistent role history", () => {
  const collector = read("azure-built-in-roles/fetch-updates.ps1");
  const history = read("azure-built-in-roles/role-history.ps1");
  const workflow = read(".github/workflows/azure-built-in-roles-updates.yaml");
  const deploy = read(".github/workflows/deploy-hugo.yaml");
  assert.ok(collector.indexOf("New-RoleHistory -Previous") < collector.indexOf("Set-Content -Path $outputPath"));
  assert.doesNotMatch(collector, /Write-Warning "Skipping|FallbackFiles/);
  assert.match(collector, /No roles parsed from/);
  assert.match(history, /AddDays\(-180\)/);
  assert.match(history, /Select-Object -First 3000/);
  assert.match(workflow, /role-history\.test\.ps1/);
  assert.match(workflow, /git add azure-built-in-roles\/role-changes\.json/);
  assert.match(workflow, /cron: '15 6 \* \* \*'/);
  for (const target of ["role-changes.json", "roles-history/index.html"]) {
    assert.ok(deploy.includes(`cp ../azure-built-in-roles/${target} public/azure-built-in-roles/${target}`));
  }
});

test("scripts, IDs, links and shell metadata are valid on the new standalone page", () => {
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
    const url = new URL(value, "https://benoit-gaumard.io/azure-built-in-roles/roles-history/");
    const file = new URL(url.pathname.replace(/^\//, "") + (url.pathname.endsWith("/") ? "index.html" : ""), root);
    assert.ok(existsSync(file), value);
    if (value.startsWith("#")) assert.ok(ids.includes(url.hash.slice(1)), value);
  }
  assert.match(html, /name="robots" content="noindex, follow"/);
  assert.match(html, /"path":"\/azure-built-in-roles\/roles-history\/"/);
  assert.ok(html.indexOf("gtag('consent', 'default'") < html.indexOf('src="https://www.googletagmanager'));
});
