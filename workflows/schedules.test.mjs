import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { buildWorkflowPage, extractScheduledWorkflow } from "../build-workflow-schedules.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "workflows", "index.html"), "utf8");
const readCatalog = (page) => JSON.parse(page.match(/<script id="workflow-catalog" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const catalog = readCatalog(html);
const helpersSource = html.match(/<script id="workflow-schedule-helpers">([\s\S]*?)<\/script>/)[1];
const helpers = createContext({ Intl, Date });
runInContext(helpersSource, helpers);

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "workflow-schedules-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  mkdirSync(join(root, "workflows"));
  writeFileSync(join(root, "workflows", "index.html"), html);
  return root;
}

test("extracts only on.schedule, preserving multiple crons and quoted names", () => {
  const source = `name: "Refresh # data"
'on':
  workflow_dispatch:
    inputs:
      schedule:
        default: ignored
  schedule:
    # - cron: '0 0 * * *'
    - cron: '0 6 * * *' # daily
    - cron: "15 18 * * MON"
jobs:
  refresh:
    steps:
      - run: echo "cron: 0 0 * * *"
`;
  assert.deepEqual(extractScheduledWorkflow(source, "example.yaml"), {
    name: "Refresh # data", file: "example.yaml", schedules: ["0 6 * * *", "15 18 * * MON"],
  });
});

test("excludes manual/event-only workflows and does not find fake nested schedules", () => {
  for (const source of [
    "name: Manual\non:\n  workflow_dispatch:\n",
    "on: [push, pull_request]\n",
    "on:\n  workflow_dispatch:\n    inputs:\n      schedule:\n        default: daily\n",
    "# on:\n#   schedule:\n#     - cron: '0 6 * * *'\n",
    "on:\n  push:\njobs:\n  example:\n    schedule:\n      - cron: '0 6 * * *'\n",
  ]) {
    assert.equal(extractScheduledWorkflow(source, "manual.yaml"), null);
  }
});

test("accepts ordinary cron ranges, lists, steps and named months/weekdays", () => {
  const result = extractScheduledWorkflow("on:\n  schedule:\n    - cron: '*/15 6-8 * JAN,MAR MON-FRI'\n", "unnamed.yml");
  assert.equal(result.name, "unnamed.yml");
  assert.deepEqual(result.schedules, ["*/15 6-8 * JAN,MAR MON-FRI"]);
});

test("rejects malformed or unsupported schedules instead of dropping entries", () => {
  for (const source of [
    "on: {schedule: [{cron: '0 6 * * *'}]}",
    "on: &events\n  schedule:\n    - cron: '0 6 * * *'",
    "on:\n  schedule: [{cron: '0 6 * * *'}]",
    "on:\n  schedule:",
    "on:\n  schedule:\n    - cron: '0 6 * * *'\n      timezone: Europe/Paris",
    "on:\n  schedule:\n    - cron: >\n        0 6 * * *",
    "on:\n  schedule:\n    - cron: '0 6 * *'",
    "on:\n  schedule:\n    - cron: '60 6 * * *'",
    "on:\n  schedule:\n    - cron: '0 24 * * *'",
    "on:\n  schedule:\n    - cron: '0 6 * * 8'",
    "on:\n  schedule:\n    - cron: '*/0 6 * * *'",
    "on:\n  schedule:\n    - cron: '0 8-6 * * *'",
    "on:\n  schedule:\n    - cron: '0 6 * * *'\n  schedule:\n    - cron: '0 7 * * *'",
    "on:\n  schedule:\n    - cron: '0 6 * * *'\non:\n  workflow_dispatch:",
  ]) {
    assert.throws(() => extractScheduledWorkflow(source, "bad.yaml"), /bad\.yaml/);
  }
});

test("the generated catalog contains all 15 current workflows and all 21 crons", () => {
  const daily = ["0 6 * * *"];
  const snapshot = ["0 6 * * *", "0 18 * * 1"];
  assert.deepEqual(Object.fromEntries(catalog.map(({ file, schedules }) => [file, schedules])), {
    "azure-updates.yaml": daily,
    "m365-updates.yaml": daily,
    "aws-updates.yaml": daily,
    "rss-updates.yaml": daily,
    "github-ip-ranges-updates.yaml": daily,
    "azure-ip-ranges-updates.yaml": daily,
    "microsoft-techcommunity-rss-feeds-updates.yaml": daily,
    "azure-taggable-resources-updates.yaml": daily,
    "azure-policy-aliases-updates.yaml": snapshot,
    "azure-regions-updates.yaml": snapshot,
    "azure-policies-updates.yaml": snapshot,
    "azure-built-in-roles-updates.yaml": ["15 6 * * *", "15 18 * * 1"],
    "entra-built-in-roles-updates.yaml": ["30 6 * * *", "30 18 * * 1"],
    "graph-permissions-updates.yaml": ["45 6 * * *", "45 18 * * 1"],
    "favicons-refresh.yaml": ["0 4 * * 0"],
  });
  assert.equal(catalog.length, 15);
  assert.equal(catalog.flatMap((workflow) => workflow.schedules).length, 21);
  assert.equal(buildWorkflowPage(), html, "checked-in catalog must match YAML and regenerate idempotently");
});

test("generation discovers .yml files, removes obsolete entries and escapes embedded JSON", (t) => {
  const root = fixture(t);
  const name = '</script><img src=x onerror="alert(1)"> $&';
  writeFileSync(join(root, ".github", "workflows", "new.yml"), `name: '${name}'\non:\n  schedule:\n    - cron: '5 7 * * *'\n`);
  writeFileSync(join(root, ".github", "workflows", "manual.yaml"), "on:\n  workflow_dispatch:\n");
  const output = buildWorkflowPage(root);
  assert.deepEqual(readCatalog(output), [{ name, file: "new.yml", schedules: ["5 7 * * *"] }]);
  assert.ok(!output.includes(name));
  const omitCatalog = (text) => text.replace(/(<script id="workflow-catalog" type="application\/json">)[\s\S]*?(<\/script>)/, "$1$2");
  assert.equal(omitCatalog(output), omitCatalog(html), "only the embedded data may change");
  writeFileSync(join(root, "workflows", "index.html"), output);
  assert.equal(buildWorkflowPage(root), output);
});

test("missing catalog markers and missing schedules fail generation explicitly", (t) => {
  const root = fixture(t);
  assert.throws(() => buildWorkflowPage(root), /No scheduled workflows/);
  writeFileSync(join(root, "workflows", "index.html"), "<html></html>");
  assert.throws(() => buildWorkflowPage(root), /exactly one/);
});

test("the deployment command works from blog and matches the local page", (t) => {
  const root = fixture(t);
  const output = join(root, "deployed.html");
  execFileSync(process.execPath, [join(ROOT, "build-workflow-schedules.mjs"), output], { cwd: join(ROOT, "blog") });
  assert.equal(readFileSync(output, "utf8"), html);
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "deploy-hugo.yaml"), "utf8");
  assert.match(workflow, /node \.\.\/build-workflow-schedules\.mjs public\/workflows\/index\.html/);
});

