import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script, runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = path => readFileSync(join(root, path), "utf8");
const generator = read("articles/build-articles.mjs").replace(/\r\n/g, "\n");
const metadata = JSON.parse(read("articles/articles.json")).articles;
const withoutScripts = html => html.replace(/<script\b[\s\S]*?<\/script>/g, "");
const decode = text => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// The phrases identify concrete, article-specific changes, not just template coverage.
export const coverage = [
  [40, "allow-icmp-ping-on-an-azure-vm", ["Check the network path", "TrustedSource", "Remove-NetFirewallRule"]],
  [41, "app-service-php-access-to-azure-sql-database-with-managed-identity", ["SQLSRV", "target application database", "Validation checklist"]],
  [42, "azure-lighthouse-cross-tenant-management", ["Which scenario concerns you?", "Preflight checklist", "managing tenant = operator/provider"]],
  [43, "azure-policy-part-1-what-is-a-policy", ["Essential reading or reference", "Trace the example", "Choose an effect"]],
  [44, "azure-policy-part-2-initiatives", ["Read the parameter path", "Definition ID", "Member reference"]],
  [45, "azure-policy-part-3-assignments", ["Before applying an assignment", "Bad message", "After deployment"]],
  [46, "azure-policy-part-4-exclusions-notscopes", ["Decide before editing notScopes", "Controls lost from evaluation", "Next review date"]],
  [47, "azure-policy-part-5-exemptions", ["Configure it, then govern its lifetime", "Copyable review record", "Review due before expiry"]],
  [48, "azure-policy-part-6-policy-as-code", ["Destination and readiness checklist", "Concrete control", "deletion plan"]],
  [49, "azure-policy-part-7-epac", ["Evaluate, configure, adopt", "Adoption gates", "not recorded"]],
  [50, "azure-rest-apis-versions-and-lifecycle", ["Find available API versions", "Choose and verify the lifecycle", "not a claim"]],
  [51, "azure-subscription-switcher", ["Choose console or desktop", "not a browser/mobile action", "Get-Command Out-GridView"]],
  [52, "azure-terraform-entra-id-authentication", ["Remote backend configuration", "Provider configuration", "Verify without applying"]],
  [53, "call-azure-api-with-powershell", ["Let the module handle the token", "Invoke-AzRestMethod", "Expected shape"]],
  [54, "clean-rbac-identity-not-found", ["Preview only", "WhatIf", "not proof it was deleted"]],
  [55, "connect-azure-vm-using-native-rdp-client-through-bastion", ["Select context and open the tunnel", "Open the client", "Close and troubleshoot"]],
  [56, "connect-github-and-azure-for-deployment-using-oidc", ["Choose identity and trust context first", "Textual trust path", "Verify login without deployment"]],
  [57, "cyber-attacks-live-maps", ["Choose a visualisation", "not reliable attribution", "not recorded"]],
  [58, "display-github-secrets-for-debug", ["Never print", "Test presence, never the value", "OIDC federation"]],
  [59, "display-latest-commits-with-git-graph", ["Read the output", "Illustrative output", "Optional shorter version and alias"]],
  [60, "dns-in-azure-part-1-fundamentals", ["Start learning or diagnose a lookup", "Quick diagnostic record", "A shared vocabulary"]],
  [61, "dns-in-azure-part-2-private-dns-zones", ["Create, link, register, verify", "Registration", "Checklist"]],
  [62, "dns-in-azure-part-3-private-resolver", ["Choose by client and destination", "Client:", "Destination:"]],
  [63, "dns-in-azure-part-4-private-endpoints", ["Decide before creating the endpoint", "Copy this final check record", "Public-network test"]],
  [64, "dns-in-azure-part-5-private-endpoint-dns", ["One example throughout", "Search the service-to-zone table", "Zone-list technical validation date"]],
  [65, "dns-in-azure-part-6-private-dns-fallback", ["Change checklist", "Before:", "After"]],
  [66, "dns-in-azure-part-7-dns-security-policies", ["Evaluation example", "Rollout checklist", "blocked-resolution diagnosis"]],
  [67, "dns-in-azure-part-8-decision-tree", ["Start the diagnostic", "Copy diagnostic", "heading.tabIndex = -1"]],
  [68, "dont-build-your-cloud-home-on-shaky-foundations", ["1. Organisation", "2. Governance", "3. Platform", "4. Operations"]],
  [69, "draw-io-vscode-extension-a-must-have-for-your-diagrams", ["Start on your desktop", "Choose a format", "three numbered steps"]],
  [70, "from-wordpress-to-hugo", ["not a measured migration case study", "Benefits have conditions", "Before considering a migration"]],
  [71, "git-basics", ["Daily change cycle", "Synchronise", "Preview remote branch deletion"]],
  [72, "github-branch-naming-convention", ["suggested team convention", "123-add-login", "check-ref-format"]],
  [73, "github-commit-naming-convention", ["Write a clear and meaningful message", "BREAKING CHANGE", "Copy this message template"]],
  [74, "github-contribution-workflow", ["Choose before cloning", "External contribution via fork", "Checkpoint"]],
  [75, "how-to-creat-a-new-article", ["contributor documentation", "Rendered result", "Before publication"]],
  [76, "how-to-delegate-a-domain-to-azure-dns", ["Prepare before delegation", "DNSSEC", "rollback is not instant"]],
  [77, "how-to-embed-a-github-script-in-an-article", ["manually maintained Markdown code snapshot", "actual commit permalink", "If GitHub is unavailable"]],
  [78, "how-to-host-your-hugo-website-on-github-pages", ["Actions-based deployment", "Adapt the official deployment workflow", "Verify publication"]],
  [79, "kql-query-collection", ["Azure Resource Graph", "not interchangeable Log Analytics", "not recorded"]],
  [80, "network-security-perimeter", ["Choose by the access path", "Validate before enforcement", "not recorded"]],
  [81, "optimize-and-reduce-costs-in-azure", ["Three first checks", "Prioritise the work", "Financial commitments"]],
  [82, "remove-old-azure-resources-based-on-tags", ["Preview expiry candidates", "no deletion", "Investigate CreatedBy separately"]],
  [83, "restrict-web-app-access-with-entra-id-authentication", ["Configure the two objects", "Assign the allowed audience", "Test both outcomes"]],
  [84, "search-azure-policy-aliases", ["Choose the web tool or PowerShell", "PowerShell prerequisites", "does **not** automatically copy"]],
  [85, "set-up-your-first-terraform-environment-on-windows", ["Select an identity", "Checkpoint", "reviewed.tfplan"]],
  [86, "terraform-vs-bicep-the-match", ["Three decision entrypoints", "Facts versus judgement", "not colour scores"]],
  [87, "what-is-an-azure-landing-zone", ["Understand or prepare an implementation", "subscription-vending module example", "subscription vending"]],
];

