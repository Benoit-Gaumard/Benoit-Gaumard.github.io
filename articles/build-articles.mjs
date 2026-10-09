// Builds articles/content/*.md into static articles/<slug>/index.html pages,
// plus articles/articles.json (consumed by /articles/index.html) and articles/rss.xml.
//
// Usage: node articles/build-articles.mjs
// Privacy only: node articles/build-articles.mjs --privacy-only
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enhancePage } from "../site-ui.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const contentDir = join(HERE, "content");
const SITE_URL = "https://benoit-gaumard.io";
const DEFAULT_AUTHOR = "Benoit Gaumard";
const WORDS_PER_MINUTE = 200;
const PRIVACY_UPDATED = "2026-10-07";

// ---------- Measurement and advertising ----------

const GA4_ID = "G-75X1Q2PPLE";
const ADSENSE_CLIENT = "ca-pub-6636684537203477";
// Existing responsive display unit. One unit per page: two <ins> sharing a slot
// on the same page leaves the second one permanently unfilled.
const AD_SLOT_ARTICLE = "4494484671";
// Set this once a dedicated second ad unit exists in AdSense; leaving it empty
// keeps a single unit per page rather than duplicating the slot above.
const AD_SLOT_ARTICLE_SECONDARY = "";

// Kept byte-identical to the fragment build-seo.mjs writes into the
// hand-authored pages, including the marker, so that script treats a freshly
// generated article as already done instead of injecting a second copy.
// The Consent Mode v2 defaults lead the block: they have to be queued before
// gtag.js loads, otherwise the tag reads a personalised default first.
const ANALYTICS_SNIPPET = `<!-- seo:analytics -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    });
    gtag('set', 'ads_data_redaction', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
  <script>
    gtag('js', new Date());
    gtag('config', '${GA4_ID}');
  </script>`;

const ADSENSE_LOADER = `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;

function adUnit(slot) {
  if (!slot) return "";
  return `    <aside class="article-ad" aria-label="Advertisement">
      <span class="article-ad-label">Advertisement</span>
      <ins class="adsbygoogle"
           style="display:block; text-align:center;"
           data-ad-layout="in-article"
           data-ad-format="fluid"
           data-ad-client="${ADSENSE_CLIENT}"
           data-ad-slot="${slot}"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </aside>`;
}

// A complete first section precedes the manual unit. Never split a command,
// its label, an interactive widget, or a reference-library entry with an ad.
function injectMidArticleAd(bodyHtml, slot) {
  const unit = adUnit(slot);
  if (!unit) return { body: bodyHtml, trailing: "" };
  const headings = [...bodyHtml.matchAll(/<h2\b/g)];
  if (headings.length < 3) return { body: bodyHtml, trailing: unit };
  const at = headings[1].index;
  return { body: bodyHtml.slice(0, at) + unit + "\n" + bodyHtml.slice(at), trailing: "" };
}

function breadcrumbLd(title, canonical) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE_URL}/articles/` },
      { "@type": "ListItem", position: 3, name: title, item: canonical },
    ],
  };
}

// ---------- Frontmatter (+++ TOML-lite +++) ----------

