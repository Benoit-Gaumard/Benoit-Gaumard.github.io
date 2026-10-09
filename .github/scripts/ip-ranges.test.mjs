import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { parseAddress, parseRange, contains, sourceFilenameDate, snapshotCollectionDate, snapshotCounts, upgradeIPPage } from "./ip-range-ui.mjs";

test("IPv4 and compressed/embedded IPv6 addresses are parsed strictly", () => {
  for (const value of ["0.0.0.0", "255.255.255.255", "2001:db8::1", "::", "::1", "::ffff:192.0.2.1", "1:2:3:4:5:6:7::"]) assert.ok(parseAddress(value), value);
  for (const value of ["", "256.1.1.1", "01.2.3.4", "1.2.3", ":::1", "2001:::1", "1:2:3:4:5:6:7:8::", "1:2:3:4:5:6:7:", "[::1]", "::1%eth0", "::ffff:300.1.1.1"]) assert.equal(parseAddress(value), null, value);
});
test("CIDR membership handles both families and exact boundary prefixes", () => {
  assert.equal(contains(parseAddress("192.0.2.255"), parseRange("192.0.2.0/24")), true);
  assert.equal(contains(parseAddress("192.0.3.0"), parseRange("192.0.2.0/24")), false);
  assert.equal(contains(parseAddress("255.255.255.255"), parseRange("0.0.0.0/0")), true);
  assert.equal(contains(parseAddress("::1"), parseRange("::/0")), true);
  assert.equal(contains(parseAddress("::1"), parseRange("::1/128")), true);
  assert.equal(contains(parseAddress("::2"), parseRange("::1/128")), false);
  assert.equal(contains(parseAddress("192.0.2.1"), parseRange("::/0")), false);
  assert.equal(contains(parseAddress("::ffff:192.0.2.1"), parseRange("::ffff:c000:0200/120")), true);
  for (const value of ["1.2.3.4/33", "::/129", "::/-1", "::/2x", "1.2.3.4", "::/128/0"]) assert.equal(parseRange(value), null, value);
});
test("every actual published prefix parses without changing its original string", () => {
  for (const kind of ["azure", "github"]) {
    const data = JSON.parse(readFileSync(`${kind}-ip-ranges\\ip-ranges.json`, "utf8"));
    const groups = data.tags || data.categories;
    for (const group of groups) for (const prefix of group.prefixes || group.cidrs) assert.ok(parseRange(prefix), prefix);
  }
});
test("both standalone pages expose snapshot cards while keeping lookup, selection and filtered exports", () => {
  for (const kind of ["azure", "github"]) {
    const html = readFileSync(`${kind}-ip-ranges\\index.html`, "utf8");
    assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="lookupInput"'));
    const stats = html.split('<section class="ip-dataset-stats"')[1].split('</section>')[0];
    assert.equal([...stats.matchAll(/class="stat-card"/g)].length, 6);
    if (kind === "azure") {
      assert.doesNotMatch(html, /id="snapshotDetails"/);
      assert.deepEqual([...stats.matchAll(/<span class="stat-label">([^<]+)<\/span>/g)].map(match => match[1]), ["Groups", "Prefix entries across groups", "IPv4 entries", "IPv6 entries", "Service-tags version", "Source file date"]);
      assert.equal([...html.matchAll(/id="sourceFileDate"/g)].length, 1);
      assert.match(html, /independent of filters/);
      assert.match(stats, /Date from source filename/);
    } else {
      assert.ok(html.indexOf('id="lookupInput"') < html.indexOf('id="snapshotDetails"'));
      assert.deepEqual([...stats.matchAll(/<span class="stat-label">([^<]+)<\/span>/g)].map(match => match[1]), ["Categories", "Prefix entries across categories", "IPv4 entries", "IPv6 entries", "Unique prefix strings", "Snapshot collected"]);
      assert.doesNotMatch(stats, /Service-tags version|Source file date/);
      assert.match(stats, /UTC date of collection/);
    }
    assert.match(html, /aria-describedby="lookupHint lookupHeading"/);
    assert.match(html, /setAttribute\("aria-invalid", "true"\)/);
    assert.match(html, /SiteUX\.copy\(state\.filteredPrefixes\.join/);
    assert.match(html, /SiteUX\.download\(state\.filteredPrefixes\.join/);
    assert.match(html, /Snapshot collected/);
    assert.ok(upgradeIPPage(html, kind) === html, `${kind} IP-page generation must be idempotent`);
    for (const [, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) attrs.includes("application/ld+json") ? JSON.parse(code) : new Script(code);
  }
});

test("snapshot counts include repeated entries but distinguish unique prefix strings", () => {
  const groups = [{ prefixes: ["192.0.2.0/24", "2001:db8::/32"] }, { prefixes: ["192.0.2.0/24", "192.0.2.0/24", "::ffff:192.0.2.0/120"] }];
  const cache = new Map(groups.flatMap(group => group.prefixes).map(prefix => [prefix, parseRange(prefix)]));
  assert.deepEqual(snapshotCounts(groups, cache), { groups: 2, entries: 5, ipv4: 3, ipv6: 2, uniquePrefixes: 3 });
  assert.deepEqual(snapshotCounts([{ prefixes: [] }], new Map()), { groups: 1, entries: 0, ipv4: 0, ipv6: 0, uniquePrefixes: 0 });
  assert.throws(() => snapshotCounts(groups, new Map()), /Missing parsed prefix/);
});

test("source filename date is valid calendar evidence, not the collection date", () => {
  assert.equal(sourceFilenameDate("ServiceTags_Public_20240229.json"), "2024-02-29");
  for (const filename of [null, "", "ServiceTags.json", "ServiceTags_Public_20250229.json", "ServiceTags_Public_20261301.json"]) {
    assert.equal(sourceFilenameDate(filename), null);
  }
});

test("GitHub collection dates use the recorded timestamp in UTC, never today's date", () => {
  assert.equal(snapshotCollectionDate("2026-09-08T10:53:11.658Z"), "2026-09-08");
  assert.equal(snapshotCollectionDate("2026-09-08T00:30:00+02:00"), "2026-09-07");
  for (const value of [null, "", "invalid", 0]) assert.equal(snapshotCollectionDate(value), null);
});
