import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { join } from "node:path";
import { localTimeCandidates, dayDifference, zonedParts, upgradeClock, calendarFacts, offsetForZone, countryForZone } from "./world-clock-ui.mjs";
import { countryCatalogue, validateFlag } from "./clock-flags.mjs";

const countries = JSON.parse(readFileSync(join("world-clock", "timezone-countries.json"), "utf8"));

test("future Paris previews use the offset for the selected season", () => {
  assert.deepEqual(localTimeCandidates("2026-01-15T09:00", "Europe/Paris"), [Date.parse("2026-01-15T08:00:00Z")]);
  assert.deepEqual(localTimeCandidates("2026-07-15T09:00", "Europe/Paris"), [Date.parse("2026-07-15T07:00:00Z")]);
});
test("nonexistent and ambiguous DST wall times are not silently shifted", () => {
  assert.deepEqual(localTimeCandidates("2026-03-29T02:30", "Europe/Paris"), []);
  assert.deepEqual(localTimeCandidates("2026-10-25T02:30", "Europe/Paris"), [Date.parse("2026-10-25T00:30:00Z"), Date.parse("2026-10-25T01:30:00Z")]);
  assert.deepEqual(localTimeCandidates("2026-02-30T09:00", "Europe/Paris"), []);
});
test("fractional offsets and international date differences are represented correctly", () => {
  assert.deepEqual(localTimeCandidates("2026-07-15T09:00", "Asia/Kolkata"), [Date.parse("2026-07-15T03:30:00Z")]);
  const instant = Date.parse("2026-07-15T00:30:00Z");
  assert.equal(dayDifference(instant, "America/Los_Angeles"), -1);
  assert.equal(dayDifference(Date.parse("2026-07-15T12:00:00Z"), "Pacific/Kiritimati"), 1);
  assert.equal(zonedParts(instant, "Europe/Paris").hour, 2);
});
test("calendar cards use the displayed Paris date and the correct year length", () => {
  const facts = calendarFacts(Date.parse("2026-10-08T12:00:00Z"));
  assert.equal(facts.dayOfYear, 281);
  assert.equal(facts.daysInYear, 365);
  assert.equal(facts.percentage.toFixed(1), "77.0");
  assert.equal(facts.weekOfYear, 41);
  assert.equal(facts.weekYear, 2026);
  assert.equal(calendarFacts(Date.parse("2026-10-08T22:00:00Z")).dayOfYear, 282);
  for (const [iso, day, days] of [
    ["2024-02-29", 60, 366], ["2024-03-01", 61, 366], ["2024-12-31", 366, 366],
    ["2000-03-01", 61, 366], ["1900-03-01", 60, 365], ["2100-03-01", 60, 365],
  ]) {
    const result = calendarFacts(Date.parse(iso + "T12:00:00Z"));
    assert.equal(result.dayOfYear, day, iso);
    assert.equal(result.daysInYear, days, iso);
  }
  assert.equal(calendarFacts(Date.parse("2024-12-31T12:00:00Z")).percentage, 100);
});
test("ISO weeks retain their week-year across New Year", () => {
  for (const [iso, week, year] of [["2021-01-01", 53, 2020], ["2018-12-31", 1, 2019], ["2026-01-01", 1, 2026]]) {
    const result = calendarFacts(Date.parse(iso + "T12:00:00Z"));
    assert.equal(result.weekOfYear, week, iso);
    assert.equal(result.weekYear, year, iso);
  }
  const nextYear = calendarFacts(Date.parse("2026-12-31T23:30:00Z"));
  assert.equal(nextYear.dayOfYear, 1);
  assert.equal(nextYear.weekOfYear, 53);
  assert.equal(nextYear.weekYear, 2026);
  assert.ok(calendarFacts(Date.parse("0099-01-01T12:00:00Z")).weekYear < 100);
});
test("GMT badges include seasonal and fractional offsets", () => {
  const winter = Date.parse("2026-01-15T12:00:00Z"), summer = Date.parse("2026-07-15T12:00:00Z");
  assert.equal(offsetForZone("Europe/Paris", winter), "GMT+1");
  assert.equal(offsetForZone("Europe/Paris", summer), "GMT+2");
  assert.equal(offsetForZone("Africa/Johannesburg", winter), "GMT+2");
  assert.equal(offsetForZone("Africa/Johannesburg", summer), "GMT+2");
  assert.equal(offsetForZone("America/New_York", summer), "GMT-4");
  assert.equal(offsetForZone("Asia/Kolkata", summer), "GMT+5:30");
  assert.equal(offsetForZone("Asia/Kathmandu", summer), "GMT+5:45");
  assert.equal(offsetForZone("America/St_Johns", winter), "GMT-3:30");
  assert.equal(offsetForZone("Pacific/Chatham", winter), "GMT+13:45");
  assert.equal(offsetForZone("UTC", summer), "GMT");
});
test("country flags cover geographic timezones without assigning countries to UTC", () => {
  for (const [zone, code] of [
    ["Europe/Paris", "FR"], ["Europe/London", "GB"], ["America/New_York", "US"],
    ["Africa/Johannesburg", "ZA"], ["Asia/Kolkata", "IN"], ["Asia/Calcutta", "IN"],
    ["Asia/Katmandu", "NP"], ["Europe/Copenhagen", "DK"], ["Europe/Bratislava", "SK"],
    ["Africa/Asmera", "ER"], ["America/Virgin", "VI"], ["Iceland", "IS"],
  ]) assert.equal(countryForZone(zone, countries)?.code, code, zone);
  for (const zone of Intl.supportedValuesOf("timeZone")) assert.ok(countryForZone(zone, countries), zone);
  assert.equal(countryForZone("UTC", countries), null);
  assert.equal(countryForZone("Etc/GMT+2", countries), null);
  assert.equal(countryForZone("Unknown/Place", countries), null);
  for (const [code, country] of Object.entries(countries.countries)) {
    assert.equal(country.flag, `/flags/${code.toLowerCase()}.png`);
    validateFlag(readFileSync(join("flags", `${code.toLowerCase()}.png`)), code);
  }
  assert.equal(countries.flagSource, "https://www.flowhunt.io/es/ai-leaderboard/");
  assert.equal(countries.flagImages, "https://static.flowhunt.io/flags/");
});
test("country collection preserves location countries and geographic alias hints", () => {
  const data = countryCatalogue(
    "DK\t+00\tEurope/Copenhagen\nDE\t+00\tEurope/Berlin\nER\t+00\tAfrica/Asmara\nKE\t+00\tAfrica/Nairobi",
    "DK\tDenmark\nDE\tGermany\nER\tEritrea\nKE\tKenya",
    "Link Europe/Berlin Europe/Copenhagen\nLink Africa/Nairobi Africa/Asmera #= Africa/Asmara\nLink Europe/Berlin CET",
  );
  assert.equal(data.zones["Europe/Copenhagen"], "DK");
  assert.equal(data.zones["Africa/Asmera"], "ER");
  assert.equal(data.zones.CET, undefined);
  assert.throws(() => validateFlag(Buffer.from("not an image"), "bad"), /24 x 18 PNG/);
});
test("world clock preserves local preferences and does not announce every second", () => {
  const html = readFileSync(join("world-clock", "index.html"), "utf8");
  assert.match(html, /world-clock-view-mode/);
  assert.match(html, /world-clock-cities/);
  assert.match(html, /id="parisTime" aria-live="off"/);
  assert.match(html, /id="timezoneGrid" aria-live="off"/);
  assert.match(html, /not live/);
  assert.match(html, /Day of the Year/);
  assert.match(html, /Week of the Year/);
  assert.match(html, /id="yearProgress"/);
  assert.match(html, /id="weekContext"/);
  assert.doesNotMatch(html, /<details class="clock-calendar"/);
  assert.match(html, /class="timezone-offset"/);
  assert.match(html, /src="\/flags\/fr.png"/);
  assert.ok(upgradeClock(html) === html);
  for (const [, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) attrs.includes("application/ld+json") ? JSON.parse(code) : new Script(code);
});
