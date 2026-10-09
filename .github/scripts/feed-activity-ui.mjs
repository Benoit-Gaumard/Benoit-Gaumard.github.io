import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enhancePage } from "../../site-ui.mjs";
import { publicationAge } from "./release-news-ui.mjs";

export function publicationState(feed, reference) {
  const stamp = typeof feed.lastPublication === "string" ? Date.parse(feed.lastPublication) : NaN;
  if (!Number.isFinite(stamp)) return { key: "unknown", label: "Publication date not recorded" };
  if (!Number.isFinite(reference)) return { key: "unknown", label: "Publication recency unavailable" };
  if (stamp > reference) return { key: "future", label: "Future-dated publication in snapshot" };
  const days = Math.floor((reference - stamp) / 86400000);
  return days >= 30 ? { key: "quiet", label: "No recorded publication in the 30 days before collection" }
    : { key: "recent", label: "Publication within 30 days before collection" };
}

export function collectionState(feed) {
  return feed.ok === true ? { key: "success", label: "Collection succeeded" }
    : feed.ok === false ? { key: "error", label: "Collection error" }
    : { key: "unknown", label: "Collection status not recorded" };
}

export function feedCounts(feeds, generatedAt, now = Date.now()) {
  const collectedAt = typeof generatedAt === "string" ? Date.parse(generatedAt) : NaN;
  const dated = Number.isFinite(collectedAt) && Number.isFinite(now);
  const current = new Date(now);
  const today = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());
  const week = today - ((current.getUTCDay() + 6) % 7) * 86400000;
  const observedUntil = Math.min(collectedAt, now);
  const publishedSince = cutoff => feeds.filter(feed => {
    const stamp = typeof feed.lastPublication === "string" ? Date.parse(feed.lastPublication) : NaN;
    return stamp >= cutoff && stamp <= observedUntil;
  }).length;
  return {
    total: feeds.length,
    categories: new Set(feeds.flatMap(feed => feed.categories)).size,
    today: dated ? publishedSince(today) : null,
    week: dated ? publishedSince(week) : null,
    dead: feeds.filter(feed => collectionState(feed).key === "error").length,
  };
}

