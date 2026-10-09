import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { enhancePage } from "../../site-ui.mjs";

export function matchesPeriod(iso, period, now = Date.now()) {
  if (!period) return true;
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) return false;
  const date = new Date(now), today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()), day = 86400000;
  if (period === "yesterday" || period === "1") return value >= today - day && value < today;
  if (period === "0") return value >= today && value < today + day;
  const count = Number(period);
  if (!Number.isInteger(count) || count < 1) throw new Error("Unsupported publication period");
  return value >= today - (count - 1) * day && value < today + day;
}

export function publicationAge(iso, now = Date.now()) {
  if (typeof iso !== "string" || !Number.isFinite(Date.parse(iso)) || !Number.isFinite(now)) return null;
  const current = new Date(now), published = new Date(iso);
  const days = Math.round((Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate())
    - Date.UTC(published.getUTCFullYear(), published.getUTCMonth(), published.getUTCDate())) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  if (days < -1) return `In ${-days} days`;
  if (days < 7) return `${days} days ago`;
  const [count, unit] = days < 30 ? [Math.round(days / 7), "week"] : days < 365 ? [Math.round(days / 30), "month"] : [Math.round(days / 365), "year"];
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

export function productLabel(value) {
  const special = { Aiml: "AI/ML", "Aws Govcloud Us": "AWS GovCloud (US)", "Amazon Appstream 2 0": "Amazon AppStream 2.0" };
  if (special[value]) return special[value];
  const words = { Aws: "AWS", Ec2: "EC2", Ecs: "ECS", Sagemaker: "SageMaker", Cloudfront: "CloudFront", Cloudwatch: "CloudWatch", Workspaces: "WorkSpaces", Appstream: "AppStream", Mwaa: "MWAA", Msk: "MSK", Emr: "EMR", Rds: "RDS", Sql: "SQL", Ami: "AMI", Memorydb: "MemoryDB", Documentdb: "DocumentDB", Opensearch: "OpenSearch", Fsx: "FSx", Netapp: "NetApp", Ontap: "ONTAP", Mediatailor: "MediaTailor", Jumpstart: "JumpStart" };
  return value.split(" ").map(word => words[word] || word).join(" ");
}

export function roadmapDates(description) {
  return [...description.matchAll(/\b(GA|Preview) date:\s*(.*?)(?=\s+(?:GA|Preview) date:|$)/g)].map(match => ({ label: match[1] === "GA" ? "GA target (source wording)" : "Preview target (source wording)", value: match[2].trim() }));
}

export function azureStatusClass(label) {
  if (typeof label !== "string") throw new TypeError("An Azure status label must be a string.");
  switch (label.trim().toLowerCase()) {
    case "general availability":
    case "generally available": return "ga";
    case "public preview":
    case "in preview": return "preview";
    case "private preview": return "private-preview";
    case "in development": return "dev";
    case "retirement": return "retirement";
    case "announcement": return "announcement";
    default: return "default";
  }
}

export function m365StatusClass(label) {
  if (typeof label !== "string") throw new TypeError("A roadmap status label must be a string.");
  switch (label.trim().toLowerCase()) {
    case "in development": return "dev";
    case "rolling out": return "preview";
    case "launched": return "ga";
    case "cancelled": return "retirement";
    default: return "default";
  }
}

function newsRuntime(config, { matchesPeriod, publicationAge, productLabel, roadmapDates, azureStatusClass, m365StatusClass }) {
  const PAGE = 20;
  const defaultPeriod = "0";
  const storageKey = config.slug + "-favorites";
  const el = Object.fromEntries(["newsControls", "search", "lastUpdate", "status", "category", "product", "favoritesFilter", "favoritesFilterLabel", "clearFilters", "retirements", "newsOptions", "resultCount", "updateList", "loadMore", "refreshedAt", "libraryCount", "newsError", "retryNews", "periodSummary"].map(id => [id, document.getElementById(id)]));
  const state = { status: "loading", items: [], filtered: [], visible: PAGE, favorites: new Set(), favoritesOnly: false };
  const STAR = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  const controls = [el.search, el.lastUpdate, el.status, el.category, el.product].filter(Boolean);
  function node(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = text; if (className) element.className = className; return element; }
  function button(label, callback) { const control = node("button", label, "news-action"); control.type = "button"; control.addEventListener("click", callback); return control; }
  function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function formatDate(value, time = false) { const date = new Date(value); return typeof value !== "string" || !value || Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "UTC" }) + " UTC"; }
  function readFavorites() {
    try {
      const values = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(values) || values.some(value => typeof value !== "string")) throw new Error("Invalid saved favorites");
      state.favorites = new Set(values);
    } catch (error) { console.warn("Favorites could not be read.", error); SiteUX.notice("Saved favorites could not be read. A temporary list is available in this page."); }
  }
  function saveFavorites() {
    try { localStorage.setItem(storageKey, JSON.stringify([...state.favorites])); }
    catch (error) { console.warn("Favorites could not be saved.", error); SiteUX.notice("Favorite changed for this page, but browser storage is unavailable."); }
  }
  function sync() {
    SiteUX.updateURL(params => {
      controls.forEach(control => {
        params.delete(control.id);
        if (control.value || (control === el.lastUpdate && defaultPeriod)) params.set(control.id, control.value);
      });
      params.delete("favoritesOnly");
      if (state.favoritesOnly) params.set("favoritesOnly", "1");
    });
  }
  function restore() {
    const params = new URLSearchParams(location.search);
    controls.forEach(control => {
      const value = params.get(control.id) ?? (control === el.lastUpdate ? defaultPeriod : "");
      if (control.tagName === "SELECT" && value && ![...control.options].some(option => option.value === value)) {
        if (control === el.lastUpdate) { control.value = ""; SiteUX.notice("The linked period is unsupported; all retained dates are shown."); return; }
        control.add(new Option(`${value} (not in snapshot)`, value));
      }
      control.value = value;
    });
    state.favoritesOnly = params.get("favoritesOnly") === "1";
    apply(false);
  }
  function card(item) {
    const article = node("article", undefined, "news-entry");
    article.dataset.itemId = item.id;
    const title = node("h2", undefined, "news-title");
    const link = node("a", item.title);
    link.href = item.link; link.target = "_blank"; link.rel = "noopener noreferrer";
    title.append(link);
    const meta = node("div", undefined, "news-meta");
    if (item.statusLabel) {
      const status = node("span", item.statusLabel, "news-status");
      if (config.kind === "azure") status.classList.add("status-badge", azureStatusClass(item.statusLabel));
      else if (config.kind === "m365") status.classList.add("status-badge", m365StatusClass(item.statusLabel));
      else status.classList.add("status-badge", "default");
      meta.append(status);
    }
    const date = node("time", `${config.kind === "m365" ? "Roadmap feed date" : "Published"}: ${formatDate(item.pubDate)}`);
    if (Number.isFinite(Date.parse(item.pubDate))) date.dateTime = item.pubDate;
    meta.append(date);
    const age = publicationAge(item.pubDate);
    if (age !== null) {
      const relative = node("span", age, "update-relative");
      relative.classList.toggle("is-recent", age === "Today" || age === "Yesterday");
      relative.title = `${config.kind === "m365" ? "Roadmap feed" : "Publication"} age based on the current UTC date`;
      meta.append(relative);
    }
    const favorite = button("", () => {
      if (state.favorites.has(item.link)) state.favorites.delete(item.link); else state.favorites.add(item.link);
      saveFavorites();
      if (state.favoritesOnly) { (el.newsOptions.open ? el.favoritesFilter : el.newsOptions.querySelector("summary")).focus({ preventScroll: true }); apply(); }
      else { paintFavorite(); updateFavoriteFilter(); }
    });
    favorite.className = "news-favorite";
    function paintFavorite() {
      const active = state.favorites.has(item.link);
      favorite.innerHTML = STAR;
      favorite.querySelector("path").setAttribute("fill", active ? "currentColor" : "none");
      favorite.setAttribute("aria-pressed", String(active));
      favorite.setAttribute("aria-label", `${active ? "Remove" : "Save"} ${item.title} ${active ? "from" : "to"} browser-local favorites`);
    }
    paintFavorite();
    meta.append(favorite);
    article.append(title, meta);
    if (item.products.length) {
      const tags = node("ul", undefined, "news-products update-tags");
      tags.setAttribute("aria-label", "Products");
      item.products.forEach(product => tags.append(node("li", config.kind === "aws" ? productLabel(product) : product, "update-tag")));
      article.append(tags);
    }
    if (config.kind === "m365") {
      const targets = roadmapDates(item.description);
      if (targets.length) {
        const dates = node("dl", undefined, "news-dates");
        targets.forEach(target => dates.append(node("dt", target.label), node("dd", target.value)));
        article.append(dates);
      }
    }
    article.append(node("p", item.description, "news-description"));
    return article;
  }
  function updateFavoriteFilter() {
    el.favoritesFilterLabel.textContent = `My favorites (${state.favorites.size.toLocaleString("en-US")})`;
    el.favoritesFilter.setAttribute("aria-pressed", String(state.favoritesOnly));
  }
  function render() {
    const shown = state.filtered.slice(0, state.visible);
    el.updateList.replaceChildren();
    if (shown.length) el.updateList.append(...shown.map(card));
    else {
      const empty = node("div", undefined, "news-empty");
      empty.append(node("h2", state.favoritesOnly ? "No saved announcements match" : "No announcements match this period and filters"));
      const newest = state.items.find(item => Number.isFinite(Date.parse(item.pubDate)));
      empty.append(node("p", newest ? `Latest retained ${config.kind === "m365" ? "feed" : "publication"} date: ${formatDate(newest.pubDate)}. Try all retained dates or reset the other filters.` : "No dated announcements are recorded in this snapshot."));
      if (el.lastUpdate.value) empty.append(button("Show latest available dates", () => { el.lastUpdate.value = ""; apply(); el.lastUpdate.focus({ preventScroll: true }); }));
      empty.append(button("Reset all filters", reset));
      el.updateList.append(empty);
    }
    el.resultCount.textContent = `${shown.length} displayed / ${state.filtered.length.toLocaleString("en-US")} matching announcements · ${state.items.length.toLocaleString("en-US")} retained.`;
    el.periodSummary.textContent = `Active period: ${el.lastUpdate.selectedOptions[0]?.textContent || "All retained"} (UTC). Publication/feed dates are separate from the snapshot collection time.`;
    el.loadMore.hidden = shown.length >= state.filtered.length;
    el.loadMore.textContent = `Show ${Math.min(PAGE, state.filtered.length - shown.length)} more announcements`;
    const active = [el.status, el.category, el.product].filter(control => control?.value).length;
    el.newsOptions.querySelector("summary").textContent = `Filters and favorites${active || state.favoritesOnly ? " · " + (active + Number(state.favoritesOnly)) + " active" : ""}`;
    el.clearFilters.hidden = !controls.some(control => control.value) && !state.favoritesOnly;
    if (el.retirements) el.retirements.setAttribute("aria-pressed", String(el.status.value === "Retirement"));
    updateFavoriteFilter();
  }
  function apply(updateUrl = true) {
    if (state.status !== "ready") return;
    clearTimeout(searchTimer);
    const query = normalize(el.search.value.trim());
    state.filtered = state.items.filter(item => (!query || item.haystack.includes(query))
      && (!el.status?.value || item.statusLabel === el.status.value)
      && (!el.category?.value || item.categories.includes(el.category.value))
      && (!el.product.value || item.products.includes(el.product.value))
      && (!state.favoritesOnly || state.favorites.has(item.link))
      && matchesPeriod(item.pubDate, el.lastUpdate.value));
    state.visible = PAGE;
    render();
    if (updateUrl) sync();
  }
  function reset() {
    controls.forEach(control => { control.value = ""; });
    state.favoritesOnly = false;
    apply();
    el.search.focus({ preventScroll: true });
  }
  function populate(select, values, label) {
    if (!select) return;
    select.replaceChildren(new Option(label, ""));
    [...new Set(values)].sort().forEach(value => select.add(new Option(config.kind === "aws" ? productLabel(value) : value, value)));
  }
  async function load() {
    if (state.status === "fetching") return;
    const retrying = document.activeElement === el.retryNews;
    state.status = "fetching";
    el.newsControls.disabled = true;
    el.newsError.hidden = true;
    el.retryNews.disabled = true;
    el.updateList.setAttribute("aria-busy", "true");
    el.refreshedAt.textContent = "Loading…";
    try {
      const payload = await SiteUX.fetchJSON("./updates.json");
      if (!Array.isArray(payload.items)) throw new Error("Missing announcements");
      state.items = payload.items.map(item => {
        const products = config.kind === "aws" ? item.products : item.tags;
        const categories = config.kind === "aws" ? item.topics : [];
        if (!item || typeof item.id !== "string" || typeof item.title !== "string" || typeof item.description !== "string"
          || typeof item.pubDate !== "string" || (item.statusLabel != null && typeof item.statusLabel !== "string") || !Array.isArray(products) || !Array.isArray(categories)
          || [...products, ...categories].some(value => typeof value !== "string")) throw new Error("Invalid announcement");
        const link = new URL(item.link);
        if (!["http:", "https:"].includes(link.protocol) || link.username || link.password) throw new Error("Invalid announcement source");
        const description = item.description.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
        return { ...item, description, products, categories, haystack: normalize([item.title, description, item.id, ...products, ...categories, ...products.map(productLabel)].join(" ")) };
      }).sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
      populate(el.status, state.items.map(item => item.statusLabel), "All statuses");
      populate(el.category, state.items.flatMap(item => item.categories), "All categories");
      populate(el.product, state.items.flatMap(item => item.products), "All products");
      if (el.retirements) el.retirements.disabled = !state.items.some(item => item.statusLabel === "Retirement");
      el.refreshedAt.textContent = formatDate(payload.generatedAt, true);
      if (el.libraryCount) el.libraryCount.textContent = `${state.items.length.toLocaleString("en-US")} retained announcements`;
      state.status = "ready";
      el.newsControls.disabled = false;
      restore();
    } catch (error) {
      console.error("Release announcements could not be loaded.", error);
      state.status = "error";
      el.newsError.hidden = false;
      el.refreshedAt.textContent = "Unavailable";
      if (el.libraryCount) el.libraryCount.textContent = "Announcement count unavailable";
      el.resultCount.textContent = "Announcements unavailable. Retry to load the snapshot.";
      el.updateList.replaceChildren();
      el.loadMore.hidden = true;
    } finally {
      el.retryNews.disabled = false;
      el.updateList.setAttribute("aria-busy", "false");
      if (retrying) (state.status === "ready" ? el.search : el.retryNews).focus({ preventScroll: true });
    }
  }
  let searchTimer;
  el.search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => apply(), 120); });
  controls.filter(control => control !== el.search).forEach(control => control.addEventListener("change", () => apply()));
  el.favoritesFilter.addEventListener("click", () => { state.favoritesOnly = !state.favoritesOnly; apply(); });
  el.clearFilters.addEventListener("click", reset);
  el.retryNews.addEventListener("click", load);
  el.retirements?.addEventListener("click", () => { el.status.value = el.status.value === "Retirement" ? "" : "Retirement"; apply(); });
  el.loadMore.addEventListener("click", () => { const old = state.visible; state.visible += PAGE; render(); const link = el.updateList.querySelectorAll(".news-title a")[old]; if (link) { link.focus({ preventScroll: true }); link.scrollIntoView({ block: "start", behavior: "instant" }); } });
  window.addEventListener("popstate", () => { if (state.status === "ready") restore(); });
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  const back = document.getElementById("backToTop");
  window.addEventListener("scroll", () => back.classList.toggle("visible", scrollY > 600), { passive: true });
  back.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  readFavorites();
  load();
}

