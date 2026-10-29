// Builds azure-policies/policy-stats.json from the weekly catalogue snapshots and injects the
// statistics section (cards, over-time chart, category and effect breakdowns) into the
// policies-history and initiatives-history pages. Idempotent: rerunning changes nothing.
// Usage: node azure-policies/policy-stats.mjs [--check]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const LIFECYCLE_PREFIX = /^\s*\[([^\]]+)\]/;
const LIFECYCLE_SUFFIX = /-(preview|deprecated)\b/i;
export function lifecycleTag(row) {
  const prefix = LIFECYCLE_PREFIX.exec(row.displayName || "")?.[1].trim().toLowerCase();
  if (prefix === "preview" || prefix === "deprecated") return prefix;
  return LIFECYCLE_SUFFIX.exec(row.version || "")?.[1].toLowerCase() || "";
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[key] || "").trim() || "Not specified";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function summarize(rows) {
  const tags = rows.map(lifecycleTag);
  return {
    total: rows.length,
    deprecated: tags.filter(tag => tag === "deprecated").length,
    preview: tags.filter(tag => tag === "preview").length,
  };
}

function seriesFor(directory, prefix, listKey, current) {
  const snapshots = existsSync(directory)
    ? readdirSync(directory)
      .map(file => new RegExp(`^${prefix}-(\\d{4}-\\d{2}-\\d{2})\\.json$`).exec(file))
      .filter(Boolean)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([file, date]) => ({ date, ...summarize(JSON.parse(readFileSync(join(directory, file), "utf8"))[listKey] || []) }))
    : [];
  const currentDate = String(current.generatedAt || "").slice(0, 10);
  const currentPoint = { date: currentDate, ...summarize(current[listKey] || []) };
  if (/^\d{4}-\d{2}-\d{2}$/.test(currentDate)) {
    const last = snapshots.at(-1);
    if (!last || last.date < currentDate) snapshots.push(currentPoint);
    else if (last.date === currentDate) snapshots[snapshots.length - 1] = currentPoint;
  }
  return snapshots;
}

export function buildStats(root = here) {
  const policies = JSON.parse(readFileSync(join(root, "policydefinitions.json"), "utf8"));
  const initiatives = JSON.parse(readFileSync(join(root, "policysetdefinitions.json"), "utf8"));
  const history = join(root, "history");
  const generatedAt = [policies.generatedAt, initiatives.generatedAt].filter(Boolean).sort().at(-1) || null;
  return {
    generatedAt,
    source: "Weekly snapshots in azure-policies/history plus the current catalogue (policydefinitions.json, policysetdefinitions.json).",
    policies: {
      asOf: policies.generatedAt || null,
      ...summarize(policies.policies || []),
      byCategory: countBy(policies.policies || [], "category"),
      byEffect: countBy(policies.policies || [], "effect"),
      snapshots: seriesFor(history, "policydefinitions", "policies", policies),
    },
    initiatives: {
      asOf: initiatives.generatedAt || null,
      ...summarize(initiatives.initiatives || []),
      byCategory: countBy(initiatives.initiatives || [], "category"),
      snapshots: seriesFor(history, "policysetdefinitions", "initiatives", initiatives),
    },
  };
}