export function opml(feeds, title = "Selected RSS feeds") {
  const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));
  const unique = [...new Map(feeds.map(feed => [feed.url, feed])).values()];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>${escape(title)}</title></head><body>\n${unique.map(feed => `  <outline type="rss" text="${escape(feed.name)}" title="${escape(feed.name)}" xmlUrl="${escape(feed.url)}"/>`).join("\n")}\n</body></opml>\n`;
}

function activityRuntime(config, { publicationState, collectionState, feedCounts, publicationAge, opml }) {
  const PAGE = 50;
  const techCommunity = config.kind === "techcommunity";
  const el = Object.fromEntries(["feedControls", "search", "statusFilter", "categoryFilter", "languageFilter", "sortBy", "sortDirection", "resetFilters", "statsSummary", "statsGrid", "refreshedAt", "resultCount", "feedResults", "loadMore", "feedError", "retryFeeds", "selectMatching", "clearSelection", "exportSelected", "selectionCount", "addedSection", "addedFeeds"].map(id => [id, document.getElementById(id)]));
  const compact = matchMedia("(max-width: 60rem)");
  const state = { status: "loading", feeds: [], filtered: [], selected: new Set(), visible: PAGE, sort: "lastPublication", direction: "desc", generatedAt: null };
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function button(text, callback) { const control = node("button", text, "feed-action"); control.type = "button"; control.addEventListener("click", callback); return control; }
  function date(value) { const time = new Date(value); return typeof value !== "string" || Number.isNaN(time.getTime()) ? "Not recorded" : time.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"; }
  function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function safeUrl(value) { const url = new URL(value); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid feed/article URL"); return value; }
  function renderStats() {
    if (config.kind === "activity") {
      el.statsSummary.textContent = state.status === "ready"
        ? `${state.feeds.length} configured feed entries · ${state.feeds.filter(feed => feed.collection.key === "success").length} collection successes · ${state.feeds.filter(feed => feed.collection.key === "error").length} collection errors. Publication recency is a separate measure, evaluated at this snapshot's collection time.`
        : state.status === "error" ? "Feed counts unavailable." : "Feed counts: loading...";
      return;
    }
    const counts = state.status === "ready" ? feedCounts(state.feeds, state.generatedAt) : null;
    el.statsGrid.querySelectorAll("[data-stat]").forEach(value => {
      const count = counts?.[value.dataset.stat];
      value.textContent = !counts ? "—" : count === null ? "Not recorded" : count.toLocaleString("en-US");
    });
    el.statsGrid.setAttribute("aria-busy", String(state.status === "loading" || state.status === "fetching"));
    el.statsSummary.textContent = !counts
      ? state.status === "error" ? "Feed counts unavailable." : "Feed counts: loading..."
      : counts.today === null
        ? "Complete catalogue totals, independent of filters. Publication activity is unavailable because the collection date is not recorded."
        : "Complete catalogue totals, independent of filters. Activity counts use recorded publications for the current UTC day/week, not a live check.";
  }
  function selectedCount() {
    el.selectionCount.textContent = `${state.selected.size} unique feed URLs selected across filters.`;
    el.exportSelected.disabled = !state.selected.size;
    el.clearSelection.disabled = !state.selected.size;
  }
  function selection(feed) {
    const label = node("label", undefined, "feed-selection");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox"; checkbox.checked = state.selected.has(feed.url);
    checkbox.setAttribute("aria-label", `Select ${feed.name} for OPML export`);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selected.add(feed.url); else state.selected.delete(feed.url);
      selectedCount();
    });
    label.append(checkbox, document.createTextNode("Select"));
    return label;
  }
  function feedContent(feed) {
    const content = node("div");
    const heading = node("h3", feed.name, "feed-name");
    content.append(heading);
    if (feed.latestLink) {
      const latest = node("a", `${techCommunity ? "Latest: " : ""}${feed.latestTitle || "Read the last recorded publication"}`, "latest-article");
      latest.href = feed.latestLink; latest.target = "_blank"; latest.rel = "noopener noreferrer";
      content.append(latest);
    }
    return content;
  }
  function actions(feed) {
    const group = node("div", undefined, "feed-actions");
    const open = node("a", "Open RSS feed", "feed-action");
    open.href = feed.url; open.target = "_blank"; open.rel = "noopener noreferrer";
    const copy = button("Copy RSS URL", () => SiteUX.copy(feed.url, `${feed.name} RSS URL`, copy));
    group.append(open, copy, selection(feed));
    return group;
  }
  function details(feed) {
    const detail = node("details", undefined, "feed-details");
    detail.append(node("summary", "Feed details"));
    const fields = node("dl", undefined, "feed-metadata");
    if (techCommunity) {
      fields.append(node("dt", "Collection result"), node("dd", feed.collection.label),
        node("dt", "Publication recency at collection"), node("dd", feed.publication.label));
    }
    [["Category", feed.category || "Not recorded"], ["Language", feed.country || "Not recorded"], ["Collection snapshot", date(state.generatedAt)], ["Last attempt", feed.lastAttemptAt ? date(feed.lastAttemptAt) : "Not recorded separately"], ["Last collection error", feed.ok === false ? feed.error || "No error detail supplied" : "No error reported in this snapshot"]].forEach(([label, value]) => fields.append(node("dt", label), node("dd", value)));
    const url = node("code", feed.url, "feed-url");
    url.tabIndex = 0; url.setAttribute("aria-label", "RSS feed URL");
    detail.append(fields, url);
    if (!feed.latestLink) detail.append(node("p", "The latest article URL is not recorded in this snapshot.", "feed-help"));
    return detail;
  }
  function activityBadge(feed) {
    const age = publicationAge(feed.lastPublication);
    const badge = node("span", age || "Not recorded", "feed-age");
    badge.classList.toggle("is-recent", age === "Today" || age === "Yesterday");
    badge.title = "Age of the last recorded publication, relative to the current UTC date";
    return badge;
  }
  function card(feed) {
    const article = node("article", undefined, "feed-card");
    article.dataset.feedIndex = feed.index;
    if (techCommunity) {
      const fields = node("dl", undefined, "feed-summary-fields feed-metadata");
      const rss = node("dd"), activity = node("dd");
      rss.append(actions(feed));
      activity.append(activityBadge(feed));
      fields.append(node("dt", "Category"), node("dd", feed.categories.join(", ") || "Not recorded"),
        node("dt", "RSS feed"), rss, node("dt", "Last published"), node("dd", date(feed.lastPublication)),
        node("dt", "Last activity"), activity);
      article.append(feedContent(feed), fields, details(feed));
    } else {
      article.append(feedContent(feed), node("p", `Last recorded publication: ${date(feed.lastPublication)}`, "feed-help"),
        node("span", feed.publication.label, "publication-status"), node("span", feed.collection.label, "collection-status is-" + feed.collection.key), actions(feed), details(feed));
    }
    return article;
  }
  function ordered() {
    return [...state.filtered].sort((a, b) => {
      let left = a[state.sort], right = b[state.sort];
      if (state.sort === "lastPublication") { left = Date.parse(left) || -Infinity; right = Date.parse(right) || -Infinity; }
      else if (state.sort === "collection") { left = a.collection.key; right = b.collection.key; }
      else { left = normalize(left); right = normalize(right); }
      const result = left === right ? 0 : left > right ? 1 : -1;
      return (state.direction === "asc" ? 1 : -1) * (result || a.name.localeCompare(b.name));
    });
  }
  function table(feeds) {
    const wrap = node("div", undefined, "feed-table-wrap"), table = node("table", undefined, "feed-table");
    if (techCommunity) table.classList.add("feed-table-techcommunity");
    const head = node("thead"), row = node("tr");
    const columns = techCommunity
      ? [["name", "Name"], ["category", "Category"], [null, "RSS feed"], ["lastPublication", "Last published"], [null, "Last activity"]]
      : [["name", "Feed and latest recorded article"], ["lastPublication", "Publication history"], ["collection", "Collection result"], [null, "RSS actions"]];
    columns.forEach(([key, label]) => {
      const cell = node("th"); cell.scope = "col";
      if (key) {
        if (state.sort === key) cell.setAttribute("aria-sort", state.direction === "asc" ? "ascending" : "descending");
        const sort = button(label, () => {
          state.direction = state.sort === key ? (state.direction === "asc" ? "desc" : "asc") : key === "lastPublication" ? "desc" : "asc";
          state.sort = key; render(); sync();
          document.getElementById("feed-sort-" + key)?.focus({ preventScroll: true });
        });
        sort.classList.add("feed-header-sort"); sort.id = "feed-sort-" + key;
        cell.append(sort);
      } else cell.textContent = label;
      row.append(cell);
    });
    head.append(row); const body = node("tbody");
    feeds.forEach(feed => {
      const row = node("tr"); row.dataset.feedIndex = feed.index;
      const name = node("td"), publication = node("td"), links = node("td");
      name.append(feedContent(feed), details(feed));
      links.append(actions(feed));
      if (techCommunity) {
        const activity = node("td");
        activity.append(activityBadge(feed));
        links.className = "feed-rss-cell";
        publication.textContent = date(feed.lastPublication);
        row.append(name, node("td", feed.categories.join(", ") || "Not recorded"), links, publication, activity);
      } else {
        const collection = node("td");
        publication.append(node("p", date(feed.lastPublication)), node("span", feed.publication.label, "publication-status"));
        collection.append(node("span", feed.collection.label, "collection-status is-" + feed.collection.key));
        row.append(name, publication, collection, links);
      }
      body.append(row);
    });
    table.append(head, body); wrap.append(table); return wrap;
  }
  function render() {
    if (state.status !== "ready") return;
    const shown = ordered().slice(0, state.visible);
    el.feedResults.replaceChildren();
    if (!shown.length) {
      const empty = node("div", undefined, "feed-empty");
      empty.append(node("h2", "No feeds match these filters"), button("Reset filters", reset));
      el.feedResults.append(empty);
    } else if (compact.matches) {
      const cards = node("div", undefined, "feed-cards"); cards.append(...shown.map(card)); el.feedResults.append(cards);
    } else el.feedResults.append(table(shown));
    el.resultCount.textContent = `${shown.length} displayed / ${state.filtered.length} matching feed entries · ${state.feeds.length} configured in this snapshot.`;
    el.loadMore.hidden = shown.length >= state.filtered.length;
    el.loadMore.textContent = `Show ${Math.min(PAGE, state.filtered.length - shown.length)} more feeds`;
    el.sortBy.value = state.sort; el.sortDirection.textContent = state.direction === "asc" ? "Ascending" : "Descending";
    selectedCount();
  }
  function apply(updateUrl = true) {
    if (state.status !== "ready") return;
    const query = normalize(el.search.value.trim());
    const status = el.statusFilter.value;
    state.filtered = state.feeds.filter(feed => (!query || normalize([feed.name, feed.category, feed.subcategory, feed.latestTitle].join(" ")).includes(query))
      && (!el.categoryFilter.value || feed.categories.includes(el.categoryFilter.value))
      && (!el.languageFilter?.value || feed.country === el.languageFilter.value)
      && (!status || (status.startsWith("collection-") ? feed.collection.key === status.slice(11) : feed.publication.key === status.slice(12))));
    state.visible = PAGE; render(); if (updateUrl) sync();
  }
  function reset() { [el.search, el.statusFilter, el.categoryFilter, el.languageFilter].filter(Boolean).forEach(control => { control.value = ""; }); apply(); el.search.focus({ preventScroll: true }); }
  function sync() {
    SiteUX.updateURL(params => {
      [el.search, el.statusFilter, el.categoryFilter, el.languageFilter].filter(Boolean).forEach(control => { params.delete(control.id); if (control.value) params.set(control.id, control.value); });
      params.set("sort", state.sort); params.set("dir", state.direction);
    });
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    [el.search, el.statusFilter, el.categoryFilter, el.languageFilter].filter(Boolean).forEach(control => {
      const value = params.get(control.id) || "";
      if (control.tagName === "SELECT" && value && ![...control.options].some(option => option.value === value)) control.add(new Option(`${value} (not in snapshot)`, value));
      control.value = value;
    });
    state.sort = ["name", "category", "country", "lastPublication", "collection"].includes(params.get("sort")) ? params.get("sort") : "lastPublication";
    state.direction = params.get("dir") === "asc" ? "asc" : "desc";
    apply(false);
  }
  async function load() {
    if (state.status === "fetching") return;
    const fromRetry = document.activeElement === el.retryFeeds;
    state.status = "fetching"; el.feedControls.disabled = true; el.retryFeeds.disabled = true; el.feedError.hidden = true;
    el.refreshedAt.textContent = "Loading...";
    renderStats();
    try {
      const payload = await SiteUX.fetchJSON(config.data);
      if (!Array.isArray(payload.feeds)) throw new Error("Missing feed-status entries");
      state.generatedAt = payload.generatedAt;
      const reference = typeof payload.generatedAt === "string" ? Date.parse(payload.generatedAt) : NaN;
      state.feeds = payload.feeds.map((feed, index) => {
        if (!feed || typeof feed.name !== "string" || typeof feed.url !== "string" || (feed.ok != null && typeof feed.ok !== "boolean")) throw new Error("Invalid feed metadata");
        safeUrl(feed.url);
        if (feed.latestLink) safeUrl(feed.latestLink);
        return { ...feed, index, categories: String(feed.category || "").split(",").map(value => value.trim()).filter(Boolean), publication: publicationState(feed, reference), collection: collectionState(feed) };
      });
      if (config.kind === "activity" && state.feeds.some(feed => !Object.hasOwn(feed, "latestLink"))) {
        try {
          const aggregate = await SiteUX.fetchJSON("../updates.json");
          const names = new Map(); state.feeds.forEach(feed => names.set(feed.name, (names.get(feed.name) || 0) + 1));
          state.feeds.forEach(feed => {
            const item = names.get(feed.name) === 1 ? aggregate.items?.find(item => item.source === feed.name && item.pubDate === feed.lastPublication) : null;
            if (!feed.latestLink && item?.link) { safeUrl(item.link); feed.latestLink = item.link; feed.latestTitle = item.title; }
          });
        } catch (error) { console.warn("Optional retained article links are unavailable.", error); }
      }
      el.refreshedAt.textContent = date(payload.generatedAt);
      el.categoryFilter.replaceChildren(new Option("All categories", ""));
      [...new Set(state.feeds.flatMap(feed => feed.categories))].sort().forEach(value => el.categoryFilter.add(new Option(value, value)));
      if (el.languageFilter) {
        el.languageFilter.replaceChildren(new Option("All recorded languages", ""));
        [...new Set(state.feeds.map(feed => feed.country).filter(Boolean))].sort().forEach(value => el.languageFilter.add(new Option(value, value)));
      }
      if (el.addedFeeds) {
        el.addedFeeds.replaceChildren();
        const added = state.feeds.filter(feed => Number.isFinite(Date.parse(feed.addedAt))).sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt) || a.name.localeCompare(b.name)).slice(0, 5);
        added.forEach(feed => el.addedFeeds.append(node("li", `${feed.name} — added ${date(feed.addedAt)}`)));
        el.addedSection.hidden = !added.length;
      }
      state.status = "ready"; el.feedControls.disabled = false; restore();
    } catch (error) {
      console.error("Feed activity could not be loaded.", error); state.status = "error"; el.feedError.hidden = false;
      el.refreshedAt.textContent = "Unavailable"; el.resultCount.textContent = "Unable to load feed activity.";
      el.feedResults.replaceChildren(); el.loadMore.hidden = true;
    } finally { renderStats(); el.retryFeeds.disabled = false; if (fromRetry) (state.status === "ready" ? el.search : el.retryFeeds).focus({ preventScroll: true }); }
  }
  let timer;
  el.search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => apply(), 120); });
  [el.statusFilter, el.categoryFilter, el.languageFilter].filter(Boolean).forEach(control => control.addEventListener("change", () => apply()));
  el.resetFilters.addEventListener("click", reset);
  el.sortBy.addEventListener("change", () => { state.sort = el.sortBy.value; render(); sync(); });
  el.sortDirection.addEventListener("click", () => { state.direction = state.direction === "asc" ? "desc" : "asc"; render(); sync(); });
  el.loadMore.addEventListener("click", () => { const old = state.visible; state.visible += PAGE; render(); const row = el.feedResults.querySelectorAll("[data-feed-index]")[old]; const control = row?.querySelector("a,summary,button"); if (control) { control.focus({ preventScroll: true }); row.scrollIntoView({ block: "start", behavior: "instant" }); } });
  el.selectMatching.addEventListener("click", () => { state.filtered.forEach(feed => state.selected.add(feed.url)); render(); });
  el.clearSelection.addEventListener("click", () => { state.selected.clear(); render(); el.selectMatching.focus(); });
  el.exportSelected.addEventListener("click", () => SiteUX.download(opml(state.feeds.filter(feed => state.selected.has(feed.url))), config.kind + "-feeds.opml", "text/x-opml;charset=utf-8", `${state.selected.size} selected RSS URLs`));
  el.retryFeeds.addEventListener("click", load);
  compact.addEventListener("change", render);
  window.addEventListener("popstate", () => { if (state.status === "ready") restore(); });
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  const back = document.getElementById("backToTop");
  window.addEventListener("scroll", () => back.classList.toggle("visible", scrollY > 600), { passive: true });
  back.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  load();
}

