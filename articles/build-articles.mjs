// Builds articles/content/*.md into static articles/<slug>/index.html pages,
// plus articles/articles.json (consumed by /articles/index.html) and articles/rss.xml.
//
// Usage: node articles/build-articles.mjs
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const contentDir = join(HERE, "content");
const SITE_URL = "https://benoit-gaumard.io";
const DEFAULT_AUTHOR = "Benoit Gaumard";
const WORDS_PER_MINUTE = 200;

// ---------- Frontmatter (+++ TOML-lite +++) ----------

function parseTomlValue(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => parseTomlValue(item.trim())).filter((item) => item !== "");
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  const quoted = value.match(/^"((?:[^"\\]|\\.)*)"/) || value.match(/^'((?:[^'\\]|\\.)*)'/);
  if (quoted) return quoted[1];
  return value;
}

function parseFrontMatter(raw) {
  const match = raw.match(/^\+\+\+\r?\n([\s\S]*?)\r?\n\+\+\+\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("Missing +++ frontmatter block");
  const [, fm, body] = match;
  const data = {};
  fm.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    data[key] = parseTomlValue(trimmed.slice(eq + 1));
  });
  return { data, body };
}

// ---------- Inline + block markdown rendering ----------

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const EXTERNAL_ICON = '<svg class="external-icon" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';

function renderInline(text) {
  const codeSpans = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codeSpans.push(escapeHtml(code));
    return `\u0000CODE${codeSpans.length - 1}\u0000`;
  });

  out = escapeHtml(out);

  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_]+)_(?!_)/g, "$1<em>$2</em>");

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    if (/^https?:\/\//i.test(url)) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ${EXTERNAL_ICON}</a>`;
    }
    return `<a href="${url}">${label}</a>`;
  });

  out = out.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => `<code>${codeSpans[Number(i)]}</code>`);
  return out;
}

function splitTableRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

const CALLOUT_ICONS = {
  note: '<svg class="callout-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/></svg>',
  info: '<svg class="callout-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16v-4M12 8h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"/></svg>',
  warning: '<svg class="callout-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01"/></svg>',
};
const CALLOUT_LABELS = { note: "Note", info: "Info", warning: "Warning" };

