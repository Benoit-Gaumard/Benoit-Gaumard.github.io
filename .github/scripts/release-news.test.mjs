import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Script } from "node:vm";
import { matchesPeriod, publicationAge, productLabel, roadmapDates, azureStatusClass, m365StatusClass, upgradeNewsPage } from "./release-news-ui.mjs";

test("news periods use bounded UTC calendar periods and allow an explicit all-retained choice", () => {
  const now = Date.parse("2026-10-07T02:00:00Z");
  assert.equal(matchesPeriod("2026-09-01T00:00:00Z", "", now), true);
  assert.equal(matchesPeriod("2026-10-07T23:00:00Z", "0", now), true);
  assert.equal(matchesPeriod("2026-10-06T23:00:00Z", "yesterday", now), true);
  assert.equal(matchesPeriod("2026-10-06T23:00:00Z", "0", now), false);
  assert.equal(matchesPeriod("2026-10-01T00:00:00Z", "7", now), true);
  assert.equal(matchesPeriod("2026-09-30T23:59:59Z", "7", now), false);
  assert.equal(matchesPeriod("invalid", "7", now), false);
});

test("publication-age badges use UTC calendar days and preserve compact older-age wording", () => {
  const now = Date.parse("2026-10-08T00:05:00Z");
  assert.equal(publicationAge("2026-10-08T00:00:00Z", now), "Today");
  assert.equal(publicationAge("2026-10-07T23:59:00Z", now), "Yesterday");
  assert.equal(publicationAge("2026-10-08T01:00:00+02:00", now), "Yesterday");
  assert.equal(publicationAge("2026-10-06T23:59:00Z", now), "2 days ago");
  assert.equal(publicationAge("2026-10-02T00:00:00Z", now), "6 days ago");
  assert.equal(publicationAge("2026-10-01T00:00:00Z", now), "1 week ago");
  assert.equal(publicationAge("2026-09-24T00:00:00Z", now), "2 weeks ago");
  assert.equal(publicationAge("2026-09-08T00:00:00Z", now), "1 month ago");
  assert.equal(publicationAge("2025-10-08T00:00:00Z", now), "1 year ago");
  assert.equal(publicationAge("2026-10-09T00:00:00Z", now), "Tomorrow");
  assert.equal(publicationAge("2026-10-10T00:00:00Z", now), "In 2 days");
  for (const value of ["", "invalid", null]) assert.equal(publicationAge(value, now), null);
  const html = readFileSync("azure-release-updates\\index.html", "utf8");
  assert.match(html, /const age = publicationAge\(item\.pubDate\)/);
  assert.match(html, /node\("time",[\s\S]*?formatDate\(item\.pubDate\)/);
  assert.match(html, /relative\.classList\.toggle\("is-recent", age === "Today" \|\| age === "Yesterday"\)/);
});
test("product spellings preserve official acronyms without changing raw filter values", () => {
  assert.equal(productLabel("Aiml"), "AI/ML");
  assert.equal(productLabel("Amazon Rds For Sql Server"), "Amazon RDS For SQL Server");
  assert.equal(productLabel("Aws Govcloud Us"), "AWS GovCloud (US)");
  assert.equal(productLabel("Amazon Sagemaker Studio"), "Amazon SageMaker Studio");
});

test("all release products use individual badges while retaining AWS display-name normalization", () => {
  for (const slug of ["azure-release-updates", "m365-release-updates", "aws-release-updates"]) {
    const html = readFileSync(slug + "\\index.html", "utf8");
    assert.match(html, /if \(item\.products\.length\)/);
    assert.match(html, /node\("ul", undefined, "news-products update-tags"\)/);
    assert.match(html, /tags\.setAttribute\("aria-label", "Products"\)/);
    assert.match(html, /item\.products\.forEach\(product => tags\.append\(node\("li", config\.kind === "aws" \? productLabel\(product\) : product, "update-tag"\)\)\)/);
    assert.match(html, /\.news-products \.update-tag\{max-width:100%;overflow-wrap:anywhere;\}/);
  }
});

test("all release announcements use only their title link, without a duplicate summary or source link", () => {
  for (const slug of ["azure-release-updates", "m365-release-updates", "aws-release-updates"]) {
    const html = readFileSync(slug + "\\index.html", "utf8");
    assert.match(html, /article\.append\(node\("p", item\.description, "news-description"\)\)/);
    assert.match(html, /link\.href = item\.link/);
    assert.doesNotMatch(html, /Full source summary|news-description-more|news-source|Read the (?:Azure|AWS) announcement|Open roadmap item/);
  }
});
test("roadmap target wording is retained without inventing an exact date", () => {
  assert.deepEqual(roadmapDates("Description. GA date: October CY2026 Preview date: September CY2026"), [
    { label: "GA target (source wording)", value: "October CY2026" },
    { label: "Preview target (source wording)", value: "September CY2026" },
  ]);
  assert.deepEqual(roadmapDates("No target is recorded."), []);
});

test("Azure status badges preserve source labels and map only recognized statuses to semantic colors", () => {
  const expected = new Map([
    ["General Availability", "ga"], ["Public Preview", "preview"], ["Private Preview", "private-preview"],
    ["Announcement", "announcement"], ["Retirement", "retirement"], ["In development", "dev"],
  ]);
  for (const [label, className] of expected) {
    assert.equal(azureStatusClass(label), className);
    assert.equal(azureStatusClass(` ${label.toUpperCase()} `), className);
  }
  assert.equal(azureStatusClass("A future source status"), "default");
  assert.equal(azureStatusClass("Not a retirement"), "default");
  assert.throws(() => azureStatusClass({}), /must be a string/);
  const data = JSON.parse(readFileSync("azure-release-updates\\updates.json", "utf8"));
  for (const item of data.items) {
    if (item.statusLabel) assert.equal(azureStatusClass(item.statusLabel), expected.get(item.statusLabel) ?? "default", item.statusLabel);
  }
  const html = readFileSync("azure-release-updates\\index.html", "utf8");
  assert.match(html, /node\("span", item\.statusLabel, "news-status"\)/);
  assert.match(html, /if \(config\.kind === "azure"\) status\.classList\.add\("status-badge", azureStatusClass\(item\.statusLabel\)\)/);
  assert.match(html, /\.news-status\.status-badge\{[^}]*border:1px solid currentColor;[^}]*white-space:normal;overflow-wrap:anywhere;/);
});

