import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { enhancePage } from "../../site-ui.mjs";

export function parseIPv4(value) {
  if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  if (parts.some(part => part > 255)) return null;
  return parts.reduce((number, part) => (number << 8n) | BigInt(part), 0n);
}

export function parseAddress(input) {
  let value = String(input).trim();
  if (!value.includes(":")) {
    const number = parseIPv4(value);
    return number === null ? null : { version: 4, number, bits: 32 };
  }
  if (/[/%\[\]\s]/.test(value)) return null;
  if (value.includes(".")) {
    const last = value.lastIndexOf(":");
    const ipv4 = parseIPv4(value.slice(last + 1));
    if (ipv4 === null) return null;
    value = value.slice(0, last + 1) + (ipv4 >> 16n).toString(16) + ":" + (ipv4 & 65535n).toString(16);
  }
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if ([...left, ...right].some(part => !/^[0-9a-f]{1,4}$/i.test(part))) return null;
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = halves.length === 1 ? left : [...left, ...Array(missing).fill("0"), ...right];
  return { version: 6, bits: 128, number: groups.reduce((number, part) => (number << 16n) | BigInt(parseInt(part, 16)), 0n) };
}

export function parseRange(value) {
  const parts = value.split("/");
  if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
  const address = parseAddress(parts[0]), length = Number(parts[1]);
  if (!address || length < 0 || length > address.bits) return null;
  const full = (1n << BigInt(address.bits)) - 1n;
  const mask = length === 0 ? 0n : full ^ ((1n << BigInt(address.bits - length)) - 1n);
  return { version: address.version, length, mask, network: address.number & mask };
}

export function contains(address, range) {
  return address.version === range.version && (address.number & range.mask) === range.network;
}

export function sourceFilenameDate(filename) {
  if (typeof filename !== "string") return null;
  const match = /_(\d{4})(\d{2})(\d{2})\.json$/.exec(filename);
  if (!match) return null;
  const value = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function snapshotCollectionDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const stamp = Date.parse(value);
  return Number.isFinite(stamp) ? new Date(stamp).toISOString().slice(0, 10) : null;
}

export function snapshotCounts(groups, cache) {
  let ipv4 = 0, ipv6 = 0;
  for (const group of groups) {
    for (const prefix of group.prefixes) {
      const version = cache.get(prefix)?.version;
      if (version === 4) ipv4++;
      else if (version === 6) ipv6++;
      else throw new Error(`Missing parsed prefix: ${prefix}`);
    }
  }
  return { groups: groups.length, entries: ipv4 + ipv6, ipv4, ipv6, uniquePrefixes: cache.size };
}

