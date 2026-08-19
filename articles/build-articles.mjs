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
    .header-links a { color: var(--cp-text-muted); text-decoration: none; }
    .header-links a:hover { color: var(--cp-text); }
    .header-links a[aria-current="page"] { color: var(--cp-text); font-weight: 600; }
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
      .header-inner { flex-wrap: wrap; row-gap: .5rem; min-height: auto; padding-block: .75rem; }
      .header-links { flex-wrap: wrap; row-gap: .5rem; }
      .footer-main { grid-template-columns: 1fr 1fr; gap: 2rem; }
      .footer-about { grid-column: 1 / -1; }
    }
    @media (max-width: 32rem) {
      .header-inner, main, .footer-inner { width: min(100% - 1rem, 90rem); }
      .header-links a:first-child { display: none; }
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
      <nav class="header-links" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/blog/">Blog</a>
        <a href="/articles/"${headerActive === "articles" ? ' aria-current="page"' : ""}>Articles</a>
        <a href="/tools/">Tools</a>
        <a href="/icons/">Icons</a>
        <a href="/emoji-sheet/">Emoji</a>
        <a href="/azure-release-updates/">Azure Updates</a>
        <a href="/m365-release-updates/">M365 Updates</a>
      </nav>
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
  </script>
</body>
</html>
`;
}

const ARTICLE_CSS = `
    .article-header { max-width: 46rem; margin: 0 auto 2rem; }
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
    .article-feature-image { max-width: 46rem; margin: 0 auto 2.5rem; }
    .article-feature-image img { width: 100%; border-radius: 14px; border: 1px solid var(--cp-border); box-shadow: var(--cp-shadow); display: block; }
    .article-body {
      max-width: 46rem; margin: 0 auto; font-size: 1.05rem; line-height: 1.75;
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
    .article-footer-nav { max-width: 46rem; margin: 2rem auto 0; display: flex; justify-content: space-between; gap: 1rem; }
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