test("all 48 audit articles have concrete source coverage and generated counterparts", () => {
  assert.equal(coverage.length, 48);
  assert.deepEqual(coverage.map(([number]) => number), Array.from({ length: 48 }, (_, i) => 40 + i));
  assert.equal(new Set(coverage.map(([, slug]) => slug)).size, 48);
  for (const [, slug, phrases] of coverage) {
    const source = read(`articles/content/${slug}.md`);
    for (const phrase of phrases) assert.ok(source.includes(phrase), `${slug}: ${phrase}`);
    assert.ok(metadata.some(article => article.slug === slug), slug);
  }
});

test("generated article and privacy HTML retain CRLF, unique IDs and parseable inline scripts", () => {
  for (const page of [...metadata.map(a => `articles/${a.slug}/index.html`), "privacy/index.html"]) {
    const html = read(page);
    assert.doesNotMatch(html, /(?<!\r)\n/, page);
    assert.doesNotMatch(html, /\r{2,}\n/, `${page}: duplicated carriage returns`);
    const markup = withoutScripts(html);
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length, page);
    for (const [, attributes, source] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (attributes.includes("application/ld+json")) JSON.parse(source);
      else new Script(source, { filename: page });
    }
  }
});

test("all generated local links, fragment targets and image files exist", () => {
  const failures = [];
  for (const page of [...metadata.map(a => `articles/${a.slug}/index.html`), "privacy/index.html"]) {
    const markup = withoutScripts(read(page));
    for (const [, attr, raw] of markup.matchAll(/\b(href|src)="([^"]+)"/g)) {
      const value = decode(raw);
      if (!value.startsWith("/") && !value.startsWith("#")) continue;
      const url = new URL(value, `https://benoit-gaumard.io/${page}`);
      const target = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
      const file = resolve(root, "." + target);
      if (!existsSync(file)) { failures.push(`${page}: missing ${value}`); continue; }
      if (attr === "href" && url.hash && target.endsWith(".html")) {
        const targetMarkup = withoutScripts(readFileSync(file, "utf8"));
        if (!targetMarkup.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) failures.push(`${page}: missing fragment ${value}`);
      }
    }
  }
  assert.deepEqual(failures, []);
});