function ipBrowser(config, { parseAddress, parseRange, contains, sourceFilenameDate, snapshotCollectionDate, snapshotCounts }) {
  const PAGE = 100, GROUP_PAGE = 12, MATCH_PAGE = 20;
  const azure = config.kind === "azure";
  const el = Object.fromEntries(["refreshedAt", "lookupFields", "browseFields", "lookupInput", "lookupButton", "lookupHeading", "lookupHint", "matchList", "moreMatches", "groupQuery", "groupResults", "groupCount", "moreGroups", "categorySelect", "selectionTitle", "selectionMeta", "prefixFilter", "prefixCount", "prefixList", "morePrefixes", "copyPrefixes", "exportPrefixes", "snapshotDetails", "dataError", "retry", "exampleV4", "exampleV6", "statsGrid", "statsSummary", "uniquePrefixes"].map(id => [id, document.getElementById(id)]));
  const state = { status: "loading", groups: [], selected: "", groupLimit: GROUP_PAGE, prefixLimit: PAGE, matchLimit: MATCH_PAGE, matches: [], cache: new Map(), filteredPrefixes: [], lookupVersion: 0, summary: null };
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function button(text, handler) { const element = node("button", text, "ip-action"); element.type = "button"; element.addEventListener("click", handler); return element; }
  function date(value) { const parsed = new Date(value); return typeof value === "string" && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "Not recorded"; }
  function renderStats() {
    const summary = state.status === "ready" ? state.summary : null;
    el.statsGrid.querySelectorAll("[data-stat]").forEach(value => {
      const count = summary?.[value.dataset.stat];
      value.textContent = !summary ? "—" : typeof count === "number" ? count.toLocaleString("en-US") : count;
    });
    el.statsGrid.setAttribute("aria-busy", String(state.status === "loading" || state.status === "loading-request"));
    el.statsSummary.textContent = summary
      ? `Complete snapshot, independent of filters. Entries may repeat across ${azure ? "groups" : "categories"} and overlap; they are not unique IP addresses.`
      : state.status === "error" ? "Snapshot totals: unavailable." : "Snapshot totals: loading...";
    if (azure) {
      el.uniquePrefixes.textContent = summary ? `${summary.uniquePrefixes.toLocaleString("en-US")} unique prefix strings`
        : state.status === "error" ? "Distinct prefixes: unavailable." : "Distinct prefixes: loading...";
    } else {
      const flag = summary ? summary.passwordAuthFlag : state.status === "error" ? "Unavailable" : "Loading...";
      el.snapshotDetails.replaceChildren(node("dt", "Meta API password-auth verification flag"), node("dd", flag));
    }
  }
  function url() {
    SiteUX.updateURL(params => {
      ["ip", "tag", "category", "q", "prefix", "lookupInput", "tagSearch", "cidrSearch"].forEach(key => params.delete(key));
      if (el.lookupInput.value.trim()) params.set("ip", el.lookupInput.value.trim());
      if (state.selected) params.set(azure ? "tag" : "category", state.selected);
      if (el.groupQuery?.value) params.set("q", el.groupQuery.value);
      if (el.prefixFilter.value) params.set("prefix", el.prefixFilter.value);
    });
  }
  function selectGroup(id, focus = true) {
    state.selected = id;
    state.prefixLimit = PAGE;
    el.prefixFilter.value = "";
    renderGroups();
    renderPrefixes();
    url();
    if (focus) { el.selectionTitle.focus({ preventScroll: true }); el.selectionTitle.scrollIntoView({ block: "start", behavior: "instant" }); }
  }
  function renderGroups() {
    if (!azure) {
      el.categorySelect.value = state.selected;
      return;
    }
    const query = el.groupQuery.value.trim().toLowerCase();
    const matching = state.groups.filter(group => !query || group.id.toLowerCase().includes(query));
    const shown = matching.slice(0, state.groupLimit);
    el.groupResults.replaceChildren();
    shown.forEach(group => {
      const item = node("li");
      const choose = button(`${group.label} · ${group.prefixes.length.toLocaleString("en-US")} prefixes`, () => selectGroup(group.id));
      choose.dataset.groupId = group.id;
      choose.setAttribute("aria-pressed", String(group.id === state.selected));
      item.append(choose);
      el.groupResults.append(item);
    });
    el.groupCount.textContent = `${shown.length} of ${matching.length.toLocaleString("en-US")} matching service tags shown.`;
    el.moreGroups.hidden = shown.length >= matching.length;
    el.moreGroups.textContent = `Show ${Math.min(GROUP_PAGE, matching.length - shown.length)} more tags`;
    if (!shown.length) el.groupResults.append(node("li", "No service tag matches this search. Clear the tag search to browse all tags."));
  }
  function renderPrefixes() {
    const group = state.groups.find(group => group.id === state.selected);
    el.prefixList.replaceChildren();
    el.selectionMeta.replaceChildren();
    el.prefixFilter.disabled = !group;
    if (!group) {
      el.selectionTitle.textContent = `Choose ${azure ? "a service tag" : "a category"} to browse its ranges`;
      el.prefixCount.textContent = "";
      state.filteredPrefixes = [];
      el.copyPrefixes.disabled = el.exportPrefixes.disabled = true;
      el.morePrefixes.hidden = true;
      return;
    }
    el.selectionTitle.textContent = `${group.label} · ${group.prefixes.length.toLocaleString("en-US")} recorded ${azure ? "prefixes" : "ranges"}`;
    if (azure) {
      [["Region", group.region || "Global / not specified"], ["Platform", group.platform || "Not recorded"], ["System service", group.systemService || "Not recorded"]].forEach(([label, value]) => el.selectionMeta.append(node("dt", label), node("dd", value)));
    }
    const query = el.prefixFilter.value.trim().toLowerCase();
    state.filteredPrefixes = group.prefixes.filter(prefix => !query || prefix.toLowerCase().includes(query));
    const shown = state.filteredPrefixes.slice(0, state.prefixLimit);
    shown.forEach(prefix => {
      const item = node("li");
      const copy = button(prefix, () => SiteUX.copy(prefix, `${group.label} prefix`, copy));
      copy.classList.add("prefix-copy");
      copy.setAttribute("aria-label", `Copy ${group.label} prefix ${prefix}`);
      item.append(copy);
      el.prefixList.append(item);
    });
    el.prefixCount.textContent = `${shown.length.toLocaleString("en-US")} displayed / ${state.filteredPrefixes.length.toLocaleString("en-US")} matching prefixes in ${group.label}.`;
    el.morePrefixes.hidden = shown.length >= state.filteredPrefixes.length;
    el.morePrefixes.textContent = `Show ${Math.min(PAGE, state.filteredPrefixes.length - shown.length)} more prefixes`;
    el.copyPrefixes.disabled = el.exportPrefixes.disabled = !state.filteredPrefixes.length;
    if (!shown.length) el.prefixList.append(node("li", "No prefixes match this filter. Clear the prefix filter to show this selection."));
  }
  function renderMatches() {
    el.matchList.replaceChildren();
    state.matches.slice(0, state.matchLimit).forEach(match => {
      const item = node("li");
      const action = button(`${match.group.label} — ${match.prefix}`, () => selectGroup(match.group.id));
      action.setAttribute("aria-label", `Explore ${match.group.label}, matching prefix ${match.prefix}`);
      item.append(action);
      el.matchList.append(item);
    });
    el.moreMatches.hidden = state.matchLimit >= state.matches.length;
    el.moreMatches.textContent = `Show ${Math.min(MATCH_PAGE, state.matches.length - state.matchLimit)} more matches`;
  }
  async function lookup() {
    if (state.status !== "ready") return;
    const version = ++state.lookupVersion;
    const value = el.lookupInput.value.trim();
    const address = parseAddress(value);
    el.matchList.replaceChildren();
    el.moreMatches.hidden = true;
    if (!address) {
      el.lookupInput.setAttribute("aria-invalid", "true");
      el.lookupHeading.dataset.state = "invalid";
      el.lookupHeading.textContent = "Enter one valid IPv4 or IPv6 address, without a port, CIDR suffix or zone identifier.";
      el.lookupInput.focus({ preventScroll: true });
      url();
      return;
    }
    el.lookupInput.setAttribute("aria-invalid", "false");
    el.lookupButton.disabled = true;
    el.lookupHeading.textContent = "Checking the loaded snapshot…";
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (version !== state.lookupVersion) { el.lookupButton.disabled = false; return; }
    state.matches = [];
    for (const group of state.groups) {
      const prefix = group.prefixes.find(prefix => contains(address, state.cache.get(prefix)));
      if (prefix) state.matches.push({ group, prefix });
    }
    state.matchLimit = MATCH_PAGE;
    el.lookupHeading.dataset.state = state.matches.length ? "match" : "no-match";
    el.lookupHeading.textContent = state.matches.length ? `${value} matches ${state.matches.length} ${azure ? "service tags" : "categories"} in this snapshot. Select a match to explore its ranges.`
      : `${value} does not match the published ranges in this loaded snapshot. This is not a live ownership or connectivity check.`;
    renderMatches();
    el.lookupButton.disabled = false;
    url();
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    el.lookupInput.value = params.get("ip") || params.get("lookupInput") || "";
    if (azure) el.groupQuery.value = params.get("q") || params.get("tagSearch") || "";
    el.prefixFilter.value = params.get("prefix") || params.get("cidrSearch") || "";
    const requested = params.get(azure ? "tag" : "category") || "";
    state.selected = state.groups.find(group => group.id.toLowerCase() === requested.toLowerCase())?.id || "";
    if (requested && !state.selected) SiteUX.notice(`The linked ${azure ? "service tag" : "category"} is not in this snapshot. Choose another; no selection was substituted.`);
    state.groupLimit = GROUP_PAGE;
    state.prefixLimit = PAGE;
    renderGroups();
    renderPrefixes();
    if (el.lookupInput.value) lookup();
  }
  async function load() {
    if (state.status === "loading-request") return;
    const fromRetry = document.activeElement === el.retry;
    state.status = "loading-request";
    el.lookupFields.disabled = el.browseFields.disabled = true;
    el.retry.disabled = true;
    el.dataError.hidden = true;
    el.refreshedAt.textContent = "Loading…";
    renderStats();
    try {
      const data = await SiteUX.fetchJSON("./ip-ranges.json");
      const source = azure ? data.tags : data.categories;
      if (!Array.isArray(source) || !source.length) throw new Error("No IP-range groups in the snapshot");
      const ids = new Set();
      state.cache.clear();
      state.groups = source.map(record => {
        const id = azure ? record.name : record.key;
        const prefixes = azure ? record.prefixes : record.cidrs;
        if (typeof id !== "string" || !id || ids.has(id) || !Array.isArray(prefixes)) throw new Error("Invalid IP-range group");
        ids.add(id);
        prefixes.forEach(prefix => {
          if (typeof prefix !== "string") throw new Error("Invalid prefix value");
          if (!state.cache.has(prefix)) {
            const parsed = parseRange(prefix);
            if (!parsed) throw new Error(`Invalid recorded prefix: ${prefix}`);
            state.cache.set(prefix, parsed);
          }
        });
        return { ...record, id, label: azure ? id : record.label || id, prefixes };
      });
      el.refreshedAt.textContent = date(data.generatedAt);
      const counts = snapshotCounts(state.groups, state.cache);
      if (azure) {
        if (data.version != null && typeof data.version !== "string" && !(typeof data.version === "number" && Number.isFinite(data.version))) throw new Error("Invalid service-tags version");
        state.summary = { ...counts, version: data.version == null || data.version === "" ? "Not recorded" : String(data.version), sourceDate: sourceFilenameDate(data.sourceFileName) || "Not recorded" };
      } else {
        state.summary = { ...counts, collectedAt: snapshotCollectionDate(data.generatedAt) || "Not recorded",
          passwordAuthFlag: typeof data.verifiablePasswordAuthentication === "boolean" ? String(data.verifiablePasswordAuthentication) : "Not recorded" };
      }
      if (!azure) {
        el.categorySelect.replaceChildren(new Option("Choose a category", ""));
        state.groups.forEach(group => el.categorySelect.add(new Option(`${group.label} (${group.prefixes.length.toLocaleString("en-US")} ranges)`, group.id)));
      }
      for (const [version, control] of [[4, el.exampleV4], [6, el.exampleV6]]) {
        const example = [...state.cache].find(([, range]) => range.version === version)?.[0].split("/")[0];
        control.disabled = !example;
        if (example) { control.dataset.ip = example; control.title = example; }
      }
      state.status = "ready";
      el.lookupFields.disabled = el.browseFields.disabled = false;
      restore();
    } catch (error) {
      console.error("IP-range snapshot could not be loaded.", error);
      state.status = "error";
      el.dataError.hidden = false;
      el.refreshedAt.textContent = "Unavailable";
      el.lookupHeading.textContent = "Lookup unavailable until the snapshot loads.";
    } finally {
      renderStats();
      el.retry.disabled = false;
      if (fromRetry) (state.status === "ready" ? el.lookupInput : el.retry).focus({ preventScroll: true });
    }
  }
  el.lookupButton.addEventListener("click", lookup);
  el.lookupInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); lookup(); } });
  el.lookupInput.addEventListener("input", () => { state.lookupVersion++; el.lookupInput.removeAttribute("aria-invalid"); el.lookupHeading.textContent = "Press Check to look up this address."; el.matchList.replaceChildren(); el.moreMatches.hidden = true; });
  [el.exampleV4, el.exampleV6].forEach(control => control.addEventListener("click", () => { el.lookupInput.value = control.dataset.ip; lookup(); }));
  if (azure) {
    el.groupQuery.addEventListener("input", () => { state.groupLimit = GROUP_PAGE; renderGroups(); url(); });
    el.moreGroups.addEventListener("click", () => { const old = state.groupLimit; state.groupLimit += GROUP_PAGE; renderGroups(); el.groupResults.querySelectorAll("button")[old]?.focus(); });
  } else el.categorySelect.addEventListener("change", () => selectGroup(el.categorySelect.value, false));
  el.prefixFilter.addEventListener("input", () => { state.prefixLimit = PAGE; renderPrefixes(); url(); });
  el.morePrefixes.addEventListener("click", () => { const old = state.prefixLimit; state.prefixLimit += PAGE; renderPrefixes(); el.prefixList.querySelectorAll("button")[old]?.focus(); });
  el.moreMatches.addEventListener("click", () => { const old = state.matchLimit; state.matchLimit += MATCH_PAGE; renderMatches(); el.matchList.querySelectorAll("button")[old]?.focus(); });
  el.copyPrefixes.addEventListener("click", () => SiteUX.copy(state.filteredPrefixes.join("\n"), `${state.selected} filtered prefixes`, el.copyPrefixes));
  el.exportPrefixes.addEventListener("click", () => SiteUX.download(state.filteredPrefixes.join("\n") + "\n", `${config.kind}-${state.selected.replace(/[^\w.-]+/g, "-")}-prefixes.txt`, "text/plain;charset=utf-8", `${state.selected}: ${state.filteredPrefixes.length} filtered prefixes`));
  el.retry.addEventListener("click", load);
  window.addEventListener("popstate", () => { if (state.status === "ready") restore(); });
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  const back = document.getElementById("backToTop");
  window.addEventListener("scroll", () => back.classList.toggle("visible", scrollY > 600), { passive: true });
  back.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  load();
}

