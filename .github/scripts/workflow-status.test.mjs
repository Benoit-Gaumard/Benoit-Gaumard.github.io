import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { join } from "node:path";
import { cadenceHours, datasetStatus, workflowRuns, upgradeWorkflowStatus } from "./workflow-status-ui.mjs";
import { buildDatasetFreshness, buildWorkflowPage } from "../../build-workflow-schedules.mjs";

test("freshness targets derive from the largest supported scheduled gap", () => {
  assert.equal(cadenceHours(["0 6 * * *"]), 24);
  assert.equal(cadenceHours(["0 6 * * *", "0 18 * * *"]), 12);
  assert.equal(cadenceHours(["0 6 * * *", "0 18 * * 1"]), 24);
  assert.equal(cadenceHours(["0 4 * * 0"]), 168);
  assert.equal(cadenceHours(["*/5 * * * *"]), null);
});
test("workflow success cannot make stale or unknown data fresh", () => {
  const now = Date.parse("2026-10-07T12:00:00Z"), schedule = ["0 6 * * *"];
  const record = generatedAt => ({ kind: "datasets", datasets: [{ path: "example.json", generatedAt }] });
  assert.equal(datasetStatus(record("2026-10-07T06:00:00Z"), schedule, now).state, "fresh");
  assert.equal(datasetStatus(record("2026-10-01T06:00:00Z"), schedule, now).state, "stale");
  assert.equal(datasetStatus(record(null), schedule, now).state, "unknown");
  assert.equal(datasetStatus(record("2026-10-08T06:00:00Z"), schedule, now).state, "unknown");
  assert.equal(datasetStatus({ kind: "assets", datasets: [] }, schedule, now).state, "not-applicable");
});
test("latest run and last successful run are distinct", () => {
  const workflow = { file: "example.yaml", name: "Example" };
  const runs = [
    { path: ".github/workflows/example.yaml", status: "completed", conclusion: "failure", run_started_at: "2026-10-07T10:00:00Z" },
    { path: ".github/workflows/example.yaml", status: "completed", conclusion: "success", run_started_at: "2026-10-06T10:00:00Z" },
    { path: ".github/workflows/other.yaml", status: "completed", conclusion: "success", run_started_at: "2026-10-07T12:00:00Z" },
  ];
  const result = workflowRuns(workflow, runs);
  assert.equal(result.latest.conclusion, "failure");
  assert.equal(result.success.run_started_at, "2026-10-06T10:00:00Z");
});
test("published freshness uses actual data timestamps, not the current build time", () => {
  const metadata = buildDatasetFreshness();
  const source = JSON.parse(readFileSync(join("azure-ip-ranges", "ip-ranges.json"), "utf8"));
  assert.equal(metadata.workflows["azure-ip-ranges-updates.yaml"].datasets[0].generatedAt, source.generatedAt);
  assert.equal(metadata.workflows["azure-policies-updates.yaml"].datasets.length, 4);
  assert.equal(metadata.workflows["favicons-refresh.yaml"].kind, "assets");
});
test("workflow catalog and UI regeneration preserve each other", () => {
  const html = readFileSync(join("workflows", "index.html"), "utf8");
  assert.equal(buildWorkflowPage(), html);
  assert.ok(upgradeWorkflowStatus(html) === html);
  assert.match(html, /Status lookup completed/);
  assert.match(html, /Succeeded, but the published data is old/);
  assert.match(html, /per_page=100&branch=main/);
  assert.doesNotMatch(html, /setInterval\(renderCards/);
  for (const [, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) /application\/(?:ld\+)?json/.test(attrs) ? JSON.parse(code) : new Script(code);
});
