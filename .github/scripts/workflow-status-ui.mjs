import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enhancePage } from "../../site-ui.mjs";

export function cadenceHours(schedules) {
  if (!Array.isArray(schedules)) return null;
  const minutes = new Set();
  for (const cron of schedules) {
    const match = /^(\d{1,2}) (\d{1,2}) \* \* (\*|[0-6])$/.exec(cron);
    if (!match || Number(match[1]) > 59 || Number(match[2]) > 23) return null;
    const days = match[3] === "*" ? [0, 1, 2, 3, 4, 5, 6] : [Number(match[3])];
    days.forEach(day => minutes.add(day * 1440 + Number(match[2]) * 60 + Number(match[1])));
  }
  const sorted = [...minutes].sort((a, b) => a - b);
  if (!sorted.length) return null;
  return Math.max(...sorted.map((minute, index) => (sorted[index + 1] ?? sorted[0] + 10080) - minute)) / 60;
}

export function datasetStatus(record, schedules, now = Date.now()) {
  if (record?.kind === "assets") return { state: "not-applicable", label: "No dataset timestamp (asset workflow)" };
  if (!Array.isArray(record?.datasets) || !record.datasets.length || record.datasets.some(dataset => !dataset || typeof dataset.generatedAt !== "string" || !Number.isFinite(Date.parse(dataset.generatedAt)))) return { state: "unknown", label: "Dataset freshness unavailable" };
  const stamps = record.datasets.map(dataset => Date.parse(dataset.generatedAt));
  if (stamps.some(stamp => stamp > now + 300000)) return { state: "unknown", label: "Dataset timestamp is in the future; verify clocks" };
  const oldest = Math.min(...stamps), interval = cadenceHours(schedules);
  if (interval === null) return { state: "unknown", label: "Freshness target not derived for this schedule", oldest };
  const targetHours = interval + Math.min(12, Math.max(1, interval / 2));
  const ageHours = Math.max(0, (now - oldest) / 3600000);
  return { state: ageHours > targetHours ? "stale" : "fresh", label: ageHours > targetHours ? "Data older than expected" : "Data within freshness target", oldest, ageHours, targetHours };
}

export function workflowRuns(workflow, runs) {
  const matching = runs.filter(run => {
    if (typeof run.path === "string") return run.path.split("/").at(-1).split("@")[0] === workflow.file;
    return run.name === workflow.name;
  }).sort((a, b) => Date.parse(b.run_started_at || b.created_at) - Date.parse(a.run_started_at || a.created_at));
  return { latest: matching[0] || null, success: matching.find(run => run.status === "completed" && run.conclusion === "success") || null };
}