const CSS = `
  .ip-dataset-stats{margin-bottom:1.5rem;}
  .ip-dataset-stats .stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.9rem;margin:0;}
  .ip-dataset-stats .stat-card{padding:.75rem 1rem;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);box-shadow:0 1px 2px var(--cp-border);}
  .ip-dataset-stats .stat-value{font-size:1.25rem;font-weight:700;line-height:1.2;overflow-wrap:anywhere;}
  .ip-dataset-stats .stat-label{margin-top:.4rem;font-size:.8rem;text-transform:uppercase;letter-spacing:.03em;}
  .ip-stats-scope{margin:0 0 .75rem;color:var(--cp-text-muted);font-size:.8rem;line-height:1.5;}
  .ip-stat-note{margin:.35rem 0 0;color:var(--cp-text-muted);font-size:.75rem;line-height:1.4;}
  @media(min-width:75rem){.ip-dataset-stats .stats-grid{grid-template-columns:repeat(6,minmax(0,1fr));}}
  @media(max-width:48rem){.ip-dataset-stats .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;}}
  .ip-tasks,.ip-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.75rem 0;}
  .ip-action,.ip-tasks a{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;max-width:100%;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font:inherit;font-size:.85rem;text-decoration:none;cursor:pointer;overflow-wrap:anywhere;}
  .ip-action:hover,.ip-tasks a:hover{border-color:var(--cp-accent);color:var(--cp-link);}
  .ip-action[aria-pressed="true"]{background:var(--cp-accent-soft);border-color:var(--cp-accent);font-weight:700;}
  .ip-action:disabled{cursor:not-allowed;color:var(--cp-text-muted);}
  .ip-controls{border:0;padding:0;margin:0;min-width:0;}
  .ip-section{margin:1.5rem 0;padding:1rem;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);}
  .ip-section h2{margin:0 0 1rem;font-size:1.35rem;}
  .ip-fields{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:.75rem;max-width:50rem;}
  .ip-field{min-width:0;margin:.75rem 0;}
  .ip-field label{display:block;margin-bottom:.4rem;font-size:.85rem;font-weight:600;}
  .ip-field input,.ip-field select{width:100%;min-width:0;height:3rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:8px;background:var(--cp-surface);color:var(--cp-text);}
  .ip-fields .ip-field{margin:0;}
  .ip-help,.ip-count{color:var(--cp-text-muted);font-size:.85rem;line-height:1.5;margin:.75rem 0;}
  #lookupHeading{font-size:.95rem;line-height:1.5;}
  #lookupInput[aria-invalid="true"]{border-color:var(--cp-danger);}
  #lookupHeading[data-state="invalid"]{color:var(--cp-danger);}
  #groupResults,#matchList,#prefixList{list-style:none;display:grid;gap:.5rem;margin:.75rem 0;padding:0;}
  #groupResults{grid-template-columns:repeat(auto-fit,minmax(17rem,1fr));}
  #groupResults .ip-action,#matchList .ip-action{justify-content:flex-start;width:100%;text-align:left;}
  #prefixList{grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));}
  .prefix-copy{width:100%;font-family:ui-monospace,monospace;white-space:nowrap;overflow-x:auto;justify-content:flex-start;}
  #selectionTitle{font-size:1.05rem;margin:1.25rem 0 .5rem;overflow-wrap:anywhere;}
  .ip-meta{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.4rem 1rem;font-size:.85rem;}
  .ip-meta dd{margin:0;min-width:0;overflow-wrap:anywhere;}
  .ip-section summary,.snapshot-statistics>summary{min-height:2.75rem;padding-block:.65rem;cursor:pointer;color:var(--cp-link);font-size:.9rem;}
  .ip-error{padding:1rem;border:1px solid var(--cp-danger);border-radius:8px;color:var(--cp-danger);background:var(--cp-danger-bg);}
  #ip-lookup,#ip-browse,#selectionTitle{scroll-margin-top:6rem;}
  @media(max-width:32rem){#groupResults,#prefixList{grid-template-columns:minmax(0,1fr);}.ip-meta{grid-template-columns:minmax(0,1fr);}}
`;

