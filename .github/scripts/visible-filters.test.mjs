import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { upgradeNewsPage } from "./release-news-ui.mjs";

const surfaces = [
  ["icons", "extra-filters"], ["emoji-sheet", "extra-filters"],
  ["favorite-links", "extra-filters"], ["azure-policy-aliases", "catalogue-options"],
  ["graph-permissions", "graph-options"], ["entra-built-in-roles", "sort-options"],
  ["guid-generator", "format-options"], ["articles", "filter-panel"],
  ["azure-built-in-roles", "roles-filters"], ["azure-policies", "filter-panel"],
  ...["azure", "m365", "aws"].map(provider => [`${provider}-release-updates`, "news-options"]),
  ...[
    "azure-built-in-roles/roles-history", "azure-policy-aliases/aliases-history",
    "azure-policies/policies-history", "azure-policies/initiatives-history",
  ].map(route => [route, "history-extra"]),
];

for (const [route, className] of surfaces) {
  test(`${route}: filter controls are permanent and scripts parse`, () => {
    const html = readFileSync(`${route}/index.html`, "utf8");
    const wrappers = [...html.matchAll(new RegExp(`<div\\b[^>]*class="${className}"[^>]*>`, "g"))];
    assert.ok(wrappers.length, className);
    for (const [markup] of wrappers) assert.doesNotMatch(markup, /\bhidden\b/);
    assert.doesNotMatch(html, className === "news-options"
      ? /<details\b[^>]*id="newsOptions"/
      : new RegExp(`<details\\b[^>]*class="${className}"`));
    assert.doesNotMatch(html, /id="(?:historyFilterToggle|historyFiltersDone|filterToggle|filtersDone|policiesFilterToggle|initiativesFilterToggle|policiesFiltersDone|initiativesFiltersDone)"/);
    assert.doesNotMatch(html, /(?:newsOptions|filterOptions)\.querySelector\("summary"\)|filtersOpen|moreFiltersOpen|panelOpen/);
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/src=|ld\+json/.test(match[1])) new vm.Script(match[2], { filename: `${route}/index.html` });
    }
    if (route !== "articles") assert.match(html, /class="site-tool-switcher"/);
  });
}

test("release page generation retains permanently visible filters", () => {
  for (const provider of ["azure", "m365", "aws"]) {
    const source = readFileSync(`${provider}-release-updates/index.html`, "utf8");
    const generated = upgradeNewsPage(source, provider, `${provider}-release-updates`);
    assert.match(generated, /<div class="news-options" id="newsOptions">/);
    assert.doesNotMatch(generated, /<details\b[^>]*id="newsOptions"|newsOptions\.querySelector\("summary"\)/);
    if (provider === "azure") {
      assert.match(generated, /class="news-controls news-controls-panel"/);
      assert.doesNotMatch(generated, /<legend>Filters and views<\/legend>/);
      assert.match(generated, /aria-label="Filter announcements and choose view"/);
    }
  }
});