const CSS = `
 .feed-statistics{margin-bottom:1.5rem;}
 .feed-statistics .stats-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.9rem;margin:0;}
 .feed-statistics .stat-card{padding:.75rem 1rem;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);box-shadow:0 1px 2px var(--cp-border);}
 .feed-statistics .stat-value{font-size:1.25rem;font-weight:700;line-height:1.2;overflow-wrap:anywhere;}
 .feed-statistics .stat-label{margin-top:.4rem;color:var(--cp-text-muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.03em;}
 .feed-stats-scope{margin:0 0 .75rem;color:var(--cp-text-muted);font-size:.8rem;line-height:1.5;}
 .feed-stat-note{margin:.35rem 0 0;color:var(--cp-text-muted);font-size:.75rem;line-height:1.4;}
 @media(max-width:60rem){.feed-statistics .stats-grid{grid-template-columns:repeat(3,minmax(0,1fr));}}
 @media(max-width:48rem){.feed-statistics .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;}.feed-statistics .stat-card:last-child{grid-column:1/-1;}}
 .feed-controls{border:0;padding:0;margin:0;min-width:0;}
 .feed-filter-grid{display:grid;grid-template-columns:minmax(0,2fr) repeat(3,minmax(0,1fr));gap:.75rem;}
 .feed-field{min-width:0;}.feed-field label{display:block;margin-bottom:.4rem;font-size:.85rem;font-weight:600;}
 .feed-field input,.feed-field select{width:100%;min-width:0;height:3rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:8px;background:var(--cp-surface);color:var(--cp-text);}
 .feed-action{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:.5rem .65rem;max-width:100%;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font:inherit;font-size:.85rem;cursor:pointer;text-decoration:none;overflow-wrap:anywhere;}
 .feed-actions,.feed-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.75rem 0;}
 .feed-toolbar select{max-width:100%;min-height:2.75rem;background:var(--cp-surface);color:var(--cp-text);border:1px solid var(--cp-border-strong);border-radius:6px;padding:.5rem;}
 .feed-help,.feed-count{font-size:.85rem;line-height:1.5;color:var(--cp-text-muted);margin:.75rem 0;}
 .feed-table-wrap{overflow-x:auto;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);}
 .feed-table{width:100%;border-collapse:collapse;font-size:.85rem;}.feed-table th,.feed-table td{padding:.75rem;vertical-align:top;border-bottom:1px solid var(--cp-border);text-align:left;}
 .feed-table th{background:var(--cp-surface-soft);}.feed-table th:first-child{width:40%;}
 .feed-table-techcommunity th{text-transform:none;vertical-align:middle;color:var(--cp-text);font:inherit;font-weight:700;}.feed-table-techcommunity th:first-child{width:32%;}
 .feed-rss-cell{min-width:12rem;}
 .feed-summary-fields .feed-actions{margin:.25rem 0;}
 .feed-age{display:inline-flex;align-items:center;min-height:1.75rem;max-width:100%;padding:.2rem .55rem;border:1px solid var(--cp-border-strong);border-radius:999px;background:var(--cp-surface-soft);color:var(--cp-text-muted);font-size:.8rem;font-weight:650;line-height:1.4;}
 .feed-age.is-recent{background:var(--cp-accent);color:var(--cp-accent-fg);border-color:var(--cp-accent);}
 .feed-header-sort{background:none;border:0;padding:0;text-align:left;font-weight:700;}
 .feed-name{margin:0 0 .35rem;font-size:1.05rem;line-height:1.4;overflow-wrap:anywhere;}
 .latest-article{display:inline-flex;min-height:2.75rem;align-items:center;color:var(--cp-link);font-size:.9rem;line-height:1.5;overflow-wrap:anywhere;}
 .collection-status,.publication-status{display:block;margin:.35rem 0;font-size:.8rem;line-height:1.5;}
 .collection-status.is-error{color:var(--cp-danger);font-weight:650;}.collection-status.is-success{color:var(--cp-success);}
 .feed-details>summary,.feed-added>summary{min-height:2.75rem;padding-block:.65rem;font-size:.85rem;color:var(--cp-link);cursor:pointer;}
 .feed-metadata{display:grid;grid-template-columns:minmax(0,1fr);gap:.25rem;font-size:.85rem;line-height:1.5;}.feed-metadata dt{font-weight:600;}.feed-metadata dd{margin:0 0 .5rem;overflow-wrap:anywhere;}
 .feed-url{display:block;max-width:100%;overflow-x:auto;white-space:nowrap;font-size:.8rem;padding:.5rem 0;}
 .feed-selection{display:inline-flex;align-items:center;gap:.5rem;min-height:2.75rem;font-size:.85rem;}.feed-selection input{width:1.15rem;height:1.15rem;accent-color:var(--cp-accent);}
 .feed-cards{display:grid;gap:.75rem;}.feed-card{padding:1rem;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);min-width:0;}
 .feed-empty,.feed-error{padding:1rem;border:1px dashed var(--cp-border-strong);border-radius:8px;}.feed-error{color:var(--cp-danger);}
 #loadMore{display:block;margin:1rem auto;}
 @media(max-width:60rem){.feed-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.feed-search{grid-column:1/-1;}}
 @media(max-width:32rem){.feed-filter-grid{grid-template-columns:minmax(0,1fr);}}
`;

