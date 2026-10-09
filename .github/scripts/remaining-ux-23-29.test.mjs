import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const pages = ["subnet-calculator", "percentage-calculator", "sla-calculator", "units-converter", "guid-generator", "random-wheel", "mini-games"];
const html = Object.fromEntries(pages.map(page => [page, fs.readFileSync(new URL(`../../${page}/index.html`, import.meta.url), "utf8")]));
function scripts(page) {
  return [...html[page].matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match => !match[1].includes("application/ld+json")).map(match => match[2]);
}
function app(page, needle) { return scripts(page).find(script => script.includes(needle)); }
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Missing source section ${start} / ${end}`);
  return source.slice(from, to);
}
function model(code, names, extra = {}) {
  const sandbox = vm.createContext({ ...extra });
  vm.runInContext(`${code}\nthis.api = {${names.join(",")}}`, sandbox);
  return { ...sandbox.api, sandbox };
}

test("all seven standalone pages retain the shared shell and contain valid inline JavaScript", () => {
  for (const page of pages) {
    assert.equal((html[page].match(/<!-- site-ui:start -->/g) || []).length, 1);
    assert.equal((html[page].match(/<!-- site-ui:end -->/g) || []).length, 1);
    for (const script of scripts(page)) assert.doesNotThrow(() => new vm.Script(script), page);
    assert.match(html[page], /data-tool-ux/);
  }
});

const subnetSource = app("subnet-calculator", "function computeNetwork");
const subnet = model(section(subnetSource, "function parseIp", "function addResultRow"), ["parseIp", "ipToInt", "intToIp", "maskIntToPrefix", "prefixToMaskInt", "computeNetwork", "azureHosts"]);
test("standard IPv4 and Azure counts/ranges are distinct, including /0, /29, /31 and /32", () => {
  const ip = subnet.ipToInt([192, 168, 1, 10]);
  const network = subnet.computeNetwork(ip, 24);
  assert.equal(network.usableHosts, 254);
  assert.equal(subnet.azureHosts(24), 251);
  assert.equal(subnet.intToIp(network.networkInt + 4), "192.168.1.4");
  assert.equal(subnet.azureHosts(29), 3);
  assert.equal(subnet.azureHosts(30), null);
  assert.equal(subnet.azureHosts(0), null);
  assert.equal(subnet.computeNetwork(ip, 0).totalAddresses, 4294967296);
  assert.equal(subnet.computeNetwork(ip, 31).usableHosts, 2);
  assert.equal(subnet.computeNetwork(ip, 32).usableHosts, 1);
  for (let prefix = 0; prefix <= 32; prefix++) assert.equal(subnet.maskIntToPrefix(subnet.prefixToMaskInt(prefix)), prefix);
  assert.equal(subnet.maskIntToPrefix(subnet.ipToInt([255, 0, 255, 0])), null);
  for (const input of ["256.1.2.3", "a.b.c.d", "1.2.3", "1.2.3.4/24"]) assert.equal(subnet.parseIp(input), null);
});
test("equal subnet arithmetic covers the parent exactly, without signed overflow", () => {
  const parent = subnet.computeNetwork(subnet.ipToInt([240, 1, 1, 1]), 24);
  const size = 2 ** (32 - 26);
  const ranges = Array.from({ length: 4 }, (_, i) => subnet.computeNetwork(parent.networkInt + i * size, 26));
  assert.equal(ranges[0].networkInt, parent.networkInt);
  assert.equal(ranges.at(-1).broadcastInt, parent.broadcastInt);
  assert.equal(ranges.reduce((sum, n) => sum + n.totalAddresses, 0), 256);
  assert.match(html["subnet-calculator"], /id="splitWrap"/);
  assert.match(subnetSource, /getElementById\("splitWrap"\)\.hidden = true/);
});

const percentageSource = app("percentage-calculator", "function renderOf");
const percentage = model(section(percentageSource, "function parseDecimal", "function setResult"), ["parseDecimal", "formatNumber"]);
test("percentage input accepts decimal commas, rejects partial numbers, and preserves small values", () => {
  assert.equal(percentage.parseDecimal("12,5"), 12.5);
  assert.equal(percentage.parseDecimal(" -2.5e-3 "), -.0025);
  for (const invalid of ["", " ", "4x", "1,2.3", "1 234"]) assert.ok(Number.isNaN(percentage.parseDecimal(invalid)));
  assert.notEqual(percentage.formatNumber(1e-12), "0");
});
test("all four percentage modes calculate contextually and associate zero errors with their fields", () => {
  const input = value => ({ value: String(value), attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } });
  const elements = {
    ofPercent: input(20), ofValue: input(50), ofResult: {},
    iwpX: input(10), iwpY: input(50), iwpResult: {},
    changeFrom: input(50), changeTo: input(75), changeResult: {},
    asValue: input(50), asPercent: input(20), asResult: {},
  };
  const code = section(percentageSource, "function parseDecimal", "function setResult")
    + section(percentageSource, "function renderOf", 'elements.ofPercent.addEventListener');
  const m = model(code, ["renderOf", "renderIsWhatPercent", "renderChange", "renderAddSubtract"], {
    elements, addSubtractOperation: "subtract",
    setResult(container, number, label, error, formula) { Object.assign(container, { number, label, error: !!error, formula }); },
  });
  m.renderOf(); m.renderIsWhatPercent(); m.renderChange(); m.renderAddSubtract();
  assert.equal(elements.ofResult.number, "10");
  assert.equal(elements.iwpResult.number, "20%");
  assert.equal(elements.changeResult.number, "+50%");
  assert.equal(elements.asResult.number, "40");
  assert.match(elements.ofResult.label, /20% of 50 is 10/);
  assert.match(elements.changeResult.formula, /\|original\|/);
  elements.iwpY.value = "0"; m.renderIsWhatPercent();
  assert.equal(elements.iwpResult.error, true);
  assert.equal(elements.iwpY.attributes["aria-invalid"], "true");
  elements.iwpY.value = "50"; m.renderIsWhatPercent();
  assert.equal(elements.iwpY.attributes["aria-invalid"], "false");
  elements.changeFrom.value = "-50"; m.renderChange();
  assert.equal(elements.changeResult.number, "+250%");
});

const slaSource = app("sla-calculator", "function compositeSla");
const sla = model(section(slaSource, "function periods", "const SLA_PRESETS") + section(slaSource, "function formatDuration", "function escapeHtml"), ["periods", "compositeSla", "slaFromDowntime", "formatDuration", "formatSlaPercent"]);
test("SLA uses explicit calendar assumptions and does not silently cap excess downtime", () => {
  for (const days of [28, 29, 30, 31]) {
    const periods = sla.periods(days);
    assert.equal(periods.find(p => p.key === "month").seconds, days * 86400);
    assert.equal(periods.find(p => p.key === "quarter").seconds, 3 * days * 86400);
    assert.equal(periods.find(p => p.key === "year").seconds, 365 * 86400);
  }
  assert.ok(Math.abs(sla.slaFromDowntime(43.2 * 60, 30 * 86400) - 99.9) < 1e-10);
  assert.ok(Number.isNaN(sla.slaFromDowntime(31 * 86400, 30 * 86400)));
  assert.ok(Number.isNaN(sla.slaFromDowntime(-1, 86400)));
  assert.equal(sla.slaFromDowntime(0, 86400), 100);
  assert.equal(sla.slaFromDowntime(86400, 86400), 0);
  assert.equal(sla.formatDuration(59.9999), "1m");
  assert.notEqual(sla.formatDuration(0.00001), "0s");
  assert.equal(sla.formatSlaPercent(99.940005), "99.940005");
  assert.notEqual(sla.formatSlaPercent(99.999999999999), "100");
});
test("series composite formula requires all services to be valid", () => {
  assert.ok(Math.abs(sla.compositeSla([{ sla: 99.99 }, { sla: 99.95 }]) - 99.940005) < 1e-10);
  assert.equal(sla.compositeSla([{ sla: 100 }, { sla: 0 }]), 0);
  for (const services of [[], [{ sla: NaN }], [{ sla: 99 }, { sla: 101 }], [{ sla: -1 }]]) assert.ok(Number.isNaN(sla.compositeSla(services)));
});

const unitsSource = app("units-converter", "const CATEGORIES");
const units = model(section(unitsSource, "const CATEGORIES", "const state") + section(unitsSource, "function toCelsius", "function populateUnitSelect"), ["CATEGORIES", "convert", "formatResult", "parseDecimal"]);
test("decimal data and binary data use correctly named, independent bases", () => {
  assert.equal(units.convert(1, "MB", "B", "data"), 1000000);
  assert.equal(units.convert(1, "MiB", "B", "data"), 1048576);
  assert.equal(units.convert(1, "GB", "MB", "data"), 1000);
  assert.equal(units.convert(1, "GiB", "MiB", "data"), 1024);
  assert.equal(units.convert(1, "MiB", "MB", "data"), 1.048576);
  assert.equal(units.convert(8, "Mbps", "MBps", "transfer"), 1);
});
test("unit formatting never rounds a finite nonzero result to zero", () => {
  for (const value of [1e-9, -1e-12, 1e-100, Number.MIN_VALUE, .000012345678, 1e100]) {
    assert.notEqual(units.formatResult(value), "0");
    assert.notEqual(units.formatResult(value), "-0");
  }
  assert.match(units.formatResult(units.convert(1, "MB", "PB", "data")), /e-9/);
  assert.ok(Number.isNaN(units.convert(Number.MIN_VALUE, "B", "PB", "data")));
  assert.ok(Number.isNaN(units.parseDecimal("1e-999")));
  assert.equal(units.parseDecimal("0,25"), .25);
  assert.equal(units.formatResult(0), "0");
});
test("unit conversion preserves temperature offsets and reversible unit pairs", () => {
  assert.equal(units.convert(0, "C", "F", "temperature"), 32);
  assert.equal(units.convert(32, "F", "C", "temperature"), 0);
  assert.equal(units.convert(0, "C", "K", "temperature"), 273.15);
  for (const [key, category] of Object.entries(units.CATEGORIES)) {
    const [from, to] = category.default;
    const result = units.convert(23.5, from, to, key);
    assert.ok(Math.abs(units.convert(result, to, from, key) - 23.5) < 1e-10, key);
  }
});

const guidSource = app("guid-generator", "function createGuid");
const guidCode = section(guidSource, "function createGuid", "function currentOptions") + section(guidSource, "function formatGuid", "function renderList");
test("GUID native and crypto fallback generators produce UUID v4 variants", () => {
  for (const crypto of [webcrypto, { getRandomValues: array => webcrypto.getRandomValues(array) }]) {
    const guid = model(guidCode, ["createGuid", "formatGuid"], { crypto });
    const values = Array.from({ length: 500 }, guid.createGuid);
    assert.equal(new Set(values).size, 500);
    for (const value of values) assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(guid.formatGuid("12345678-abcd-4def-8123-abcdef123456", { uppercase: true, braces: true, quotes: true, hyphens: false }), '"{12345678ABCD4DEF8123ABCDEF123456}"');
  }
});
test("GUID batches share one honest copy path and JSON exports avoid double quotation", () => {
  assert.match(guidSource, /return SiteUX\.copy/);
  assert.doesNotMatch(guidSource, /execCommand|Math\.random/);
  assert.match(guidSource, /quotes: false/);
  assert.match(html["guid-generator"], /id="batchOptions"/);
});
test("GUID quantity normalization handles bounds, fractions and exponent notation explicitly", () => {
  const guid = model(section(guidSource, "function normalizeQuantity", "function generate"), ["normalizeQuantity"]);
  for (const [value, expected] of [["", 1], ["-5", 1], ["501", 500], ["2.9", 2], ["1e2", 100], ["garbage", 1]]) assert.equal(guid.normalizeQuantity(value), expected);
});

const wheelSource = app("random-wheel", "function buildPool");
test("wheel pools contain exactly the advertised unique letters and inclusive numbers", () => {
  const wheel = model(section(wheelSource, "function buildPool", "const state"), ["buildPool"]);
  const letters = wheel.buildPool("letters"), numbers = wheel.buildPool("numbers");
  assert.equal(letters.length, 26);
  assert.equal(new Set(letters).size, 26);
  assert.equal(letters[0], "A"); assert.equal(letters.at(-1), "Z");
  assert.equal(numbers.length, 101);
  assert.equal(numbers[0], "0"); assert.equal(numbers.at(-1), "100");
});
test("wheel reduced-motion draws complete immediately without repetition and announce the result", () => {
  const state = { mode: "letters", pools: { letters: ["A", "B"] }, picked: { letters: [] }, spinning: false, rotation: 0 };
  const status = {}, canvas = { style: {}, removeEventListener() {} };
  const wheel = model(section(wheelSource, "function spin()", "function resetPool()"), ["spin"], {
    state, canvas, currentPool: () => state.pools.letters, currentPicked: () => state.picked.letters,
    document: { getElementById: () => status }, window: { matchMedia: () => ({ matches: true }) },
    clearTimeout, setTimeout, resultValue: {}, resultHeadline: {}, resultSub: {},
    drawWheel() {}, updatePoolStatus() {}, updateHistory() {},
  });
  wheel.spin(); wheel.spin(); wheel.spin();
  assert.equal(state.spinning, false);
  assert.equal(new Set(state.picked.letters).size, 2);
  assert.equal(state.pools.letters.length, 0);
  assert.match(status.textContent, /picked\. 0 values remaining/);
});

const gamesSource = app("mini-games", "const GAME_KEYS");
test("game keys are captured only by the focused play area; paused and external keys scroll normally", () => {
  const handlers = {}, canvas = { addEventListener() {} };
  const state = { running: true, paused: false };
  const document = { activeElement: {}, getElementById: () => ({ contains: () => false }) };
  const keys = new Set(), tapped = new Set();
  const sandbox = vm.createContext({
    window: { addEventListener(name, handler) { handlers[name] = handler; } }, canvas, document, state,
    keys, tapped, pointer: {}, togglePause(value) { state.paused = value ?? !state.paused; }, startGame() { state.running = true; state.paused = false; },
    pauseButton: { focus() { document.activeElement = this; } }, startButton: { focus() {} },
  });
  vm.runInContext(section(gamesSource, "const GAME_KEYS", "// Focus follows"), sandbox);
  const event = () => ({ code: "ArrowLeft", preventDefault() { this.prevented = true; } });
  let key = event(); handlers.keydown(key);
  assert.equal(key.prevented, undefined); assert.equal(keys.size, 0);
  document.activeElement = canvas; key = event(); handlers.keydown(key);
  assert.equal(key.prevented, true); assert.equal(keys.has("ArrowLeft"), true);
  handlers.keyup(key); assert.equal(keys.size, 0);
  state.paused = true; key = event(); handlers.keydown(key);
  assert.equal(key.prevented, undefined);
  handlers.keydown({ code: "Escape" });
  assert.notEqual(document.activeElement, canvas);
});
