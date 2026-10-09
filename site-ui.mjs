// Build-time shared behavior, embedded inline so every published page remains standalone.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const START = "<!-- site-ui:start -->";
const END = "<!-- site-ui:end -->";

export function parseToolNavigation(catalogue) {
  const tools = [...catalogue.matchAll(/<article class="tool-card" data-tool-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)].map(([, href, card]) => {
    const title = card.match(/<h2\b[^>]*>([^<]+)<\/h2>/)?.[1];
    const description = card.match(/<p>([^<]+)<\/p>/)?.[1];
    const icon = card.match(/<img src="(\/tools\/images\/[a-z0-9-]+\.(?:svg|png))"/)?.[1];
    const symbol = card.match(/<span class="tool-icon" aria-hidden="true">([^<]+)<\/span>/)?.[1];
    if (!/^\/[a-z0-9-]+\/$/.test(href) || !title || !description || (!icon && !symbol)
      || !card.includes(`class="tool-link" href="${href}"`)) {
      throw new Error(`Invalid tool navigation entry: ${href}`);
    }
    return { href, title, description, icon, symbol };
  });
  if (!tools.length || new Set(tools.map(tool => tool.href)).size !== tools.length) {
    throw new Error("The tool navigation catalogue is empty or has duplicate destinations.");
  }
  return tools.sort((a, b) => a.title.localeCompare(b.title, "en"));
}

let toolNavigation;
function toolSwitcherMarkup(path) {
  toolNavigation ??= parseToolNavigation(readFileSync(join(ROOT, "tools", "index.html"), "utf8"));
  if (path !== "/tools/" && !toolNavigation.some(tool => path.startsWith(tool.href))) return "";
  const links = toolNavigation.map(tool => {
    const current = path.startsWith(tool.href);
    const icon = tool.icon ? `<img src="${tool.icon}" alt="" width="20" height="20" loading="lazy">` : tool.symbol;
    return `<li data-tool-keywords="${tool.description.replace(/"/g, "&quot;")}"><a class="site-tool-link" href="${tool.href}"${current ? ` aria-current="${path === tool.href ? "page" : "location"}"` : ""}><span class="site-tool-icon" aria-hidden="true">${icon}</span><span class="site-tool-name">${tool.title}</span>${current ? '<span class="site-tool-current">Current</span>' : ""}</a></li>`;
  }).join("\n");
  return `<!-- tool-switcher:start -->
<details class="site-tool-switcher" id="siteToolSwitcher">
  <summary aria-controls="siteToolPanel"><span>Switch tool</span><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></summary>
  <div class="site-tool-panel" id="siteToolPanel">
    <div class="site-tool-search" hidden><label for="siteToolSearch">Find a tool</label><input id="siteToolSearch" type="search" placeholder="Search tools..." autocomplete="off" spellcheck="false" aria-controls="siteToolLinks"></div>
    <p class="site-tool-count" id="siteToolCount" role="status" aria-live="polite" aria-atomic="true">${toolNavigation.length} tools</p>
    <nav class="site-tool-list" aria-label="Switch to another tool"><ul id="siteToolLinks">${links}</ul><div class="site-tool-empty" hidden><p>No tools match your search.</p><button class="site-ux-button" type="button" data-tool-search-clear>Clear search</button></div></nav>
    <a class="site-tool-catalogue" href="/tools/"${path === "/tools/" ? ' aria-current="page"' : ""}>All tools</a>
  </div>
</details>
<!-- tool-switcher:end -->`;
}