test("Microsoft 365 adopts the Microsoft card layout without changing roadmap semantics", () => {
  for (const [label, tone] of [["In development", "dev"], ["Rolling out", "preview"], ["Launched", "ga"], ["Cancelled", "retirement"]]) {
    assert.equal(m365StatusClass(label), tone);
    assert.equal(m365StatusClass(label.toUpperCase()), tone);
  }
  assert.equal(m365StatusClass("Future status"), "default");
  assert.throws(() => m365StatusClass(null), /must be a string/);
  const html = readFileSync("m365-release-updates\\index.html", "utf8");
  assert.match(html, /const defaultPeriod = "0"/);
  assert.match(html, /else if \(config\.kind === "m365"\) status\.classList\.add\("status-badge", m365StatusClass\(item\.statusLabel\)\)/);
  assert.match(html, /Feed-date period/);
  assert.match(html, /Roadmap feed date/);
  assert.match(html, /const age = publicationAge\(item\.pubDate\)/);
  assert.match(html, /roadmapDates\(item\.description\)/);
  assert.doesNotMatch(html, /Open roadmap item/);
});
test("AWS keeps category/product filtering and never infers a status from its announcement title", () => {
  const html = readFileSync("aws-release-updates\\index.html", "utf8");
  assert.match(html, /const defaultPeriod = "0"/);
  assert.match(html, /const age = publicationAge\(item\.pubDate\)/);
  assert.match(html, /if \(item\.statusLabel\)/);
  assert.match(html, /else status\.classList\.add\("status-badge", "default"\)/);
  assert.match(html, /item\.categories\.includes\(el\.category\.value\)/);
  assert.match(html, /item\.products\.includes\(el\.product\.value\)/);
  assert.match(html, /config\.kind === "aws" \? item\.products : item\.tags/);
});
test("news generation is repeatable and retains storage keys, data states and deep links", () => {
  for (const [kind, slug] of [["azure", "azure-release-updates"], ["m365", "m365-release-updates"], ["aws", "aws-release-updates"]]) {
    const html = readFileSync(slug + "\\index.html", "utf8");
    assert.ok(upgradeNewsPage(html, kind, slug) === html, slug);
    assert.match(html, /<option value="0" selected>Today/);
    assert.match(html, /params\.get\(control\.id\) \?\? \(control === el\.lastUpdate \? defaultPeriod : ""\)/);
    assert.match(html, /control\.value \|\| \(control === el\.lastUpdate && defaultPeriod\)/);
    assert.match(html, /Show latest available dates/);
    assert.match(html, /el\.refreshedAt\.textContent = "Unavailable"/);
    assert.match(html, /Snapshot collected/);
    assert.match(html, /SiteUX\.fetchJSON/);
    assert.doesNotMatch(html, /refreshed twice (?:daily|a day)/i);
    for (const [, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) attrs.includes("application/ld+json") ? JSON.parse(code) : new Script(code);
  }
});

test("release favorite filters use the shared My favorites star button", () => {
  for (const slug of ["azure-release-updates", "m365-release-updates", "aws-release-updates"]) {
    const html = readFileSync(slug + "\\index.html", "utf8");
    assert.doesNotMatch(html, /Saved in this browser/);
    assert.match(html, /class="favorites-filter" id="favoritesFilter" type="button" aria-pressed="false"><svg[^>]*aria-hidden="true"[^>]*>/);
    assert.match(html, /id="favoritesFilterLabel">My favorites \(0\)/);
    assert.match(html, /favoritesFilterLabel\.textContent = `My favorites/);
    assert.match(html, /\.favorites-filter\[aria-pressed="true"\]\{border-color:var\(--cp-warning\);background:var\(--cp-warning-bg\);color:var\(--cp-warning\);\}/);
    assert.match(html, /\.favorites-filter\[aria-pressed="true"\] svg path\{fill:currentColor;\}/);
    assert.match(html, /const storageKey = config\.slug \+ "-favorites"/);
  }
});