function statsRuntime(config) {
  const $ = id => document.getElementById(id);
  const root = $("policyStats");
  if (!root) return;
  const number = value => Number(value).toLocaleString("en-US");
  const monthLabel = key => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const dayLabel = iso => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const svgNode = (tag, attrs, text) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const state = { period: "month", data: null };

  function periods(snapshots) {
    const groups = new Map();
    snapshots.forEach(point => groups.set(state.period === "month" ? point.date.slice(0, 7) : point.date.slice(0, 4), point));
    let previous = null;
    return [...groups].map(([key, point]) => {
      const row = { key, label: state.period === "month" ? monthLabel(key) : key, ...point, change: previous ? point.total - previous.total : null };
      previous = point;
      return row;
    });
  }

  function niceStep(span) {
    const raw = span / 4, power = 10 ** Math.floor(Math.log10(raw || 1));
    return [1, 2, 2.5, 5, 10].map(step => step * power).find(step => step >= raw) || power * 10;
  }

  function drawChart(rows) {
    const host = $("statsChart");
    host.replaceChildren();
    if (!rows.length) { host.append(Object.assign(document.createElement("p"), { className: "stats-help", textContent: "No snapshot is available yet." })); return; }
    const width = Math.max(280, host.clientWidth || 640), height = width < 480 ? 220 : 260;
    const pad = { top: 28, right: 20, bottom: 36, left: width < 480 ? 44 : 56 };
    const values = rows.map(row => row.total);
    let min = Math.min(...values), max = Math.max(...values);
    const margin = Math.max(5, Math.round((max - min) * 0.25));
    const step = niceStep(max - min + margin * 2);
    min = Math.floor((min - margin) / step) * step; max = Math.ceil((max + margin) / step) * step;
    if (min < 0) min = 0;
    const x = index => rows.length === 1 ? pad.left + (width - pad.left - pad.right) / 2 : pad.left + index * (width - pad.left - pad.right) / (rows.length - 1);
    const y = value => pad.top + (max - value) * (height - pad.top - pad.bottom) / (max - min || 1);
    const first = rows[0], last = rows.at(-1);
    const svg = svgNode("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": "statsChartTitle statsChartDesc", class: "stats-svg" });
    svg.append(svgNode("title", { id: "statsChartTitle" }, $("chartTitle").textContent));
    svg.append(svgNode("desc", { id: "statsChartDesc" }, rows.length === 1
      ? `${number(first.total)} ${config.noun} in ${first.label}.`
      : `${number(first.total)} ${config.noun} in ${first.label}, ${number(last.total)} in ${last.label}.`));
    for (let tick = min; tick <= max; tick += step) {
      svg.append(svgNode("line", { x1: pad.left, x2: width - pad.right, y1: y(tick), y2: y(tick), class: "stats-grid-line" }));
      svg.append(svgNode("text", { x: pad.left - 8, y: y(tick) + 4, "text-anchor": "end", class: "stats-axis" }, number(tick)));
    }
    const points = rows.map((row, index) => [x(index), y(row.total)]);
    if (points.length > 1) {
      const line = points.map(([px, py], index) => `${index ? "L" : "M"}${px},${py}`).join(" ");
      svg.append(svgNode("path", { d: `${line} L${points.at(-1)[0]},${y(min)} L${points[0][0]},${y(min)} Z`, class: "stats-area" }));
      svg.append(svgNode("path", { d: line, class: "stats-line" }));
    }
    const labelEvery = Math.max(1, Math.ceil(rows.length / Math.floor((width - pad.left - pad.right) / 70)));
    rows.forEach((row, index) => {
      const [px, py] = points[index];
      const point = svgNode("circle", { cx: px, cy: py, r: 4.5, class: "stats-point" });
      point.append(svgNode("title", {}, `${row.label}: ${number(row.total)} ${config.noun}${row.change === null ? "" : ` (${row.change >= 0 ? "+" : ""}${number(row.change)})`}`));
      svg.append(point);
      if (index % labelEvery === 0 || index === rows.length - 1) {
        const edge = rows.length > 1 && index === 0 ? ["start", -6] : rows.length > 1 && index === rows.length - 1 ? ["end", 6] : ["middle", 0];
        svg.append(svgNode("text", { x: px + edge[1], y: py - 12, "text-anchor": edge[0], class: "stats-value-label" }, number(row.total)));
        svg.append(svgNode("text", { x: px + edge[1], y: height - pad.bottom + 22, "text-anchor": edge[0], class: "stats-axis" }, row.label));
      }
    });
    host.append(svg);
  }

  function drawTable(rows) {
    const body = $("statsTableBody");
    body.replaceChildren(...rows.map(row => {
      const tr = document.createElement("tr");
      [row.label, number(row.total), number(row.deprecated), row.change === null ? "—" : `${row.change >= 0 ? "+" : ""}${number(row.change)}`, dayLabel(row.date)]
        .forEach((value, index) => { const cell = document.createElement(index ? "td" : "th"); if (!index) cell.scope = "row"; cell.textContent = value; tr.append(cell); });
      return tr;
    }));
  }

  function bars(listId, entries, limit) {
    const list = $(listId);
    if (!list) return;
    const max = entries[0]?.[1] || 1;
    list.replaceChildren(...entries.map(([label, count], index) => {
      const item = document.createElement("li");
      if (limit && index >= limit) item.hidden = true;
      const name = Object.assign(document.createElement("span"), { className: "bar-label", textContent: label });
      const track = Object.assign(document.createElement("span"), { className: "bar-track" });
      const fill = Object.assign(document.createElement("span"), { className: "bar-fill" });
      fill.style.width = `${Math.max(1, (count / max) * 100)}%`;
      track.append(fill);
      const value = Object.assign(document.createElement("span"), { className: "bar-value", textContent: number(count) });
      item.append(name, track, value);
      return item;
    }));
  }

  function renderChart() {
    const rows = periods(state.data.snapshots);
    $("chartTitle").textContent = `${config.title} Over Time by ${state.period === "month" ? "Month" : "Year"}`;
    root.querySelectorAll("[data-stats-period]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.statsPeriod === state.period)));
    drawChart(rows);
    drawTable(rows);
  }

  function render(stats) {
    const data = state.data = stats[config.kind];
    const first = data.snapshots[0];
    $("statTotal").textContent = number(data.total);
    $("statTotalNote").textContent = first && first.date < String(data.asOf || "").slice(0, 10)
      ? `${data.total - first.total >= 0 ? "+" : ""}${number(data.total - first.total)} since ${dayLabel(first.date)}`
      : "Current built-in catalogue";
    $("statDeprecated").textContent = number(data.deprecated);
    $("statDeprecatedNote").textContent = `${data.total ? ((data.deprecated / data.total) * 100).toFixed(1) : "0"}% of the catalogue`;
    $("statsSource").textContent = `Catalogue scanned ${data.asOf ? dayLabel(data.asOf) : "on an unrecorded date"} (UTC). Azure does not publish creation dates, so the trend is built from weekly catalogue snapshots${first ? ` since ${dayLabel(first.date)}` : ""}: each period shows its last snapshot.`;
    bars("byCategory", data.byCategory || [], 10);
    bars("byEffect", data.byEffect || []);
    const more = $("categoryMore");
    if (more) {
      const total = (data.byCategory || []).length;
      more.hidden = total <= 10;
      more.textContent = `Show all ${number(total)} categories`;
      more.setAttribute("aria-expanded", "false");
    }
    renderChart();
    root.setAttribute("aria-busy", "false");
  }

  root.querySelectorAll("[data-stats-period]").forEach(button => button.addEventListener("click", () => {
    state.period = button.dataset.statsPeriod;
    if (state.data) renderChart();
  }));
  $("categoryMore")?.addEventListener("click", event => {
    const button = event.currentTarget, expanded = button.getAttribute("aria-expanded") === "true";
    [...$("byCategory").children].forEach((item, index) => { item.hidden = expanded && index >= 10; });
    button.setAttribute("aria-expanded", String(!expanded));
    button.textContent = expanded ? `Show all ${number($("byCategory").children.length)} categories` : "Show top 10 only";
  });
  let width = 0;
  new ResizeObserver(entries => {
    const next = Math.round(entries[0].contentRect.width);
    if (state.data && Math.abs(next - width) > 8) { width = next; renderChart(); }
  }).observe($("statsChart"));

  fetch("../policy-stats.json", { cache: "no-cache" })
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(render)
    .catch(error => {
      console.warn("Catalogue statistics unavailable.", error);
      root.setAttribute("aria-busy", "false");
      $("statsSource").textContent = "Catalogue statistics could not be loaded. The change log below is unaffected.";
    });
}