const CSS = `
  .news-controls{border:0;padding:0;margin:0;min-width:0;}
  .news-primary{display:grid;grid-template-columns:minmax(0,2fr) minmax(9rem,1fr);gap:.75rem;}
  .news-field{min-width:0;}
  .news-field label{display:block;margin-bottom:.4rem;font-size:.85rem;font-weight:600;}
  .news-field input,.news-field select{width:100%;min-width:0;height:3rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:8px;background:var(--cp-surface);color:var(--cp-text);}
  .news-field input::placeholder{color:var(--cp-text-muted);}
  .news-options>summary{min-height:2.75rem;padding-block:.65rem;cursor:pointer;color:var(--cp-link);font-size:.85rem;}
  .news-secondary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;}
  .news-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:.75rem 0;}
  .news-action{display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font:inherit;font-size:.85rem;cursor:pointer;}
  .news-action[aria-pressed="true"]{background:var(--cp-accent-soft);border-color:var(--cp-accent);font-weight:700;}
  .favorites-filter{display:inline-flex;align-items:center;gap:.4rem;min-height:2.75rem;padding:.375rem .75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);cursor:pointer;font-weight:650;font-size:.85rem;}
  .favorites-filter svg{width:1rem;height:1rem;flex:none;}
  .favorites-filter:hover{border-color:var(--cp-accent);color:var(--cp-accent);}
  .favorites-filter[aria-pressed="true"]{border-color:var(--cp-warning);background:var(--cp-warning-bg);color:var(--cp-warning);}
  .favorites-filter[aria-pressed="true"] svg path{fill:currentColor;}
  .news-help,.news-count{max-width:85ch;color:var(--cp-text-muted);font-size:.85rem;line-height:1.5;margin:.75rem 0;}
  .news-results{display:grid;gap:1rem;}
  .news-entry{padding:1rem;border:1px solid var(--cp-border);border-radius:8px;background:var(--cp-surface);scroll-margin-top:6rem;min-width:0;}
  .news-title{margin:0 0 .5rem;font-size:1.2rem;line-height:1.4;}
  .news-title a{color:var(--cp-text);text-decoration:none;overflow-wrap:anywhere;}
  .news-title a:hover{text-decoration:underline;color:var(--cp-link);}
  .news-meta{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .75rem;font-size:.8rem;color:var(--cp-text-muted);}
  .news-status{font-weight:650;color:var(--cp-text);}
  .news-status.status-badge{display:inline-flex;align-items:center;min-height:1.75rem;max-width:100%;padding:.25rem .65rem;border:1px solid currentColor;border-radius:999px;font-size:.75rem;font-weight:700;line-height:1.3;white-space:normal;overflow-wrap:anywhere;}
  .news-status.status-badge.private-preview{background:var(--cp-violet-bg);color:var(--cp-violet);}
  .news-status.status-badge.default{background:var(--cp-surface-soft);color:var(--cp-text-muted);}
  .news-meta .update-relative{min-height:1.75rem;padding:.25rem .65rem;border:1px solid var(--cp-border-strong);line-height:1.3;}
  .news-meta .update-relative.is-recent{background:var(--cp-accent);color:var(--cp-accent-fg);border-color:var(--cp-accent);}
  .news-favorite{display:inline-flex;align-items:center;justify-content:center;flex:none;width:2.75rem;height:2.75rem;padding:0;margin-left:auto;border:1px solid var(--cp-border);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);cursor:pointer;}
  .news-favorite[aria-pressed="true"]{color:var(--cp-link);border-color:var(--cp-accent);}
  .news-products{margin:.5rem 0;color:var(--cp-text-muted);font-size:.8rem;line-height:1.5;}
  .news-products.update-tags{padding:0;list-style:none;}
  .news-products .update-tag{max-width:100%;overflow-wrap:anywhere;}
  .news-description{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin:.5rem 0;color:var(--cp-text-muted);font-size:.9rem;line-height:1.55;}
  .news-dates{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.25rem .75rem;font-size:.85rem;}
  .news-dates dt{font-weight:600;}.news-dates dd{margin:0;}
  .news-empty,.news-error{padding:1rem;border:1px dashed var(--cp-border-strong);border-radius:8px;line-height:1.6;}
  .news-empty h2{font-size:1.2rem;margin-top:0;}.news-empty .news-action{margin:.25rem;}
  .news-error{color:var(--cp-danger);border-color:var(--cp-danger);background:var(--cp-danger-bg);}
  .news-more{display:block;margin:1rem auto;}
  @media(max-width:48rem){.news-secondary,.news-dates{grid-template-columns:minmax(0,1fr);}}
`;

