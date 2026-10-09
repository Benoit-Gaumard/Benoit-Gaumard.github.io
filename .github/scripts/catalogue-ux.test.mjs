import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const pages = ["icons", "emoji-sheet", "it-images", "favorite-links", "friends-websites", "microsoft-portals"];
const read = (file) => readFileSync(resolve(file), "utf8");
const html = Object.fromEntries(pages.map((page) => [page, read(`${page}/index.html`)]));
function functionSource(source, name) {
  const match = source.match(new RegExp(`    function ${name}\\([^]*?\\n    \\}`));
  assert.ok(match, name);
  return match[0];
}
function functions(page, names, context = {}) {
  const sandbox = vm.createContext({ URL, ...context });
  vm.runInContext(names.map((name) => functionSource(html[page], name)).join("\n"), sandbox);
  return sandbox;
}

for (const page of pages) {
  test(`${page}: standalone scripts parse, common shell retained, CRLF preserved`, () => {
    assert.equal((html[page].match(/<!-- site-ui:start -->/g) || []).length, 1);
    assert.equal((html[page].match(/<!-- site-ui:end -->/g) || []).length, 1);
    assert.equal(/(?<!\r)\n/.test(html[page]), false);
    assert.equal(/\r\r|\r(?!\n)/.test(html[page]), false);
    for (const match of html[page].matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/src=|ld\+json/.test(match[1])) new vm.Script(match[2]);
    }
    assert.match(html[page], /data-catalogue-ux/);
    assert.match(html[page], /script async src="https:\/\/pagead2.googlesyndication.com/);
    assert.ok(html[page].indexOf("pagead2.googlesyndication.com") > html[page].indexOf("</main>"));
  });
}
test("icons: compact preview preserves source terms and truthful export states", () => {
  const source = html.icons;
  for (const text of ["dialogSourceLink", "PNG copying is unavailable", "Download SVG", "Automatic copy unavailable"]) assert.ok(source.includes(text), text);
  assert.doesNotMatch(source, /dialogLicense|dialogVariant|dialogSourceName|dialogCategoryName|File variant:|File:|secondary-actions/);
  const dialog = source.split('<dialog id="previewDialog"')[1].split("</dialog>")[0];
  assert.match(dialog, /aria-describedby="dialogCollection"/);
  assert.match(dialog, /<p class="dialog-collection" id="dialogCollection"><\/p>\s*<a id="dialogSourceLink"/);
  assert.ok(source.includes('elements.dialogCollection.textContent = `${icon.source} · ${icon.category}`;'));
  assert.deepEqual([...dialog.matchAll(/class="dialog-action(?: primary)?" id="([^"]+)"/g)].map(match => match[1]), ["downloadSvg", "downloadPng", "copySvg", "copyPng"]);
  assert.doesNotMatch(dialog, /<details|<summary/);
  assert.match(source, /copy\.append\(title, category\)/);
  assert.match(source, /capability\.hidden = canCopyPng/);
  assert.doesNotMatch(source, /SVG downloaded\.|PNG downloaded\./);
  assert.match(source, /SiteUX\.copy/);
  assert.match(source, /window\.addEventListener\("popstate"/);
  assert.match(source, /params\.get\("category"\)/);
  const manifest = JSON.parse(read("icons/icons.json"));
  assert.ok(manifest.every((icon) => icon.path && icon.source && icon.category));
  const names = new Set(manifest.map((icon) => icon.name));
  assert.ok(names.size < manifest.length, "duplicate display names still refer to distinct assets");
  assert.equal(new Set(manifest.map(icon => icon.path)).size, manifest.length);
});
test("icons: source and usage rights remain visible without a disclosure", () => {
  const source = html.icons;
  assert.match(source, /<section class="usage-details" aria-labelledby="usage-rights-title">\s*<h2 id="usage-rights-title">Source and usage rights<\/h2>/);
  assert.doesNotMatch(source, /<details class="usage-details"|\.usage-details summary/);
  const rights = source.split('<section class="usage-details"')[1].split("</section>")[0];
  for (const id of ["sourceDisclaimer", "sourceDisclaimerText", "sourceDisclaimerLink"]) assert.ok(rights.includes(`id="${id}"`));
  assert.match(source, /elements\.sourceDisclaimerText\.textContent = disclaimer\.text/);
  assert.match(source, /elements\.sourceDisclaimerLink\.hidden = !disclaimer\.url/);
});
test("emoji: readable names and separately labelled actions use the shared copy fallback", () => {
  assert.match(html["emoji-sheet"], /Copy emoji: \$\{item.description\}/);
  assert.match(html["emoji-sheet"], /Copy shortcode/);
  assert.match(html["emoji-sheet"], /card\.append\(favorite, glyph, name, codes\)/);
  assert.match(html["emoji-sheet"], /SiteUX\.copy\(text, label, button\)/);
  assert.match(html["emoji-sheet"], /browser storage is unavailable/);
  const entries = JSON.parse(read("emoji-sheet/emojis.json"));
  assert.ok(entries.every((entry) => entry.description && entry.search && entry.names.length));
  assert.match(html["emoji-sheet"], /DEFAULT_PAGE_SIZE = 50/);
});
test("IT gallery: real content before filters, descriptions retained by generator", () => {
  const source = html["it-images"];
  assert.ok(source.indexOf('<div class="gallery" id="gallery"') < source.indexOf('<input id="search"'));
  const payload = JSON.parse(read("it-images/images.json"));
  const descriptions = JSON.parse(read("it-images/image-descriptions.json"));
  for (const image of payload.images) {
    for (const field of ["description", "transcription", "credit", "license"]) assert.equal(image[field], descriptions[image.file][field]);
    assert.match(image.license, /not recorded/);
  }
  assert.match(read("it-images/generate-manifest.mjs"), /descriptions\[entry.name\]/);
  assert.match(source, /Submission requires a GitHub account/);
  assert.doesNotMatch(source, /Image text, source & usage|image-details|image-transcription|image-description\b/);
  assert.doesNotMatch(functionSource(source, "createCard"), /image-credit|createElement\("details"\)/);
  assert.match(source, /copy\.append\(title\)/);
});
test("curated links: exact URLs, visible metadata, descriptive labels and storage keys preserved", () => {
  assert.doesNotMatch(html["favorite-links"], /Your saved links/);
  assert.match(html["favorite-links"], /My favorites \(0\)/);
  const sandbox = functions("favorite-links", ["parseCsvLine", "parseCsv", "hostnameFor", "groupFor", "presentLink"], {
    linkLabels: JSON.parse(read("favorite-links/link-labels.json")),
    CATEGORY_GROUPS: { "Test category": [] },
  });
  const rows = sandbox.parseCsv(read("favorite-links/favorite-links.csv"));
  assert.ok(rows.length > 500);
  for (const row of rows) {
    const presentation = sandbox.presentLink(row);
    assert.equal(presentation.url, row.url);
    assert.doesNotMatch(presentation.title, /^(https?:\/\/|www\.)/);
    assert.ok(presentation.description);
  }
  assert.match(html["favorite-links"], /favorite-links-my-favorites/);
  assert.doesNotMatch(html["favorite-links"], /Last verified: not recorded|Report a broken link|Details & report a link|link-details|link-usefulness/);
  assert.match(html["favorite-links"], /const card = document.createElement\("article"\)/);
  assert.match(html["favorite-links"], /destination\.textContent = link\.url/);
  assert.match(html["favorite-links"], /card\.append\(favorite, row1, row2\)/);
  assert.match(html["favorite-links"], /date\.textContent = dateLabel \|\| \(link\.dateAdded \? "Invalid date" : "Not dated"\)/);
  assert.doesNotMatch(functionSource(html["favorite-links"], "createCard"), /link-domain/);
  assert.doesNotMatch(html["favorite-links"], /\.link-card-row2\s*\{\s*display:\s*none/);
});
test("friends: visible filters and controls precede results without invented data", () => {
  const source = html["friends-websites"];
  const data = JSON.parse(read("friends-websites/websites-meta.json"));
  assert.ok(data.sites.every((site) => site.description !== "Description."));
  for (const id of ["searchInput", "categoryFilter", "countryFilter"]) {
    assert.match(source, new RegExp(`<label for="${id}">`));
    assert.doesNotMatch(source.match(new RegExp(`<(?:input|select)[^>]*id="${id}"[^>]*>`))[0], /\bhidden\b/);
    assert.ok(source.indexOf(`id="${id}"`) < source.indexOf('id="friendCards"'));
  }
  assert.ok(source.indexOf('id="submitOpen"') < source.indexOf('id="friendCards"'));
  assert.doesNotMatch(source, /categories\.length < 2|countries\.length < 2|friends\.length < 8|\.before\(elements\.friendCards\)/);
  assert.match(source, /directoryReady = true/);
  assert.match(source, /Websites unavailable\./);
  assert.match(read("friends-websites/fetch-updates.mjs"), /description\|todo\|tbd/);
  assert.match(source, /description\|todo\|tbd/);
});
test("portals: six scoped destinations, official documentation evidence and task vocabulary", () => {
  const sandbox = functions("microsoft-portals", ["parseCsvLine", "parseCsv"]);
  const portals = sandbox.parseCsv(read("microsoft-portals/portals-urls.csv"));
  assert.equal(portals.length, 6);
  const details = JSON.parse(read("microsoft-portals/portal-details.json"));
  assert.ok(portals.every((portal) => details[new URL(portal.url).hostname]?.description));
  assert.match(details["entra.microsoft.com"].tasks, /conditional access/);
  assert.match(details["security.microsoft.com"].source, /^https:\/\/learn.microsoft.com\//);
  assert.doesNotMatch(html["microsoft-portals"], /comprehensive directory of all Microsoft portals/);
});