export const siteStyles = `
  .site-header .menu-toggle,.site-header .theme-toggle,.site-header .social-link,.news-banner-close { min-width:2.75rem;min-height:2.75rem;width:2.75rem;height:2.75rem; }
  .site-header .header-links a { min-height:2.75rem; }
  .site-footer .footer-group { gap:.25rem; }
  .site-footer .footer-group > a { min-height:1.5rem; }
  .site-header .header-links a[aria-current] { color:var(--cp-text);font-weight:700;text-decoration:underline;text-underline-offset:.35rem; }
  .news-banner-text { animation:none!important;padding-left:0!important;transform:none!important; }
  .news-banner-track { white-space:normal!important;mask-image:none!important;-webkit-mask-image:none!important; }
  .news-banner,.news-banner-text a,.news-banner-close { color:var(--cp-accent-fg); }
  :root[data-theme="dark"] { --cp-accent-fg:#0c1420; }
  .back-to-top:not(.visible) { visibility:hidden; }
  .back-to-top.visible { visibility:visible; }
  button:is(.favorite-button,.fav-button,.news-favorite,.favorites-filter)[aria-pressed="true"] { color:var(--cp-warning);border-color:var(--cp-warning);background:var(--cp-warning-bg); }
  button:is(.favorite-button,.fav-button,.news-favorite,.favorites-filter)[aria-pressed="true"] svg,button:is(.favorite-button,.fav-button,.news-favorite,.favorites-filter)[aria-pressed="true"] svg path { fill:currentColor; }
  .site-privacy-choices { min-height:2.75rem;padding:.4rem .6rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font:inherit;cursor:pointer; }
  .site-privacy-choices:focus-visible,.site-ux-button:focus-visible,.site-ux-dialog textarea:focus-visible { outline:3px solid var(--cp-accent);outline-offset:2px; }
  .site-ux-status { position:fixed;left:50%;bottom:1rem;transform:translateX(-50%);z-index:1000;max-width:min(40rem,calc(100% - 2rem));margin:0;padding:.65rem 1rem;border:1px solid var(--cp-border-strong);border-radius:8px;background:var(--cp-panel-strong);color:var(--cp-text);font-size:.9rem;line-height:1.5;pointer-events:none; }
  .site-ux-status:empty { display:none; }
  .site-ux-dialog { width:min(44rem,calc(100% - 2rem));max-height:calc(100dvh - 2rem);overflow:auto;padding:1.25rem;border:1px solid var(--cp-border-strong);border-radius:10px;background:var(--cp-surface);color:var(--cp-text); }
  .site-ux-dialog::backdrop { background:rgba(10,17,28,.84); }
  .site-ux-dialog h2 { margin:0 0 .75rem;font-size:1.35rem; }
  .site-ux-dialog p { line-height:1.6; }
  .site-ux-dialog textarea { display:block;width:100%;min-height:8rem;max-height:50dvh;padding:.75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface-soft);color:var(--cp-text);font-family:ui-monospace,monospace;font-size:.85rem; }
  .site-ux-actions { display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem; }
  .site-ux-button { display:inline-flex;align-items:center;justify-content:center;min-height:2.75rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font:inherit;font-size:.85rem;cursor:pointer; }
  .site-header .header-inner:has(.site-tool-switcher) { position:relative; }
  .site-tool-switcher { flex:none; }
  .site-tool-switcher > summary { display:flex;align-items:center;justify-content:center;gap:.5rem;min-height:2.75rem;padding:.5rem .625rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface);color:var(--cp-text);font-size:.85rem;font-weight:600;white-space:nowrap;cursor:pointer;list-style:none; }
  .site-tool-switcher > summary::-webkit-details-marker { display:none; }
  .site-tool-switcher > summary:hover,.site-tool-switcher[open] > summary { border-color:var(--cp-accent);background:var(--cp-accent-soft); }
  .site-tool-switcher[open] > summary svg { transform:rotate(180deg); }
  .site-tool-panel { position:absolute;right:0;top:calc(100% + .5rem);z-index:40;display:flex;flex-direction:column;width:min(30rem,calc(100vw - 2rem));max-height:min(36rem,calc(100dvh - 10rem));padding:.75rem;border:1px solid var(--cp-border-strong);border-radius:10px;background:var(--cp-surface);color:var(--cp-text);box-shadow:0 8px 24px rgba(10,17,28,.18); }
  .site-tool-switcher:not([open]) > .site-tool-panel,.site-tool-switcher [hidden] { display:none; }
  .site-tool-search { display:grid;gap:.375rem;flex:none; }
  .site-tool-search label { font-size:.85rem;font-weight:600; }
  .site-tool-search input { min-width:0;width:100%;height:2.75rem;padding:.5rem .75rem;border:1px solid var(--cp-border-strong);border-radius:6px;background:var(--cp-surface-soft);color:var(--cp-text);font:inherit;font-size:1rem; }
  .site-tool-search input::placeholder { color:var(--cp-text-muted);opacity:1; }
  .site-tool-panel .site-tool-count { flex:none;margin:.5rem 0;font-size:.8rem;color:var(--cp-text-muted); }
  .site-tool-list { min-height:0;overflow:auto;overscroll-behavior:contain; }
  .site-tool-list ul { padding:0;margin:0;list-style:none; }
  .site-tool-list li { margin:0; }
  .site-tool-link { display:grid;grid-template-columns:1.25rem minmax(0,1fr) auto;align-items:center;gap:.625rem;min-height:2.75rem;padding:.5rem;border-radius:6px;color:var(--cp-text);font-size:.9rem;line-height:1.4;text-decoration:none; }
  .site-tool-link img { width:1.25rem;height:1.25rem;object-fit:contain; }
  .site-tool-icon { display:flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;font-size:1rem; }
  .site-tool-link > span { min-width:0;overflow-wrap:anywhere; }
  .site-tool-link:hover,.site-tool-link[aria-current] { background:var(--cp-accent-soft);color:var(--cp-link); }
  .site-tool-current { font-size:.75rem;font-weight:600; }
  .site-tool-empty { padding:.5rem; }
  .site-tool-empty p { margin:0 0 .5rem;font-size:.9rem; }
  .site-tool-catalogue { flex:none;display:flex;align-items:center;min-height:2.75rem;margin-top:.5rem;border-top:1px solid var(--cp-border);color:var(--cp-link);font-size:.85rem; }
  .site-tool-switcher :is(summary,input,a,button):focus-visible { outline:3px solid var(--cp-accent);outline-offset:2px; }
  .site-tool-link:focus-visible { outline-offset:-3px; }
  @media(max-width:48rem) { .site-header .header-inner:has(.site-tool-switcher) { gap:.5rem; } }
  .site-footer .footer-main > * { min-width:0; }
  @media(max-width:64rem) { .site-footer .footer-main { grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem; }.site-footer .footer-about{grid-column:1/-1;} }
  @media(max-width:32rem) { .site-footer .footer-main { grid-template-columns:minmax(0,1fr); }.site-footer .footer-about{grid-column:auto;} .site-footer .footer-group > a{min-height:2rem;} .filter-bar input:not([type="checkbox"]):not([type="radio"]),.filter-bar select{flex:none;min-width:0;width:100%;max-width:100%;min-height:3rem;} }
  @media print { .site-privacy-choices,.site-ux-status,.site-ux-dialog,.site-tool-switcher{display:none!important;} }
`;

