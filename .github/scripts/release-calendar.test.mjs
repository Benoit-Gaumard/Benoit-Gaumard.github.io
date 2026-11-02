import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import { test } from "node:test";
import { upgradeNewsPage } from "./release-news-ui.mjs";

class Element {
  children = [];
  attributes = {};
  style = {};
  events = {};
  constructor(tag) { this.tag = tag; }
  append(...children) { this.children.push(...children); }
  prepend(...children) { this.children.unshift(...children); }
  before(element) { this.previous = element; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  replaceChildren(...children) { this.children = children; }
}
function fixture(kind = "azure") {
  const period = new Element("select");
  const window = {};
  runInNewContext(readFileSync("release-news/views.js", "utf8"), {
    window, document: { createElement: tag => new Element(tag), getElementById: () => period },
  });
  const controls = new Element("fieldset"), results = new Element("div");
  const calendar = window.createReleaseCalendar({ controls, results, apply() {}, sync() {}, kind });
  return { calendar, controls, panel: results.previous, period, results };
}
const item = (pubDate, statusLabel, products) => ({ pubDate, statusLabel, products, title: "Test update", link: "https://azure.microsoft.com/updates" });

test("calendar uses UTC month boundaries, leap days and restorable view URLs", () => {
  const { calendar, panel, period, results } = fixture();
  calendar.restore(new URLSearchParams("view=calendar&month=2024-02"));
  assert.equal(calendar.matches("2024-03-01T00:30:00+01:00"), true);
  assert.equal(calendar.matches("2024-03-01T00:00:00Z"), false);
  assert.equal(calendar.matches("invalid"), false);
  calendar.render([item("2024-02-29T12:00:00Z", "Preview", [])]);
  const days = panel.children[3].children.filter(element => element.className === "calendar-day");
  assert.equal(days.length, 29);
  assert.equal(days.at(-1).children[1].textContent, "1 update");
  assert.equal(results.hidden, true);
  assert.equal(period.disabled, true);
  const params = new URLSearchParams();
  calendar.sync(params);
  assert.equal(params.get("month"), "2024-02");
  calendar.restore(new URLSearchParams());
  calendar.render([]);
  assert.equal(results.hidden, false);
  assert.equal(period.disabled, false);
});

test("diagrams count entries, retain empty months, and count multi-product updates separately", () => {
  const { calendar, panel } = fixture();
  calendar.restore(new URLSearchParams("view=diagram"));
  assert.equal(calendar.matches("2020-01-01T00:00:00Z"), true);
  assert.equal(calendar.matches("invalid"), false);
  calendar.render([
    item("2026-01-31T23:00:00Z", "Preview", ["SQL", "AI"]),
    item("2026-03-01T00:00:00Z", "GA", ["SQL"]),
  ]);
  const diagrams = panel.children[4];
  const monthly = diagrams.children[1].children[1].children;
  assert.deepEqual(monthly.map(row => row.children[0].textContent), ["2026-01", "2026-02", "2026-03"]);
  assert.deepEqual(monthly.map(row => row.children[1].textContent), ["1", "0", "1"]);
  const products = diagrams.children[3].children[1].children;
  assert.deepEqual(products.map(row => [row.children[0].textContent, row.children[1].textContent]), [["SQL", "2"], ["AI", "1"]]);
  const params = new URLSearchParams("month=2026-01");
  calendar.sync(params);
  assert.equal(params.get("view"), "diagram");
  assert.equal(params.has("month"), false);
  calendar.render([]);
  assert.equal(diagrams.children[1].children[1].textContent, "No matching announcements.");
});

test("generation and deployment preserve shared assets and filtering integration for all release pages", () => {
  for (const kind of ["azure", "m365", "aws"]) {
    const slug = `${kind}-release-updates`;
    const source = readFileSync(`${slug}/index.html`, "utf8");
    const generated = upgradeNewsPage(source, kind, slug);
    for (const html of [source, generated]) {
      assert.match(html, /src="\/release-news\/views\.js"/);
      assert.match(html, /href="\/release-news\/views\.css"/);
      assert.match(html, /calendar\?\.active \? calendar\.matches\(item\.pubDate\)/);
      assert.match(html, /calendar\?\.restore\(params\)/);
    }
  }
  assert.match(readFileSync(".github/workflows/deploy-hugo.yaml", "utf8"), /cp \.\.\/release-news\/views.js \.\.\/release-news\/views.css public\/release-news\//);
});

test("AWS charts use categories and M365 charts explain feed dates", () => {
  const { calendar, panel } = fixture("aws");
  calendar.restore(new URLSearchParams("view=diagram"));
  calendar.render([{ ...item("2026-01-01T00:00:00Z", "", ["Amazon EC2"]), categories: ["Compute", "Security"] }]);
  const chart = panel.children[4].children[2];
  assert.equal(chart.children[0].textContent, "Updates by Category");
  assert.equal(chart.children[1].children.length, 2);
  const m365 = fixture("m365");
  m365.calendar.restore(new URLSearchParams("view=diagram"));
  m365.calendar.render([]);
  assert.match(m365.panel.children[2].textContent, /feed dates/);
});