function markup(kind) {
  const azure = kind === "azure";
  return `<!-- ip-range-view:start -->
    <section class="ip-dataset-stats" aria-label="Whole-snapshot statistics">
      <p class="ip-stats-scope" id="statsSummary" role="status" aria-live="polite" aria-atomic="true">Snapshot totals: loading&hellip;</p>
      <div class="stats-grid" id="statsGrid" aria-busy="true">
        <div class="stat-card"><span class="stat-value" data-stat="groups">&mdash;</span><span class="stat-label">${azure ? "Groups" : "Categories"}</span></div>
        <div class="stat-card"><span class="stat-value" data-stat="entries">&mdash;</span><span class="stat-label">Prefix entries across ${azure ? "groups" : "categories"}</span>${azure ? '<p class="ip-stat-note" id="uniquePrefixes">Distinct prefixes: loading&hellip;</p>' : ""}</div>
        <div class="stat-card"><span class="stat-value" data-stat="ipv4">&mdash;</span><span class="stat-label">IPv4 entries</span></div>
        <div class="stat-card"><span class="stat-value" data-stat="ipv6">&mdash;</span><span class="stat-label">IPv6 entries</span></div>
        ${azure ? `<div class="stat-card"><span class="stat-value" data-stat="version">&mdash;</span><span class="stat-label">Service-tags version</span></div>
        <div class="stat-card"><span class="stat-value" data-stat="sourceDate" id="sourceFileDate">&mdash;</span><span class="stat-label">Source file date</span><p class="ip-stat-note">Date from source filename</p></div>` : `<div class="stat-card"><span class="stat-value" data-stat="uniquePrefixes">&mdash;</span><span class="stat-label">Unique prefix strings</span></div>
        <div class="stat-card"><span class="stat-value" data-stat="collectedAt">&mdash;</span><span class="stat-label">Snapshot collected</span><p class="ip-stat-note">UTC date of collection</p></div>`}
      </div>
      <noscript><p class="ip-stats-scope">Enable JavaScript to display these statistics, or <a href="./ip-ranges.json">download the snapshot</a>.</p></noscript>
    </section>
    <nav class="ip-tasks" aria-label="IP range tasks"><a href="#ip-lookup">Check an IP address</a><a href="#ip-browse">${azure ? "Explore service tags" : "Browse categories"}</a></nav>
    <div class="ip-error" id="dataError" role="alert" hidden><p>The IP-range snapshot could not be loaded or validated. Please retry.</p><button class="ip-action" id="retry" type="button">Retry</button></div>
    <section class="ip-section" id="ip-lookup" aria-labelledby="lookupTitle">
      <h2 id="lookupTitle">Check an IP address</h2>
      <fieldset class="ip-controls" id="lookupFields" disabled>
        <div class="ip-fields"><div class="ip-field"><label for="lookupInput">IPv4 or IPv6 address</label><input id="lookupInput" type="text" autocomplete="off" spellcheck="false" aria-describedby="lookupHint lookupHeading"></div><button class="ip-action" id="lookupButton" type="button">Check</button></div>
        <p class="ip-help" id="lookupHint">Checks published ranges in the downloaded snapshot, not reachability or ownership of an individual resource.</p>
        <div class="ip-actions"><button class="ip-action" id="exampleV4" type="button">Use an IPv4 example</button><button class="ip-action" id="exampleV6" type="button">Use an IPv6 example</button></div>
      </fieldset>
      <p id="lookupHeading" role="status" aria-live="polite" aria-atomic="true">Enter an address or choose an example.</p><ul id="matchList"></ul><button class="ip-action" id="moreMatches" type="button" hidden>More matches</button>
    </section>
    <section class="ip-section" id="ip-browse" aria-labelledby="browseTitle">
      <h2 id="browseTitle">${azure ? "Explore a service tag" : "Choose a GitHub category"}</h2>
      <fieldset class="ip-controls" id="browseFields" disabled>
        ${azure ? '<div class="ip-field"><label for="groupQuery">Find a service tag</label><input id="groupQuery" type="search" placeholder="Storage, AzureCloud.westeurope, Sql" spellcheck="false"></div><p class="ip-count" id="groupCount" role="status" aria-live="polite"></p><ul id="groupResults"></ul><button class="ip-action" id="moreGroups" type="button" hidden>More tags</button>' : '<div class="ip-field"><label for="categorySelect">Category and recorded range count</label><select id="categorySelect"><option value="">Choose a category</option></select></div>'}
        <h3 id="selectionTitle" tabindex="-1">Choose a selection to browse its ranges</h3>
        ${azure ? '<details><summary>Selected tag metadata</summary><dl class="ip-meta" id="selectionMeta"></dl></details>' : '<dl class="ip-meta" id="selectionMeta"></dl>'}
        <div class="ip-field"><label for="prefixFilter">Filter prefixes in this selection</label><input id="prefixFilter" type="search" disabled></div>
        <p class="ip-count" id="prefixCount" role="status" aria-live="polite"></p>
        <div class="ip-actions"><button class="ip-action" id="copyPrefixes" type="button" disabled>Copy filtered prefixes</button><button class="ip-action" id="exportPrefixes" type="button" disabled>Export filtered prefixes</button></div>
        <ul id="prefixList"></ul><button class="ip-action" id="morePrefixes" type="button" hidden>More prefixes</button>
      </fieldset>
    </section>
    ${azure ? "" : '<details class="snapshot-statistics"><summary>Technical metadata</summary><dl class="ip-meta" id="snapshotDetails"></dl><p class="ip-help">Additional metadata from the same GitHub Meta API snapshot.</p></details>'}
    <!-- ip-range-view:end -->
`;
}