function statusRuntime({ datasetStatus, workflowRuns }) {
  const REPO = "Benoit-Gaumard/Benoit-Gaumard.github.io";
  const WORKFLOWS = JSON.parse(document.getElementById("workflow-catalog").textContent);
  const VIEW_KEY = "workflows-view-mode";
  const state = { loading: false, results: [], view: "cards", anomalyFirst: true, zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" };
  const el = Object.fromEntries(["workflowCards", "refreshButton", "lastChecked", "workflowStatus", "workflowError", "anomalyFirst", "scheduleTimezone", "scheduleZone"].map(id => [id, document.getElementById(id)]));
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function date(iso) { const value = new Date(iso); return typeof iso !== "string" || Number.isNaN(value.getTime()) ? "Not recorded" : value.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"; }
  function runStatus(run, error) {
    if (error) return { label: "Run status unavailable", tone: "unknown" };
    if (!run) return { label: "No run in retrieved window", tone: "unknown" };
    if (run.status !== "completed") return { label: run.status === "in_progress" ? "In progress" : run.status || "Not reported", tone: "progress" };
    const labels = { success: "Success", failure: "Failure", timed_out: "Timed out", action_required: "Action required", cancelled: "Cancelled", skipped: "Skipped" };
    return { label: labels[run.conclusion] || "Conclusion not recorded", tone: run.conclusion === "success" ? "success" : ["failure", "timed_out", "action_required"].includes(run.conclusion) ? "failure" : "unknown" };
  }
  function rank(result) {
    if (result.technical.tone === "failure") return 0;
    if (result.freshness.state === "stale") return 1;
    if (result.technical.tone === "unknown") return 2;
    if (result.freshness.state === "unknown") return 3;
    if (result.technical.tone === "progress") return 4;
    return 5;
  }
  function render() {
    el.workflowCards.replaceChildren();
    el.workflowCards.classList.toggle("list-view", state.view === "list");
    const results = [...state.results].sort((a, b) => (state.anomalyFirst ? rank(a) - rank(b) : 0) || a.workflow.name.localeCompare(b.workflow.name));
    results.forEach(result => {
      const { workflow, latest, success, technical, freshness, metadata, apiError } = result;
      const card = node("article", undefined, "workflow-card");
      card.id = "workflow-" + workflow.file.replace(/\.[^.]+$/, "");
      card.dataset.workflowFile = workflow.file;
      const heading = node("div", undefined, "workflow-card-header");
      heading.append(node("h2", workflow.name), node("span", "Last run: " + technical.label, "status-pill is-" + technical.tone));
      card.append(heading);
      const freshnessLabel = technical.tone === "success" && freshness.state === "stale" ? "Succeeded, but the published data is old" : freshness.label;
      card.append(node("p", freshnessLabel, "workflow-freshness is-" + freshness.state),
        node("p", `Last successful run in retrieved window: ${success ? date(success.updated_at || success.run_started_at) : "Not found / unavailable"}`, "workflow-summary"));
      if (freshness.oldest) card.append(node("p", `Oldest required dataset snapshot: ${date(new Date(freshness.oldest).toISOString())}`, "workflow-summary"));
      if (freshness.targetHours) card.append(node("p", `Freshness target: ${freshness.targetHours} hours (schedule gap plus grace). This is an alert threshold, not an SLA.`, "workflow-summary"));
      if (apiError) card.append(node("p", `GitHub run details could not be retrieved: ${apiError}. A quota or network/access restriction is not evidence that the workflow failed.`, "workflow-note"));
      const details = node("details", undefined, "workflow-run-details");
      details.append(node("summary", "Run, schedule and dataset details"));
      const schedule = node("div");
      schedule.innerHTML = renderSchedule(workflow, state.zone);
      details.append(schedule);
      if (latest) {
        const duration = Date.parse(latest.updated_at) - Date.parse(latest.run_started_at);
        const meta = node("dl", undefined, "workflow-data-meta");
        [["Run", "#" + latest.run_number], ["Branch", latest.head_branch || "Not recorded"], ["Started", date(latest.run_started_at)], ["Duration", latest.status === "completed" && Number.isFinite(duration) && duration >= 0 ? Math.round(duration / 1000) + " seconds" : "Not completed / unavailable"]].forEach(([label, value]) => meta.append(node("dt", label), node("dd", value)));
        details.append(meta);
      }
      const datasets = node("ul", undefined, "workflow-datasets");
      if (metadata?.datasets?.length) metadata.datasets.forEach(dataset => {
        const item = node("li");
        item.append(node("code", dataset.path), node("span", " — " + (dataset.generatedAt ? date(dataset.generatedAt) : dataset.error || "Timestamp not recorded")));
        datasets.append(item);
      });
      else datasets.append(node("li", metadata?.note || "No published dataset timestamp mapping is available."));
      details.append(datasets);
      card.append(details);
      const workflowUrl = `https://github.com/${REPO}/actions/workflows/${encodeURIComponent(workflow.file)}`;
      const link = node("a", latest ? "View latest run on GitHub" : "View workflow on GitHub", "workflow-link");
      let target = null;
      try { if (latest?.html_url) target = new URL(latest.html_url); }
      catch (error) { console.warn("Run link unavailable; the workflow link remains accessible.", error); }
      link.href = target && target.protocol === "https:" && target.hostname === "github.com" ? target.href : workflowUrl;
      if (link.href === workflowUrl) link.textContent = "View workflow on GitHub";
      link.target = "_blank"; link.rel = "noopener noreferrer";
      card.append(link); el.workflowCards.append(card);
    });
    el.scheduleTimezone.textContent = state.zone;
  }
  async function refresh() {
    if (state.loading) return;
    const fromButton = document.activeElement === el.refreshButton;
    state.loading = true;
    el.refreshButton.disabled = true;
    el.refreshButton.textContent = "Checking statuses…";
    el.workflowError.hidden = true;
    el.workflowStatus.textContent = "Loading GitHub run statuses and published dataset timestamps. This does not start a workflow.";
    if (!state.results.length) {
      el.workflowCards.replaceChildren();
      WORKFLOWS.forEach(workflow => {
        const card = node("article", undefined, "workflow-card");
        card.append(node("h2", workflow.name), node("p", "Checking…", "workflow-summary"));
        el.workflowCards.append(card);
      });
    }
    const [runResult, dataResult] = await Promise.allSettled([
      SiteUX.fetchJSON(`https://api.github.com/repos/${REPO}/actions/runs?per_page=100&branch=main`, 15000),
      SiteUX.fetchJSON("./data-freshness.json", 15000),
    ]);
    let runs = [], metadata = null, apiError = "";
    if (runResult.status === "fulfilled" && Array.isArray(runResult.value.workflow_runs) && runResult.value.workflow_runs.every(run => run && typeof run.status === "string" && (typeof run.path === "string" || typeof run.name === "string"))) runs = runResult.value.workflow_runs;
    else {
      apiError = runResult.status === "rejected" ? runResult.reason.message : "Unexpected GitHub response";
      console.warn("Workflow status lookup unavailable.", apiError);
    }
    if (dataResult.status === "fulfilled" && dataResult.value?.workflows) metadata = dataResult.value.workflows;
    else console.warn("Published freshness metadata unavailable.", dataResult.status === "rejected" ? dataResult.reason : "Unexpected metadata format");
    const now = Date.now();
    state.results = WORKFLOWS.map(workflow => {
      const found = workflowRuns(workflow, runs);
      return { workflow, ...found, technical: runStatus(found.latest, apiError), apiError,
        metadata: metadata?.[workflow.file], freshness: datasetStatus(metadata?.[workflow.file], workflow.schedules, now) };
    });
    render();
    el.lastChecked.textContent = date(new Date(now).toISOString());
    const missing = state.results.filter(result => result.technical.tone === "unknown").length;
    const old = state.results.filter(result => result.freshness.state === "stale").length;
    el.workflowStatus.textContent = `Lookup completed for ${WORKFLOWS.length} workflows: ${missing} run statuses unavailable or absent from the latest 100 main-branch runs; ${old} published datasets older than the configured freshness target.`;
    if (apiError || !metadata) {
      el.workflowError.hidden = false;
      el.workflowError.textContent = `${apiError ? "GitHub run lookup is unavailable. " : ""}${!metadata ? "Published dataset metadata is unavailable. " : ""}Use Refresh statuses to retry. Available schedule and snapshot information remains visible.`;
    }
    state.loading = false;
    el.refreshButton.disabled = false;
    el.refreshButton.textContent = apiError ? "Retry status lookup" : "Refresh statuses";
    if (fromButton) el.refreshButton.focus({ preventScroll: true });
  }
  try { state.view = localStorage.getItem(VIEW_KEY) === "list" ? "list" : "cards"; }
  catch (error) { console.warn("Workflow view preference unavailable.", error); }
  document.querySelectorAll("[data-view]").forEach(control => {
    control.setAttribute("aria-pressed", String(control.dataset.view === state.view));
    control.addEventListener("click", () => {
      state.view = control.dataset.view;
      document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button === control)));
      try { localStorage.setItem(VIEW_KEY, state.view); } catch (error) { console.warn("Workflow view could not be saved.", error); SiteUX.notice("View changed for this page only."); }
      render();
    });
  });
  [...new Set([state.zone, "Europe/Paris", "UTC"])].forEach(zone => el.scheduleZone.add(new Option(zone, zone)));
  el.scheduleZone.value = state.zone;
  el.scheduleZone.addEventListener("change", () => { state.zone = el.scheduleZone.value; render(); });
  el.anomalyFirst.addEventListener("change", () => { state.anomalyFirst = el.anomalyFirst.checked; render(); });
  el.refreshButton.addEventListener("click", refresh);
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  const back = document.getElementById("backToTop");
  window.addEventListener("scroll", () => back.classList.toggle("visible", scrollY > 600), { passive: true });
  back.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  refresh();
}