function siteRuntime(config) {
  const french = config.language === "fr";
  let status, statusTimer, copyDialog, returnFocus, consentPending = false;
  let savedTheme;
  try { savedTheme = localStorage.getItem("site-theme"); }
  catch (error) { console.warn("Theme preference unavailable; using the system preference.", error); }
  const darkTheme = savedTheme === "dark" || (savedTheme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  if (darkTheme) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  function text(tag, value, className) {
    const node = document.createElement(tag);
    if (value !== undefined) node.textContent = value;
    if (className) node.className = className;
    return node;
  }
  function notice(message, duration = 7000) {
    if (!status) {
      status = text("p", "", "site-ux-status");
      status.id = "siteUxStatus";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      document.body.append(status);
    }
    clearTimeout(statusTimer);
    status.textContent = message;
    if (duration) statusTimer = setTimeout(() => { status.textContent = ""; }, duration);
  }
  function manualCopy(value, label, source) {
    if (!copyDialog) {
      copyDialog = text("dialog", undefined, "site-ux-dialog");
      copyDialog.id = "siteCopyDialog";
      copyDialog.setAttribute("aria-labelledby", "siteCopyHeading");
      const heading = text("h2", "", "");
      heading.id = "siteCopyHeading";
      const explanation = text("p", french ? "La copie automatique a été refusée. Sélectionnez le texte et copiez-le manuellement." : "Automatic copying was denied. Select the text and copy it manually.");
      const area = document.createElement("textarea");
      area.readOnly = true;
      area.setAttribute("aria-label", french ? "Texte à copier" : "Text to copy");
      const actions = text("div", undefined, "site-ux-actions");
      const select = text("button", french ? "Tout sélectionner" : "Select all", "site-ux-button");
      select.type = "button";
      select.addEventListener("click", () => { area.focus(); area.select(); });
      const close = text("button", french ? "Fermer" : "Close", "site-ux-button");
      close.type = "button";
      close.addEventListener("click", () => copyDialog.close());
      actions.append(select, close);
      copyDialog.append(heading, explanation, area, actions);
      copyDialog.addEventListener("close", () => { if (returnFocus?.isConnected && returnFocus.checkVisibility()) returnFocus.focus({ preventScroll: true }); });
      document.body.append(copyDialog);
    }
    returnFocus = source || document.activeElement;
    copyDialog.querySelector("h2").textContent = (french ? "Copier : " : "Copy: ") + label;
    copyDialog.querySelector("textarea").value = value;
    if (!copyDialog.open) copyDialog.showModal();
    copyDialog.querySelector("textarea").focus();
    copyDialog.querySelector("textarea").select();
  }
  async function copy(value, label = "Value", control) {
    try {
      await navigator.clipboard.writeText(String(value));
      notice(french ? `${label} copié.` : `${label} copied.`);
      if (control) { control.classList.add("is-copied"); setTimeout(() => control.classList.remove("is-copied"), 1600); }
      return true;
    } catch (error) {
      console.warn("Clipboard access unavailable.", error);
      notice(french ? "Copie automatique indisponible." : "Automatic copying is unavailable.");
      manualCopy(String(value), label, control);
      return false;
    }
  }
  function download(value, filename, mime = "text/plain;charset=utf-8", label = filename) {
    let url;
    const link = document.createElement("a");
    try {
      url = URL.createObjectURL(new Blob([value], { type: mime }));
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      notice(french ? `Téléchargement demandé : ${label}.` : `Download requested: ${label}.`);
      return true;
    } catch (error) {
      console.error("Download could not be started.", error);
      notice(french ? "Téléchargement indisponible. Une copie manuelle est proposée." : "Download unavailable. A manual copy is available.");
      manualCopy(String(value), label);
      return false;
    } finally {
      link.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
  async function fetchJSON(url, timeout = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`Request failed (${response.status}) for ${url}`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function updateURL(change, push = false) {
    try {
      const url = new URL(location.href);
      change(url.searchParams, url);
      if (url.href !== location.href) history[push ? "pushState" : "replaceState"](history.state, "", url);
      window.dispatchEvent(new Event("siteurlchange"));
    } catch (error) {
      console.warn("URL state could not be updated.", error);
      notice(french ? "La vue fonctionne, mais son adresse n'a pas pu être actualisée." : "The view works, but its address could not be updated.");
    }
  }
  function privacyChoices(control) {
    if (consentPending) return;
    consentPending = true;
    if (control) control.disabled = true;
    let finished = false;
    const finish = message => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      consentPending = false;
      if (control) control.disabled = false;
      notice(message, 12000);
    };
    const unavailable = french
      ? "Le gestionnaire de consentement n'est pas disponible (chargement bloqué, message non configuré ou région non concernée). Aucun nouvel enregistrement de choix n'est confirmé."
      : "The consent manager is unavailable (blocked loading, unpublished message or inapplicable region). No newly saved choices have been confirmed.";
    const timer = setTimeout(() => finish(unavailable), 10000);
    notice(french ? "Ouverture du gestionnaire de consentement…" : "Opening the consent manager…");
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => {
      if (finished) return;
      try {
        if (typeof window.googlefc.showRevocationMessage !== "function") { finish(unavailable); return; }
        window.googlefc.showRevocationMessage();
        finish(french ? "Le dialogue Google a été demandé. Vérifiez vos choix dans ce dialogue." : "The Google consent dialog was requested. Review your choices in that dialog.");
      } catch (error) { console.warn("Consent manager could not be opened.", error); finish(unavailable); }
    } });
    if (!document.querySelector('script[src*="fundingchoicesmessages.google.com/i/"]') && typeof window.googlefc.showRevocationMessage !== "function") {
      const script = document.createElement("script");
      script.src = "https://fundingchoicesmessages.google.com/i/pub-6636684537203477?ers=1";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("error", () => { script.remove(); finish(unavailable); });
      document.head.append(script);
    }
  }
  window.SiteUX = { copy, download, fetchJSON, updateURL, notice, privacyChoices };
  function setupToolSwitcher(menu, nav) {
    const switcher = document.getElementById("siteToolSwitcher");
    if (!switcher) return;
    const summary = switcher.querySelector("summary");
    const search = document.getElementById("siteToolSearch");
    const items = [...switcher.querySelectorAll("#siteToolLinks > li")];
    const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const indexed = items.map(item => ({ item, text: normalize(`${item.querySelector(".site-tool-name").textContent} ${item.dataset.toolKeywords} ${item.querySelector("a").getAttribute("href")}`) }));
    const visibleLinks = () => items.filter(item => !item.hidden).map(item => item.querySelector("a"));
    const close = restore => {
      switcher.open = false;
      if (restore) summary.focus({ preventScroll: true });
    };
    function filter() {
      const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
      indexed.forEach(({ item, text }) => { item.hidden = !terms.every(term => text.includes(term)); });
      const count = visibleLinks().length;
      document.getElementById("siteToolCount").textContent = terms.length ? `${count} of ${items.length} tools` : `${items.length} tools`;
      switcher.querySelector(".site-tool-empty").hidden = count !== 0;
      switcher.querySelector(".site-tool-list").scrollTop = 0;
    }
    switcher.querySelector(".site-tool-search").hidden = false;
    switcher.addEventListener("toggle", () => {
      if (!switcher.open) return;
      nav?.classList.remove("nav-open");
      menu?.setAttribute("aria-expanded", "false");
      search.value = "";
      filter();
      search.focus({ preventScroll: true });
    });
    search.addEventListener("input", filter);
    switcher.querySelector("[data-tool-search-clear]").addEventListener("click", () => {
      search.value = "";
      filter();
      search.focus();
    });
    switcher.addEventListener("keydown", event => {
      if (event.key === "Escape" && switcher.open) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      }
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
      const links = visibleLinks(), index = links.indexOf(document.activeElement);
      if (event.target === search && event.key === "Enter" && search.value.trim() && links.length === 1) {
        event.preventDefault();
        links[0].click();
      } else if ((event.target === search || index >= 0) && ["ArrowDown", "ArrowUp"].includes(event.key) && links.length) {
        event.preventDefault();
        const next = index < 0 ? (event.key === "ArrowDown" ? 0 : links.length - 1)
          : (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links[next].focus();
      } else if (index >= 0 && ["Home", "End"].includes(event.key)) {
        event.preventDefault();
        links[event.key === "Home" ? 0 : links.length - 1].focus();
      }
    });
    switcher.addEventListener("click", event => {
      const link = event.target.closest("a[href]");
      if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) close(true);
    });
    document.addEventListener("click", event => { if (!switcher.contains(event.target)) close(false); });
    document.addEventListener("focusin", event => { if (switcher.open && !switcher.contains(event.target)) close(false); });
    menu?.addEventListener("click", () => close(false));
    window.addEventListener("pagehide", () => close(false));
    window.addEventListener("pageshow", event => { if (event.persisted && switcher.open) close(false); });
  }
  function init() {
    const menu = document.getElementById("menuToggle");
    const nav = document.getElementById("primaryNav");
    if (menu && nav && config.menu) {
      const close = restore => {
        const wasOpen = nav.classList.contains("nav-open");
        nav.classList.remove("nav-open");
        menu.setAttribute("aria-expanded", "false");
        if (restore && wasOpen) menu.focus({ preventScroll: true });
      };
      menu.addEventListener("click", event => {
        event.stopPropagation();
        const open = !nav.classList.contains("nav-open");
        nav.classList.toggle("nav-open", open);
        menu.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", event => { if (event.target.closest("a")) close(false); });
      document.addEventListener("click", event => { if (!nav.contains(event.target) && !menu.contains(event.target)) close(false); });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("dialog[open]")) close(true);
      });
      window.addEventListener("resize", () => { if (getComputedStyle(menu).display === "none") close(false); });
    }
    setupToolSwitcher(menu, nav);
    const theme = document.getElementById("themeToggle");
    function themeLabel() {
      if (!theme) return;
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const label = french ? (dark ? "Activer le thème clair" : "Activer le thème sombre") : (dark ? "Switch to light theme" : "Switch to dark theme");
      theme.setAttribute("aria-label", label);
      theme.title = label;
    }
    if (theme && config.theme) theme.addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      if (dark) document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", "dark");
      try { localStorage.setItem("site-theme", dark ? "light" : "dark"); }
      catch (error) { console.warn("Theme preference could not be saved.", error); notice(french ? "Thème modifié pour cette page ; préférence non enregistrée." : "Theme changed for this page; the preference could not be saved."); }
      themeLabel();
    });
    themeLabel();
    const banner = document.getElementById("newsBanner");
    if (banner && config.banner) document.getElementById("newsBannerClose")?.addEventListener("click", () => {
      banner.hidden = true;
      try { localStorage.setItem("news-banner-dismissed", "2026-08-21"); }
      catch (error) { console.warn("Banner preference could not be saved.", error); notice(french ? "Le bandeau est fermé pour cette page." : "The banner is dismissed for this page."); }
      (document.querySelector(".site-header .brand") || menu)?.focus({ preventScroll: true });
    });
    if (nav && !config.errorPage) {
      const page = config.path;
      const destination = page === "/" || page === "/index_fr.html" ? (page === "/index_fr.html" ? "/index_fr.html" : "/")
        : page.startsWith("/articles/") ? "/articles/" : page.startsWith("/privacy/") ? "" : "/tools/";
      nav.querySelectorAll("a").forEach(link => {
        const target = new URL(link.href, location.href).pathname;
        link.removeAttribute("aria-current");
        if (target === destination) link.setAttribute("aria-current", target === page ? "page" : "location");
      });
    }
    document.querySelectorAll("[data-privacy-choices]").forEach(control => control.addEventListener("click", () => privacyChoices(control)));
    document.addEventListener("click", event => {
      const favorite = event.target.closest('[data-share="favorite"]');
      if (!favorite) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const hint = favorite.closest(".footer-share")?.querySelector("[data-share-hint]");
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const mac = /Mac/i.test(navigator.userAgent);
      const message = mobile ? (french ? "Utilisez le menu Partager ou le menu du navigateur, puis Ajouter aux favoris." : "Use your browser's Share or menu action, then Add Bookmark.")
        : (french ? "Utilisez " : "Press ") + (mac ? "⌘" : "Ctrl") + (french ? " + D pour ajouter un favori du navigateur." : " + D to create a browser bookmark.");
      if (hint) hint.textContent = message;
      notice(message);
    }, true);
    document.querySelectorAll('[data-share="favorite"]').forEach(button => {
      const label = french ? "Favori du navigateur" : "Browser bookmark";
      button.setAttribute("aria-label", label);
      const textNode = [...button.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
      if (textNode) textNode.textContent = label;
    });
    function updateShareLinks() {
      const root = document.querySelector(".footer-share");
      if (!root) return;
      const url = encodeURIComponent(location.href.split("#")[0]), title = encodeURIComponent(document.title);
      const targets = { linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + url, twitter: "https://twitter.com/intent/tweet?url=" + url + "&text=" + title,
        reddit: "https://www.reddit.com/submit?url=" + url + "&title=" + title, mail: "mailto:?subject=" + title + "&body=" + url };
      root.querySelectorAll("a[data-share]").forEach(link => { if (targets[link.dataset.share]) link.href = targets[link.dataset.share]; });
    }
    document.querySelector(".footer-share")?.addEventListener("focusin", updateShareLinks);
    document.querySelector(".footer-share")?.addEventListener("pointerdown", updateShareLinks);
    window.addEventListener("siteurlchange", updateShareLinks);
    window.addEventListener("popstate", updateShareLinks);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
}

