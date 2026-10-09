import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Script } from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { enhancePage, siteStyles, parseToolNavigation } from "../../site-ui.mjs";
import { analyticsSnippet, injectAnalytics } from "../../build-seo.mjs";

const root = new URL("../../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const tools = parseToolNavigation(read("tools/index.html"));
test("inline enhancement is idempotent and keeps pages standalone", () => {
  for (const path of ["index.html", "index_fr.html", "tools/index.html", "graph-permissions/index.html", "privacy/index.html", "404.html"]) {
    const route = path === "index.html" ? "/" : "/" + path.replace(/index\.html$/, "");
    const first = enhancePage(read(path), { path: route, errorPage: path === "404.html" });
    assert.equal(enhancePage(first, { path: route, errorPage: path === "404.html" }), first, path);
    assert.doesNotMatch(first, /\r\r/);
    assert.equal([...first.matchAll(/<!-- site-ui:start -->/g)].length, 1);
    assert.match(first, /window\.SiteUX = \{ copy, download, fetchJSON, updateURL, notice, privacyChoices \}/);
    assert.doesNotMatch(first, /src="\/.*site-ui/);
  }
});
test("privacy and error pages never retain the advertising loader", () => {
  for (const [path, route] of [["privacy/index.html", "/privacy/"], ["404.html", "/404.html"]]) {
    const html = enhancePage(read(path), { path: route, errorPage: route === "/404.html" });
    assert.doesNotMatch(html, /src="[^"]*adsbygoogle\.js/);
    assert.doesNotMatch(html, /<ins class="adsbygoogle"/);
    assert.match(html, /href="\/privacy\/"/);
  }
});
test("generator and SEO enrichment preserve the shared shell and ad-free utility pages", () => {
  const article = read("articles/build-articles.mjs"), seo = read("build-seo.mjs");
  assert.match(article, /return enhancePage\(`/);
  assert.match(seo, /url !== "\/404\.html" && url !== "\/privacy\/"/);
  assert.match(seo, /html = enhancePage/);
});
test("the old blog is not changed by the enhancer", () => {
  const input = "<html><head></head><body>Legacy</body></html>";
  assert.equal(enhancePage(input, { path: "/blog/post/" }), input);
});
test("footer branding uses the header icon and preserves localized home links", () => {
  for (const [language, href, label] of [["en", "/", "home"], ["fr", "/index_fr.html", "accueil"]]) {
    const source = `<html lang="${language}"><head></head><body><footer><a class="brand" href="${href}"><span class="brand-mark">B.</span>G</a></footer></body></html>`;
    const html = enhancePage(source, { path: href });
    assert.ok(html.includes(`<a class="brand" href="${href}" aria-label="Benoit Gaumard - ${label}"><img class="mark" src="/favicon.svg" alt="" width="56" height="56"></a>`));
    assert.match(html, /<span class="site-branding"><a class="brand"[\s\S]*?<\/a><a class="site-brand-name" href="https:\/\/benoit-gaumard\.io\/">benoit-gaumard\.io<\/a><\/span>/);
    assert.doesNotMatch(html, /<span class="brand-mark">/);
    assert.equal(enhancePage(html, { path: href }), html);
  }
});
test("header and footer site names use the supplied destination without changing logo links", () => {
  for (const [file, route, home] of [["index.html", "/", "/"], ["index_fr.html", "/index_fr.html", "/index_fr.html"], ["tools/index.html", "/tools/", "/"]]) {
    const html = enhancePage(read(file), { path: route });
    assert.equal(enhancePage(html, { path: route }), html, file);
    for (const tag of ["header", "footer"]) {
      const section = html.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`))[0];
      assert.equal([...section.matchAll(/class="site-brand-name"/g)].length, 1, file + " " + tag);
      assert.match(section, /class="site-brand-name" href="https:\/\/benoit-gaumard\.io\/">benoit-gaumard\.io<\/a>/);
      assert.ok(section.includes(`<a class="brand" href="${home}"`), file + " " + tag);
    }
  }
});
test("the shared footer keeps both owner-supplied external site links", () => {
  for (const [file, route, label] of [["index.html", "/", "Extra links"], ["index_fr.html", "/index_fr.html", "Liens supplémentaires"], ["privacy/index.html", "/privacy/", "Extra links"]]) {
    const html = enhancePage(read(file), { path: route });
    assert.equal(enhancePage(html, { path: route }), html, file);
    const extra = html.match(/<!-- footer-extra:start -->([\s\S]*?)<!-- footer-extra:end -->/)?.[1];
    assert.ok(extra, file);
    assert.ok(extra.includes(`<strong>${label}</strong>`));
    assert.match(extra, /href="https:\/\/www\.quickquotemaker\.com\/" target="_blank" rel="noopener noreferrer" hreflang="en">quickquotemaker\.com<\/a>/);
    assert.match(extra, /href="https:\/\/www\.travelstorymaker\.com\/" target="_blank" rel="noopener noreferrer" hreflang="en">travelstorymaker\.com<\/a>/);
    assert.equal([...extra.matchAll(/<a\b/g)].length, 2);
  }
});
test("French and English language flags remain available alongside country flags", () => {
  const flags = readdirSync(new URL("flags/", root));
  for (const file of ["fr.png", "en.png"]) {
    assert.ok(flags.includes(file));
    const flag = readFileSync(new URL("flags/" + file, root));
    assert.equal(flag.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(flag.readUInt32BE(16), 24);
    assert.equal(flag.readUInt32BE(20), 18);
  }
  assert.match(read(".github/workflows/deploy-hugo.yaml"), /cp -R \.\.\/flags public\/flags/);
});
test("empty-bodied external scripts are preserved except explicit ad-free utility loaders", () => {
  const input = '<html lang="en"><head><script src="library.js"></script><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=example"></script></head><body></body></html>';
  const regular = enhancePage(input, { path: "/example/" });
  assert.match(regular, /src="library\.js"/);
  assert.match(regular, /src="https:\/\/pagead2/);
  const privacy = enhancePage(input, { path: "/privacy/" });
  assert.match(privacy, /src="library\.js"/);
  assert.doesNotMatch(privacy, /src="https:\/\/pagead2/);
});
test("an analytics marker without its loader is repaired after consent defaults", () => {
  const complete = "<head>" + analyticsSnippet() + "</head>";
  const incomplete = complete.replace(/<script async src="https:\/\/www\.googletagmanager[^>]*><\/script>/, "");
  const repaired = injectAnalytics(incomplete);
  assert.equal([...repaired.matchAll(/src="https:\/\/www\.googletagmanager/g)].length, 1);
  assert.ok(repaired.indexOf("gtag('consent', 'default'") < repaired.indexOf('src="https://www.googletagmanager'));
  assert.equal(injectAnalytics(repaired), repaired);
  assert.equal(injectAnalytics(complete), complete);
});
test("removed shell handlers do not leave whitespace-only markup lines", () => {
  const literal = '<pre>code\n  \nend</pre><textarea>text\n  \nend</textarea><script>const text = `value\n  \nend`;</script>';
  const html = enhancePage("<html><head></head><body>\n  \n" + literal + "\n  \n</body></html>");
  assert.ok(html.includes(literal));
  assert.ok(html.includes("<body>\n\n"));
  assert.ok(html.includes("\n\n</body>"));
});
test("shared shell has explicit focus, theme, privacy, copy and download failure behavior", () => {
  const source = read("site-ui.mjs");
  assert.match(source, /close\(true\)/);
  assert.match(source, /Switch to light theme/);
  assert.match(source, /not\(\.visible\).*visibility:hidden/);
  assert.match(source, /CONSENT_API_READY/);
  assert.match(source, /showRevocationMessage\(\)/);
  assert.match(source, /No newly saved choices have been confirmed/);
  assert.match(source, /manualCopy\(String\(value\), label, control\)/);
  assert.match(source, /Download requested/);
  assert.doesNotMatch(source, /execCommand/);
});
test("footer text links are compact without shrinking header or language controls", () => {
  assert.match(siteStyles, /\.site-header \.header-links a \{ min-height:2\.75rem; \}/);
  assert.match(siteStyles, /\.site-footer \.footer-group \{ gap:\.25rem; \}/);
  assert.match(siteStyles, /\.site-footer \.footer-group > a \{ min-height:1\.5rem; \}/);
  assert.match(siteStyles, /@media\(max-width:32rem\)[^\n]*\.site-footer \.footer-group > a\{min-height:2rem;\}/);
  assert.doesNotMatch(siteStyles, /\.site-footer-extra[^{}]*\{[^}]*(?:gap|min-height|line-height):/);
  assert.doesNotMatch(siteStyles, /\.site-header \.header-links a,\.site-footer/);
  assert.match(siteStyles, /\.site-footer \.footer-bottom \{[^}]*justify-content:center;align-items:center;text-align:center;/);
  assert.match(siteStyles, /\.site-footer \.footer-bottom > span:first-child \{ width:100%; \}/);
});
test("saved favorite stars share yellow highlighting without recoloring other toggles", () => {
  const selector = 'button:is(.favorite-button,.fav-button,.news-favorite,.favorites-filter)[aria-pressed="true"]';
  assert.ok(siteStyles.includes(`${selector} { color:var(--cp-warning);border-color:var(--cp-warning);background:var(--cp-warning-bg); }`));
  assert.ok(siteStyles.includes(`${selector} svg,${selector} svg path { fill:currentColor; }`));
  assert.doesNotMatch(siteStyles, /(?:button|\.icon-button)\[aria-pressed="true"\]/);
  assert.match(read("rss-watcher/index.html"), /button\.className = "icon-button favorite-button";/);
});
test("tool navigation derives its labels, links and icons from the catalogue", () => {
  assert.equal(tools.length, 30);
  assert.equal(new Set(tools.map(tool => tool.href)).size, tools.length);
  assert.ok(tools.some(tool => tool.title === "IT Images &amp; Memes"));
  assert.ok(tools.every(tool => tool.description && (tool.symbol || tool.icon.startsWith("/tools/images/"))));
  for (const tool of tools) assert.ok(read(tool.href.slice(1) + "index.html"));
  assert.throws(() => parseToolNavigation(""), /empty/);
  const fixture = '<article class="tool-card" data-tool-id="/test/"><a class="tool-link" href="/test/"><img src="/tools/images/test.svg"><h2>Test &amp; tools</h2><p>Query &quot;cloud&quot; data.</p></a></article>';
  assert.equal(parseToolNavigation(fixture)[0].title, "Test &amp; tools");
  assert.throws(() => parseToolNavigation(fixture + fixture), /duplicate/);
  assert.throws(() => parseToolNavigation(fixture.replace('data-tool-id="/test/"', 'data-tool-id="https://example.org/"')), /Invalid/);
});
test("tool switching is standalone, idempotent and scoped to tools including nested histories", () => {
  for (const route of [...tools.map(tool => tool.href), "/tools/", "/azure-policies/policies-history/", "/azure-policies/initiatives-history/", "/azure-built-in-roles/roles-history/", "/azure-policy-aliases/aliases-history/", "/rss-watcher/activity/"]) {
    const original = read(route.slice(1) + "index.html");
    const html = enhancePage(original, { path: route });
    assert.equal(enhancePage(html, { path: route }), html, route);
    const switcher = html.match(/<!-- tool-switcher:start -->([\s\S]*?)<!-- tool-switcher:end -->/);
    assert.ok(switcher, route);
    const links = [...switcher[1].matchAll(/class="site-tool-link" href="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(links, tools.map(tool => tool.href), route);
    assert.equal([...switcher[1].matchAll(/aria-current=/g)].length, 1, route);
    assert.match(switcher[1], /<details class="site-tool-switcher"/);
    assert.match(switcher[1], /<summary aria-controls="siteToolPanel">/);
    assert.doesNotMatch(switcher[1], /target=|role="(?:menu|menuitem|combobox)"|fetch\(/);
    const content = html.replace(/<!-- site-ui:start -->[\s\S]*?<!-- site-ui:end -->/g, "");
    const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, route);
  }
  for (const route of ["/", "/index_fr.html", "/articles/", "/articles/azure-policy-part-1-what-is-a-policy/", "/privacy/", "/404.html", "/unrelated/"]) {
    const html = enhancePage(read("tools/index.html"), { path: route, errorPage: route === "/404.html" });
    assert.doesNotMatch(html, /<!-- tool-switcher:start -->/, route);
  }
  const nested = enhancePage(read("azure-policy-aliases/aliases-history/index.html"), { path: "/azure-policy-aliases/aliases-history/" });
  assert.match(nested, /class="site-tool-link" href="\/azure-policy-aliases\/" aria-current="location"/);
});
test("all standalone inline scripts remain parseable after the shell migration", () => {
  const paths = ["index.html", "index_fr.html", "404.html"];
  const cwd = process.cwd();
  for (const dir of readdirSync(cwd, { withFileTypes: true }).filter(dir => dir.isDirectory() && !dir.name.startsWith(".") && !["blog", "node_modules"].includes(dir.name))) {
    const files = readdirSync(join(cwd, dir.name), { withFileTypes: true });
    if (files.some(file => file.name === "index.html")) paths.push(dir.name + "/index.html");
    for (const sub of files.filter(file => file.isDirectory() && !["history", "images", "export", "content"].includes(file.name))) {
      if (readdirSync(join(cwd, dir.name, sub.name)).includes("index.html")) paths.push(dir.name + "/" + sub.name + "/index.html");
    }
  }
  assert.ok(paths.length >= 87);
  for (const path of paths) {
    const html = read(path);
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/(?:ld\+)?json/.test(attrs)) JSON.parse(body);
      else new Script(body, { filename: path });
    }
    assert.equal([...html.matchAll(/<!-- site-ui:start -->/g)].length, 1, path);
    assert.ok(html.replace(/\r\n/g, "\n").includes(`<style data-site-ui>${siteStyles}</style>`), path);
    assert.doesNotMatch(html, /\r\r/);
    assert.equal([...html.matchAll(/<script\b[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js/g)].length, 1, path);
    const ads = [...html.matchAll(/<script\b[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)].length;
    assert.equal(ads, ["privacy/index.html", "404.html"].includes(path) ? 0 : 1, path);
    assert.ok(html.indexOf("gtag('consent', 'default'") < html.indexOf('src="https://www.googletagmanager'), path);
    const header = html.match(/<header\b[\s\S]*?<\/header>/)[0];
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)[0];
    assert.doesNotMatch(footer, /\bInfra (?:and|&amp;) DevOps/, path);
    assert.match(footer, path === "index_fr.html" ? /Consultant Azure Infrastructure et DevOps/ : /Azure Infrastructure and DevOps Consultant/, path);
    assert.doesNotMatch(footer, /data-privacy-choices|site-privacy-choices|Change privacy choices|Modifier mes choix de confidentialité/, path);
    assert.match(footer, /href="\/privacy\/"/, path);
    const explore = footer.match(/<nav class="footer-group"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    assert.match(explore, /href="\/privacy\/"(?: hreflang="en")?>Privacy &amp; cookies<\/a>/, path);
    assert.equal([...footer.matchAll(/href="\/privacy\/"/g)].length, 1, path);
    assert.doesNotMatch(footer.match(/<div class="footer-bottom">[\s\S]*?<\/div>/)[0], /href="\/privacy\/"/, path);
    assert.match(footer, /&copy; <span id="currentYear">2026<\/span> Benoit Gaumard - Built with ❤️ - All Rights Reserved/, path);
    assert.equal([...footer.matchAll(/class="footer-group site-footer-extra"/g)].length, 1, path);
    assert.equal([...footer.matchAll(/href="https:\/\/www\.quickquotemaker\.com\/"/g)].length, 1, path);
    assert.equal([...footer.matchAll(/href="https:\/\/www\.travelstorymaker\.com\/"/g)].length, 1, path);
    const headerLogo = header.match(/<img class="mark" src="([^"]+)"/);
    const footerLogo = footer.match(/<img class="mark" src="([^"]+)"/);
    assert.ok(headerLogo && footerLogo, path);
    assert.equal(footerLogo[1], headerLogo[1], path);
    for (const section of [header, footer]) {
      assert.equal([...section.matchAll(/class="site-brand-name"/g)].length, 1, path);
      assert.match(section, /class="site-brand-name" href="https:\/\/benoit-gaumard\.io\/">benoit-gaumard\.io<\/a>/, path);
      assert.doesNotMatch(section, /https:\/\/tools\.benoit-gaumard\.io\//, path);
    }
    assert.doesNotMatch(footer, /<span class="brand-mark">/);
    assert.match(footer, /<a class="brand" href="[^"]+" aria-label="Benoit Gaumard - (?:home|accueil)">/, path);
  }
});