function markup(kind) {
  const aws = kind === "aws";
  return `<!-- release-news-view:start -->
  <section aria-label="Release announcements">
    <fieldset class="news-controls" id="newsControls" disabled>
      <div class="news-primary"><div class="news-field"><label for="search">Search announcements</label><input id="search" type="search" placeholder="Title, description or product" autocomplete="off"></div><div class="news-field"><label for="lastUpdate">${kind === "m365" ? "Feed-date period" : "Publication period"}</label><select id="lastUpdate"><option value="">All retained</option><option value="0" selected>Today</option><option value="yesterday">Yesterday</option><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></div></div>
      <details class="news-options" id="newsOptions"><summary>Filters and favorites</summary><div class="news-secondary"><div class="news-field"><label for="${aws ? "category" : "status"}">${aws ? "Category" : "Status"}</label><select id="${aws ? "category" : "status"}"><option value="">All ${aws ? "categories" : "statuses"}</option></select></div><div class="news-field"><label for="product">Product</label><select id="product"><option value="">All products</option></select></div></div><div class="news-actions"><button class="favorites-filter" id="favoritesFilter" type="button" aria-pressed="false"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg><span id="favoritesFilterLabel">My favorites (0)</span></button></div><p class="news-help">Favorites stay in this browser. A shared filtered URL does not transfer your saved list.</p></details>
      <div class="news-actions">${kind === "azure" ? '<button class="news-action" id="retirements" type="button" aria-pressed="false">Retirements</button>' : ""}<button class="news-action" id="clearFilters" type="button" hidden>Reset filters</button></div>
    </fieldset>
    <p class="news-help" id="periodSummary"></p>
    ${kind === "m365" ? '<details class="news-options"><summary>Roadmap dates and statuses</summary><p class="news-help">Feed date is the date carried by the RSS entry, not a guaranteed deployment start. GA and Preview targets retain the roadmap wording and may change. In development is planned work; Rolling out is an ongoing rollout; Launched is a source status, not proof that every tenant already has the feature. Cancelled entries are not a promise of delivery.</p></details>' : ""}
    <div class="news-error" id="newsError" role="alert" hidden><p>The announcement snapshot could not be loaded or validated.</p><button class="news-action" id="retryNews" type="button">Retry</button></div>
    <p class="news-count" id="resultCount" role="status" aria-live="polite">Loading announcements…</p><div class="news-results" id="updateList" aria-busy="true"></div><button class="news-action news-more" id="loadMore" type="button" hidden>More announcements</button>
  </section>
  <!-- release-news-view:end -->
`;
}