function markup(kind) {
  return `<!-- feed-activity-view:start -->
  ${kind === "techcommunity" ? `<section class="feed-statistics" aria-label="Whole-catalogue statistics">
    <p class="feed-stats-scope" id="statsSummary" role="status" aria-live="polite" aria-atomic="true">Feed counts: loading&hellip;</p>
    <div class="stats-grid" id="statsGrid" aria-busy="true">
      <div class="stat-card"><div class="stat-value" data-stat="total">&mdash;</div><div class="stat-label">Total Feeds</div></div>
      <div class="stat-card"><div class="stat-value" data-stat="categories">&mdash;</div><div class="stat-label">Categories</div></div>
      <div class="stat-card"><div class="stat-value" data-stat="today">&mdash;</div><div class="stat-label">Active Today</div><p class="feed-stat-note">Published today (UTC)</p></div>
      <div class="stat-card"><div class="stat-value" data-stat="week">&mdash;</div><div class="stat-label">This Week</div><p class="feed-stat-note">Since Monday (UTC)</p></div>
      <div class="stat-card"><div class="stat-value" data-stat="dead">&mdash;</div><div class="stat-label">Dead Feeds</div><p class="feed-stat-note">Last collection failed, not proof of permanent failure</p></div>
    </div>
    <noscript><p class="feed-stats-scope">Enable JavaScript to display the totals, or <a href="./feeds-status.json">download the recorded snapshot</a>.</p></noscript>
  </section>` : ""}
  <section aria-label="Recorded feed activity">
    <fieldset class="feed-controls" id="feedControls" disabled><div class="feed-filter-grid">
      <div class="feed-field feed-search"><label for="search">Search feeds and titles</label><input id="search" type="search" autocomplete="off"></div>
      <div class="feed-field"><label for="statusFilter">Recorded status</label><select id="statusFilter"><option value="">All statuses</option><option value="collection-error">Collection error</option><option value="collection-success">Collection succeeded</option><option value="collection-unknown">Collection status unknown</option><option value="publication-quiet">No publication in preceding 30 days</option><option value="publication-recent">Published within preceding 30 days</option><option value="publication-unknown">Publication date unavailable</option><option value="publication-future">Future-dated publication</option></select></div>
      <div class="feed-field"><label for="categoryFilter">Category</label><select id="categoryFilter"><option value="">All categories</option></select></div>
      ${kind === "activity" ? '<div class="feed-field"><label for="languageFilter">Feed language</label><select id="languageFilter"><option value="">All recorded languages</option></select></div>' : ""}
    </div><div class="feed-toolbar"><label for="sortBy">Sort by</label><select id="sortBy"><option value="lastPublication">Last publication</option><option value="name">Name</option><option value="category">Category</option><option value="collection">Collection result</option>${kind === "activity" ? '<option value="country">Language</option>' : ""}</select><button class="feed-action" id="sortDirection" type="button">Descending</button><button class="feed-action" id="resetFilters" type="button">Reset filters</button></div>
    <div class="feed-toolbar"><button class="feed-action" id="selectMatching" type="button">Select all matching feeds</button><button class="feed-action" id="clearSelection" type="button" disabled>Clear selection</button><button class="feed-action" id="exportSelected" type="button" disabled>Export selected OPML</button><span class="feed-help" id="selectionCount">0 selected</span></div></fieldset>
    ${kind === "activity" ? '<p class="feed-help" id="statsSummary">Feed counts: loading…</p>' : ""}
    <p class="feed-help">Collection results and publication dates describe the snapshot, not a live health check. A quiet feed is not necessarily broken. Copy an RSS URL into your reader, or import the selected feeds as OPML.</p>
    <div class="feed-error" id="feedError" role="alert" hidden><p>The feed-status snapshot could not be loaded.</p><button class="feed-action" id="retryFeeds" type="button">Retry</button></div>
    <p class="feed-count" id="resultCount" role="status" aria-live="polite">Loading feeds…</p><div id="feedResults"></div><button class="feed-action" id="loadMore" type="button" hidden>More feeds</button>
    ${kind === "activity" ? '<details class="feed-added" id="addedSection"><summary>Recently added feeds (five shown)</summary><p class="feed-help">Equal addition timestamps are ordered by name; this is not an exact ordering of those additions.</p><ul id="addedFeeds"></ul></details><p><a class="feed-action" href="../">Back to RSS Watcher</a></p>' : ""}
  </section>
  <!-- feed-activity-view:end -->
`;
}