export function upgradeIPPage(source, kind) {
  let html = source.replace(/\r\n/g, "\n");
  const body = markup(kind);
  if (html.includes("<!-- ip-range-view:start -->")) html = html.replace(/<!-- ip-range-view:start -->[\s\S]*?<!-- ip-range-view:end -->\n?/, body);
  else {
    const start = html.indexOf('    <section aria-label="Summary">'), end = html.indexOf('    <section class="page-notes"', start);
    if (start < 0 || end < start) throw new Error(`IP view guard failed: ${kind}`);
    html = html.slice(0, start) + body + "\n" + html.slice(end);
  }
  html = html.replace('Last refreshed: <strong id="refreshedAt">', 'Snapshot collected: <strong id="refreshedAt">');
  if (kind === "azure") html = html.replace(/<span>Published file: <strong id="sourceFileDate">[^<]*<\/strong><\/span>\s*/, "");
  const script = `<script data-ip-range-ui>(() => {\n${[parseIPv4, parseAddress, parseRange, contains, sourceFilenameDate, snapshotCollectionDate, snapshotCounts].map(fn => fn.toString()).join("\n")}\n(${ipBrowser.toString()})(${JSON.stringify({ kind })}, {parseAddress,parseRange,contains,sourceFilenameDate,snapshotCollectionDate,snapshotCounts});\n})();</script>`;
  if (html.includes("<script data-ip-range-ui>")) html = html.replace(/<script data-ip-range-ui>[\s\S]*?<\/script>/, () => script);
  else {
    const start = html.indexOf('  <script>\n    document.getElementById("currentYear")'), end = html.indexOf("</script>", start);
    if (start < 0 || end < start) throw new Error(`IP controller guard failed: ${kind}`);
    html = html.slice(0, start) + script + html.slice(end + 9);
  }
  html = html.replace(/  <script data-url-state>[\s\S]*?<\/script>/g, "");
  html = html.replace(/<style data-ip-range-ui>[\s\S]*?<\/style>\n?/g, "");
  html = html.replace("</head>", `<style data-ip-range-ui>${CSS}</style>\n</head>`);
  return enhancePage(html.replace(/\n/g, "\r\n"), { path: `/${kind === "azure" ? "azure" : "github"}-ip-ranges/` });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const kind of ["azure", "github"]) {
    const path = join(process.cwd(), `${kind}-ip-ranges`, "index.html");
    await writeFile(path, upgradeIPPage(await readFile(path, "utf8"), kind));
  }
  console.log("Updated both standalone IP-range pages.");
}