function isBlockStart(line, nextLine) {
  if (line.trim() === "") return true;
  if (line.trim() === "[[toc]]") return true;
  if (/^```/.test(line.trim())) return true;
  if (/^:::(note|info|warning)\s*$/i.test(line.trim())) return true;
  if (/^#{2,4}\s+/.test(line)) return true;
  if (/^-{3,}\s*$/.test(line.trim())) return true;
  if (/^[-*]\s+/.test(line)) return true;
  if (/^\d+\.\s+/.test(line)) return true;
  if (line.includes("|") && nextLine && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(nextLine)) return true;
  if (/^!\[[^\]]*\]\([^)]+\)$/.test(line.trim())) return true;
  return false;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts = [];
  const headings = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") { i++; continue; }

    if (line.trim() === "[[toc]]") {
      htmlParts.push("\u0000TOC\u0000");
      i++;
      continue;
    }

    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).trim() || "text";
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      const code = escapeHtml(codeLines.join("\n"));
      htmlParts.push(`<div class="code-block"><div class="code-block-header"><span class="code-lang">${lang}</span><button type="button" class="copy-code-button" data-code-copy>Copy</button></div><pre><code class="language-${lang}">${code}</code></pre></div>`);
      continue;
    }

    const calloutMatch = line.trim().match(/^:::(note|info|warning)\s*$/i);
    if (calloutMatch) {
      const type = calloutMatch[1].toLowerCase();
      const bodyLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        bodyLines.push(lines[i]);
        i++;
      }
      i++;
      const inner = markdownToHtml(bodyLines.join("\n")).html;
      htmlParts.push(`<div class="callout callout-${type}">${CALLOUT_ICONS[type]}<div class="callout-body"><span class="callout-label">${CALLOUT_LABELS[type]}</span>${inner}</div></div>`);
      continue;
    }

    const headingMatch = line.match(/^(#{2,4})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
      htmlParts.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      i++;
      continue;
    }

    if (/^-{3,}\s*$/.test(line.trim())) {
      htmlParts.push("<hr>");
      i++;
      continue;
    }

    if (line.includes("|") && lines[i + 1] && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const headerCells = splitTableRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${headerCells.map((c) => `<th>${renderInline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      htmlParts.push(`<div class="table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      htmlParts.push(`<ul>${items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      htmlParts.push(`<ol>${items.map((it) => `<li>${renderInline(it)}</li>`).join("")}</ol>`);
      continue;
    }

    const imgOnly = line.trim().match(/^!\[([^\]]*)\]\(([^)"]+?)(?:\s+"([^"]*)")?\)$/);
    if (imgOnly) {
      const [, alt, src, caption] = imgOnly;
      htmlParts.push(`<figure class="article-figure"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy">${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}</figure>`);
      i++;
      continue;
    }

    const paraLines = [];
    while (i < lines.length && !isBlockStart(lines[i], lines[i + 1])) {
      paraLines.push(lines[i]);
      i++;
    }
    htmlParts.push(`<p>${renderInline(paraLines.join(" "))}</p>`);
  }

  let html = htmlParts.join("\n");
  if (headings.length && html.includes("\u0000TOC\u0000")) {
    const items = headings.map((h) => `<li class="toc-level-${h.level}"><a href="#${h.id}">${renderInline(h.text)}</a></li>`).join("");
    const toc = `<nav class="article-toc" aria-label="Table of contents"><strong>Contents</strong><ul>${items}</ul></nav>`;
    html = html.replace(/\u0000TOC\u0000/g, toc);
  } else {
    html = html.replace(/\u0000TOC\u0000/g, "");
  }

  return { html, headings };
}

function countWords(markdown) {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_`#>|-]/g, " ");
  const words = stripped.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

// ---------- Page template ----------

function formatDisplayDate(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function formatRssDate(dateStr) {
  return new Date(`${dateStr}T12:00:00Z`).toUTCString();
}

function pageShell({ title, description, canonical, extraHead = "", bodyClass = "", headerActive = "articles", content, footerNote }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="color-scheme" content="light">
  <script>
    (function () {
      try {
        var stored = localStorage.getItem("site-theme");
        var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
      } catch (e) {}
    })();
  </script>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" type="application/rss+xml" title="Benoit Gaumard — Articles" href="/articles/rss.xml">
  <title>${escapeHtml(title)}</title>
${extraHead}
  <style>
    :root {
      color-scheme: light;
      --cp-bg: #f5faff;
      --cp-surface: #ffffff;
      --cp-surface-soft: #eef7ff;
      --cp-border: #d8e8f5;
      --cp-border-strong: #89afd0;
      --cp-text: #17324d;
      --cp-text-muted: #536f88;
      --cp-accent: #0b6fb8;
      --cp-accent-hover: #075b98;
      --cp-accent-soft: rgba(11, 111, 184, 0.09);
      --cp-accent-fg: #ffffff;
      --cp-success: #16845b;
      --cp-success-bg: #e4f6ee;
      --cp-warning: #c88719;
      --cp-warning-bg: #fff8e8;
      --cp-info: #0c7d8f;
      --cp-info-bg: #e6f6f8;
      --cp-link: #0969b5;
      --cp-shadow: 0 18px 48px rgba(36, 92, 136, 0.14);
      --cp-panel-strong: rgba(255, 255, 255, 0.97);
    }
    :root[data-theme="dark"] {
      color-scheme: dark;
      --cp-bg: #0c1420;
      --cp-surface: #16233a;
      --cp-surface-soft: #1c2c42;
      --cp-border: #253b52;
      --cp-border-strong: #3f6280;
      --cp-text: #e8f1fa;
      --cp-text-muted: #9db3c7;
      --cp-accent: #4fa8ea;
      --cp-accent-hover: #6fbdf3;
      --cp-accent-soft: rgba(79, 168, 234, 0.16);
      --cp-accent-fg: #ffffff;
      --cp-success: #35c98d;
      --cp-success-bg: #113325;
      --cp-warning: #e4a940;
      --cp-warning-bg: #3b2c10;
      --cp-info: #4fd3e8;
      --cp-info-bg: #123238;
      --cp-link: #6fbdf3;
      --cp-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
      --cp-panel-strong: rgba(16, 26, 41, 0.97);
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      min-width: 18rem;
      margin: 0;
      background: var(--cp-bg);
      color: var(--cp-text);
      font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body::before, body::after { content: ""; position: fixed; inset: 0; pointer-events: none; }
    body::before {
      z-index: -2;
      background:
        radial-gradient(44rem 34rem at 6% -12%, rgba(15, 176, 212, .22), transparent 60%),
        radial-gradient(40rem 36rem at 106% 6%, rgba(123, 97, 255, .16), transparent 58%),
        radial-gradient(48rem 42rem at 48% 118%, rgba(47, 127, 245, .16), transparent 62%);
      filter: blur(6px);
      animation: aurora-drift 30s ease-in-out infinite alternate;
    }
    body::after {
      z-index: -1;
      background-image: radial-gradient(rgba(11, 111, 184, .18) 1px, transparent 1px);
      background-size: 1.5rem 1.5rem;
      -webkit-mask-image: radial-gradient(70% 55% at 50% 0%, #000 35%, transparent 92%);
      mask-image: radial-gradient(70% 55% at 50% 0%, #000 35%, transparent 92%);
    }
    @keyframes aurora-drift {
      0% { transform: translate3d(0, 0, 0) scale(1); }
      100% { transform: translate3d(-2%, 2%, 0) scale(1.05); }
    }
    button, input, select { font: inherit; }
    button, a { -webkit-tap-highlight-color: transparent; }
    a { color: var(--cp-link); }
    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
      outline: 3px solid var(--cp-accent);
      outline-offset: 2px;
    }
    .site-header {
      position: sticky; top: 0; z-index: 20;
      border-bottom: 1px solid var(--cp-border);
      background: var(--cp-panel-strong);
      backdrop-filter: blur(12px);
    }
    .header-inner, main, .footer-inner { width: min(90rem, calc(100% - 2rem)); margin-inline: auto; }
    .header-inner { min-height: 4rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .brand { display: flex; align-items: center; gap: .5rem; color: var(--cp-text); font-size: 1rem; font-weight: 700; text-decoration: none; }
    .brand-mark { color: var(--cp-accent); }
    .brand .mark { width: 1.75rem; height: 1.75rem; flex: 0 0 auto; border-radius: 6px; }
    .header-links { display: flex; align-items: center; gap: 1rem; }
    .header-links a { display: inline-flex; align-items: center; gap: .45rem; color: var(--cp-text-muted); text-decoration: none; }
    .nav-icon { flex: 0 0 auto; opacity: .7; }
    .header-links a:hover .nav-icon, .header-links a[aria-current="page"] .nav-icon { opacity: 1; }
    .header-links a:hover { color: var(--cp-text); }
    .header-links a[aria-current="page"] { color: var(--cp-text); font-weight: 600; }
    .menu-toggle { display: none; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; padding: 0; border: 1px solid var(--cp-border); border-radius: 6px; background: transparent; color: var(--cp-text); cursor: pointer; flex: 0 0 auto; }
    .menu-toggle:hover { border-color: var(--cp-border-strong); }
    .menu-toggle .menu-icon-close { display: none; }
    .menu-toggle[aria-expanded="true"] .menu-icon-open { display: none; }
    .menu-toggle[aria-expanded="true"] .menu-icon-close { display: block; }
    .header-actions { display: flex; align-items: center; gap: .25rem; flex: 0 0 auto; }
    .social-link { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: 6px; color: var(--cp-text-muted); flex: 0 0 auto; }
    .social-link:hover { color: var(--cp-accent); background: var(--cp-surface); }
    .theme-toggle { display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; padding: 0; border: none; border-radius: 6px; background: transparent; color: var(--cp-text-muted); cursor: pointer; flex: 0 0 auto; }
    .theme-toggle:hover { color: var(--cp-accent); background: var(--cp-surface); }
    .theme-toggle .theme-icon-sun { display: none; }
    :root[data-theme="dark"] .theme-toggle .theme-icon-sun { display: inline-flex; }
    :root[data-theme="dark"] .theme-toggle .theme-icon-moon { display: none; }
    main { padding-block: 2.5rem 4rem; }
    .empty-state { padding: 2.5rem; border: 1px dashed var(--cp-border-strong); border-radius: 12px; text-align: center; color: var(--cp-text-muted); }
    .back-to-top {
      position: fixed; right: 1.5rem; bottom: 1.5rem; z-index: 30;
      display: grid; place-items: center; width: 3rem; height: 3rem; padding: 0;
      border: 1px solid var(--cp-border); border-radius: 50%;
      background: var(--cp-accent); color: var(--cp-accent-fg); cursor: pointer;
      box-shadow: var(--cp-shadow); opacity: 0; transform: translateY(.75rem); pointer-events: none;
      transition: opacity .2s ease, transform .2s ease;
    }
    .back-to-top.visible { opacity: 1; transform: none; pointer-events: auto; }
    .back-to-top:hover { background: var(--cp-accent-hover); }
    footer.site-footer { border-top: 1px solid var(--cp-border); background: var(--cp-panel-strong); color: var(--cp-text-muted); }
    .footer-inner { padding-block: 2rem 1.5rem; }
    .footer-main { display: grid; grid-template-columns: minmax(16rem, 1fr) repeat(2, minmax(10rem, auto)); gap: 3rem; padding-bottom: 1.5rem; }
    .footer-about { max-width: 30rem; }
    .footer-about p { margin: .75rem 0 0; font-size: .875rem; line-height: 1.6; }
    .footer-group { display: flex; align-items: flex-start; flex-direction: column; gap: .5rem; }
    .footer-group strong { margin-bottom: .125rem; color: var(--cp-text); font-size: .75rem; text-transform: uppercase; }
    .footer-group a { color: var(--cp-text-muted); font-size: .875rem; text-decoration: none; }
    .footer-group a:hover { color: var(--cp-link); }
    .footer-bottom { display: flex; justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--cp-border); font-size: .8rem; }
    @media (max-width: 48rem) {
      .header-inner { flex-wrap: nowrap; min-height: auto; padding-block: .75rem; position: relative; }
      .menu-toggle { display: inline-flex; }
      .header-links { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; align-items: stretch; gap: 0; background: var(--cp-panel-strong); border: 1px solid var(--cp-border); border-radius: 10px; padding: .5rem; box-shadow: var(--cp-shadow); margin-top: .5rem; z-index: 30; }
      .header-links.nav-open { display: flex; }
      .header-links a { padding: .65rem .75rem; border-radius: 6px; }
      .header-links a:hover { background: var(--cp-panel); }
      .footer-main { grid-template-columns: 1fr 1fr; gap: 2rem; }
      .footer-about { grid-column: 1 / -1; }
    }
    @media (max-width: 32rem) {
      .header-inner, main, .footer-inner { width: min(100% - 1rem, 90rem); }
      .back-to-top { right: 1rem; bottom: 1rem; }
      .footer-main { grid-template-columns: 1fr; }
      .footer-about { grid-column: auto; }
      .footer-bottom { flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      body::before { animation: none; }
    }
${ARTICLE_CSS}
  </style>
</head>
<body class="${bodyClass}">
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/"><img class="mark" src="/favicon.svg" alt="" width="56" height="56"></a>
      <button type="button" class="menu-toggle" id="menuToggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="primaryNav">
        <svg class="menu-icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <svg class="menu-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
      <nav class="header-links" id="primaryNav" aria-label="Primary navigation">
        <a href="/"><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Home</a>
        <a href="/blog/"><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg>Blog</a>
        <a href="/articles/"${headerActive === "articles" ? ' aria-current="page"' : ""}><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>Articles</a>
        <a href="/tools/"><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>Tools</a>
      </nav>
      <div class="header-actions">
        <a class="social-link" href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn profile" title="LinkedIn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0z"/></svg>
        </a>
        <button type="button" class="theme-toggle" id="themeToggle" aria-label="Toggle dark mode" title="Toggle dark mode">
          <svg class="theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          <svg class="theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>
        </button>
      </div>
    </div>
  </header>

  <main>
${content}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-main">
        <div class="footer-about">
          <a class="brand" href="/"><span class="brand-mark">B.</span>G / Articles</a>
          <p>Articles and how-to guides written by Benoit Gaumard about Azure, Terraform, GitHub, and cloud engineering.</p>
        </div>
        <nav class="footer-group" aria-label="Footer navigation">
          <strong>Explore</strong>
          <a href="/">Home</a>
          <a href="/articles/">Articles</a>
          <a href="#top">Back to top</a>
        </nav>
        <div class="footer-group">
          <strong>Tools</strong>
          <a href="/icons/">Icons</a>
          <a href="/emoji-sheet/">Emoji</a>
          <a href="/azure-release-updates/">Azure Updates</a>
          <a href="/m365-release-updates/">M365 Updates</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span id="currentYear"></span> Benoit Gaumard</span>
      </div>
    </div>
  </footer>

  <button class="back-to-top" id="backToTop" type="button" aria-label="Back to top">
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <script>
    document.getElementById("currentYear").textContent = new Date().getFullYear();
    document.querySelectorAll('[data-code-copy]').forEach((button) => {
      button.addEventListener("click", () => {
        const code = button.closest(".code-block").querySelector("code").textContent;
        navigator.clipboard.writeText(code).then(() => {
          const original = button.textContent;
          button.textContent = "Copied!";
          button.classList.add("is-copied");
          setTimeout(() => { button.textContent = original; button.classList.remove("is-copied"); }, 1600);
        });
      });
    });
    let scrollTicking = false;
    const backToTop = document.getElementById("backToTop");
    window.addEventListener("scroll", () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(() => {
        backToTop.classList.toggle("visible", window.scrollY > 600);
        scrollTicking = false;
      });
    }, { passive: true });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    (function () {
      const toggle = document.getElementById("menuToggle");
      const nav = document.getElementById("primaryNav");
      if (!toggle || !nav) return;
      const closeMenu = () => { nav.classList.remove("nav-open"); toggle.setAttribute("aria-expanded", "false"); };
      const openMenu = () => { nav.classList.add("nav-open"); toggle.setAttribute("aria-expanded", "true"); };
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        nav.classList.contains("nav-open") ? closeMenu() : openMenu();
      });
      nav.addEventListener("click", (e) => { if (e.target.tagName === "A") closeMenu(); });
      document.addEventListener("click", (e) => {
        if (!nav.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) closeMenu();
      });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
      window.addEventListener("resize", () => { if (window.innerWidth > 760) closeMenu(); });
    })();
    (function () {
      const toggle = document.getElementById("themeToggle");
      if (!toggle) return;
      toggle.addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const next = isDark ? "light" : "dark";
        if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
        else document.documentElement.removeAttribute("data-theme");
        try { localStorage.setItem("site-theme", next); } catch (e) {}
      });
    })();
  </script>
</body>
</html>
`;
}

const ARTICLE_CSS = `
    .article-header { margin: 0 0 2rem; }
    .article-breadcrumb { margin: 0 0 1.25rem; font-size: .85rem; }
    .article-breadcrumb a { color: var(--cp-text-muted); text-decoration: none; }
    .article-breadcrumb a:hover { color: var(--cp-link); }
    .article-categories { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1rem; }
    .article-category-tag {
      display: inline-flex; padding: .2rem .6rem; border-radius: 999px;
      background: var(--cp-accent-soft); color: var(--cp-accent); font-size: .75rem; font-weight: 700; text-decoration: none;
    }
    .article-title { margin: 0; font-size: clamp(1.9rem, 4.4vw, 2.85rem); line-height: 1.12; }
    .article-description { margin: 1rem 0 0; color: var(--cp-text-muted); font-size: 1.08rem; line-height: 1.6; }
    .article-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-top: 1.25rem; color: var(--cp-text-muted); font-size: .88rem; }
    .article-meta .dot { opacity: .5; }
    .article-tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1rem; }
    .article-tag { padding: .15rem .55rem; border-radius: 999px; background: var(--cp-surface-soft); color: var(--cp-text-muted); font-size: .75rem; border: 1px solid var(--cp-border); }
    .article-feature-image { margin: 0 0 2.5rem; }
    .article-feature-image img { width: 100%; border-radius: 14px; border: 1px solid var(--cp-border); box-shadow: var(--cp-shadow); display: block; }
    .article-body {
      margin: 0; font-size: 1.05rem; line-height: 1.75;
      background: var(--cp-surface); border: 1px solid var(--cp-border); border-radius: 16px;
      padding: clamp(1.5rem, 4vw, 3rem); box-shadow: 0 1px 2px var(--cp-border);
    }
    .article-body h2, .article-body h3, .article-body h4 { scroll-margin-top: 5.5rem; }
    .article-body h2 { margin: 2.2rem 0 1rem; font-size: 1.55rem; }
    .article-body h3 { margin: 1.8rem 0 .85rem; font-size: 1.28rem; }
    .article-body h4 { margin: 1.5rem 0 .7rem; font-size: 1.08rem; }
    .article-body p { margin: 0 0 1.1rem; overflow-wrap: anywhere; }
    .article-body ul, .article-body ol { margin: 0 0 1.1rem; padding-left: 1.4rem; }
    .article-body li { margin-bottom: .4rem; }
    .article-body hr { border: 0; border-top: 1px solid var(--cp-border); margin: 2rem 0; }
    .article-body blockquote { margin: 0 0 1.1rem; padding: .25rem 1.1rem; border-left: 3px solid var(--cp-accent); color: var(--cp-text-muted); }
    .article-body a { overflow-wrap: anywhere; }
    .article-body a .external-icon { vertical-align: middle; }
    .article-body code { background: var(--cp-surface-soft); border: 1px solid var(--cp-border); border-radius: 4px; padding: .1rem .35rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; overflow-wrap: anywhere; }
    .article-figure { margin: 0 0 1.5rem; }
    .article-figure img { max-width: 100%; border-radius: 10px; border: 1px solid var(--cp-border); display: block; }
    .article-figure figcaption { margin-top: .5rem; color: var(--cp-text-muted); font-size: .85rem; text-align: center; }
    .table-wrap { overflow-x: auto; margin: 0 0 1.1rem; }
    .article-body table { width: 100%; border-collapse: collapse; font-size: .93rem; }
    .article-body th, .article-body td { padding: .55rem .75rem; border: 1px solid var(--cp-border); text-align: left; }
    .article-body th { background: var(--cp-surface-soft); }
    .code-block { margin: 0 0 1.3rem; border: 1px solid var(--cp-border); border-radius: 10px; overflow: hidden; background: #0f1b2b; }
    .code-block-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem .9rem; background: #16273d; color: #b9d3ea; font-size: .78rem; }
    .code-lang { text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
    .copy-code-button { border: 1px solid rgba(255,255,255,.25); background: transparent; color: #d7e8f7; padding: .2rem .6rem; border-radius: 6px; font-size: .75rem; font-weight: 600; cursor: pointer; }
    .copy-code-button:hover { background: rgba(255,255,255,.1); }
    .copy-code-button.is-copied { border-color: var(--cp-success); color: #9ee8c8; }
    .code-block pre { margin: 0; padding: 1rem 1.1rem; overflow-x: auto; }
    .code-block code { background: none; border: 0; padding: 0; color: #e3edf7; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .88rem; line-height: 1.6; }
    .callout { display: flex; gap: .75rem; margin: 0 0 1.3rem; padding: 1rem 1.15rem; border-radius: 10px; border: 1px solid var(--cp-border); }
    .callout-icon { flex: 0 0 auto; margin-top: .15rem; }
    .callout-label { display: block; margin-bottom: .3rem; font-weight: 700; font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; }
    .callout-body p:last-child { margin-bottom: 0; }
    .callout-note { background: var(--cp-accent-soft); color: var(--cp-text); }
    .callout-note .callout-icon, .callout-note .callout-label { color: var(--cp-accent); }
    .callout-info { background: var(--cp-info-bg); color: var(--cp-text); }
    .callout-info .callout-icon, .callout-info .callout-label { color: var(--cp-info); }
    .callout-warning { background: var(--cp-warning-bg); color: var(--cp-text); }
    .callout-warning .callout-icon, .callout-warning .callout-label { color: var(--cp-warning); }
    .article-toc { margin: 0 0 1.6rem; padding: 1rem 1.25rem; border: 1px solid var(--cp-border); border-radius: 10px; background: var(--cp-surface-soft); }
    .article-toc strong { display: block; margin-bottom: .5rem; font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; color: var(--cp-text-muted); }
    .article-toc ul { margin: 0; padding: 0; list-style: none; }
    .article-toc li { margin: 0; }
    .article-toc a { display: block; padding: .25rem 0; color: var(--cp-text); text-decoration: none; font-size: .92rem; }
    .article-toc a:hover { color: var(--cp-link); }
    .toc-level-3 a { padding-left: 1rem; font-size: .87rem; color: var(--cp-text-muted); }
    .toc-level-4 a { padding-left: 2rem; font-size: .85rem; color: var(--cp-text-muted); }
    .article-footer-nav { margin: 2rem 0 0; display: flex; justify-content: space-between; gap: 1rem; }
    .article-footer-nav a { display: inline-flex; align-items: center; gap: .4rem; color: var(--cp-accent); font-weight: 600; text-decoration: none; font-size: .92rem; }
    .article-footer-nav a:hover { color: var(--cp-accent-hover); }
    @media (max-width: 40rem) {
      .article-meta { font-size: .82rem; }
    }`;

function renderArticlePage(article) {
  const categoriesHtml = article.categories.map((c) => `<a class="article-category-tag" href="/articles/?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`).join("");
  const tagsHtml = article.tags.length ? `<div class="article-tags">${article.tags.map((t) => `<span class="article-tag">#${escapeHtml(t)}</span>`).join("")}</div>` : "";
  const featureImageHtml = article.featureImage
    ? `<div class="article-feature-image"><img src="${article.featureImage}" alt="${escapeHtml(article.title)}"></div>`
    : "";

  const content = `    <div class="article-header">
      <p class="article-breadcrumb"><a href="/articles/">&larr; All articles</a></p>
      <div class="article-categories">${categoriesHtml}</div>
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <p class="article-description">${escapeHtml(article.description)}</p>
      <div class="article-meta">
        <span>${escapeHtml(article.author)}</span>
        <span class="dot">&middot;</span>
        <span>${formatDisplayDate(article.date)}</span>
        <span class="dot">&middot;</span>
        <span>${article.readingMinutes} min read</span>
      </div>
      ${tagsHtml}
    </div>

    ${featureImageHtml}

    <article class="article-body">
      ${article.bodyHtml}
    </article>

    <div class="article-footer-nav">
      <a href="/articles/">&larr; Back to all articles</a>
      <a href="/articles/rss.xml">RSS feed</a>
    </div>`;

  return pageShell({
    title: `${article.title} | Benoit Gaumard`,
    description: article.description,
    canonical: `${SITE_URL}${article.url}`,
    content,
  });
}

// ---------- Build ----------

async function loadArticle(filename) {
  const raw = await readFile(join(contentDir, filename), "utf8");
  const { data, body } = parseFrontMatter(raw);
  if (!data.title) throw new Error(`${filename}: missing "title" in frontmatter`);
  if (!data.date) throw new Error(`${filename}: missing "date" in frontmatter`);
  if (!data.description) throw new Error(`${filename}: missing "description" in frontmatter`);

  const slug = filename.replace(/\.md$/i, "");
  const { html: bodyHtml } = markdownToHtml(body.trim());
  const wordCount = countWords(body);

  return {
    slug,
    title: data.title,
    description: data.description,
    author: data.author || DEFAULT_AUTHOR,
    date: data.date,
    tags: Array.isArray(data.tags) ? data.tags : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    featureImage: data.featureImage || null,
    featured: data.featured === true,
    draft: data.draft === true,
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    url: `/articles/${slug}/`,
    bodyHtml,
  };
}

function buildRss(articles) {
  const items = articles.map((a) => `    <item>
      <title>${escapeHtml(a.title)}</title>
      <link>${SITE_URL}${a.url}</link>
      <guid isPermaLink="true">${SITE_URL}${a.url}</guid>
      <description>${escapeHtml(a.description)}</description>
      <author>${escapeHtml(a.author)}</author>
      <pubDate>${formatRssDate(a.date)}</pubDate>
${a.categories.map((c) => `      <category>${escapeHtml(c)}</category>`).join("\n")}
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Benoit Gaumard — Articles</title>
    <link>${SITE_URL}/articles/</link>
    <atom:link href="${SITE_URL}/articles/rss.xml" rel="self" type="application/rss+xml"/>
    <description>Latest articles and how-to guides by Benoit Gaumard.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

async function main() {
  const files = (await readdir(contentDir)).filter((f) => f.endsWith(".md"));
  if (!files.length) {
    console.log(`No markdown files found in ${contentDir}`);
    return;
  }

  const all = await Promise.all(files.map(loadArticle));
  const published = all.filter((a) => !a.draft).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  for (const article of published) {
    const outDir = join(HERE, article.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), renderArticlePage(article), "utf8");
  }

  const articlesJson = {
    generatedAt: new Date().toISOString(),
    articles: published.map(({ bodyHtml, draft, ...meta }) => meta),
  };
  await writeFile(join(HERE, "articles.json"), `${JSON.stringify(articlesJson, null, 2)}\n`, "utf8");
  await writeFile(join(HERE, "rss.xml"), buildRss(published), "utf8");

  console.log(`Built ${published.length} article(s):`);
  published.forEach((a) => console.log(`  - ${a.url}  (${a.title})`));
  if (all.length !== published.length) {
    console.log(`Skipped ${all.length - published.length} draft article(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