export function upgradeFeedPage(source, kind) {
  let html = source.replace(/\r\n/g, "\n");
  const path = kind === "activity" ? "/rss-watcher/activity/" : "/microsoft-techcommunity-rss-feeds/";
  if (html.includes("<!-- feed-activity-view:start -->")) html = html.replace(/<!-- feed-activity-view:start -->[\s\S]*?<!-- feed-activity-view:end -->\n?/, markup(kind));
  else {
    const start = html.indexOf('    <section class="stats-grid"'), end = kind === "activity" ? html.indexOf("  </main>", start) : html.indexOf('    <section class="page-notes"', start);
    if (start < 0 || end < start) throw new Error("Feed layout guard");
    html = html.slice(0, start) + markup(kind) + "\n" + html.slice(end);
  }
  html = html.replace("Last refreshed: <strong", "Collection snapshot: <strong");
  if (kind === "activity" && !html.includes('class="tool-breadcrumb"')) html = html.replace('<h1 id="page-title">', '<p class="tool-breadcrumb"><a href="../">&larr; RSS Watcher</a></p><h1 id="page-title">');
  const script = `<script data-feed-activity>(()=>{\n${[publicationState, collectionState, feedCounts, publicationAge, opml].map(fn => fn.toString()).join("\n")}\n(${activityRuntime.toString()})(${JSON.stringify({ kind, data: kind === "activity" ? "../feeds-status.json" : "./feeds-status.json" })},{publicationState,collectionState,feedCounts,publicationAge,opml});\n})();</script>`;
  if (html.includes("<script data-feed-activity>")) html = html.replace(/<script data-feed-activity>[\s\S]*?<\/script>/, () => script);
  else {
    const token = kind === "activity" ? "    const FLAGS =" : "    const DEAD_AFTER_DAYS =";
    const tokenStart = html.indexOf(token), start = html.lastIndexOf("<script>", tokenStart), end = html.indexOf("</script>", tokenStart);
    if (tokenStart < 0 || start < 0 || end < start) throw new Error("Feed controller guard");
    html = html.slice(0, start) + script + html.slice(end + 9);
  }
  html = html.replace(/  <script data-url-state>[\s\S]*?<\/script>/g, "").replace(/<style data-feed-activity>[\s\S]*?<\/style>\n?/g, "");
  html = html.replace("</head>", `<style data-feed-activity>${CSS}</style>\n</head>`);
  html = html.replace(/font-size: 1\.3rem;/g, "font-size: 1.35rem;");
  return enhancePage(html.replace(/\n/g, "\r\n"), { path });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [kind, file] of [["activity", "rss-watcher\\activity\\index.html"], ["techcommunity", "microsoft-techcommunity-rss-feeds\\index.html"]]) {
    const path = join(process.cwd(), file);
    await writeFile(path, upgradeFeedPage(await readFile(path, "utf8"), kind));
  }
  console.log("Updated both feed activity pages.");
}