export function enhancePage(input, { path = "/", errorPage = false } = {}) {
  if (path.startsWith("/blog/")) return input;
  const eol = input.includes("\r\n") ? "\r\n" : "\n";
  let html = input.replace(/\r+\n/g, "\n").replace(/\r/g, "\n");
  const previous = html.match(/<!-- site-ui-config: (\{[^\n]*\}) -->/);
  const config = previous ? JSON.parse(previous[1]) : { menu: false, theme: false, banner: false };
  html = html.replace(/<!-- site-ui:start -->[\s\S]*?<!-- site-ui:end -->\n?/g, "");
  html = html.replace(/\n?<!-- tool-switcher:start -->[\s\S]*?<!-- tool-switcher:end -->\n?/g, "");
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (whole, attrs, code) => {
    if (/application\/(?:ld\+)?json/.test(attrs)) return whole;
    const cleaned = code.replace(/\(function\s*\(\)\s*\{[\s\S]*?\}\)\(\);/g, block => {
      const beginning = block.slice(0, 200);
      const target = /^\(function\s*\(\)\s*\{\s*(?:var|const|let)\s+toggle\s*=\s*document\.getElementById\(["'](menuToggle|themeToggle)["']\)/.exec(beginning);
      if (target && block.length < 4000) { config[target[1] === "menuToggle" ? "menu" : "theme"] = true; return ""; }
      if (/^\(function\s*\(\)\s*\{\s*(?:var|const|let)\s+banner\s*=\s*document\.getElementById\(["']newsBanner["']\)/.test(beginning) && block.length < 2000) { config.banner = true; return ""; }
      return block;
    });
    return cleaned.trim() || /\bsrc\s*=/.test(attrs) ? `<script${attrs}>${cleaned}</script>` : "";
  });
  config.path = path;
  config.errorPage = errorPage;
  config.language = /<html[^>]*\blang=["']fr["']/.test(html) ? "fr" : "en";
  if (!errorPage && path !== "/" && path !== "/index_fr.html" && !path.startsWith("/articles/") && !path.startsWith("/privacy/")) {
    html = html.replace(/<header\b[\s\S]*?<\/header>/g, header => {
      const switcher = toolSwitcherMarkup(path);
      if (!switcher) return header;
      if (!header.includes('<div class="header-actions">')) throw new Error(`Missing header actions for the tool switcher: ${path}`);
      return header.replace('<div class="header-actions">', `<div class="header-actions">\n${switcher}\n`);
    });
  }
  if (html.includes('id="menuToggle"') && !config.menu) throw new Error(`Menu handler needs explicit integration: ${path}`);
  if (html.includes('id="themeToggle"') && !config.theme) throw new Error(`Theme handler needs explicit integration: ${path}`);
  html = html.replace(/<span class="news-banner-text">[\s\S]*?<\/span>/, `<span class="news-banner-text">${config.language === "fr" ? "Outils Azure et guides pratiques. Vos retours sur" : "Azure tools and practical guides. Feedback on"} <a href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</span>`);
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/g, (whole, attrs, css) => {
    const fixed = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector, body) => {
      if (/(?:background|background-color)\s*:[^;]*(?:var\(--cp-accent\)|var\(--cp-accent-hover\))/.test(body)) {
        return selector + "{" + body.replace(/(^|;)(\s*color\s*:\s*)(?:#fff(?:fff)?|white)(?=\s*[;!])/gi, "$1$2var(--cp-accent-fg)") + "}";
      }
      return rule;
    });
    return `<style${attrs}>${fixed}</style>`;
  });
  html = html.replace(/<footer\b[\s\S]*?<\/footer>/g, footer => {
    footer = footer.replace(/<a\b([^>]*\bclass="brand"[^>]*)>\s*<span class="brand-mark">B\.<\/span>\s*G\s*<\/a>/g, (_match, attributes) => {
      const label = config.language === "fr" ? "Benoit Gaumard - accueil" : "Benoit Gaumard - home";
      return `<a${attributes.replace(/\saria-label="[^"]*"/g, "")} aria-label="${label}"><img class="mark" src="/favicon.svg" alt="" width="56" height="56"></a>`;
    });
    return footer.includes("data-privacy-choices") ? footer
      : footer.replace(/(<a\b[^>]*href="\/privacy\/"[^>]*>[\s\S]*?<\/a>)/, `$1\n        <button class="site-privacy-choices" data-privacy-choices type="button">${config.language === "fr" ? "Modifier mes choix de confidentialité" : "Change privacy choices"}</button>`);
  });
  if (path === "/privacy/" || errorPage) {
    html = html.replace(/\s*<script\b[^>]*src=["'][^"']*pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js[^"']*["'][^>]*><\/script>/g, "");
    html = html.replace(/<aside\b[^>]*class="article-ad"[\s\S]*?<\/aside>/g, "");
  }
  const snippet = `${START}\n<!-- site-ui-config: ${JSON.stringify(config)} -->\n<style data-site-ui>${siteStyles}</style>\n<script data-site-ui>(${siteRuntime.toString()})(${JSON.stringify(config)});</script>\n${END}`;
  if (!html.includes("</head>")) throw new Error(`Missing document head: ${path}`);
  html = html.replace("</head>", snippet + "\n</head>");
  html = html.replace(/(<(pre|textarea|script)\b[^>]*>[\s\S]*?<\/\2>)|^[\t ]+$/gim, (match, literal) => literal || "");
  return html.replace(/\r+\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, eol);
}

export async function applySiteUI(root = ROOT) {
  const pages = [join(root, "index.html"), join(root, "index_fr.html"), join(root, "404.html")];
  for (const dir of await readdir(root, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name.startsWith(".") || ["blog", "node_modules"].includes(dir.name)) continue;
    const contents = await readdir(join(root, dir.name), { withFileTypes: true });
    if (contents.some(entry => entry.name === "index.html")) pages.push(join(root, dir.name, "index.html"));
    for (const sub of contents.filter(entry => entry.isDirectory() && !["content", "images", "export", "history"].includes(entry.name))) {
      const nested = await readdir(join(root, dir.name, sub.name));
      if (nested.includes("index.html")) pages.push(join(root, dir.name, sub.name, "index.html"));
    }
  }
  const prepared = [];
  for (const page of pages) {
    const rel = relative(root, page).replace(/\\/g, "/");
    const route = rel === "index.html" ? "/" : rel === "index_fr.html" ? "/index_fr.html" : "/" + rel.replace(/index\.html$/, "");
    const before = await readFile(page, "utf8");
    const after = enhancePage(before, { path: route, errorPage: rel === "404.html" });
    prepared.push({ page, before, after });
  }
  for (const { page, before, after } of prepared) if (after !== before) await writeFile(page, after, "utf8");
  return prepared.map(item => relative(root, item.page));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Updated inline UI on ${(await applySiteUI()).length} standalone pages.`);
}
