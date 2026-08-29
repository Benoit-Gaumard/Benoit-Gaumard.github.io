// Builds sitemap.xml for the 63 hand-authored and generated shell pages.
// The Hugo blog emits its own sitemap into public/blog/, so robots.txt points
// at both rather than nesting a sitemap index.
//
// Run: node build-sitemap.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SITE = "https://benoit-gaumard.io";
const SKIP = new Set(["blog", "public", "node_modules", "themes", ".git", ".github", ".impeccable", ".playwright-mcp"]);
// 404.html carries meta robots noindex; listing it in the sitemap is a
// contradiction search engines report as an error
const NOINDEX = new Set(["404.html"]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || SKIP.has(entry)) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (entry.endsWith(".html") && !NOINDEX.has(entry)) out.push(p);
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
    return src.includes("news-banner"); // the shared shell marks a real page
  })
  .map((p) => {
    const rel = relative(ROOT, p).split(sep).join("/");
    const url = rel === "index.html" ? "/" : "/" + rel.replace(/index\.html$/, "");
    return { url, lastmod: statSync(p).mtime.toISOString().slice(0, 10) };
  })
  // index_fr.html is a real alternate, keep it; drop nothing else
  .sort((a, b) => a.url.localeCompare(b.url));

const body = pages
  .map(({ url, lastmod }) => {
    const alt =
      url === "/" || url === "/index_fr.html"
        ? `\n    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/"/>` +
          `\n    <xhtml:link rel="alternate" hreflang="fr" href="${SITE}/index_fr.html"/>` +
          `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`
        : "";
    return `  <url>
    <loc>${SITE}${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${priorityFor(url)}</priority>${alt}
  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
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

console.log(`sitemap.xml: ${pages.length} URLs`);
console.log("robots.txt: written (2 sitemaps referenced)");