const PAGES = {
  policies: { file: "policies-history/index.html", kind: "policies", title: "Policies", noun: "policies", singular: "Policies" },
  initiatives: { file: "initiatives-history/index.html", kind: "initiatives", title: "Initiatives", noun: "initiatives", singular: "Initiatives" },
};

function section(page) {
  const breakdowns = page.kind === "policies" ? `
        <div class="stats-split">
          <article class="stats-panel">
            <h3>Policies by Category</h3>
            <ol class="bar-list" id="byCategory"></ol>
            <button class="history-action stats-more" id="categoryMore" type="button" aria-controls="byCategory" aria-expanded="false" hidden>Show all categories</button>
          </article>
          <article class="stats-panel">
            <h3>Policies by Effect</h3>
            <ol class="bar-list" id="byEffect"></ol>
          </article>
        </div>` : "";
  return `<!-- policy-stats:start -->
    <section class="policy-stats" id="policyStats" aria-labelledby="statsHeading" aria-busy="true">
      <h2 id="statsHeading">${page.title} at a glance</h2>
      <p class="stats-help" id="statsSource">Loading catalogue statistics&hellip;</p>
      <div class="stats-cards">
        <article class="stat-card">
          <h3>Total ${page.title}</h3>
          <p class="stat-value" id="statTotal">&ndash;</p>
          <p class="stat-note" id="statTotalNote"></p>
        </article>
        <article class="stat-card">
          <h3>Deprecated ${page.title}</h3>
          <p class="stat-value is-deprecated" id="statDeprecated">&ndash;</p>
          <p class="stat-note" id="statDeprecatedNote"></p>
        </article>
      </div>
      <article class="stats-panel">
        <div class="stats-panel-head">
          <h3 id="chartTitle">${page.title} Over Time by Month</h3>
          <div class="stats-toggle" role="group" aria-label="Group the chart by">
            <button type="button" data-stats-period="month" aria-pressed="true">Month</button>
            <button type="button" data-stats-period="year" aria-pressed="false">Year</button>
          </div>
        </div>
        <div class="stats-chart" id="statsChart"></div>
        <details class="stats-data">
          <summary>Show chart data</summary>
          <div class="stats-table-wrap">
            <table>
              <thead><tr><th scope="col">Period</th><th scope="col">Total</th><th scope="col">Deprecated</th><th scope="col">Net change</th><th scope="col">Snapshot</th></tr></thead>
              <tbody id="statsTableBody"></tbody>
            </table>
          </div>
        </details>
      </article>${breakdowns}
    </section>
    <!-- policy-stats:end -->`;
}