export function upgradeWorkflowStatus(source) {
  let html = source.replace(/\r+\n/g, "\n");
  html = html.replace('Last refreshed: <strong id="lastChecked">', 'Status lookup completed: <strong id="lastChecked">');
  html = html.replace(/<p class="intro-text">[\s\S]*?<\/p>/, '<p class="intro-text">Check scheduled GitHub Actions runs separately from the age of published data. Refresh only reads statuses and timestamp metadata; it does not run collectors or update datasets.</p>');
  if (!html.includes('id="workflowStatus"')) html = html.replace('<div class="workflow-cards" id="workflowCards">', '<div class="workflow-controls"><label><input id="anomalyFirst" type="checkbox" checked> Anomalies first</label><label for="scheduleZone">Schedule timezone</label><select id="scheduleZone"></select></div><p id="workflowStatus" role="status" aria-live="polite"></p><p id="workflowError" role="alert" hidden></p><div class="workflow-cards" id="workflowCards">');
  const script = `<script data-workflow-status>(()=>{\n${[cadenceHours, datasetStatus, workflowRuns].map(fn => fn.toString()).join("\n")}\n(${statusRuntime.toString()})({datasetStatus,workflowRuns});\n})();</script>`;
  if (html.includes("<script data-workflow-status>")) html = html.replace(/<script data-workflow-status>[\s\S]*?<\/script>/, () => script);
  else {
    const token = html.indexOf('    const VIEW_STORAGE_KEY = "workflows-view-mode"'), start = html.lastIndexOf("<script>", token), end = html.indexOf("</script>", token);
    if (token < 0 || start < 0 || end < start) throw new Error("Workflow status script guard");
    html = html.slice(0, start) + script + html.slice(end + 9);
  }
  const css = `
    .workflow-controls{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem 1rem;margin:1rem 0;font-size:.85rem;}
    .workflow-controls label{display:inline-flex;align-items:center;gap:.5rem;min-height:2.75rem;}
    .workflow-controls select{min-height:2.75rem;max-width:100%;padding:.5rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);}
    #refreshButton,.view-toggle-button,.workflow-link{min-height:2.75rem;}
    #workflowStatus,#workflowError,.workflow-summary{color:var(--cp-text-muted);font-size:.85rem;line-height:1.5;}
    #workflowError{padding:1rem;border:1px solid var(--cp-danger);border-radius:8px;color:var(--cp-danger);}
    .workflow-freshness{font-size:.95rem;font-weight:650;line-height:1.5;}
    .workflow-freshness.is-stale{color:var(--cp-warning);}
    .workflow-run-details>summary{min-height:2.75rem;padding-block:.65rem;cursor:pointer;color:var(--cp-link);font-size:.85rem;}
    .workflow-data-meta{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.35rem .75rem;font-size:.85rem;}
    .workflow-data-meta dt{font-weight:600;}.workflow-data-meta dd{margin:0;overflow-wrap:anywhere;}
    .workflow-datasets{padding-left:1rem;font-size:.8rem;line-height:1.5;}.workflow-datasets li{margin-bottom:.5rem;overflow-wrap:anywhere;}
    .workflow-card h2{overflow-wrap:anywhere;}.workflow-cards.list-view .workflow-card{display:block;}
    @media(max-width:48rem){.workflow-cards.list-view .workflow-card{display:block;}.workflow-data-meta{grid-template-columns:minmax(0,1fr);}}
  `;
  html = html.replace(/<style data-workflow-status>[\s\S]*?<\/style>\n?/g, "").replace("</head>", `<style data-workflow-status>${css}</style>\n</head>`);
  return enhancePage(html.replace(/\n/g, "\r\n"), { path: "/workflows/" });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = join(process.cwd(), "workflows", "index.html");
  await writeFile(file, upgradeWorkflowStatus(await readFile(file, "utf8")));
  console.log("Workflow status and data freshness are separated.");
}