test("daily conversions use the next occurrence, including both Paris DST changes", () => {
  for (const [now, zone, local, utc] of [
    ["2026-01-10T00:00:00Z", "Europe/Paris", "Daily at 07:00", "Daily at 06:00 UTC"],
    ["2026-07-10T00:00:00Z", "Europe/Paris", "Daily at 08:00", "Daily at 06:00 UTC"],
    ["2026-03-28T07:00:00Z", "Europe/Paris", "Daily at 08:00", "Daily at 06:00 UTC"],
    ["2026-10-24T07:00:00Z", "Europe/Paris", "Daily at 07:00", "Daily at 06:00 UTC"],
    ["2026-07-10T00:00:00Z", "Asia/Kathmandu", "Daily at 11:45", "Daily at 06:00 UTC"],
    ["2026-07-10T00:00:00Z", "UTC", "Daily at 06:00", "Daily at 06:00 UTC"],
  ]) {
    const actual = helpers.describeSchedule("0 6 * * *", zone, new Date(now));
    assert.equal(actual.local, local, `${zone} at ${now}`);
    assert.equal(actual.utc, utc);
  }
});

test("weekly schedules correctly cross local weekdays and midnight", () => {
  const now = new Date("2026-07-03T00:00:00Z");
  const west = helpers.describeSchedule("0 4 * * 0", "America/Los_Angeles", now);
  assert.equal(west.local, "Saturday at 21:00");
  assert.equal(west.utc, "Sunday at 04:00 UTC");
  assert.equal(west.iso, "2026-07-05T04:00:00.000Z");
  const east = helpers.describeSchedule("0 18 * * 1", "Pacific/Kiritimati", now);
  assert.equal(east.local, "Tuesday at 08:00");
  assert.equal(east.utc, "Monday at 18:00 UTC");
  const midnight = helpers.describeSchedule("30 18 * * 1", "Asia/Kolkata", now);
  assert.equal(midnight.local, "Tuesday at 00:00");
});

