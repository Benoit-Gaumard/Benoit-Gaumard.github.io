import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-regions/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const data = JSON.parse(readFileSync(new URL('azure-regions/regions.json', root), 'utf8'));
const script = html.match(/<script data-regions-script>([\s\S]*?)<\/script>/)[1];
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const validate = runInNewContext(`(${declaration('validateData')})`);
const zoneStatus = runInNewContext(`(${declaration('zoneStatus')})`);

test('source-backed data retains three zone states and separate dates', () => {
  assert.equal(data.schemaVersion, 2);
  assert.equal(data.sources.metadata.checkedAt, data.generatedAt);
  assert.ok(Number.isFinite(Date.parse(data.sources.reference.checkedAt)));
  assert.match(data.sources.reference.url, /^https:\/\/learn\.microsoft\.com\/en-us\/azure\/reliability\/regions-list$/);
  const counts = { yes: 0, no: 0, unknown: 0 };
  for (const region of validate(data).regions) counts[zoneStatus(region).key]++;
  assert.ok(counts.yes > 0);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), data.regions.length);
  for (const region of data.regions) {
    assert.ok([true, false, null].includes(region.availabilityZones));
    if (region.availabilityZones === false) assert.equal(region.availabilityZonesSource, 'microsoft-learn');
    if (region.availabilityZones === null) assert.equal(region.availabilityZonesSource, null);
    if (typeof region.restricted === 'boolean') assert.equal(region.restrictedSource, 'microsoft-learn');
  }
});

test('unproven legacy false values never become confirmed negatives', () => {
  const legacy = { ...data, schemaVersion: 1, regions: data.regions.map(region => ({ ...region, availabilityZones: false, restricted: true })) };
  const normalized = validate(legacy);
  assert.ok(normalized.regions.every(region => region.availabilityZones === null && region.restricted === null));
  const withoutEvidence = { ...data, regions: [{ ...data.regions[0], availabilityZones: false, availabilityZonesSource: 'arm' }] };
  assert.equal(validate(withoutEvidence).regions[0].availabilityZones, null);
});

test('invalid coordinates do not remove a region from the directory', () => {
  const normalized = validate({ ...data, regions: [{ ...data.regions[0], latitude: 95, longitude: null }, { ...data.regions[1], latitude: 0, longitude: 0 }] });
  assert.equal(normalized.regions.length, 2);
  assert.equal(normalized.regions[0].latitude, null);
  assert.equal(normalized.regions[1].latitude, 0);
  assert.throws(() => validate({ ...data, regions: [data.regions[0], data.regions[0]] }));
  assert.throws(() => validate({ ...data, regions: [{ ...data.regions[0], regionType: 'Logical' }] }));
});

test('directory precedes map and collapsed statistics in the DOM', () => {
  const ids = ['searchInput', 'zoneFilter', 'regionCards', 'mapPanel', 'statsSection', 'dataSources'];
  const offsets = ids.map(id => html.indexOf(`id="${id}"`));
  assert.ok(offsets.every(offset => offset >= 0));
  assert.deepEqual(offsets, [...offsets].sort((a, b) => a - b));
  assert.match(html, /<details class="map-section" id="mapPanel">/);
  assert.match(html, /<details class="statistics" id="statsSection">/);
  assert.doesNotMatch(html, /Total regions|Standalone|No availability zones/);
});

test('tri-state filters retain visible programmatic names without a copy control', () => {
  for (const value of ['yes', 'no', 'unknown']) assert.ok(html.includes(`<option value="${value}">`));
  assert.match(html, /id="resultsCount" role="status" aria-live="polite"/);
  assert.doesNotMatch(script, /Copy name|navigator\.clipboard|copy-fallback|actionStatus/);
  assert.match(script, /code\.textContent = region\.id/);
  assert.match(script, /idRow\.append\(code\)/);
  assert.match(script, /region\.name} \$\{region\.id}/);
  assert.match(script, /params\.get\("azOnlyFilter"\) === "1"/);
  assert.doesNotMatch(html, /data-url-state/);
});

test('map assets are lazy and gestures start disabled', () => {
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="https:\/\/unpkg\.com\/leaflet/);
  assert.match(script, /await loadLeaflet\(\)/);
  for (const handler of ['dragging', 'touchZoom', 'scrollWheelZoom', 'doubleClickZoom', 'boxZoom', 'keyboard']) {
    assert.ok(script.includes(`${handler}: false`), handler);
  }
  assert.match(script, /elements\.regionMap\.inert = !enabled/);
  assert.match(script, /event\.key === "Escape"/);
  assert.match(script, /setMapInteraction\(false\)/);
});

test('the collector reads root mappings without coercing missing data', () => {
  const helper = readFileSync(new URL('azure-regions/region-data.ps1', root), 'utf8');
  const collector = readFileSync(new URL('azure-regions/fetch-updates.ps1', root), 'utf8');
  assert.match(helper, /\$Location\.availabilityZoneMappings/);
  assert.doesNotMatch(collector, /\$metadata\.availabilityZoneMappings|\[bool\]\$hasZones/);
  assert.doesNotMatch(collector, /restricted\s*=\s*\$metadata\.regionCategory/);
  assert.match(collector, /Get-RegionEvidence/);
  assert.match(collector, /Write-Warning "Microsoft Learn region evidence is unavailable/);
});

test('inline scripts and JSON parse and element IDs are unique', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'azure-regions/index.html' });
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
