import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-policy-aliases/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const payload = JSON.parse(readFileSync(new URL('azure-policy-aliases/policy-aliases.json', root), 'utf8'));
const script = html.match(/<script data-aliases-script>([\s\S]*?)<\/script>/)[1];
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${['normalize', 'prepareCatalogue', 'resolveResourceType', 'filterRows', 'sortRows'].map(declaration).join('\n')}
  ({ prepareCatalogue, resolveResourceType, filterRows, sortRows });
`);
const catalogue = helpers.prepareCatalogue(payload);
const fixture = helpers.prepareCatalogue({ resources: [
  { provider: 'Microsoft.One', resourceType: 'Microsoft.One/accounts', aliases: [['properties.items[*].id', 'Microsoft.One/accounts/items[*].id'], [null, 'Microsoft.One/accounts/missingPath']] },
  { provider: 'Microsoft.One', resourceType: 'Microsoft.One/accounts/children', aliases: [['properties.name', 'Microsoft.One/accounts/children/name']] },
  { provider: 'Microsoft.Two', resourceType: 'Microsoft.Two/accounts', aliases: [['properties.name', 'Microsoft.Two/accounts/name']] },
] });

test('all collected aliases and exact source strings remain intact', () => {
  assert.equal(catalogue.resources.length, payload.resources.length);
  assert.equal(catalogue.rows.length, payload.resources.reduce((sum, resource) => sum + resource.aliases.length, 0));
  assert.equal(new Set(catalogue.rows.map(row => row.id)).size, catalogue.rows.length);
  assert.equal(catalogue.rows[0].alias, payload.resources[0].aliases[0][1]);
  assert.equal(catalogue.rows[0].defaultPath, payload.resources[0].aliases[0][0]);
});

test('three visible counter cards use full-catalogue totals and explicit loading/error states', () => {
  const stats = html.split('<section class="dataset-stats"')[1].split('</section>')[0];
  assert.deepEqual([...stats.matchAll(/<div class="stat-label">([^<]+)<\/div>/g)].map(match => match[1]), ['Aliases', 'Types', 'Providers']);
  assert.equal([...stats.matchAll(/class="stat-card"/g)].length, 3);
  assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="search"'));
  const render = declaration('renderStats');
  assert.match(render, /state\.rows\.length, state\.resources\.length, new Set\(state\.resources\.map\(resource => resource\.provider\)\)\.size/);
  assert.match(render, /independent of the current filters/);
  for (const status of ['loading', 'ready', 'error']) assert.ok(script.includes(`renderStats("${status}")`));
});

test('provider and type form a strict hierarchy with searchable short or full names', () => {
  assert.equal(helpers.resolveResourceType(fixture.resources, 'Microsoft.One', 'ACCOUNTS'), 'Microsoft.One/accounts');
  assert.equal(helpers.resolveResourceType(fixture.resources, 'Microsoft.One', 'accounts/children'), 'Microsoft.One/accounts/children');
  assert.equal(helpers.resolveResourceType(fixture.resources, 'Microsoft.One', 'Microsoft.One/accounts'), 'Microsoft.One/accounts');
  assert.equal(helpers.resolveResourceType(fixture.resources, 'Microsoft.Two', 'Microsoft.One/accounts'), null);
  assert.equal(helpers.resolveResourceType(fixture.resources, '', 'accounts'), null);
  assert.equal(helpers.resolveResourceType(fixture.resources, 'Microsoft.One', ''), '');
});

test('search composes with provider and exact type without broadening invalid input', () => {
  assert.equal(helpers.filterRows(fixture.rows, '[*]', '', '').length, 1);
  assert.equal(helpers.filterRows(fixture.rows, 'NAME', 'Microsoft.One', '').length, 1);
  assert.equal(helpers.filterRows(fixture.rows, '', 'Microsoft.One', 'Microsoft.One/accounts').length, 2);
  assert.equal(helpers.filterRows(fixture.rows, '', 'Microsoft.One', null).length, 0);
  assert.equal(helpers.filterRows(fixture.rows, '', 'Missing.Provider', '').length, 0);
});

test('all previous sort keys remain available with deterministic order', () => {
  for (const key of ['alias', 'resourceType', 'defaultPath']) {
    const ascending = helpers.sortRows(fixture.rows, key, 'asc');
    const descending = helpers.sortRows(fixture.rows, key, 'desc');
    assert.deepEqual(Array.from(ascending, row => row.id), Array.from(descending, row => row.id).reverse());
  }
});

test('missing paths are explicit but malformed aliases and type/provider mismatches fail', () => {
  assert.equal(fixture.rows[1].defaultPath, '');
  assert.throws(() => helpers.prepareCatalogue({ resources: [{ resourceType: 'Microsoft.One/accounts', aliases: [[123, 'alias']] }] }));
  assert.throws(() => helpers.prepareCatalogue({ resources: [{ provider: 'Microsoft.Two', resourceType: 'Microsoft.One/accounts', aliases: [] }] }));
  assert.throws(() => helpers.prepareCatalogue({ resources: [{ resourceType: 'no-provider', aliases: [] }] }));
  assert.equal(helpers.prepareCatalogue({ resources: [] }).rows.length, 0);
  assert.match(script, /Not provided by the source/);
});

test('sortable table keeps resource type, default path and alias in the requested order', () => {
  const headers = html.split('<thead>')[1].split('</thead>')[0];
  assert.deepEqual([...headers.matchAll(/<th scope="col" data-key="([^"]+)"/g)].map(match => match[1]), ['resourceType', 'defaultPath', 'alias']);
  assert.match(html, /<table class="aliases-table" role="table"/);
  assert.match(html, /<tbody id="aliasResults" aria-busy="true">/);
  assert.match(script, /tr\.append\(resourceCell, pathCell, aliasCell\)/);
  assert.match(script, /empty\.colSpan = 3/);
  assert.match(script, /header\.querySelector\("button"\)\.addEventListener\("click"/);
  assert.match(script, /header\.setAttribute\("aria-sort"/);
  assert.match(script, /header\.querySelector\("button"\)\.disabled = true/);
});

test('technical values stay complete and scroll locally without alias copy buttons', () => {
  assert.doesNotMatch(html, /overflow-wrap:\s*anywhere[^}]*font-family/);
  assert.match(html, /\.technical-value \{[^}]*overflow-x: auto;[^}]*white-space: nowrap;[^}]*word-break: normal;[^}]*overflow-wrap: normal;/);
  assert.match(script, /resourceCell\.append\(technicalValue\(row\.resourceType\)\)/);
  assert.match(script, /aliasCell\.append\(technicalValue\(row\.alias\)\)/);
  assert.doesNotMatch(html, /Copy alias|copy-button|alias-main|copyButton/);
  assert.match(script, /next\.querySelector\("\.alias-cell \.technical-value"\)\.focus/);
  assert.match(script, /replacement\?\.cells\[activeColumn\]\?\.querySelector/);
  assert.match(script, /code\.tabIndex = code\.scrollWidth > code\.clientWidth/);
  assert.match(script, /text\.className = "mobile-field-label"/);
});

test('default batches make the footer reachable while preserving a 100-row option', () => {
  assert.match(script, /const DEFAULT_PAGE_SIZE = 25/);
  for (const size of [25, 50, 100]) assert.ok(html.includes(`<option value="${size}">${size}</option>`));
  assert.match(script, /state\.visible \+= state\.pageSize/);
  assert.match(html, /id="resultCount" role="status" aria-live="polite" aria-atomic="true"/);
});

test('array-alias disclosure is removed from the filters without changing the reference notes', () => {
  assert.doesNotMatch(html, /alias-help|What does \[\*\] mean in an alias\?/);
  assert.match(html, /id="array-aliases">Array aliases use <code>\[\*\]<\/code>/);
});

test('legacy and new filters are restored by a single URL-state controller', () => {
  assert.doesNotMatch(html, /data-url-state/);
  for (const name of ['search', 'providerFilter', 'resourceTypeFilter', 'sort', 'direction', 'pageSize', 'shown']) assert.ok(script.includes(`params.get("${name}")`));
  assert.match(script, /params\.get\("providerFilter"\) \|\| resource\?\.provider/);
  assert.match(script, /window\.addEventListener\("popstate"/);
  assert.match(script, /history\.replaceState\(history\.state, "", catalogueUrl\(\)\)/);
  assert.match(script, /window\.dispatchEvent\(new Event\("aliasstatechange"\)\)/);
});

test('search-link copy controls are removed without losing URL failure feedback', () => {
  assert.doesNotMatch(html, /Copy search link|shareSearch|copyFallback|copyValue|copyLabel|copy-fallback/);
  assert.doesNotMatch(script, /copyText|navigator\.clipboard/);
  const actionStatus = { textContent: '' };
  const warnings = [];
  runInNewContext(`(${declaration('syncUrl')})()`, {
    history: { state: null, replaceState() { throw new Error('History is unavailable'); } },
    catalogueUrl: () => 'https://benoit-gaumard.io/azure-policy-aliases/?search=network',
    elements: { actionStatus },
    console: { warn: (...args) => warnings.push(args) },
  });
  assert.equal(actionStatus.textContent, 'Filters work, but the address could not be updated.');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], 'Alias search URL could not be updated.');
});

test('network failure updates freshness, statistics and results together with retry', () => {
  assert.match(script, /elements\.refreshedAt\.textContent = "Not available"/);
  assert.match(script, /Catalogue totals: unavailable/);
  assert.match(script, /Unable to load aliases\. Retry loading the catalogue/);
  assert.match(html, /id="loadError" role="alert"/);
  assert.match(script, /if \(!response\.ok\) throw/);
  assert.doesNotMatch(script, /execCommand/);
});

test('inline scripts parse and UI targets remain unique', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'azure-policy-aliases/index.html' });
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\bfor="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