test("reading contract precedes advertising and keeps contextual navigation", () => {
  for (const article of metadata) {
    const html = read(`articles/${article.slug}/index.html`);
    assert.equal([...html.matchAll(/data-ad-slot="/g)].length, 1, article.slug);
    assert.equal([...html.matchAll(/<script\b[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-6636684537203477"[^>]*><\/script>/g)].length, 1, `${article.slug}: existing ad loader`);
    assert.equal([...html.matchAll(/<script\b[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-75X1Q2PPLE"[^>]*><\/script>/g)].length, 1, `${article.slug}: existing analytics loader`);
    assert.ok(html.indexOf('id="article-content"') < html.indexOf('data-ad-slot="4494484671"'), article.slug);
    const imageIndex = html.indexOf('<figure class="article-feature-image');
    assert.ok(imageIndex > html.indexOf('<div class="article-header">'), article.slug);
    assert.ok(imageIndex < html.indexOf('<details class="article-share">'), article.slug);
    assert.ok(imageIndex < html.indexOf('<div class="reading-layout">'), article.slug);
    assert.equal([...html.matchAll(/<figure class="article-feature-image/g)].length, 1, article.slug);
    const image = html.slice(imageIndex).split('</figure>')[0];
    assert.ok(image.includes(`src="${article.featureImage}"`), article.slug);
    assert.match(image, /loading="eager" fetchpriority="high"/);
    assert.match(html, /<details class="article-share">/);
    assert.match(html, /max-width: var\(--reading-prose-width, min\(42rem, 72ch\)\)/);
    assert.match(html, /data-article-reading/);
    assert.match(html, /class="article-related"/);
    const footerNav = html.match(/<div class="article-footer-nav">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(footerNav, `${article.slug}: footer navigation`);
    assert.match(footerNav, /href="\/articles\/">&larr; Back to all articles<\/a>/, article.slug);
    assert.doesNotMatch(footerNav, /rss\.xml|RSS feed/i, article.slug);
    assert.match(html, /window\.SiteUX\.copy\(code, "Code", button\)/);
    if (/^(azure-policy|dns-in-azure)-part-/.test(article.slug)) {
      const count = article.slug.startsWith("azure-policy") ? 7 : 8;
      const part = Number(article.slug.match(/part-(\d+)/)[1]);
      assert.ok(html.includes(`Part ${part} of ${count}`));
      assert.equal([...html.matchAll(/class="series-nav"/g)].length, 2);
    }
  }
});

test("article and privacy framing fills the page while illustrations keep their existing measure", () => {
  for (const article of metadata) {
    const html = read(`articles/${article.slug}/index.html`);
    assert.match(html, /\.article-page \.article-header \{ max-width: none; margin-inline: 0; \}/, article.slug);
    assert.match(html, /\.article-share \{ display: block; padding: \.2rem \.8rem; margin: \.6rem 0 1rem; \}/, article.slug);
    assert.match(html, /\.series-nav, \.article-related \{ margin: 1rem 0;/, article.slug);
    assert.doesNotMatch(html, /\.(?:article-share|series-nav|article-related)\s*\{[^}]*max-width:/, article.slug);
    assert.match(html, /\.article-feature-image \{ max-width: 50rem; margin: 1rem auto 1\.5rem;/, article.slug);
  }
  assert.match(read("privacy/index.html"), /<body class="article-page">/);
});

test("article contents can collapse without reserving a sidebar or a narrow prose column", () => {
  for (const article of metadata) {
    const html = read(`articles/${article.slug}/index.html`);
    if (!html.includes('<details class="reading-toc">')) continue;
    assert.match(html, /<summary aria-controls="article-toc-navigation">/);
    assert.match(html, /class="toc-label-show">Show table of contents/);
    assert.match(html, /class="toc-label-hide">Hide table of contents/);
    assert.equal([...withoutScripts(html).matchAll(/id="article-toc-navigation"/g)].length, 1);
    assert.match(html, /\.reading-layout:has\(> \.reading-toc:not\(\[open\]\)\) \{ grid-template-columns: minmax\(0, 1fr\); --reading-prose-width: none; --reading-heading-width: none; \}/);
    assert.match(html, /document\.activeElement === toc\.querySelector\("summary"\)/);
  }
});

test("fenced code keeps an always-dark surface and readable controls in both themes", () => {
  for (const article of metadata) {
    const html = read(`articles/${article.slug}/index.html`);
    assert.match(html, /\.code-block \{[^}]*background: #0f1b2b; color: #e3edf7; color-scheme: dark;/, article.slug);
    assert.match(html, /\.code-block-header \{[^}]*background: #16273d; color: #b9d3ea;/, article.slug);
    assert.match(html, /\.code-block code \{[^}]*color: #e3edf7;/, article.slug);
    assert.match(html, /\.copy-code-button \{ border: 1px solid #b9d3ea; background: transparent; color: #d7e8f7;/, article.slug);
    assert.match(html, /\.copy-code-button\.is-copied \{ border-color: #9ee8c8; color: #9ee8c8;/, article.slug);
    assert.doesNotMatch(html, /\.code-block(?:-header)? \{[^}]*background: var\(--cp-surface/, article.slug);
    assert.match(html, /\.article-body code \{ background: var\(--cp-surface-soft\)/, article.slug);
  }
});

test("library queries and code blocks are retained and classified", () => {
  for (const slug of ["kql-query-collection", "git-basics"]) {
    const source = read(`articles/content/${slug}.md`);
    const html = read(`articles/${slug}/index.html`);
    const fenced = [...source.matchAll(/^```[a-z]/gm)].length;
    assert.equal([...html.matchAll(/class="code-block"/g)].length, fenced, slug);
    assert.match(html, /id="library-search"/);
    assert.match(html, /id="library-category"/);
    assert.match(html, /id="library-count" role="status"/);
    assert.match(html, /class="library-entry"/);
  }
  assert.match(read("articles/kql-query-collection/index.html"), /Requires read access/);
  assert.match(read("articles/dns-in-azure-part-5-private-endpoint-dns/index.html"), /data-zone-table/);
});

test("decisions and dangerous examples are ordered and do not hide warnings", () => {
  const policy = read("articles/azure-policy-part-4-exclusions-notscopes/index.html");
  assert.ok(policy.indexOf('<h2 id="exclusion-versus-exemption-in-one-table"') < policy.indexOf('<h2 id="what-an-exclusion-is"'));
  const dns = read("articles/how-to-delegate-a-domain-to-azure-dns/index.html");
  assert.ok(dns.indexOf('<h2 id="create-dns-records"') < dns.indexOf('<h2 id="delegate-the-domain"'));
  const secrets = read("articles/display-github-secrets-for-debug/index.html");
  assert.ok(secrets.indexOf("Never print") < secrets.indexOf('class="code-block"'));
  assert.doesNotMatch(secrets, /sed 's\/\.\/&amp; \/g'|spaced out so it/);
  assert.doesNotMatch(read("articles/content/set-up-your-first-terraform-environment-on-windows.md"), /apply -auto-approve/);
  assert.doesNotMatch(read("articles/content/remove-old-azure-resources-based-on-tags.md"), /Remove-AzResource[^\n]*-Force/);
  assert.doesNotMatch(read("articles/content/terraform-vs-bicep-the-match.md"), /🟢|🔴|🟠/);
});

test("privacy keeps consent information without the removed buttons or advertising slots", () => {
  const html = read("privacy/index.html");
  assert.doesNotMatch(html, /data-ad-slot=|src="[^"]*adsbygoogle\.js/);
  assert.match(html, /<script\b[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-75X1Q2PPLE"/);
  assert.match(html, /id="privacy-summary"/);
  assert.doesNotMatch(withoutScripts(html), /data-privacy-choices|Change my privacy choices|This action asks|pressing the button/);
  assert.match(html, /Consent manager, where available/);
  assert.match(html, /href="https:\/\/www\.google\.com\/settings\/ads"/);
  for (const purpose of ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"]) {
    assert.match(html, new RegExp(`${purpose}: 'denied'`));
  }
  assert.match(html, /Voluntarily forwarded draft fields/);
  assert.match(html, /not a legal compliance certification/);
  assert.doesNotMatch(html, /clear this site's cookies.*reload any page|I never ask you for your name/);
});

test("privacy reuses the article reading layout and table of contents without article-only content", () => {
  const html = withoutScripts(read("privacy/index.html"));
  assert.match(html, /<body class="article-page">/);
  assert.match(html, /<div class="reading-layout">\s*<details class="reading-toc">/);
  assert.match(html, /<summary aria-controls="article-toc-navigation">/);
  assert.match(html, /<article class="article-body" id="article-content">/);
  const body = html.match(/<article class="article-body"[^>]*>([\s\S]*?)<\/article>/)[1];
  const headings = [...body.matchAll(/<h2 id="([^"]+)">([^<]+)<\/h2>/g)];
  const toc = html.match(/<nav id="article-toc-navigation"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.equal(headings.length, 9);
  assert.deepEqual([...toc.matchAll(/href="#([^"]+)">([^<]+)<\/a>/g)].map(([, id, title]) => [id, title]),
    headings.map(([, id, title]) => [id, title]));
  assert.doesNotMatch(body, /<details class="reading-toc"/);
  assert.doesNotMatch(html, /<(?:figure|details|nav|aside)[^>]*class="(?:article-feature-image|article-share|series-nav|article-related)/);
  assert.match(html, /<div class="article-footer-nav">\s*<a href="\/">&larr; Back to home<\/a>/);
});

test("quoted frontmatter arrays preserve commas in section titles", () => {
  const start = generator.indexOf("function parseTomlValue(");
  const end = generator.indexOf("\nfunction parseFrontMatter(", start);
  const parse = runInNewContext(`(${generator.slice(start, end)})`);
  assert.deepEqual(Array.from(parse('["Exclusion versus exemption, in one table", "The decision rule"]')), ["Exclusion versus exemption, in one table", "The decision rule"]);
  assert.deepEqual(Array.from(parse("['a,b', 'c']")), ["a,b", "c"]);
});