export function upgradeNewsPage(source, kind, slug) {
  let html = source.replace(/\r\n/g, "\n");
  if (html.includes("<!-- release-news-view:start -->")) html = html.replace(/<!-- release-news-view:start -->[\s\S]*?<!-- release-news-view:end -->\n?/, markup(kind));
  else {
    const start = html.indexOf('    <section aria-label="Update browser">'), end = html.indexOf('    <section class="page-notes"', start);
    if (start < 0 || end < start) throw new Error(`News layout guard: ${kind}`);
    html = html.slice(0, start) + markup(kind) + "\n" + html.slice(end);
  }
  html = html.replace(/refreshed twice daily/gi, "collected automatically");
  html = html.replace(/refreshed twice a day/gi, "collected on the schedule listed on Workflows");
  const intro = kind === "m365" ? "Microsoft 365 roadmap entries with source status and target-date wording." : `${kind === "azure" ? "Azure" : "AWS"} service announcements from the official feed.`;
  html = html.replace(/<p class="intro-text">[\s\S]*?<\/p>/, `<p class="intro-text">${intro} <a href="/workflows/">View the collection schedule</a>.</p>`);
  html = html.replace("Last refreshed: <strong", "Snapshot collected: <strong");
  const script = `<script data-release-news>(()=>{\n${[matchesPeriod, publicationAge, productLabel, roadmapDates, azureStatusClass, m365StatusClass].map(fn => fn.toString()).join("\n")}\n(${newsRuntime.toString()})(${JSON.stringify({ kind, slug })},{matchesPeriod,publicationAge,productLabel,roadmapDates,azureStatusClass,m365StatusClass});\n})();</script>`;
  if (html.includes("<script data-release-news>")) html = html.replace(/<script data-release-news>[\s\S]*?<\/script>/, () => script);
  else {
    const start = html.indexOf("  <script>\n    const DEFAULT_PAGE_SIZE = 40;"), end = html.indexOf("</script>", start);
    if (start < 0 || end < start) throw new Error(`News controller guard: ${kind}`);
    html = html.slice(0, start) + script + html.slice(end + 9);
  }
  html = html.replace(/  <script data-url-state>[\s\S]*?<\/script>/g, "").replace(/<style data-release-news>[\s\S]*?<\/style>\n?/g, "");
  html = html.replace("</head>", `<style data-release-news>${CSS}</style>\n</head>`);
  return enhancePage(html.replace(/\n/g, "\r\n"), { path: `/${slug}/` });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [kind, slug] of [["azure", "azure-release-updates"], ["m365", "m365-release-updates"], ["aws", "aws-release-updates"]]) {
    const path = join(process.cwd(), slug, "index.html");
    await writeFile(path, upgradeNewsPage(await readFile(path, "utf8"), kind, slug));
  }
  console.log("Updated three standalone release catalogues.");
}
