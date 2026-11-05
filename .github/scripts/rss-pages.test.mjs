import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { publicationState, collectionState, feedCounts, opml, upgradeFeedPage } from "./feed-activity-ui.mjs";

test("editorial silence is independent from collection errors", () => {
  const reference = Date.parse("2026-10-06T12:00:00Z");
  const quiet = { ok: true, lastPublication: "2026-01-01T00:00:00Z" };
  assert.equal(publicationState(quiet, reference).key, "quiet");
  assert.equal(collectionState(quiet).key, "success");
  const error = { ok: false, lastPublication: "2026-10-05T12:00:00Z", error: "HTTP 403" };
  assert.equal(publicationState(error, reference).key, "recent");
  assert.equal(collectionState(error).key, "error");
  assert.equal(publicationState({ lastPublication: null }, reference).key, "unknown");
  assert.equal(collectionState({}).key, "unknown");
});
test("OPML exports exact unique selected URLs and escapes XML", () => {
  const feed = { name: 'A & "B"', url: "https://example.com/feed?a=1&b=2" };
  const text = opml([feed, feed]);
  assert.equal([...text.matchAll(/<outline /g)].length, 1);
  assert.match(text, /A &amp; &quot;B&quot;/);
  assert.match(text, /a=1&amp;b=2/);
});
test("activity and feed-directory views are generated repeatably", () => {
  for (const [kind, file] of [["activity", join("rss-watcher", "activity", "index.html")], ["techcommunity", join("microsoft-techcommunity-rss-feeds", "index.html")]]) {
    const html = readFileSync(file, "utf8");
    assert.ok(upgradeFeedPage(html, kind) === html, file);
    if (kind === "activity") {
      assert.doesNotMatch(html, />Dead(?: feeds| \(error\))?/i);
      assert.doesNotMatch(html, /id="statsGrid"/);
      assert.doesNotMatch(html, /id="statsSummary"|configured feed entries|Publication recency is a separate measure/);
      assert.doesNotMatch(html, /Collection results and publication dates describe the snapshot|A quiet feed is not necessarily broken/);
    }
    assert.match(html, /Collection snapshot/);
    assert.doesNotMatch(html, /Copy RSS URL/);
    if (kind === "techcommunity") assert.match(html, /Export selected OPML/);
    else assert.doesNotMatch(html, /id="selectMatching"|id="clearSelection"|id="exportSelected"|id="selectionCount"/);
    assert.match(html, /Last attempt/);
    assert.match(html, /No error detail supplied/);
  }
});

test("Tech Community exposes five source-backed counters before the filters", () => {
  const html = readFileSync(join("microsoft-techcommunity-rss-feeds", "index.html"), "utf8");
  const stats = html.split('<section class="feed-statistics"')[1].split("</section>")[0];
  assert.deepEqual([...stats.matchAll(/<div class="stat-label">([^<]+)<\/div>/g)].map(match => match[1]), ["Total Feeds", "Categories", "Active Today", "This Week", "Dead Feeds"]);
  assert.equal([...html.matchAll(/id="statsSummary"/g)].length, 1);
  assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="feedControls"'));
  assert.match(stats, /id="statsGrid" aria-busy="true"/);
  assert.match(stats, /Since Monday \(UTC\)/);
  assert.match(stats, /Last collection failed, not proof of permanent failure/);
  assert.match(html, /renderStats\(\); el\.retryFeeds\.disabled = false/);
  assert.doesNotMatch(html, /Collection results and publication dates describe the snapshot|Complete catalogue totals, independent of filters/);
  assert.match(html, /el\.statsSummary\.hidden = Boolean\(counts && counts\.today !== null\)/);
  assert.match(html, /if \(techCommunity\) group\.append\(selection\(feed\)\)/);
});

