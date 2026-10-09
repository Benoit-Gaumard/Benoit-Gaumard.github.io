import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-taggable-resources/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const data = JSON.parse(readFileSync(new URL('azure-taggable-resources/tag-support.json', root), 'utf8'));
const script = html.match(/<script data-taggable-script>([\s\S]*?)<\/script>/)[1];
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${['normalize', 'fullType', 'validatePayload', 'filterResources', 'sortResources'].map(declaration).join('\n')}
  ({ normalize, fullType, validatePayload, filterResources, sortResources });
`);
const fixture = [
  { provider: 'Microsoft.Example', resourceType: 'Both', supportsTags: true, costReport: true },
  { provider: 'Microsoft.Example', resourceType: 'TagsOnly/Child', supportsTags: true, costReport: false },
  { provider: 'Microsoft.Example', resourceType: 'CostsOnly', supportsTags: false, costReport: true },
  { provider: 'Microsoft.Other', resourceType: 'Neither', supportsTags: false, costReport: false },
];

test('tag acceptance and cost propagation remain independent filters', () => {
  assert.equal(helpers.filterResources(fixture, {}).length, 4);
  assert.equal(helpers.filterResources(fixture, { taggableOnly: true }).length, 2);
  const costMatches = helpers.filterResources(fixture, { costReportOnly: true });
  assert.equal(costMatches.length, 2);
  assert.ok(costMatches.some(resource => !resource.supportsTags));
  assert.equal(helpers.filterResources(fixture, { taggableOnly: true, costReportOnly: true }).length, 1);
  assert.equal(helpers.filterResources(fixture, { provider: 'Microsoft.Other', costReportOnly: true }).length, 0);
});

test('exact full-type search preserves original casing and child paths without copy controls', () => {
  const value = helpers.fullType(fixture[1]);
  assert.equal(value, 'Microsoft.Example/TagsOnly/Child');
  assert.equal(helpers.filterResources(fixture, { query: 'MICROSOFT.EXAMPLE/TAGSONLY/CHILD' })[0], fixture[1]);
  assert.doesNotMatch(script, /copyType|navigator\.clipboard|copyFallback|copyValue|copy-button|execCommand/);
  assert.match(script, /tr\.tabIndex = -1/);
  assert.match(script, /next\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /elements\.actionStatus\.textContent = "Filters work,/);
  assert.match(html, /id="actionStatus" role="status" aria-live="polite"/);
});

test('the current dataset is preserved and supports independently useful cost filtering', () => {
  assert.equal(helpers.validatePayload(data).resources.length, data.resources.length);
  const costs = helpers.filterResources(data.resources, { costReportOnly: true });
  assert.equal(costs.length, data.resources.filter(resource => resource.costReport).length);
  assert.ok(costs.some(resource => !resource.supportsTags));
  assert.ok(data.resources.some(resource => resource.supportsTags && !resource.costReport));
});

test('sorting supports all previous keys and has stable ties', () => {
  for (const key of ['provider', 'resourceType', 'supportsTags', 'costReport']) {
    const asc = helpers.sortResources(fixture, key, 'asc');
    const desc = helpers.sortResources(fixture, key, 'desc');
    assert.equal(asc.length, fixture.length);
    assert.deepEqual(Array.from(asc, helpers.fullType), Array.from(desc, helpers.fullType).reverse());
  }
  assert.equal(helpers.sortResources(fixture, 'costReport', 'desc')[0].costReport, true);
});

test('the table separates provider and resource type in the requested four-column order', () => {
  const headers = html.split('<thead>')[1].split('</thead>')[0];
  assert.deepEqual([...headers.matchAll(/<th scope="col" data-key="([^"]+)"/g)].map(match => match[1]), ['provider', 'resourceType', 'supportsTags', 'costReport']);
  assert.match(headers, />Provider <span/);
  assert.match(headers, />Resource type <span/);
  assert.match(headers, />Support tags <span/);
  assert.match(headers, />Tags in cost reports <span/);
  assert.doesNotMatch(headers, /<a\b|column-help|Accepts tags|Passes tags|tagsColumnHelp|costColumnHelp/);
  assert.match(script, /providerCode\.textContent = resource\.provider/);
  assert.match(script, /const parts = resource\.resourceType\.split\("\/"\)/);
  assert.match(script, /typeTd\.append\(typeLabel, code\)/);
  assert.match(script, /tr\.append\(providerTd, typeTd, tagsTd, costTd\)/);
  assert.match(script, /cell\.colSpan = 4/);
  assert.match(script, /const active = th\.dataset\.key === state\.sortKey;/);
  assert.doesNotMatch(html, /copy-cell|action-column/);
});

test('four visible catalogue counters precede filters and distinguish totals from results', () => {
  const positions = ['datasetStats', 'statsGrid', 'search', 'costReportOnlyFilter', 'resultCount', 'tableBody', 'loadMore'].map(id => html.indexOf(`id="${id}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(html, /<section class="dataset-stats" id="datasetStats" aria-label="Whole-catalogue statistics">/);
  assert.doesNotMatch(html, /<details class="dataset-stats"/);
  const stats = declaration('renderStats');
  assert.deepEqual([...stats.matchAll(/label: "([^"]+)"/g)].map(match => match[1]), ['Resource types', 'Providers', 'Support tags', "Don't support tags"]);
  assert.match(stats, /const resources = state\.resources/);
  assert.match(stats, /resources\.length - taggable/);
  assert.match(script, /renderStats\("Not available"\)/);
  assert.match(html, /Totals for the complete dataset, independent/);
  assert.match(html, /<label for="search">Search resource types<\/label>/);
  assert.match(html, /<label for="providerFilter">Provider<\/label>/);
});