const CSS = `
    .policy-stats{display:grid;gap:1rem;margin:0 0 2rem;}
    .policy-stats h2{margin:0;font-size:1.35rem;}
    .policy-stats h3{margin:0;font-size:1rem;}
    .stats-help{margin:0;color:var(--cp-text-muted);font-size:.85rem;line-height:1.5;max-width:52rem;}
    .stats-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem;}
    .stat-card,.stats-panel{min-width:0;padding:1.25rem;background:var(--cp-panel-strong);border:1px solid var(--cp-border);border-radius:12px;box-shadow:var(--cp-shadow);}
    .stat-card h3{color:var(--cp-text-muted);font-size:.85rem;font-weight:600;}
    .stat-value{margin:.35rem 0 .15rem;font-size:2.25rem;font-weight:750;line-height:1.1;font-variant-numeric:tabular-nums;color:var(--cp-text);}
    .stat-value.is-deprecated{color:var(--cp-warning);}
    .stat-note{margin:0;color:var(--cp-text-muted);font-size:.85rem;}
    .stats-panel{display:grid;gap:.85rem;align-content:start;}
    .stats-panel-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.75rem;}
    .stats-toggle{display:inline-flex;gap:.25rem;padding:.25rem;border:1px solid var(--cp-border);border-radius:10px;background:var(--cp-surface);}
    .stats-toggle button{min-height:2.75rem;min-width:4.5rem;padding:.4rem .9rem;border:0;border-radius:7px;background:transparent;color:var(--cp-text-muted);font:inherit;font-size:.85rem;font-weight:600;cursor:pointer;}
    .stats-toggle button:hover{color:var(--cp-text);}
    .stats-toggle button[aria-pressed="true"]{background:var(--cp-accent-soft);color:var(--cp-accent);}
    .stats-toggle button:focus-visible,.stats-more:focus-visible,.stats-data summary:focus-visible{outline:3px solid var(--cp-accent);outline-offset:2px;}
    .stats-chart{min-height:13.75rem;}
    .stats-svg{display:block;max-width:100%;overflow:visible;}
    .stats-grid-line{stroke:var(--cp-border);stroke-width:1;}
    .stats-axis{fill:var(--cp-text-muted);font-size:.75rem;}
    .stats-value-label{fill:var(--cp-text);font-size:.8rem;font-weight:700;}
    .stats-line{fill:none;stroke:var(--cp-accent);stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;}
    .stats-area{fill:var(--cp-accent-soft);stroke:none;}
    .stats-point{fill:var(--cp-surface);stroke:var(--cp-accent);stroke-width:2.5;}
    .stats-data summary{min-height:2.75rem;display:flex;align-items:center;cursor:pointer;color:var(--cp-link);font-size:.85rem;}
    .stats-table-wrap{overflow-x:auto;}
    .stats-data table{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums;}
    .stats-data th,.stats-data td{padding:.45rem .6rem;border-bottom:1px solid var(--cp-border);text-align:right;white-space:nowrap;}
    .stats-data th:first-child{text-align:left;}
    .stats-data thead th{color:var(--cp-text-muted);font-weight:600;}
    .stats-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr));gap:1rem;align-items:start;}
    .bar-list{display:grid;gap:.5rem;margin:0;padding:0;list-style:none;}
    .bar-list li{display:grid;grid-template-columns:minmax(0,11rem) minmax(3rem,1fr) 3.5rem;align-items:center;gap:.75rem;font-size:.85rem;}
    .bar-list li[hidden]{display:none;}
    .bar-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .bar-track{height:.6rem;border-radius:999px;background:var(--cp-surface-soft);overflow:hidden;}
    .bar-fill{display:block;height:100%;border-radius:inherit;background:var(--cp-accent);}
    .bar-value{text-align:right;font-weight:650;font-variant-numeric:tabular-nums;}
    .stats-more{justify-self:start;}
    @media(max-width:30rem){.bar-list li{grid-template-columns:minmax(0,1fr) 3rem;row-gap:.25rem;}.bar-track{grid-column:1/-1;grid-row:2;}.stat-value{font-size:1.9rem;}}
`;

