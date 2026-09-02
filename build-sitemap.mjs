// Builds sitemap.xml for the 63 hand-authored and generated shell pages.
// The Hugo blog emits its own sitemap into public/blog/, so robots.txt points
// at both rather than nesting a sitemap index.
//
// Run: node build-sitemap.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SITE = "https://benoit-gaumard.io";
const SKIP = new Set(["blog", "public", "node_modules", "themes", ".git", ".github", ".impeccable", ".playwright-mcp", "favicons"]);

// Listing a noindex page in the sitemap is a contradiction search engines report
// as an error, so the directive itself decides - no hardcoded filename list to
// keep in sync when a page later opts out.
function isNoindex(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  return m ? /noindex/i.test(m[1]) : false;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || SKIP.has(entry)) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith(".html")) out.push(p);
  }
  return out;
}

// Priority reflects how the site is actually entered: visitors arrive deep on a
// tool page from search far more often than they arrive on the homepage.
function priorityFor(url) {
  if (url === "/") return "1.0";
  if (url === "/tools/" || url === "/articles/") return "0.9";
  if (url.startsWith("/articles/")) return "0.7";
  return "0.8";
}

const pages = walk(ROOT)
  .filter((p) => {
    const src = readFileSync(p, "utf8");
    if (isNoindex(src)) return false;
    return src.includes("news-banner"); // the shared shell marks a real page
  })
  .map((p) => {
    const rel = relative(ROOT, p).split(sep).join("/");
    const url = rel === "index.html" ? "/" : "/" + rel.replace(/index\.html$/, "");
    const src = readFileSync(p, "utf8");
    const title = (src.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/\s*\|\s*Benoit Gaumard\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    const description = (src.match(/<meta name="description" content="([^"]*)"/i)?.[1] || "")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim();
    return { url, lastmod: statSync(p).mtime.toISOString().slice(0, 10), title, description };
  })
  // index_fr.html is a real alternate, keep it; drop nothing else
  .sort((a, b) => a.url.localeCompare(b.url));

const body = pages
  .map(({ url, lastmod }) => {
    return `  <url>
    <loc>${SITE}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priorityFor(url)}</priority>
  </url>`;
  })
  .join("\n");

// The hreflang pairing between / and /index_fr.html is already declared with
// <link rel="alternate" hreflang> in the <head> of both pages, which Google
// treats as equivalent. Repeating it here as <xhtml:link> added nothing and
// cost the browser's XML tree viewer: Chromium disables it as soon as the
// document contains an element in a known namespace such as XHTML, and renders
// the sitemap as flat text instead. Keeping the document inside the sitemap
// namespace alone keeps that viewer as a fallback for when XSLT is removed.
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(join(ROOT, "sitemap.xml"), xml.replace(/\n/g, "\r\n"), "utf8");

const robots = `# https://benoit-gaumard.io
User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/blog/sitemap.xml
`;
writeFileSync(join(ROOT, "robots.txt"), robots.replace(/\n/g, "\r\n"), "utf8");

// llms.txt is a convention, not a ranking signal, and it is generated from the
// same page list as the sitemap so the two cannot drift apart. Only pages that
// are already indexable appear here.
const groups = [
  { heading: "Articles", match: (u) => u.startsWith("/articles/") && u !== "/articles/" },
  { heading: "Tools and reference data", match: (u) => !u.startsWith("/articles/") && u !== "/" && u !== "/index_fr.html" },
];

const home = pages.find((p) => p.url === "/");
const sections = groups
  .map(({ heading, match }) => {
    const items = pages
      .filter((p) => match(p.url))
      .map((p) => `- [${p.title}](${SITE}${p.url})${p.description ? `: ${p.description}` : ""}`)
      .join("\n");
    return items ? `## ${heading}\n\n${items}` : "";
  })
  .filter(Boolean)
  .join("\n\n");

const llms = `# benoit-gaumard.io

> ${home?.description || "Azure tools, reference data and how-to guides by Benoit Gaumard."}

Personal site of Benoit Gaumard, Azure Infra & DevOps Consultant in Paris.
The reference datasets (Azure regions, IP ranges, policies, policy aliases,
taggable resources, release updates) are refreshed automatically by scheduled
GitHub Actions workflows, so the JSON behind each tool tracks upstream sources.

## Main pages

- [Home](${SITE}/): ${home?.description || ""}
- [Accueil (French)](${SITE}/index_fr.html)
- [Articles](${SITE}/articles/): index of every how-to guide
- [Tools](${SITE}/tools/): index of every tool and reference page

${sections}

## Feeds

- [Articles RSS](${SITE}/articles/rss.xml)
- [Sitemap](${SITE}/sitemap.xml)
`;

writeFileSync(join(ROOT, "llms.txt"), llms.replace(/\r?\n/g, "\r\n"), "utf8");

console.log(`sitemap.xml: ${pages.length} URLs`);
console.log("robots.txt: written (2 sitemaps referenced)");
console.log(`llms.txt: ${pages.length} page(s) listed`);