test('both properties have accessible help and visible yes/no labels', () => {
  for (const [control, help, note] of [
    ['taggableOnlyFilter', 'tagsColumnHelp', 'tag-support-notes'],
    ['costReportOnlyFilter', 'costColumnHelp', 'cost-report-notes'],
  ]) {
    assert.match(html, new RegExp(`id="${control}" aria-describedby="${help}"`));
    assert.ok(html.includes(`id="${help}"`));
    assert.ok(html.includes(`href="#${note}"`));
    assert.ok(html.includes(`id="${note}"`));
  }
  assert.match(script, /badge\.textContent = value \? "Yes" : "No"/);
  assert.match(html, /Tag inheritance in Cost Management/);
});

test('missing flags and duplicate identifiers fail rather than becoming No', () => {
  assert.throws(() => helpers.validatePayload({ resources: [{ ...fixture[0], supportsTags: undefined }] }));
  assert.throws(() => helpers.validatePayload({ resources: [{ ...fixture[0], costReport: 'true' }] }));
  assert.throws(() => helpers.validatePayload({ resources: [fixture[0], fixture[0]] }));
  assert.equal(helpers.validatePayload({ resources: [] }).resources.length, 0);
  assert.match(script, /if \(!response\.ok\) throw/);
  assert.match(html, /id="loadError" role="alert"/);
});

test('URL state supports old filters and the new cost filter without a second controller', () => {
  for (const key of ['search', 'providerFilter', 'taggableOnlyFilter', 'costReportOnlyFilter']) assert.ok(script.includes(`params.get("${key}")`));
  assert.doesNotMatch(html, /data-url-state/);
  assert.match(script, /window\.addEventListener\("popstate"/);
  assert.match(script, /state\.visible \+= PAGE_SIZE/);
  assert.match(script, /const PAGE_SIZE = 100/);
  assert.match(html, /id="resultCount" role="status" aria-live="polite" aria-atomic="true"/);
});

test('inline JavaScript parses and labels point to unique element IDs', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'azure-taggable-resources/index.html' });
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