function parseTomlValue(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    const items = inner.match(/(?:[^,"']|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')+/g) || [];
    return items.map((item) => parseTomlValue(item.trim())).filter((item) => item !== "");
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
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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
  if (/^:::html\s*$/i.test(line.trim())) return true;
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
  const usedIds = new Map();
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
      const pre = `<pre tabindex="0" aria-label="${escapeHtml(lang)} code"><code class="language-${escapeHtml(lang)}">${code}</code></pre>`;
      htmlParts.push(`<div class="code-block"><div class="code-block-header"><span class="code-lang">${escapeHtml(lang)}</span><button type="button" class="copy-code-button" data-code-copy aria-label="Copy ${escapeHtml(lang)} code">Copy</button></div>${codeLines.length > 35 ? `<details class="code-details"><summary>Show complete script (${codeLines.length} lines)</summary>${pre}</details>` : pre}</div>`);
      continue;
    }

    // A ":::html" fence emits its body verbatim, so an article can embed an
    // interactive widget the Markdown subset cannot express.
    if (/^:::html\s*$/i.test(line.trim())) {
      const rawLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ":::") {
        rawLines.push(lines[i]);
        i++;
      }
      i++;
      htmlParts.push(rawLines.join("\n"));
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
      const baseId = slugify(text);
      const occurrence = (usedIds.get(baseId) || 0) + 1;
      usedIds.set(baseId, occurrence);
      const id = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
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
      const headerCells = splitTableRow(line).map((cell, index) => cell || (index === 0 ? "Criterion" : "Value"));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${headerCells.map((c) => `<th scope="col">${renderInline(c)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c, n) => `<td data-label="${escapeHtml(headerCells[n] || "")}">${renderInline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      htmlParts.push(`<div class="table-wrap" tabindex="0" role="region" aria-label="${escapeHtml(headerCells.join(", "))} table"><table>${thead}${tbody}</table></div>`);
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
      htmlParts.push(`<figure class="article-figure"><a href="${src}" data-image-zoom aria-label="Enlarge: ${escapeHtml(alt || caption || "article image")}"><img src="${src}" alt="${escapeHtml(alt)}" loading="lazy"></a><figcaption>${escapeHtml(caption || alt)} <a href="${src}" target="_blank" rel="noopener">Open original image</a></figcaption></figure>`);
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
    .replace(/:::html[\s\S]*?\n:::/g, " ")
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

function pageShell({ title, description, canonical, extraHead = "", bodyClass = "", headerActive = "articles", content, footerNote, ads = false, noindex = false }) {
  return enhancePage(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">${noindex ? `\n  <meta name="robots" content="noindex, follow">` : ""}
  <meta name="color-scheme" content="light">
  ${ANALYTICS_SNIPPET}
${ads ? ADSENSE_LOADER + "\n" : ""}  <script>
    (function () {
      try {
        var stored = localStorage.getItem("site-theme");
        var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
      } catch (e) {}
      try {
        if (localStorage.getItem("news-banner-dismissed") === "2026-08-21") {
          document.documentElement.setAttribute("data-news-banner", "hidden");
        }
      } catch (e) {}
    })();
  </script>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="benoit-gaumard.io">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://benoit-gaumard.io/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="benoit-gaumard.io - Azure tools, reference data and how-to guides">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#f5faff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0c1420" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">
${JSON.stringify(
    canonical === 'https://benoit-gaumard.io/articles/'
      ? {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title.replace(/\s*\|\s*Benoit Gaumard$/, ''),
          description,
          url: canonical,
          isPartOf: { '@type': 'WebSite', name: 'benoit-gaumard.io', url: 'https://benoit-gaumard.io/' },
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: title.replace(/\s*\|\s*Benoit Gaumard$/, ''),
          description,
          url: canonical,
          author: { '@type': 'Person', name: 'Benoit Gaumard', url: 'https://benoit-gaumard.io/' },
          publisher: { '@type': 'Person', name: 'Benoit Gaumard', url: 'https://benoit-gaumard.io/' },
          inLanguage: 'en',
        },
    null,
    2
  )}
  </script>${
    canonical === 'https://benoit-gaumard.io/articles/'
      ? ''
      : `\n  <script type="application/ld+json">\n${JSON.stringify(
          breadcrumbLd(title.replace(/\s*\|\s*Benoit Gaumard$/, ''), canonical),
          null,
          2
        )}\n  </script>`
  }
  <link rel="alternate" type="application/rss+xml" title="Benoit Gaumard - Articles" href="/articles/rss.xml">
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
      --cp-success: #157f57;
      --cp-success-bg: #eefaf5;
      --cp-warning: #96610a;
      --cp-warning-bg: #fdf3e1;
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
    .skip-link {
      position: absolute;
      left: .5rem;
      top: .5rem;
      z-index: 100;
      transform: translateY(-250%);
      padding: .6rem 1rem;
      border-radius: 6px;
      background: var(--cp-accent);
      color: var(--cp-accent-fg);
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: transform .15s ease;
    }
    .skip-link:focus { transform: none; }
    #top:focus { outline: none; }

    .news-banner {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .5rem 1rem;
      background: linear-gradient(90deg, var(--cp-accent), var(--cp-accent-hover));
      color: #fff;
      overflow: hidden;
      position: relative;
    }
    :root[data-news-banner="hidden"] .news-banner { display: none; }
    .news-banner[hidden] { display: none; }
    .news-banner-track {
      flex: 1 1 auto;
      overflow: hidden;
      white-space: nowrap;
      -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 3rem, #000 calc(100% - 3rem), transparent 100%);
      mask-image: linear-gradient(90deg, transparent 0, #000 3rem, #000 calc(100% - 3rem), transparent 100%);
    }
    .news-banner-text {
      display: inline-block;
      padding-left: 100%;
      font-size: 0.85rem;
      font-weight: 600;
      animation: news-banner-scroll 28s linear infinite;
    }
    .news-banner-text a { color: #fff; text-decoration: underline; text-underline-offset: .15rem; }
    .news-banner:hover .news-banner-text, .news-banner:focus-within .news-banner-text { animation-play-state: paused; }
    @keyframes news-banner-scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }
    .news-banner-close {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      border: 0;
      border-radius: 6px;
      background: rgba(255, 255, 255, .16);
      color: #fff;
      cursor: pointer;
    }
    .news-banner-close:hover { background: rgba(255, 255, 255, .3); }
    @media (prefers-reduced-motion: reduce) {
      .news-banner-text { animation: none; padding-left: 0; }
      .news-banner-track { white-space: normal; -webkit-mask-image: none; mask-image: none; }
    }
    .site-header {
      position: sticky; top: 0; z-index: 20;
      border-bottom: 1px solid var(--cp-border);
      background: var(--cp-panel-strong);
      backdrop-filter: blur(12px);
    }
    .header-inner, main, .footer-inner { width: min(90rem, calc(100% - 2rem)); margin-inline: auto; }
    .header-inner { min-height: 4rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .brand { min-height: 1.5rem; display: flex; align-items: center; gap: .5rem; color: var(--cp-text); font-size: 1rem; font-weight: 700; text-decoration: none; }
    .brand-mark { color: var(--cp-accent); }
    .brand .mark { width: 1.75rem; height: 1.75rem; flex: 0 0 auto; border-radius: 6px; }
    .header-links { display: flex; align-items: center; gap: 1rem; }
    .header-links a { min-height: 1.5rem; display: inline-flex; align-items: center; gap: .45rem; color: var(--cp-text-muted); text-decoration: none; }
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
    .footer-about p { margin: .75rem 0 0; font-size: 0.85rem; line-height: 1.6; }
    .footer-group { display: flex; align-items: flex-start; flex-direction: column; gap: .5rem; }
    .footer-group strong { margin-bottom: .125rem; color: var(--cp-text); font-size: 0.75rem; text-transform: uppercase; }
    .footer-group a { display: inline-flex; align-items: center; min-height: 1.5rem; color: var(--cp-text-muted); font-size: 0.85rem; text-decoration: none; }
    .footer-group a:hover { color: var(--cp-link); }
    .footer-bottom { display: flex; justify-content: space-between; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--cp-border); font-size: 0.8rem; }
    .footer-bottom a { color: var(--cp-text-muted); text-decoration: none; }
    .footer-bottom a:hover { color: var(--cp-link); }
    /* Reserving the height keeps the ad slot from shifting the article once it fills. */
    .article-ad { margin: 2.2rem 0; display: flex; flex-direction: column; gap: .35rem; min-height: 280px; }
    .article-ad-label { font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; color: var(--cp-text-muted); }
    .article-ad ins { min-height: 250px; }
    @media (max-width: 48rem) {
      .header-inner { flex-wrap: nowrap; min-height: auto; padding-block: .75rem; position: relative; }
      .menu-toggle { display: inline-flex; }
      .header-links { display: none; position: absolute; top: 100%; left: 0; right: 0; flex-direction: column; align-items: stretch; gap: 0; background: var(--cp-panel-strong); border: 1px solid var(--cp-border); border-radius: 10px; padding: .5rem; box-shadow: var(--cp-shadow); margin-top: .5rem; z-index: 30; }
      .header-links.nav-open { display: flex; }
      .header-links a { min-height: 1.5rem; padding: .65rem .75rem; border-radius: 6px; }
      .header-links a:hover { background: var(--cp-surface-soft); }
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
    @media print {
      /* Printing an article should yield the writing, not the furniture. */
      .news-banner, .site-header, .site-footer, .skip-link,
      .theme-toggle, .section-nav, .copy-code-button, .article-toc,
      .article-share, .adsbygoogle,
      .breadcrumb { display: none !important; }
      :root { --cp-bg: #fff; --cp-surface: #fff; --cp-surface-soft: #fff; }
      * { background: transparent !important; color: #000 !important; box-shadow: none !important; }
      body { font-size: 11pt; }
      main { max-width: none; padding: 0; }
      a { text-decoration: underline; }
      /* a printed link is useless without its target */
      .article-body a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 9pt; word-break: break-all; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #bbb; padding: 4pt 6pt; }
      thead { display: table-header-group; }
      tr, .card, figure, pre, .code-block { break-inside: avoid; page-break-inside: avoid; }
      h1, h2, h3 { break-after: avoid; page-break-after: avoid; }
      .code-block, .code-block code { border: 1px solid #bbb; }
    }



    @media (prefers-reduced-motion: reduce) {
      /* Catch-all: naming individual selectors let every newly added element
         escape. 0.01ms rather than 0 so transitionend/animationend still fire. */
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

  
    /* Share links */
    .footer-share { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px 14px; margin-bottom: 1.5rem; }
    .footer-share-label { font-size: 0.8rem; font-weight: 700; color: var(--cp-text-muted); }
    .footer-share-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
    .share-btn { display: inline-flex; align-items: center; gap: 7px; padding: 0.42rem 0.75rem; border: 1px solid var(--cp-border-strong, var(--cp-border)); border-radius: 6px; background: var(--cp-surface); color: var(--cp-text); font-family: inherit; font-size: 0.78rem; font-weight: 600; line-height: 1.1; text-decoration: none; cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.2s; }
    .share-btn:hover { border-color: var(--cp-accent); background: var(--cp-accent-soft, var(--cp-surface)); transform: translateY(-1px); }
    .share-btn svg { flex: none; }
    .footer-share-hint { flex-basis: 100%; margin: 0; text-align: center; font-size: 0.75rem; color: var(--cp-text-muted); }
    @media (prefers-reduced-motion: reduce) { .share-btn:hover { transform: none; } }
  </style>
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#top">Skip to content</a>
  <div class="news-banner" id="newsBanner">
    <div class="news-banner-track">
      <span class="news-banner-text">\u{1F44B} Welcome! I hope these tools, guides, and Azure resources save you time and help you learn something new - feedback is always welcome on <a href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</span>
    </div>
    <button type="button" class="news-banner-close" id="newsBannerClose" aria-label="Dismiss announcement">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
    </button>
  </div>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="Benoit Gaumard - home"><img class="mark" src="/favicon.svg" alt="" width="56" height="56"></a>
      <button type="button" class="menu-toggle" id="menuToggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="primaryNav">
        <svg class="menu-icon-open" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        <svg class="menu-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
      <nav class="header-links" id="primaryNav" aria-label="Primary navigation">
        <a href="/"><svg class="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>Home</a>
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

  <main id="top" tabindex="-1">
${content}
  </main>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-main">
        <div class="footer-about">
          <a class="brand" href="/"><span class="brand-mark">B.</span>G</a>
          <p>Azure Infra &amp; DevOps Consultant, helping teams design, automate, and secure cloud-native platforms on Microsoft Azure.</p>
        </div>
        <nav class="footer-group" aria-label="Footer navigation">
          <strong>Explore</strong>
          <a href="/">Home</a>
          <a href="/articles/">Articles</a>
          <a href="/tools/">Tools</a>
        </nav>
        <div class="footer-group">
          <strong>Tools</strong>
          <a href="/icons/">Icons</a>
          <a href="/emoji-sheet/">Emoji</a>
          <a href="/azure-release-updates/">Azure Updates</a>
          <a href="/m365-release-updates/">M365 Updates</a>
        </div>
      </div>
      <div class="footer-share">
        <span class="footer-share-label">Share this site</span>
        <div class="footer-share-links">
          <a class="share-btn" data-share="linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fbenoit-gaumard.io%2F" target="_blank" rel="noopener">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
            LinkedIn
          </a>
          <a class="share-btn" data-share="twitter" href="https://twitter.com/intent/tweet?url=https%3A%2F%2Fbenoit-gaumard.io%2F" target="_blank" rel="noopener">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.963 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"/></svg>
            Twitter
          </a>
          <a class="share-btn" data-share="reddit" href="https://www.reddit.com/submit?url=https%3A%2F%2Fbenoit-gaumard.io%2F" target="_blank" rel="noopener">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-6.993 4.87-3.86 0-6.99-2.176-6.99-4.87 0-.183.01-.366.037-.545A1.745 1.745 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.56-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
            Reddit
          </a>
          <a class="share-btn" data-share="mail" href="mailto:?body=https%3A%2F%2Fbenoit-gaumard.io%2F">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Mail
          </a>
          <button class="share-btn" type="button" data-share="favorite">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Add to favorites
          </button>
        </div>
        <p class="footer-share-hint" data-share-hint role="status" aria-live="polite"></p>
      </div>
      <div class="footer-bottom">
        <span>&copy; <span id="currentYear"></span> Benoit Gaumard</span>
        <a href="/privacy/">Privacy &amp; cookies</a>
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
        window.SiteUX.copy(code, "Code", button);
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
    (function () {
      const banner = document.getElementById("newsBanner");
      const closeBtn = document.getElementById("newsBannerClose");
      if (!banner || !closeBtn) return;
      closeBtn.addEventListener("click", () => {
        banner.setAttribute("hidden", "");
        try { localStorage.setItem("news-banner-dismissed", "2026-08-21"); } catch (e) {}
      });
    })();
  </script>
<script data-share-script>
    (function () {
      var root = document.querySelector('.footer-share');
      if (!root) return;
      var pageUrl = location.protocol.indexOf('http') === 0 ? location.href.split('#')[0] : 'https://benoit-gaumard.io/';
      var url = encodeURIComponent(pageUrl);
      var title = encodeURIComponent(document.title);
      var targets = {
        linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + url,
        twitter: 'https://twitter.com/intent/tweet?url=' + url + '&text=' + title,
        reddit: 'https://www.reddit.com/submit?url=' + url + '&title=' + title,
        mail: 'mailto:?subject=' + title + '&body=' + title + '%20-%20' + url
      };
      Array.prototype.forEach.call(root.querySelectorAll('a[data-share]'), function (el) {
        var href = targets[el.getAttribute('data-share')];
        if (href) el.setAttribute('href', href);
      });
      var favBtn = root.querySelector('[data-share="favorite"]');
      var hint = root.querySelector('[data-share-hint]');
      if (favBtn && hint) {
        favBtn.addEventListener('click', function () {
          var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
          hint.textContent = 'Press ' + (isMac ? '\\u2318' : 'Ctrl') + ' + D to add this site to your favorites.';
        });
      }
    })();
  </script>
<script data-article-share-script>
    (function () {
      var root = document.querySelector('.article-share');
      if (!root) return;
      var hint = root.querySelector('[data-article-share-hint]');

      function say(message) {
        if (hint) hint.textContent = message;
      }

      var copyBtn = root.querySelector('[data-article-share="copy"]');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          // The build-time URL is canonical; location.href would carry any
          // tracking query string the visitor arrived with.
          var value = copyBtn.getAttribute('data-share-url') || location.href;
          window.SiteUX.copy(value, "Article link", copyBtn).then(function (copied) {
            say(copied ? "Link copied to the clipboard." : "Copy unavailable. Use the manual copy dialog.");
          });
        });
      }

      var printBtn = root.querySelector('[data-article-share="print"]');
      if (printBtn) {
        printBtn.addEventListener('click', function () { window.print(); });
      }
    })();
  </script>

  <script data-article-reading>
  (${articleReadingRuntime.toString()})();
  </script>
  </body>
</html>
`, { path: new URL(canonical).pathname });
}

function articleReadingRuntime() {
  const toc = document.querySelector(".reading-toc");
  if (toc) {
    toc.open = matchMedia("(min-width: 75rem)").matches;
    toc.addEventListener("toggle", () => {
      if (document.activeElement === toc.querySelector("summary")) {
        toc.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    });
    toc.addEventListener("click", event => {
      const link = event.target.closest("a[href^='#']");
      if (!link) return;
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === "DETAILS") parent.open = true;
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
      if (matchMedia("(max-width: 74.99rem)").matches) toc.open = false;
    });
  }
  const share = document.querySelector(".article-share");
  if (share) share.open = matchMedia("(min-width: 40rem)").matches;
  const revealReference = () => {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
    if (!target) return;
    if (target.tagName === "SUMMARY") target.parentElement.open = true;
    for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent.tagName === "DETAILS") parent.open = true;
  };
  window.addEventListener("hashchange", revealReference);
  revealReference();
  let printState = [];
  window.addEventListener("beforeprint", () => {
    printState = [...document.querySelectorAll(".article-body details")].map(detail => [detail, detail.open]);
    printState.forEach(([detail]) => { detail.open = true; });
  });
  window.addEventListener("afterprint", () => printState.forEach(([detail, open]) => { detail.open = open; }));

  let imageDialog, imageOpener;
  document.querySelectorAll("[data-image-zoom]").forEach(link => link.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!imageDialog) {
      imageDialog = document.createElement("dialog");
      imageDialog.className = "image-dialog";
      imageDialog.setAttribute("aria-label", "Image viewer");
      imageDialog.innerHTML = '<button type="button" class="share-btn" data-image-close>Close image</button><figure><img alt=""><figcaption></figcaption></figure><a target="_blank" rel="noopener">Open original image</a>';
      document.body.append(imageDialog);
      imageDialog.querySelector("[data-image-close]").addEventListener("click", () => imageDialog.close());
      imageDialog.addEventListener("close", () => imageOpener?.focus());
      imageDialog.addEventListener("click", e => { if (e.target === imageDialog) imageDialog.close(); });
    }
    imageOpener = link;
    const source = link.querySelector("img");
    imageDialog.querySelector("img").src = link.href;
    imageDialog.querySelector("img").alt = source?.alt || "";
    imageDialog.querySelector("figcaption").textContent = link.closest("figure")?.querySelector("figcaption")?.firstChild?.textContent || source?.alt || "";
    imageDialog.querySelector("a").href = link.href;
    imageDialog.showModal();
    imageDialog.querySelector("button").focus();
  }));

  document.querySelectorAll("[data-copy-section]").forEach(button => button.addEventListener("click", () => {
    const section = document.getElementById(button.dataset.copySection);
    if (section) window.SiteUX.copy(section.innerText, "Checklist", button);
  }));

  const zoneTable = document.querySelector("[data-zone-table]");
  if (zoneTable) {
    const rows = [...zoneTable.querySelectorAll("tbody tr")];
    const search = document.getElementById("zone-search");
    const status = document.getElementById("zone-count");
    rows.forEach(row => row.querySelectorAll("code").forEach(code => {
      if (!code.textContent.includes("privatelink.")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "share-btn";
      button.textContent = "Copy zone";
      button.setAttribute("aria-label", "Copy " + code.textContent);
      button.addEventListener("click", () => window.SiteUX.copy(code.textContent, "Private DNS zone", button));
      code.after(button);
    }));
    const filter = () => {
      let count = 0;
      rows.forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(search.value.trim().toLowerCase()); if (!row.hidden) count++; });
      status.textContent = count + " of " + rows.length + " services" + (count ? "" : ". Try another service or zone name.");
    };
    search.addEventListener("input", filter);
    document.getElementById("zone-reset").addEventListener("click", () => { search.value = ""; filter(); search.focus(); });
    filter();
  }

  const library = document.querySelector("[data-reference-library]");
  if (library) {
    const groups = [...library.querySelectorAll(".library-group")];
    const input = document.getElementById("library-search");
    const category = document.getElementById("library-category");
    const count = document.getElementById("library-count");
    const entries = [...library.querySelectorAll(".library-entry")];
    if (matchMedia("(max-width: 40rem)").matches) groups.forEach(group => { group.open = false; });
    const filter = () => {
      let visible = 0;
      groups.forEach(group => {
        let groupVisible = 0;
        group.querySelectorAll(".library-entry").forEach(entry => {
          entry.hidden = !(category.value === "" || group.dataset.category === category.value) || !entry.textContent.toLowerCase().includes(input.value.trim().toLowerCase());
          if (!entry.hidden) { visible++; groupVisible++; }
        });
        group.hidden = !groupVisible;
        if (input.value.trim() || category.value) group.open = !!groupVisible;
      });
      count.textContent = visible + " of " + entries.length + " entries" + (visible ? "" : ". Clear the search or choose another category.");
    };
    input.addEventListener("input", filter);
    category.addEventListener("change", filter);
    document.getElementById("library-reset").addEventListener("click", () => { input.value = ""; category.value = ""; filter(); input.focus(); });
    const revealHash = () => {
      let target;
      try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { return; }
      const group = target?.closest(".library-group");
      if (group) { input.value = ""; category.value = ""; filter(); group.open = true; target.scrollIntoView({ block: "start", behavior: "instant" }); }
    };
    window.addEventListener("hashchange", revealHash);
    filter();
    revealHash();
  }
}

const ARTICLE_CSS = `
    .article-header { margin: 0 0 2rem; }
    .article-breadcrumb { margin: 0 0 1.25rem; font-size: 0.85rem; }
    .article-breadcrumb a { color: var(--cp-text-muted); text-decoration: none; }
    .article-breadcrumb a:hover { color: var(--cp-link); }
    .article-categories { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1rem; }
    .article-category-tag {
      display: inline-flex; align-items: center; min-height: 1.5rem; padding: .2rem .7rem; border-radius: 999px;
      background: var(--cp-accent-soft); color: var(--cp-accent-hover); font-size: 0.75rem; font-weight: 700; text-decoration: none;
    }
    .article-title { margin: 0; font-size: clamp(1.9rem, 4.4vw, 2.85rem); line-height: 1.12; }
    .article-description { margin: 1rem 0 0; color: var(--cp-text-muted); font-size: 1.05rem; line-height: 1.6; }
    .article-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-top: 1.25rem; color: var(--cp-text-muted); font-size: 0.85rem; }
    .article-meta .dot { opacity: .5; }
    .article-tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: 1rem; }
    .article-tag { padding: .15rem .55rem; border-radius: 999px; background: var(--cp-surface-soft); color: var(--cp-text-muted); font-size: 0.75rem; border: 1px solid var(--cp-border); }
    .article-body {
      margin: 0; font-size: 1.05rem; line-height: 1.75;
      background: var(--cp-surface); border: 1px solid var(--cp-border); border-radius: 16px;
      padding: clamp(1.5rem, 4vw, 3rem); box-shadow: 0 1px 2px var(--cp-border);
    }
    .article-body h2, .article-body h3, .article-body h4 { scroll-margin-top: 5.5rem; }
    .article-body h2 { margin: 2.2rem 0 1rem; font-size: 1.5rem; }
    .article-body h3 { margin: 1.8rem 0 .85rem; font-size: 1.25rem; }
    .article-body h4 { margin: 1.5rem 0 .7rem; font-size: 1.05rem; }
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
    .article-figure figcaption { margin-top: .5rem; color: var(--cp-text-muted); font-size: 0.85rem; text-align: center; }
    .table-wrap { overflow-x: auto; margin: 0 0 1.1rem; }
    .article-body table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .article-body th, .article-body td { padding: .55rem .75rem; border: 1px solid var(--cp-border); text-align: left; }
    .article-body th { background: var(--cp-surface-soft); }
    .code-block { margin: 0 0 1.3rem; border: 1px solid var(--cp-border); border-radius: 10px; overflow: hidden; background: #0f1b2b; color: #e3edf7; color-scheme: dark; }
    .code-block-header { display: flex; align-items: center; justify-content: space-between; padding: .5rem .9rem; background: #16273d; color: #b9d3ea; font-size: 0.8rem; }
    .code-lang { text-transform: uppercase; letter-spacing: .04em; font-weight: 700; }
    .copy-code-button { border: 1px solid #b9d3ea; background: transparent; color: #d7e8f7; padding: .2rem .6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
    .copy-code-button:hover { background: rgba(255,255,255,.1); }
    .copy-code-button.is-copied { border-color: #9ee8c8; color: #9ee8c8; }
    .copy-code-button:focus-visible, .code-details > summary:focus-visible { outline-color: #b9d3ea; }
    .code-block pre { margin: 0; padding: 1rem 1.1rem; overflow-x: auto; }
    .code-block code { background: none; border: 0; padding: 0; color: #e3edf7; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85rem; line-height: 1.6; }
    /* ASCII diagrams need a tight line-height so box-drawing connectors join up */
    .code-block code.language-diagram { line-height: 1.15; }
    .callout { display: flex; gap: .75rem; margin: 0 0 1.3rem; padding: 1rem 1.15rem; border-radius: 10px; border: 1px solid var(--cp-border); }
    .callout-icon { flex: 0 0 auto; margin-top: .15rem; }
    .callout-label { display: block; margin-bottom: .3rem; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .03em; }
    .callout-body p:last-child { margin-bottom: 0; }
    .callout-note { background: var(--cp-accent-soft); color: var(--cp-text); }
    .callout-note .callout-icon, .callout-note .callout-label { color: var(--cp-accent); }
    .callout-info { background: var(--cp-info-bg); color: var(--cp-text); }
    .callout-info .callout-icon, .callout-info .callout-label { color: var(--cp-info); }
    .callout-warning { background: var(--cp-warning-bg); color: var(--cp-text); }
    .callout-warning .callout-icon, .callout-warning .callout-label { color: var(--cp-warning); }
    .article-toc { margin: 0 0 1.6rem; padding: 1rem 1.25rem; border: 1px solid var(--cp-border); border-radius: 10px; background: var(--cp-surface-soft); }
    .article-toc strong { display: block; margin-bottom: .5rem; font-size: 0.8rem; text-transform: uppercase; letter-spacing: .03em; color: var(--cp-text-muted); }
    .article-toc ul { margin: 0; padding: 0; list-style: none; }
    .article-toc li { margin: 0; }
    .article-toc a { display: block; padding: .25rem 0; color: var(--cp-text); text-decoration: none; font-size: 0.9rem; }
    .article-toc a:hover { color: var(--cp-link); }
    .toc-level-3 a { padding-left: 1rem; font-size: 0.85rem; color: var(--cp-text-muted); }
    .toc-level-4 a { padding-left: 2rem; font-size: 0.85rem; color: var(--cp-text-muted); }
    .article-footer-nav { margin: 2rem 0 0; display: flex; justify-content: space-between; gap: 1rem; }
    .article-footer-nav a { display: inline-flex; align-items: center; min-height: 1.5rem; }
    .article-footer-nav a { display: inline-flex; align-items: center; gap: .4rem; color: var(--cp-accent); font-weight: 600; text-decoration: none; font-size: 0.9rem; }
    .article-footer-nav a:hover { color: var(--cp-accent-hover); }
    /* Reuses the shell's .share-btn so this reads as the same control as the
       "Share this site" row in the footer; only the layout differs. */
    .article-share {
      display: flex; flex-wrap: wrap; align-items: center; gap: .6rem .9rem;
      margin: 1.75rem 0 2rem; padding: 1rem 1.25rem;
      border: 1px solid var(--cp-border); border-radius: 12px; background: var(--cp-surface);
    }
    .article-share-label { font-size: 0.8rem; font-weight: 700; color: var(--cp-text-muted); }
    .article-share-links { display: flex; flex-wrap: wrap; gap: 8px; }
    .article-share-hint { flex-basis: 100%; margin: 0; font-size: 0.75rem; color: var(--cp-text-muted); }
    .article-share-hint:empty { display: none; }
    @media (max-width: 40rem) {
      .article-meta { font-size: 0.8rem; }
      .article-share { flex-direction: column; align-items: flex-start; }
      .article-share-links { width: 100%; }
    }
    .article-header { max-width: 75ch; margin-inline: auto; margin-bottom: 1rem; }
    .article-page .article-header { max-width: none; margin-inline: 0; }
    .article-title { font-size: clamp(1.7rem, 3.3vw, 2.65rem); }
    .article-breadcrumb, .article-categories { margin-bottom: .6rem; }
    .article-description { margin-top: .7rem; }
    .article-meta { margin-top: .7rem; }
    .article-tags { margin-top: .5rem; }
    .article-body { min-width: 0; padding: clamp(1rem, 2.2vw, 2rem); }
    .article-page main { padding-top: 1.25rem; }
    .article-body > :is(p, ul, ol, h2, h3, h4, .callout),
    .article-body .library-entry > :is(p, ul, ol),
    .article-body .reference-section > :is(p, ul, ol),
    .callout-body { max-width: var(--reading-prose-width, min(42rem, 72ch)); margin-inline: auto; }
    .article-body > :is(h2, h3, h4) { max-width: var(--reading-heading-width, 42rem); }
    .article-body > h2:first-child { margin-top: .4rem; }
    .callout-body { min-width: 0; }
    .reading-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; align-items: start; }
    .reading-layout:has(> .reading-toc:not([open])) { grid-template-columns: minmax(0, 1fr); --reading-prose-width: none; --reading-heading-width: none; }
    .reading-layout > .reading-toc { scroll-margin-top: 6rem; }
    .reading-layout > .reading-toc:not([open]) { justify-self: start; max-width: 100%; position: static; }
    .reading-toc { border: 1px solid var(--cp-border); border-radius: 10px; background: var(--cp-surface-soft); padding: .7rem 1rem; }
    .reading-toc summary, .article-share summary, .series-map summary, .library-group > summary { cursor: pointer; min-height: 2.75rem; align-content: center; font-weight: 600; }
    .reading-toc[open] .toc-label-show, .reading-toc:not([open]) .toc-label-hide { display: none; }
    .reading-toc nav { max-height: 55vh; overflow: auto; }
    .reading-toc ul { list-style: none; padding: 0; margin: .5rem 0; }
    .reading-toc a { display: block; padding: .35rem .2rem; font-size: .9rem; }
    .reading-toc .toc-level-4 { display: none; }
    .article-share { display: block; padding: .2rem .8rem; margin: .6rem 0 1rem; }
    .article-share-links { padding-block: .5rem; }
    .series-nav, .article-related { margin: 1rem 0; padding: 1rem; border: 1px solid var(--cp-border); border-radius: 10px; background: var(--cp-surface); }
    .series-nav > p { margin: 0 0 .5rem; }
    .series-links { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .75rem; }
    .series-map ol { line-height: 1.6; padding-left: 1.5rem; }
    .series-map [aria-current="page"] { font-weight: 700; }
    .article-related h2 { font-size: 1.15rem; margin-top: 0; }
    .article-related li { margin-block: .55rem; }
    .article-feature-image { max-width: 50rem; margin: 1rem auto 1.5rem; border: 1px solid var(--cp-border); border-radius: 14px; background: var(--cp-surface-soft); overflow: hidden; }
    .article-feature-image > a:focus-visible { outline-offset: -3px; }
    .article-feature-image img { display: block; border: 0; border-radius: 0; }
    .article-feature-image.is-banner > a { display: block; aspect-ratio: 16 / 9; }
    .article-feature-image.is-banner img { width: 100%; height: 100%; object-fit: contain; }
    .article-feature-image.is-logo > a { display: flex; align-items: center; justify-content: center; height: 13rem; padding: 1.5rem; }
    .article-feature-image.is-logo img { height: 100%; width: auto; max-width: 100%; object-fit: contain; }
    .article-feature-image figcaption { margin: 0; padding: .5rem .75rem; }
    .article-figure figcaption { max-width: 72ch; margin-inline: auto; }
    .article-figure figcaption a { display: inline-block; padding: .3rem; }
    .image-dialog { color: var(--cp-text); background: var(--cp-surface); border: 1px solid var(--cp-border); border-radius: 10px; max-width: 96vw; max-height: 94vh; padding: 1rem; }
    .image-dialog::backdrop { background: var(--cp-text-muted); opacity: .8; }
    .image-dialog figure { margin: 1rem 0; }
    .image-dialog img { max-width: 100%; max-height: 72vh; object-fit: contain; }
    .image-dialog figcaption { max-width: 72ch; }
    .copy-code-button { min-height: 2.75rem; padding: .4rem .7rem; }
    .code-block pre { white-space: pre; overflow-wrap: normal; }
    .code-block pre code { white-space: pre; overflow-wrap: normal; }
    .code-details summary { padding: .7rem 1rem; cursor: pointer; }
    .library-controls, .zone-controls { padding: 1rem; margin-bottom: 1rem; background: var(--cp-surface-soft); border: 1px solid var(--cp-border); border-radius: 10px; display: flex; flex-wrap: wrap; gap: .7rem; align-items: end; }
    .library-controls label, .zone-controls label { display: grid; gap: .3rem; }
    .library-controls input, .library-controls select, .zone-controls input { max-width: 100%; min-height: 2.75rem; border: 1px solid var(--cp-border-strong); border-radius: 6px; padding: .5rem; background: var(--cp-surface); color: var(--cp-text); }
    .library-controls p, .zone-controls p { flex-basis: 100%; margin: 0; }
    .library-group { border: 1px solid var(--cp-border); border-radius: 10px; padding: .6rem 1rem; margin-bottom: 1rem; }
    .library-entry { min-width: 0; margin-block: 1rem 2rem; }
    .library-entry h3 { scroll-margin-top: 6rem; }
    .query-context { font-size: .9rem; color: var(--cp-text-muted); }
    .query-output { overflow-wrap: anywhere; }
    .reference-section { margin-bottom: 1.25rem; }
    .reference-section > summary { cursor: pointer; font-size: 1.15rem; font-weight: 600; padding: .75rem; background: var(--cp-surface-soft); }
    .table-wrap [hidden], .library-group[hidden], .library-entry[hidden] { display: none !important; }
    @media (min-width: 75rem) {
      .reading-layout { grid-template-columns: 16rem minmax(0, 1fr); }
      .reading-toc { position: sticky; top: 5.5rem; }
      .reading-toc nav { max-height: calc(100vh - 12rem); }
      .reading-layout:not(:has(.reading-toc)) { grid-template-columns: minmax(0, 1fr); }
    }
    @media (max-width: 40rem) {
      .article-feature-image.is-logo > a { height: 10rem; padding: 1.25rem; }
      .article-tags { display: none; }
      .article-body { font-size: 1rem; line-height: 1.65; }
      .article-body table, .article-body tbody, .article-body tr, .article-body td { display: block; }
      .article-body thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .article-body tr { margin-bottom: .8rem; border: 1px solid var(--cp-border); border-radius: 8px; }
      .article-body td { border: 0; padding: .55rem .7rem; overflow-wrap: anywhere; }
      .article-body td::before { content: attr(data-label); display: block; font-weight: 700; color: var(--cp-text-muted); font-size: .8rem; }
      .article-body td + td { border-top: 1px solid var(--cp-border); }
      .table-wrap { overflow: visible; }
      .library-controls > label, .zone-controls > label { width: 100%; }
      .series-nav { font-size: .9rem; padding: .7rem; }
      .series-nav { display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .75rem; }
      .series-nav > p { flex-basis: 100%; margin: 0; }
      .series-links { flex: 1; }
      .series-map[open] { flex-basis: 100%; }
      .series-map summary { min-height: 2.5rem; }
      .reading-toc { padding: .2rem .75rem; }
      .article-description { font-size: 1rem; line-height: 1.5; }
    }
    @media print {
      .reading-toc, .article-share, .article-feature-image, .library-controls, .zone-controls, .copy-code-button { display: none !important; }
      .reading-layout { display: block; }
      .article-body { border: 0; box-shadow: none; padding: 0; }
      .code-block pre { white-space: pre-wrap; }
    }`;

// The footer's "Share this site" row shares the site; a reader looking at an
// article wants to share *that*. The bar sits in the header, under the tags and
// above the feature image, so passing a piece on does not mean scrolling past
// it first. Links are built here rather than at runtime because the canonical
// URL and the title are already known, so they work without JavaScript - only
// Copy and Print need a script.
function articleShareBar(article) {
  const url = encodeURIComponent(`${SITE_URL}${article.url}`);
  const title = encodeURIComponent(article.title);
  const icon = {
    x: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.963 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"/></svg>',
    linkedin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>',
    facebook: '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z"/></svg>',
    copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    print: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
  };

  return `    <details class="article-share">
      <summary id="share-label">Share this article</summary>
      <div class="article-share-links" role="group" aria-labelledby="share-label">
        <a class="share-btn" href="https://twitter.com/intent/tweet?url=${url}&amp;text=${title}" target="_blank" rel="noopener">${icon.x}X</a>
        <a class="share-btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener">${icon.linkedin}LinkedIn</a>
        <a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener">${icon.facebook}Facebook</a>
        <button class="share-btn" type="button" data-article-share="copy" data-share-url="${SITE_URL}${article.url}">${icon.copy}Copy link</button>
        <button class="share-btn" type="button" data-article-share="print">${icon.print}Print</button>
      </div>
      <p class="article-share-hint" data-article-share-hint role="status" aria-live="polite"></p>
    </details>`;
}

function articleToc(headings) {
  if (headings.length < 2) return "";
  return `<details class="reading-toc"><summary aria-controls="article-toc-navigation"><span class="toc-label-show">Show table of contents</span><span class="toc-label-hide">Hide table of contents</span></summary><nav id="article-toc-navigation" aria-label="Table of contents"><ul>${headings.map(h => `<li class="toc-level-${h.level}"><a href="#${h.id}">${renderInline(h.text)}</a></li>`).join("")}</ul></nav></details>`;
}

function seriesNavigation(article, articles) {
  const match = article.slug.match(/^(azure-policy|dns-in-azure)-part-(\d+)-/);
  if (!match) return "";
  const parts = articles.filter(a => a.slug.startsWith(`${match[1]}-part-`)).sort((a, b) => Number(a.slug.match(/part-(\d+)/)[1]) - Number(b.slug.match(/part-(\d+)/)[1]));
  const current = parts.findIndex(a => a.slug === article.slug);
  const label = match[1] === "azure-policy" ? "Azure Policy" : "DNS in Azure";
  const link = (a, text) => a ? `<a href="${a.url}">${text}</a>` : "";
  return `<nav class="series-nav" aria-label="${label} series"><p><strong>${label} · Part ${current + 1} of ${parts.length}</strong></p><div class="series-links">${link(parts[current - 1], "← Previous part")}${link(parts[current + 1], "Next part →")}</div><details class="series-map"><summary>All ${parts.length} parts</summary><ol>${parts.map(a => `<li><a href="${a.url}"${a.slug === article.slug ? ' aria-current="page"' : ""}>${escapeHtml(a.title.split(": ").slice(1).join(": ") || a.title)}</a></li>`).join("")}</ol></details></nav>`;
}

function relatedReading(article, articles) {
  const related = (article.related || []).map(slug => articles.find(a => a.slug === slug)).filter(Boolean);
  if (!related.length) {
    related.push(...articles.filter(a => a.slug !== article.slug && !a.noindex && a.tags.some(t => article.tags.includes(t))).slice(0, 3));
  }
  return related.length ? `<aside class="article-related" aria-label="Related reading"><h2>Continue with</h2><ul>${related.slice(0, 3).map(a => `<li><a href="${a.url}">${escapeHtml(a.title)}</a><br><span>${escapeHtml(a.description)}</span></li>`).join("")}</ul></aside>` : "";
}

function referenceLibrary(article) {
  const kql = article.slug === "kql-query-collection";
  const sections = article.bodyHtml.split(/(?=<h2\b)/);
  const intro = sections.shift();
  let count = 0;
  const groups = sections.map(section => {
    const heading = section.match(/^<h2 id="([^"]+)">([\s\S]*?)<\/h2>/);
    if (!heading) return section;
    const chunks = section.slice(heading[0].length).split(/(?=<h3\b)/);
    const entries = chunks.filter(c => c.includes('class="code-block"')).map(chunk => {
      count++;
      const entryHeading = chunk.match(/^<h3 id="([^"]+)">([\s\S]*?)<\/h3>/);
      const id = entryHeading?.[1] || `${heading[1]}-commands`;
      const title = entryHeading?.[2] || heading[2];
      const code = chunk.match(/<code class="language-[^"]+">([\s\S]*?)<\/code>/)?.[1] || "";
      const projections = [...code.matchAll(/^\|\s*(?:project|summarize)\s+(.+)$/gm)];
      const output = projections.length ? projections.at(-1)[1] : "Resource fields selected by this query; inspect the returned schema in Resource Graph Explorer.";
      const context = kql ? `<p class="query-context">Run in <a href="https://portal.azure.com/#view/HubsExtension/ArgQueryBlade">Azure Resource Graph Explorer</a>, not Log Analytics. Requires read access to the queried resources; select the intended subscriptions. Replace sample names, IDs and tag values. Technical execution validation: not recorded.</p><p class="query-output"><strong>Output:</strong> ${output}</p>` : "";
      return `<section class="library-entry"><h3 id="${id}">${title}</h3><p><a href="#${id}">Link to this ${kql ? "query" : "task"}</a></p>${context}${entryHeading ? chunk.slice(entryHeading[0].length) : chunk}</section>`;
    });
    return `<details class="library-group" data-category="${heading[1]}" open><summary id="${heading[1]}">${heading[2]}</summary>${chunks[0].includes('class="code-block"') ? "" : chunks[0]}${entries.join("\n")}</details>`;
  });
  const categories = article.headings.filter(h => h.level === 2);
  return `<div class="library-controls"><label for="library-search">Search ${kql ? "queries" : "commands"}<input id="library-search" type="search" placeholder="${kql ? "subnets, RBAC, storage…" : "branch, status, commit…"}"></label><label for="library-category">Category<select id="library-category"><option value="">All categories</option>${categories.map(h => `<option value="${h.id}">${escapeHtml(h.text)}</option>`).join("")}</select></label><button class="share-btn" id="library-reset" type="button">Clear filters</button><p id="library-count" role="status" aria-live="polite">${count} entries</p></div><details class="reference-section"><summary>${kql ? "Execution context and limitations" : "How to use this reference"}</summary>${intro}</details><div data-reference-library>${groups.join("\n")}</div>`;
}

function renderArticlePage(article, articles) {
  const categoriesHtml = article.categories.map((c) => `<a class="article-category-tag" href="/articles/?category=${encodeURIComponent(c)}">${escapeHtml(c)}</a>`).join("");
  const tagsHtml = article.tags.length ? `<div class="article-tags">${article.tags.map((t) => `<span class="article-tag">#${escapeHtml(t)}</span>`).join("")}</div>` : "";
  const featureImageHtml = article.featureImage
    ? `<figure class="article-feature-image article-figure is-${article.featureImageShape || "banner"}"><a href="${article.featureImage}" data-image-zoom aria-label="Enlarge article illustration"><img src="${article.featureImage}" alt="${escapeHtml(article.title)}" loading="eager" fetchpriority="high" decoding="async"></a><figcaption>Article illustration · <a href="${article.featureImage}" target="_blank" rel="noopener">Open original image</a></figcaption></figure>`
    : "";

  const library = ["kql-query-collection", "git-basics"].includes(article.slug);
  let readable = library ? referenceLibrary(article) : article.bodyHtml;
  if (article.slug === "dns-in-azure-part-5-private-endpoint-dns") {
    const start = readable.indexOf('<h2 id="the-zone-name-has-to-be-exact">');
    const at = readable.indexOf('<div class="table-wrap"', start);
    if (at !== -1) readable = readable.slice(0, at) + '<div class="zone-controls"><label for="zone-search">Find a service or private DNS zone<input id="zone-search" type="search"></label><button class="share-btn" id="zone-reset" type="button">Clear search</button><p id="zone-count" role="status" aria-live="polite"></p></div>' + readable.slice(at).replace('<div class="table-wrap"', '<div class="table-wrap" data-zone-table');
  }
  const { body, trailing } = library ? { body: readable, trailing: adUnit(AD_SLOT_ARTICLE) } : injectMidArticleAd(readable, AD_SLOT_ARTICLE);

  const content = `    <div class="article-header">
      <p class="article-breadcrumb"><a href="/articles/">&larr; All articles</a></p>
      <div class="article-categories">${categoriesHtml}</div>
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <p class="article-description">${escapeHtml(article.summary || article.description)}</p>
      <div class="article-meta">
        <span>${escapeHtml(article.author)}</span>
        <span class="dot">&middot;</span>
        <span>Published ${formatDisplayDate(article.date)}</span>
        <span class="dot">&middot;</span>
        <span>${library ? (article.slug === "kql-query-collection" ? `Query library · ${(article.bodyHtml.match(/class="code-block"/g) || []).length} queries` : "Command cheat sheet") : `About ${article.readingMinutes} min reading · not implementation time`}</span>
      </div>
      ${tagsHtml}
    </div>

    ${featureImageHtml}

${articleShareBar(article)}

    ${seriesNavigation(article, articles)}

    <div class="reading-layout">
    ${library ? "" : articleToc(article.headings)}
    <article class="article-body" id="article-content">
      ${body}
    </article>
    </div>

${trailing ? trailing + "\n" : ""}${adUnit(AD_SLOT_ARTICLE_SECONDARY) ? adUnit(AD_SLOT_ARTICLE_SECONDARY) + "\n" : ""}
    ${seriesNavigation(article, articles)}
    ${relatedReading(article, articles)}
    <div class="article-footer-nav">
      <a href="/articles/">&larr; Back to all articles</a>
    </div>`;

  return pageShell({
    title: `${article.title} | Benoit Gaumard`,
    description: article.description,
    canonical: `${SITE_URL}${article.url}`,
    content,
    bodyClass: "article-page",
    ads: true,
    noindex: article.noindex,
  });
}

// ---------- Static pages ----------

// The privacy policy is required by AdSense and has to stay reachable from
// every page, so it is generated from the same shell as the articles.
function renderPrivacyPage() {
  const description =
    "How benoit-gaumard.io handles cookies, advertising, and analytics: Google AdSense, Google Analytics, consent management, and how to change your choices.";

  const body = `      <h2 id="privacy-summary">In brief</h2>
      <p>There is no site account. Calculations run locally; favourites and interface preferences are stored in this browser. Suggestions are prepared locally and are sent to GitHub only when you choose to continue and submit them there. GitHub hosting, Google Analytics and advertising involve third-party processing described below.</p>
      <p><button class="share-btn" type="button" data-privacy-choices>Change my privacy choices</button></p>
      <p>This action asks the consent manager to reopen. If it is unavailable or blocked, the site reports that honestly; pressing the button does not accept cookies or change your choice by itself.</p>
      <h2 id="who-runs-this-site">Who runs this site</h2>
      <p>benoit-gaumard.io is a personal website published by Benoit Gaumard, an Azure infrastructure and DevOps consultant. It hosts free tools, reference data, and technical articles about Microsoft Azure, GitHub, and cloud operations. It is a personal project and is not operated by any employer.</p>
      <p>For any question about this policy, you can reach me through <a href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</p>

      <h2 id="what-data-is-collected">What data is collected</h2>
      <p>There is no account system or newsletter on this site. Some tools offer suggestion forms with a name, title, URL or description. These fields prepare a GitHub issue locally. Opening the GitHub draft transmits the prefilled information to GitHub; submitting it there can make it public, associated with your GitHub account. Do not include confidential information or personal details you do not want published.</p>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Data purposes"><table><thead><tr><th scope="col">Purpose</th><th scope="col">Data and destination</th><th scope="col">Control</th></tr></thead><tbody>
        <tr><td data-label="Purpose">Local tools and preferences</td><td data-label="Data and destination">Calculator inputs, favourites, theme, view and filter preferences in this browser. Some filters can also appear in a shareable URL.</td><td data-label="Control">Use the tool's reset/favourite controls, or manage local site storage in browser settings. Shared URLs disclose their query parameters to recipients and hosting services.</td></tr>
        <tr><td data-label="Purpose">Suggestions</td><td data-label="Data and destination">Voluntarily forwarded draft fields and, on submission, your GitHub issue and profile.</td><td data-label="Control">Review before opening/submitting. Manage the resulting issue on GitHub.</td></tr>
        <tr><td data-label="Purpose">Page delivery</td><td data-label="Data and destination">Connection information processed by GitHub Pages. Linked or embedded third-party images can also receive a request.</td><td data-label="Control">See the provider's privacy policy; external destinations have their own policies.</td></tr>
        <tr><td data-label="Purpose">Audience measurement</td><td data-label="Data and destination">Page and technical measurement data sent to Google Analytics under the tag's consent settings.</td><td data-label="Control">Change privacy choices. Denied storage is not the same as no network requests.</td></tr>
        <tr><td data-label="Purpose">Advertising</td><td data-label="Data and destination">Google and advertising partners may process ad requests and, where permitted by choices and configuration, cookies and personalisation data.</td><td data-label="Control">Consent manager and Google's advertising settings.</td></tr>
      </tbody></table></div>
      <ul>
        <li><strong>Local processing.</strong> Calculations run in your browser. Favourites and saved preferences are local to this browser, not synchronised to a site account. Exporting, copying or sharing results and sending suggestions are deliberate actions that can move that information elsewhere.</li>
        <li><strong>Technical data from hosting.</strong> The site is served by GitHub Pages. Like any web host, GitHub processes connection data such as your IP address in order to deliver pages and protect the service against abuse. See the <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a>.</li>
        <li><strong>Measurement and advertising data.</strong> Described below, with controls in the consent manager when available.</li>
      </ul>

      <h2 id="advertising">Advertising: Google AdSense</h2>
      <p>Parts of this site display advertising served by Google AdSense, which helps cover hosting and domain costs. Google and its advertising partners act as third-party vendors on this site.</p>
      <ul>
        <li>Third-party vendors, including Google, use cookies and similar technologies to serve ads based on your prior visits to this website or to other websites.</li>
        <li>Google's use of advertising cookies enables it and its partners to serve ads to you based on your visit to this site and/or other sites on the Internet.</li>
        <li>You can opt out of personalised advertising in <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.</li>
        <li>You can opt out of third-party vendor cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a> or <a href="https://www.youronlinechoices.com/" target="_blank" rel="noopener noreferrer">Your Online Choices</a>.</li>
        <li>Google's own handling of this data is described in <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses information from sites that use its services</a>.</li>
      </ul>
      <p>Consult the vendor and purpose details in the consent dialogue for the choices offered by the active configuration. This privacy page does not load the advertising script or contain ad slots.</p>

      <h2 id="analytics">Analytics</h2>
      <p>This site uses Google Analytics 4 to understand, in aggregate, which pages and tools are useful. It reports things such as how many people visited a page and which country traffic came from. IP addresses are handled by Google under the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>, and analytics storage stays disabled until you consent.</p>
      <p>The intended use is aggregate audience measurement, not an account-based visitor profile. Google may still process technical request information, including restricted-mode signals when storage is denied.</p>

      <h2 id="cookies-and-consent">Cookies and your consent</h2>
      <p>This site implements Google Consent Mode v2. Before you make a choice, advertising storage, advertising personalisation, ad user data, and analytics storage are all set to <em>denied</em>. Google tags run in a restricted mode and no advertising or analytics cookies are used for personalisation.</p>
      <p>Where Google's configured consent message is available, it offers the applicable purpose and vendor choices. Availability can depend on region, prior choices, provider configuration and content blockers. The site cannot guarantee that a dialogue will appear in every browser.</p>
      <ul>
        <li><strong>Your selected choices</strong> control the permitted purposes through the configured consent manager; accepting one purpose is not a blanket description of all others.</li>
        <li><strong>If you refuse</strong>, you keep access to the tools and articles. Restricted advertising or measurement requests may still occur; denied storage does not mean no third-party processing.</li>
        <li><strong>To change your mind later</strong>, use <button class="share-btn" type="button" data-privacy-choices>Change my privacy choices</button>. This requests the consent manager, not consent itself. If unavailable, consult <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a> for Google-wide choices; those are not a substitute for this site's consent dialogue.</li>
      </ul>
      <p>Local storage remembers requested interface features such as theme, favourites and view preferences. These controls are separate from advertising choices. Removing local storage clears those saved preferences; it is not the normal route for reopening the consent manager.</p>

      <h2 id="your-rights">Your rights</h2>
      <p>Under the GDPR you can request access to, correction of, or erasure of personal data relating to you, object to processing, and lodge a complaint with a supervisory authority — in France, the <a href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer">CNIL</a>.</p>
      <p>There is no site account or mailing list. If you have sent a suggestion, include its GitHub issue link when contacting the publisher through <a href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer">LinkedIn</a>, without publishing sensitive details in an issue. Requests about provider-held data may also need to be addressed to GitHub or Google; see their linked privacy policies. This description of site behaviour is not a legal compliance certification.</p>

      <h2 id="children">Children</h2>
      <p>This site publishes professional technical documentation for cloud engineers. It is not directed at children under 16, and no content here is created for a child audience.</p>

      <h2 id="changes">Changes to this policy</h2>
      <p>This policy is updated when the site's tooling changes — for example if an advertising or measurement provider is added or removed. The date at the top of this page always reflects the latest version.</p>`;
  const headings = [...body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)]
    .map(([, id, text]) => ({ level: 2, id, text }));
  const content = `    <div class="article-header">
      <p class="article-breadcrumb"><a href="/">&larr; Home</a></p>
      <h1 class="article-title">Privacy Policy</h1>
      <p class="article-description">${description}</p>
      <div class="article-meta">
        <span>Benoit Gaumard</span>
        <span class="dot">&middot;</span>
        <span>Last updated ${formatDisplayDate(PRIVACY_UPDATED)}</span>
      </div>
    </div>

    <div class="reading-layout">
    ${articleToc(headings)}
    <article class="article-body" id="article-content">
${body}
    </article>
    </div>

    <div class="article-footer-nav">
      <a href="/">&larr; Back to home</a>
      <a href="/articles/">All articles</a>
    </div>`;

  return pageShell({
    title: "Privacy Policy | Benoit Gaumard",
    description,
    canonical: `${SITE_URL}/privacy/`,
    headerActive: "",
    content,
    bodyClass: "article-page",
    ads: false,
  });
}

// ---------- Build ----------

// The feature images come in two shapes that no single box can serve: about
// half are 1200x630 / 1792x1024 banners drawn for the purpose, the other half
// are square service or product logos as small as 18x18. A fixed 16/9 box with
// object-fit: contain stretched a 150px logo to 450px, which is why some heroes
// looked enormous next to the banners. Measuring the source lets each shape get
// its own normalised box, so every logo hero is the same height as every other
// logo hero and every banner matches every other banner.
const BANNER_MIN_RATIO = 1.4;

function readSvgSize(text) {
  const attr = (name) => {
    const m = text.match(new RegExp(`<svg[^>]*\\s${name}="([\\d.]+)`, "i"));
    return m ? Number(m[1]) : 0;
  };
  const width = attr("width");
  const height = attr("height");
  if (width > 0 && height > 0) return { width, height };
  const box = text.match(/viewBox="\s*[\d.+-]+[\s,]+[\d.+-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (box) return { width: Number(box[1]), height: Number(box[2]) };
  return null;
}

function readPngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// Walks the JPEG marker chain to the first start-of-frame, which is the only
// place the dimensions live.
function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset++; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

async function featureImageShape(src) {
  if (!src) return null;
  const file = join(HERE, "..", src.replace(/^\//, ""));
  try {
    let size = null;
    if (/\.svg$/i.test(src)) size = readSvgSize(await readFile(file, "utf8"));
    else {
      const buffer = await readFile(file);
      size = readPngSize(buffer) || readJpegSize(buffer);
    }
    if (!size || !size.width || !size.height) {
      console.warn(`  feature image size unreadable, treating as a banner: ${src}`);
      return "banner";
    }
    return size.width / size.height >= BANNER_MIN_RATIO ? "banner" : "logo";
  } catch {
    console.warn(`  feature image missing, treating as a banner: ${src}`);
    return "banner";
  }
}

async function loadArticle(filename) {
  const raw = await readFile(join(contentDir, filename), "utf8");
  const { data, body } = parseFrontMatter(raw);
  if (!data.title) throw new Error(`${filename}: missing "title" in frontmatter`);
  if (!data.date) throw new Error(`${filename}: missing "date" in frontmatter`);
  if (!data.description) throw new Error(`${filename}: missing "description" in frontmatter`);

  const slug = filename.replace(/\.md$/i, "");
  const rendered = markdownToHtml(body.trim());
  let bodyHtml = rendered.html.replace(/<nav class="article-toc"[\s\S]*?<\/nav>/g, "");
  if (/^(azure-policy|dns-in-azure)-part-/.test(slug)) {
    bodyHtml = bodyHtml.replace(/<ul>[\s\S]*?<\/ul>/g, list => (list.match(/href="\/articles\/(?:azure-policy|dns-in-azure)-part-/g) || []).length >= 5 ? "" : list);
  }
  if (Array.isArray(data.leadSections)) {
    const sections = bodyHtml.split(/(?=<h2 id=")/);
    const intro = sections.shift();
    const promoted = [];
    for (const title of data.leadSections) {
      const at = sections.findIndex(section => section.startsWith(`<h2 id="${slugify(title)}">`));
      if (at < 0) throw new Error(`${filename}: lead section not found: ${title}`);
      promoted.push(...sections.splice(at, 1));
    }
    bodyHtml = [intro, ...promoted, ...sections].join("");
  }
  for (const title of data.collapsible || []) {
    const id = slugify(title);
    const level = rendered.headings.find(heading => heading.id === id)?.level;
    if (!level) throw new Error(`${filename}: collapsible section not found: ${title}`);
    const expression = new RegExp(`(<h${level} id="${id}">[\\s\\S]*?<\\/h${level}>)([\\s\\S]*?)(?=<h[2-${level}]\\b|$)`);
    bodyHtml = bodyHtml.replace(expression, (_, heading, section) => `<details class="reference-section"><summary id="${id}">${renderInline(title)}</summary>${section}</details>`);
  }
  const wordCount = countWords(body);

  return {
    slug,
    title: data.title,
    description: data.description,
    summary: data.summary || "",
    author: data.author || DEFAULT_AUTHOR,
    date: data.date,
    tags: Array.isArray(data.tags) ? data.tags : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
    featureImage: data.featureImage || null,
    featureImageShape: await featureImageShape(data.featureImage || null),
    featured: data.featured === true,
    draft: data.draft === true,
    noindex: data.noindex === true,
    related: Array.isArray(data.related) ? data.related : [],
    headings: rendered.headings.sort((a, b) => bodyHtml.indexOf(`id="${a.id}"`) - bodyHtml.indexOf(`id="${b.id}"`)),
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    url: `/articles/${slug}/`,
    bodyHtml,
  };
}

// The article list on /articles/ is rendered from articles.json at runtime, so
// the HTML that Googlebot parses first contained the page chrome and not one
// link to any of the 32 articles - every article was orphaned, discoverable
// only through the sitemap and a successful JS render. Emitting the same list
// as real markup fixes that and shows content before the script runs;
// renderList() calls replaceChildren() on this container, so the runtime list
// still takes over untouched.
const LIST_START = "<!-- articles:static:start -->";
const LIST_END = "<!-- articles:static:end -->";

function staticCard(article) {
  const thumb = article.featureImage
    ? `<div class="card-thumb"><img src="${escapeHtml(article.featureImage)}" alt="" loading="lazy" width="1200" height="630"></div>`
    : "";
  const categories = article.categories.length
    ? `<div class="card-categories">${article.categories.map((c) => `<span class="card-category-tag">${escapeHtml(c)}</span>`).join("")}</div>`
    : "";
  return `        <a class="article-card" href="${article.url}">
${thumb ? `          ${thumb}\n` : ""}          <div class="card-body">
${categories ? `            ${categories}\n` : ""}            <h3>${escapeHtml(article.title)}</h3>
            <p>${escapeHtml(article.description)}</p>
            <div class="card-meta">
              <span>${formatDisplayDate(article.date)}</span>
              <span class="dot">&middot;</span>
              <span>${article.readingMinutes} min read</span>
            </div>
          </div>
        </a>`;
}

function injectStaticList(html, articles) {
  const cards = articles.map(staticCard).join("\n");
  const block = `${LIST_START}\n${cards}\n        ${LIST_END}`;

  if (html.includes(LIST_START) && html.includes(LIST_END)) {
    const start = html.indexOf(LIST_START);
    const end = html.indexOf(LIST_END) + LIST_END.length;
    return html.slice(0, start) + block + html.slice(end);
  }

  const open = '<div class="article-cards" id="articleCards">';
  const at = html.indexOf(open);
  if (at === -1) throw new Error('articles/index.html: #articleCards container not found');
  const close = html.indexOf("</div>", at + open.length);
  if (close === -1) throw new Error('articles/index.html: #articleCards is not closed');
  return html.slice(0, at + open.length) + block + "\n      " + html.slice(close);
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
    <title>Benoit Gaumard - Articles</title>
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

function htmlLineEndings(html) {
  return html.replace(/\r+\n/g, "\n").replace(/^[ \t]+$/gm, "").replace(/\n/g, "\r\n");
}

async function main() {
  if (process.argv.includes("--privacy-only")) {
    const privacyDir = join(HERE, "..", "privacy");
    await mkdir(privacyDir, { recursive: true });
    await writeFile(join(privacyDir, "index.html"), htmlLineEndings(renderPrivacyPage()), "utf8");
    console.log("Built /privacy/ (Privacy Policy).");
    return;
  }
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
    await writeFile(join(outDir, "index.html"), htmlLineEndings(renderArticlePage(article, published)), "utf8");
  }

  const privacyDir = join(HERE, "..", "privacy");
  await mkdir(privacyDir, { recursive: true });
  await writeFile(join(privacyDir, "index.html"), htmlLineEndings(renderPrivacyPage()), "utf8");

  const articlesJson = {
    generatedAt: new Date().toISOString(),
    articles: published.map(({ bodyHtml, headings, related, draft, ...meta }) => meta),
  };
  await writeFile(join(HERE, "articles.json"), `${JSON.stringify(articlesJson, null, 2)}\n`, "utf8");
  await writeFile(join(HERE, "rss.xml"), buildRss(published), "utf8");

  const indexPath = join(HERE, "index.html");
  const indexHtml = await readFile(indexPath, "utf8");
  const indexed = published.filter((a) => !a.noindex);
  const nextIndexHtml = injectStaticList(indexHtml, indexed).replace(/\r+\n/g, "\n").replace(/\n/g, "\r\n");
  if (nextIndexHtml !== indexHtml) await writeFile(indexPath, nextIndexHtml, "utf8");

  console.log(`Built ${published.length} article(s):`);
  published.forEach((a) => console.log(`  - ${a.url}  (${a.title})${a.noindex ? "  [noindex]" : ""}`));
  console.log("  - /privacy/  (Privacy Policy)");
  console.log(`Static list in articles/index.html: ${indexed.length} crawlable link(s).`);
  if (all.length !== published.length) {
    console.log(`Skipped ${all.length - published.length} draft article(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