test("Tech Community tables and cards expose the requested fields and Latest article prefix", () => {
  const html = readFileSync(join("microsoft-techcommunity-rss-feeds", "index.html"), "utf8");
  assert.match(html, /\[\["name", "Name"\], \["category", "Category"\], \[null, "RSS feed"\], \["lastPublication", "Last published"\], \[null, "Last activity"\]\]/);
  assert.match(html, /techCommunity \? "Latest: " : ""/);
  assert.match(html, /latest\.href = feed\.latestLink/);
  assert.match(html, /row\.append\(name, node\("td", feed\.categories\.join\(", "\) \|\| "Not recorded"\), links, publication, activity\)/);
  assert.match(html, /const age = publicationAge\(feed\.lastPublication\)/);
  assert.match(html, /badge\.classList\.toggle\("is-recent", age === "Today" \|\| age === "Yesterday"\)/);
  assert.match(html, /node\("dt", "RSS feed"\), rss, node\("dt", "Last published"\)/);
  assert.match(html, /node\("dt", "Last activity"\), activity/);
});

test("feed counters distinguish current UTC calendar activity from failed collections", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  const generatedAt = "2026-10-08T11:00:00Z";
  const feeds = [
    { categories: ["A", "B"], ok: true, lastPublication: "2026-10-08T00:00:00Z" },
    { categories: ["B"], ok: false, lastPublication: "2026-10-07T23:00:00-02:00" },
    { categories: ["C"], ok: true, lastPublication: "2026-10-05T00:00:00Z" },
    { categories: [], ok: true, lastPublication: "2026-10-04T23:59:59Z" },
    { categories: [], ok: true, lastPublication: "2026-10-08T11:30:00Z" },
    { categories: [], ok: true, lastPublication: "2026-10-09T00:00:00Z" },
    { categories: [], ok: true, lastPublication: null },
    { categories: [], lastPublication: "invalid" },
  ];
  assert.deepEqual(feedCounts(feeds, generatedAt, now), { total: 8, categories: 3, today: 2, week: 3, dead: 1 });
  assert.deepEqual(feedCounts(feeds, "2026-10-04T23:00:00Z", now), { total: 8, categories: 3, today: 0, week: 0, dead: 1 });
  assert.deepEqual(feedCounts(feeds, null, now), { total: 8, categories: 3, today: null, week: null, dead: 1 });
  assert.deepEqual(feedCounts([], generatedAt, now), { total: 0, categories: 0, today: 0, week: 0, dead: 0 });
  assert.equal(feedCounts(feeds, generatedAt, Date.parse("2026-10-05T12:00:00Z")).week, 1, "Monday starts a new week");
});
test("RSS watcher preserves preferences, useful defaults and independent count meanings", () => {
  const html = readFileSync(join("rss-watcher", "index.html"), "utf8");
  for (const key of ["rssWatcherFavorites", "rssWatcherKeywords", "rssWatcherViewMode"]) assert.ok(html.includes(key));
  assert.match(html, /<option value="0" selected>Today/);
  assert.match(html, /params\.get\(control\.id\) \?\? \(control === elements\.lastUpdate \? "0" : ""\)/);
  assert.match(html, /if \(control\.value \|\| control === elements\.lastUpdate\) params\.set\(control\.id, control\.value\)/);
  assert.doesNotMatch(html, /feedMeta|collection successes|View the collection schedule/);
  assert.match(html, /Show latest available dates/);
  assert.match(html, /Source labels|source labels/);
  assert.match(html, /state\.filteredItems\.slice\(0, state\.visibleItems\)/);
  assert.match(html, /Suggest a feed\s*<\/button>/);
  assert.doesNotMatch(html, /data-url-state/);
  assert.doesNotMatch(html, /Saved in this browser/);
  assert.match(html, /favoritesToggleLabel\.textContent = `My favorites/);
  assert.match(html, /class="favorites-filter" id="favoritesToggle"/);
  assert.doesNotMatch(html, /createArticleSummary|rss-item-summary|summary\.textContent = "Summary"/);
  assert.match(html, /titleRow\.append\(tags\)/);
  assert.doesNotMatch(html, /head\.append\(tags\)/);
  assert.match(html, /\.site-card-title-row \{[^}]*flex-wrap: wrap/);
  assert.match(html, /\.favorites-filter\[aria-pressed="true"\] svg path \{ fill: currentColor; \}/);
  const collector = readFileSync(join("rss-watcher", "fetch-updates.mjs"), "utf8");
  assert.match(collector, /lastAttemptAt: r\.attemptedAt/);
  assert.match(collector, /latestLink: r\.ok && r\.items\.length/);
});

test("RSS language filters use local flags and a globe while preserving accessible names and URL values", () => {
  const html = readFileSync(join("rss-watcher", "index.html"), "utf8");
  const group = html.split('<div class="language-filter"')[1].split("</div>")[0];
  assert.match(group, /role="group" aria-label="Feed language"/);
  for (const [id, value, label] of [["languageAll", "", "All languages"], ["languageEn", "EN", "English"], ["languageFr", "FR", "French"]]) {
    assert.match(group, new RegExp(`id="${id}" type="button" data-lang="${value}" aria-pressed="(?:true|false)" aria-label="${label}" title="${label}"`));
  }
  assert.match(group, /id="languageAll"[^>]*>[\s\S]*?<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
  for (const language of ["en", "fr"]) {
    assert.ok(group.includes(`<img class="flag" src="/flags/${language}.png" alt="" width="24" height="18">`));
  }
  assert.doesNotMatch(group, />\s*(?:All|English|French)\s*</);
  assert.match(html, /\.language-option \{[^}]*min-width: 2\.75rem;[^}]*min-height: 2\.75rem;/);
  assert.match(html, /state\.language = button\.dataset\.lang/);
  assert.match(html, /params\.set\("language", state\.language\)/);
  assert.match(html, /option\.setAttribute\("aria-pressed", String\(option\.dataset\.lang === state\.language\)\)/);
});

test("RSS source logos are local, source-specific and visible before titles in both views", () => {
  const html = readFileSync(join("rss-watcher", "index.html"), "utf8");
  assert.match(html, /createSourceIcon\(item, "list-icon-slot"\)/);
  assert.match(html, /titleRow\.append\(createSourceIcon\(group, "site-icon-slot"\)\)/);
  assert.match(html, /sourceIconMap\?\.\[source\.source\]\?\.src/);
  assert.match(html, /cachedFaviconFor\(iconDomain\(source\.icon\)\)/);
  assert.match(html, /cachedFaviconFor\(hostFromUrl\(source\.link\)\)/);
  assert.match(html, /await Promise\.all\(\[loadFaviconMap\(\), loadSourceIcons\(\)\]\)/);
  assert.match(html, /image\.loading = "eager"/);
  assert.match(html, /slot\.setAttribute\("aria-hidden", "true"\)/);
  assert.match(html, /Icon unavailable for/);
  assert.match(html, /grid-template-areas:"icon title actions"/);
  assert.doesNotMatch(html, /\.list-article \.list-icon-slot\{display:none/);
  const deploy = readFileSync(join(".github", "workflows", "deploy-hugo.yaml"), "utf8");
  assert.match(deploy, /cp \.\.\/rss-watcher\/source-icons\.json public\/rss-watcher\/source-icons\.json/);
  assert.match(deploy, /cp -R \.\.\/rss-watcher\/source-icons public\/rss-watcher\/source-icons/);
  const workflow = readFileSync(join(".github", "workflows", "rss-updates.yaml"), "utf8");
  assert.match(workflow, /node rss-watcher\/cache-icons\.mjs/);
  assert.match(workflow, /git add[^\n]*rss-watcher\/source-icons\.json rss-watcher\/source-icons/);
});

test("all RSS page scripts compile", () => {
  for (const file of [join("rss-watcher", "index.html"), join("rss-watcher", "activity", "index.html"), join("microsoft-techcommunity-rss-feeds", "index.html")]) {
    for (const [, attrs, code] of readFileSync(file, "utf8").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) attrs.includes("application/ld+json") ? JSON.parse(code) : new Script(code);
  }
});

test("RSS watcher has two visible filter rows, compact cards without scrolling and ten single-line headlines by default", () => {
  const html = readFileSync(join("rss-watcher", "index.html"), "utf8");
  const primary = html.split('<div class="rss-primary">')[1].split('<div class="rss-secondary">')[0];
  for (const id of ["search", "lastUpdate", "source", "languageAll", "languageEn", "languageFr"]) assert.ok(primary.includes(`id="${id}"`), id);
  const secondary = html.split('<div class="rss-secondary">')[1].split('id="keywordChips"')[0];
  for (const id of ["category", "subcategory", "keywordInput"]) assert.ok(secondary.includes(`id="${id}"`), id);
  assert.doesNotMatch(html, /<details class="rss-options"/);
  assert.doesNotMatch(html, /rssOptions|updateRssOptions/);
  assert.match(html, /\.site-grid\{[^}]*grid-auto-rows:auto;gap:\.5rem/);
  assert.match(html, /\.site-card\{height:auto;overflow:visible;gap:\.375rem/);
  assert.match(html, /\.site-card-head\{min-height:0;flex:none;overflow:visible;/);
  assert.doesNotMatch(html, /site-card-footer-space/);
  assert.match(html, /\.site-card \.site-articles\{[^}]*min-height:0;overflow:visible/);
  assert.match(html, /const MAX_ARTICLES_PER_SITE = 10;/);
  assert.match(html, /articles: group\.articles\.slice\(0, state\.sourceLimits\.get\(group\.source\) \|\| MAX_ARTICLES_PER_SITE\)/);
  assert.match(html, /state\.sourceLimits\.set\(group\.source, old \+ MAX_ARTICLES_PER_SITE\)/);
  assert.match(html, /\.site-article-title\{white-space:nowrap;overflow:hidden;text-overflow:ellipsis/);
  assert.match(html, /link\.title = \[item\.title, item\.description\]/);
  assert.match(html, /link\.title = \[item\.title, item\.source, item\.description\]/);
});

test("RSS source, category and subcategory dropdowns share searchable checkbox selection and repeated URL parameters", () => {
  const html = readFileSync(join("rss-watcher", "index.html"), "utf8");
  assert.match(html, /id="source" multiple hidden/);
  assert.match(html, /id="sourceToggle"[^>]*aria-expanded="false" aria-controls="sourcePanel"/);
  assert.match(html, /id="sourceSearch" type="search"/);
  assert.match(html, /id="category" multiple hidden/);
  assert.match(html, /id="categoryToggle"[^>]*aria-expanded="false" aria-controls="categoryPanel"/);
  assert.match(html, /id="categorySearch" type="search"/);
  assert.match(html, /id="subcategory" multiple hidden/);
  assert.match(html, /id="subcategoryToggle"[^>]*aria-expanded="false" aria-controls="subcategoryPanel"/);
  assert.match(html, /id="subcategorySearch" type="search"/);
  assert.match(html, /params\.getAll\(id\)/);
  assert.match(html, /params\.append\(id, option\.value\)/);
  assert.match(html, /!selectedSources\.size \|\| selectedSources\.has\(item\.source\)/);
  assert.match(html, /checkbox\.type = "checkbox"/);
  assert.match(html, /!selectedCategories\.size \|\| item\.categories\.some\(category => selectedCategories\.has\(category\)\)/);
  assert.match(html, /!selectedSubcategories\.size \|\| selectedSubcategories\.has\(item\.subcategory\)/);
  assert.match(html, /search\.addEventListener\("input", \(\) => renderFilterOptions\(id\)\)/);
  assert.match(html, /closeFilterPanel\(id, true\)/);
});

test("RSS cards show every matching source while list articles remain progressively loaded", () => {
  const html = readFileSync(join("rss-watcher", "index.html"), "utf8");
  assert.doesNotMatch(html, /visibleGroups|more source groups/);
  assert.match(html, /state\.groups\.forEach\(\(group\) => fragment\.append\(createSiteCard/);
  assert.match(html, /more\.hidden = state\.viewMode !== "list" \|\| state\.visibleItems >= totalArticles/);
  assert.match(html, /state\.filteredItems\.slice\(0, state\.visibleItems\)/);
  assert.doesNotMatch(html, /libraryCount|updates tracked/);
});
