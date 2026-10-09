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
    }
    assert.match(html, /Collection snapshot/);
    assert.match(html, /Copy RSS URL/);
    assert.match(html, /Export selected OPML/);
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
  assert.match(html, /<option value="" selected>All retained/);
  assert.match(html, /configured · \$\{payload\.succeededCount\} collection successes/);
  assert.match(html, /Show latest available dates/);
  assert.match(html, /Source labels|source labels/);
  assert.match(html, /state\.filteredItems\.slice\(0, state\.visibleItems\)/);
  assert.match(html, /GitHub account required/);
  assert.doesNotMatch(html, /data-url-state/);
  assert.doesNotMatch(html, /Saved in this browser/);
  assert.match(html, /favoritesToggleLabel\.textContent = `My favorites/);
  assert.match(html, /class="favorites-filter" id="favoritesToggle"/);
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
  assert.match(html, /grid-template-areas:"icon source day"/);
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