test("next occurrences advance at the exact scheduled instant and across year boundaries", () => {
  assert.equal(helpers.nextScheduledOccurrence("0 6 * * *", new Date("2026-12-31T06:00:00Z")).date.toISOString(), "2027-01-01T06:00:00.000Z");
  assert.equal(helpers.nextScheduledOccurrence("0 18 * * 1", new Date("2026-10-05T18:00:00Z")).date.toISOString(), "2026-10-12T18:00:00.000Z");
  const next = helpers.describeSchedule("0 18 * * 1", "Europe/Paris", new Date("2026-10-24T00:00:00Z"));
  assert.equal(next.local, "Monday at 19:00");
});

test("uninterpreted crons are explicit and escaped instead of displaying a guessed time", () => {
  for (const cron of ["*/15 6 * * *", "0 6 1 * *", "0 25 * * *", "<img src=x onerror=alert(1)>"]) {
    assert.equal(helpers.describeSchedule(cron, "UTC", new Date()), null);
    const output = helpers.renderSchedule({ schedules: [cron] }, "UTC");
    assert.match(output, /Schedule not interpreted/);
    assert.ok(!output.includes("<img"));
  }
});

function renderContext() {
  const context = createContext({ Intl, Date, REPO: "owner/repo", LOCAL_TIME_ZONE: "Europe/Paris" });
  runInContext(helpersSource, context);
  const start = html.indexOf("    function statusInfo(");
  const end = html.indexOf("    async function loadWorkflow(", start);
  assert.ok(start > 0 && end > start);
  runInContext(html.slice(start, end), context);
  return context;
}

test("all run-detail states retain schedules, including 403/429 and no runs", () => {
  const context = renderContext();
  const workflow = catalog.find(({ file }) => file === "azure-regions-updates.yaml");
  const run = {
    status: "completed", conclusion: "success", run_number: 42, head_branch: "main",
    run_started_at: "2026-10-01T06:00:00Z", updated_at: "2026-10-01T06:05:00Z",
    html_url: "https://github.com/owner/repo/actions/runs/42",
  };
  for (const [state, error] of [
    [run, null], [{ ...run, status: "in_progress" }, null], [null, null],
    [null, new Error("HTTP 403")], [null, new Error("HTTP 429")], [null, new Error("Network unavailable")],
  ]) {
    const card = {};
    context.renderCard(card, workflow, state, error);
    assert.equal((card.innerHTML.match(/class="workflow-schedule"/g) || []).length, 1);
    assert.match(card.innerHTML, /Daily at 06:00 UTC/);
    assert.match(card.innerHTML, /Monday at 18:00 UTC/);
  }
  const card = {};
  context.renderCard(card, { ...workflow, name: "<img src=x>" }, run, null);
  assert.match(card.innerHTML, /&lt;img src=x&gt;/);
});

test("loading cards already contain every schedule before the API responds", () => {
  const context = renderContext();
  const cards = [];
  context.WORKFLOWS = catalog;
  context.loadWorkflow = () => {};
  context.document = {
    createElement: () => ({}),
    getElementById: (id) => id === "workflowCards"
      ? { replaceChildren: () => { cards.length = 0; }, append: (card) => cards.push(card) }
      : {},
  };
  const start = html.indexOf("    function renderCards()");
  const end = html.indexOf('    document.getElementById("refreshButton").addEventListener', start);
  assert.ok(start > 0 && end > start);
  runInContext(html.slice(start, end), context);
  context.renderCards();
  assert.equal(cards.length, 15);
  for (const card of cards) assert.match(card.innerHTML, /class="workflow-schedule"/);
  assert.equal(cards.reduce((count, card) => count + (card.innerHTML.match(/<time datetime=/g) || []).length, 0), 21);
});