export function injectStats(source, pageKey) {
  const page = PAGES[pageKey];
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  let html = source.replace(/\r\n/g, "\n");
  const markup = section(page);
  if (html.includes("<!-- policy-stats:start -->")) html = html.replace(/<!-- policy-stats:start -->[\s\S]*?<!-- policy-stats:end -->/, () => markup);
  else {
    const anchor = html.indexOf('<section class="history-log"');
    if (anchor < 0) throw new Error(`${page.file}: history log section not found.`);
    html = `${html.slice(0, anchor)}${markup}\n\n    ${html.slice(anchor)}`;
  }
  html = html.replace(/<style data-policy-stats>[\s\S]*?<\/style>\n?/g, "").replace("</head>", `<style data-policy-stats>${CSS}</style>\n</head>`);
  const config = { kind: page.kind, title: page.title, noun: page.noun };
  const script = `<script data-policy-stats>(${statsRuntime.toString().replace(/\r\n/g, "\n")})(${JSON.stringify(config)});</script>`;
  html = html.replace(/<script data-policy-stats>[\s\S]*?<\/script>\n?/g, "").replace("</body>", `${script}\n</body>`);
  return html.replace(/\n/g, eol);
}

export function renderStatsJson(stats) {
  return `${JSON.stringify(stats, null, 2)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  const outputs = [[join(here, "policy-stats.json"), renderStatsJson(buildStats())]];
  for (const key of Object.keys(PAGES)) {
    const file = join(here, PAGES[key].file);
    outputs.push([file, injectStats(readFileSync(file, "utf8"), key)]);
  }
  const stale = outputs.filter(([file, content]) => !existsSync(file) || readFileSync(file, "utf8") !== content);
  if (check) {
    if (stale.length) { console.error(`Out of date: ${stale.map(([file]) => file).join(", ")}`); process.exit(1); }
    console.log("Azure Policy statistics are up to date.");
  } else {
    stale.forEach(([file, content]) => writeFileSync(file, content, "utf8"));
    console.log(`Azure Policy statistics written (${stale.length} file(s) changed).`);
  }
}
