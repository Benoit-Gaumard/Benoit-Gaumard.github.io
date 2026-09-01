// Patches the hand-authored shell pages so they carry the same consent, analytics
// and legal-footer wiring as the generated /articles/ pages.
// Generated pages (articles/<slug>/, privacy/) come from articles/build-articles.mjs
// and are skipped here.
//
// Run: node build-shell-patch.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set(["blog", "public", "node_modules", "themes", ".git", ".github", ".impeccable", ".playwright-mcp", "privacy"]);
const GA4_ID = "G-75X1Q2PPLE";

const COLOR_SCHEME = '<meta name="color-scheme" content="light">';
const FOOTER_MARKER = '<span>&copy; <span id="currentYear"></span> Benoit Gaumard</span>';

const CONSENT_BLOCK = `${COLOR_SCHEME}
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
    gtag('set', 'url_passthrough', true);
  </script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
  <script>
    gtag('js', new Date());
    gtag('config', '${GA4_ID}');
  </script>`;

const FOOTER_BLOCK = `${FOOTER_MARKER}
        <a href="/privacy/">Privacy &amp; cookies</a>`;

const FOOTER_CSS = `.footer-bottom a { color: var(--cp-text-muted); text-decoration: none; }
    .footer-bottom a:hover { color: var(--cp-link); }

    .back-to-top {`;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || SKIP_DIRS.has(entry)) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith(".html")) out.push(p);
  }
  return out;
}

// articles/<slug>/index.html is emitted by build-articles.mjs; only the
// hand-authored articles/index.html listing page belongs to this pass.
function isGenerated(rel) {
  return /^articles\/[^/]+\/index\.html$/.test(rel);
}

let patched = 0;
let skipped = 0;

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).split(sep).join("/");
  if (isGenerated(rel)) continue;

  let src = readFileSync(file, "utf8");
  const before = src;

  if (!src.includes("gtag('consent', 'default'") && src.includes(COLOR_SCHEME)) {
    src = src.replace(COLOR_SCHEME, CONSENT_BLOCK);
  }
  if (!src.includes('href="/privacy/"') && src.includes(FOOTER_MARKER)) {
    src = src.replace(FOOTER_MARKER, FOOTER_BLOCK);
  }
  if (!src.includes(".footer-bottom a {") && src.includes("\n    .back-to-top {")) {
    src = src.replace("\n    .back-to-top {", `\n    ${FOOTER_CSS}`);
  }

  if (src !== before) {
    writeFileSync(file, src, "utf8");
    patched++;
    console.log(`patched  ${rel}`);
  } else {
    skipped++;
  }
}

console.log(`\n${patched} page(s) patched, ${skipped} already up to date.`);
