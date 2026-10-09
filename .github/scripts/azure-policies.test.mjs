import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-policies/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const script = html.match(/<script data-policies-script>([\s\S]*?)<\/script>/)[1];
const policies = JSON.parse(readFileSync(new URL('azure-policies/policydefinitions.json', root), 'utf8'));
const initiatives = JSON.parse(readFileSync(new URL('azure-policies/policysetdefinitions.json', root), 'utf8'));
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${script.match(/const LIFECYCLE_PREFIX = [^\n]+/)[0]}
  ${script.match(/const LIFECYCLE_SUFFIX = [^\n]+/)[0]}
  ${['normalize', 'compareVersions', 'lifecycleTag', 'validateDefinitions', 'datasetTotals', 'filterDefinitions', 'sortDefinitions'].map(declaration).join('\n')}
  ({ compareVersions, lifecycleTag, validateDefinitions, datasetTotals, filterDefinitions, sortDefinitions });
`);
const baseCriteria = { query: '', filters: {}, favorites: new Set(), favoritesOnly: false, hidePreview: true, hideDeprecated: true };

test('current datasets validate without changing metadata or member references', () => {
  assert.equal(helpers.validateDefinitions(policies, 'policies'), policies.policies);
  assert.equal(helpers.validateDefinitions(initiatives, 'initiatives'), initiatives.initiatives);
  assert.throws(() => helpers.validateDefinitions({ policies: [policies.policies[0], policies.policies[0]] }, 'policies'));
  assert.throws(() => helpers.validateDefinitions({ initiatives: [{ name: 'id', displayName: 'Broken', policies: [{ id: null }] }] }, 'initiatives'));
});

test('four counter cards precede the catalogue and replace the old bottom summary', () => {
  const stats = html.split('<section class="dataset-stats"')[1].split('</section>')[0];
  assert.deepEqual([...stats.matchAll(/<div class="stat-label">([^<]+)<\/div>/g)].map(match => match[1]), ['Policies', 'Initiatives', 'Categories', 'Policy effects']);
  assert.equal([...stats.matchAll(/class="stat-card"/g)].length, 4);
  assert.equal([...html.matchAll(/id="statsSummary"/g)].length, 1);
  assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="catalogue"'));
  assert.match(stats, /id="statsSummary" role="status" aria-live="polite"/);
  assert.match(stats, /id="statsGrid" aria-busy="true"/);
  assert.match(script, /including preview and deprecated entries; unaffected by filters/);
});

test('counter totals use both complete datasets and deduplicate categories and policy effects', () => {
  const totals = helpers.datasetTotals({ status: 'ready', rows: policies.policies }, { status: 'ready', rows: initiatives.initiatives });
  assert.equal(totals.policies, policies.policies.length);
  assert.equal(totals.initiatives, initiatives.initiatives.length);
  assert.equal(totals.categories, new Set([...policies.policies, ...initiatives.initiatives].map(row => row.category).filter(Boolean)).size);
  assert.equal(totals.effects, new Set(policies.policies.map(row => row.effect).filter(Boolean)).size);
  const fixture = helpers.datasetTotals(
    { status: 'ready', rows: [{ category: 'A', effect: 'Audit' }, { category: 'B', effect: 'Audit' }, { category: '', effect: 'Deny' }] },
    { status: 'ready', rows: [{ category: 'B' }, { category: 'C' }, {}] },
  );
  assert.deepEqual({ ...fixture }, { policies: 3, initiatives: 3, categories: 3, effects: 2 });
  assert.deepEqual({ ...helpers.datasetTotals({ status: 'ready', rows: [] }, { status: 'ready', rows: [] }) }, { policies: 0, initiatives: 0, categories: 0, effects: 0 });
});

test('independent loading and failures never show zero or partial global totals', () => {
  const browsers = {
    policies: { state: { status: 'fetching', rows: policies.policies } },
    initiatives: { state: { status: 'loading', rows: [] } },
  };
  const elements = {
    statsSummary: { textContent: '' }, statsGrid: { setAttribute(name, value) { this[name] = value; } },
    statsValues: ['policies', 'initiatives', 'categories', 'effects'].map(stat => ({ dataset: { stat } })),
    refreshedAt: {}, sourceLink: {},
  };
  const update = runInNewContext(`(${declaration('updateDatasetSummary')})`, { browsers, elements, datasetTotals: helpers.datasetTotals, activeTab: 'policies' });
  const values = () => elements.statsValues.map(value => value.textContent);
  update();
  assert.deepEqual(values(), ['—', '—', '—', '—']);
  assert.equal(elements.statsGrid['aria-busy'], 'true');
  browsers.policies.state.status = 'ready';
  update();
  assert.deepEqual(values(), [policies.policies.length.toLocaleString('en-US'), '—', '—', new Set(policies.policies.map(row => row.effect).filter(Boolean)).size.toLocaleString('en-US')]);
  browsers.initiatives.state.status = 'error';
  update();
  assert.match(elements.statsSummary.textContent, /initiatives: unavailable/);
  assert.equal(elements.statsGrid['aria-busy'], 'false');
  browsers.initiatives.state = { status: 'ready', rows: initiatives.initiatives };
  browsers.policies.state.status = 'error';
  update();
  assert.deepEqual(values(), ['—', initiatives.initiatives.length.toLocaleString('en-US'), '—', '—']);
  assert.match(elements.statsSummary.textContent, /policies: unavailable/);
  browsers.policies.state.status = 'ready';
  update();
  assert.ok(values().every(value => value !== '—'));
  assert.match(elements.statsSummary.textContent, /unaffected by filters/);
});

test('default exclusions apply to lifecycle tags or version suffixes, not prose', () => {
  assert.equal(helpers.lifecycleTag({ displayName: '[Preview]: Policy' }), 'preview');
  assert.equal(helpers.lifecycleTag({ displayName: '[Deprecated]: Policy' }), 'deprecated');
  assert.equal(helpers.lifecycleTag({ displayName: '[Mission] Policy', version: '1.0.0-preview' }), 'preview');
  assert.equal(helpers.lifecycleTag({ displayName: 'Policy', description: 'mentions preview' }), '');
  const expected = policies.policies.filter(row => !['preview', 'deprecated'].includes(helpers.lifecycleTag(row)));
  assert.equal(helpers.filterDefinitions(policies.policies, baseCriteria).length, expected.length);
  assert.ok(expected.length < policies.policies.length);
});

test('query, category, effect, mode and favorites compose independently', () => {
  const sample = policies.policies.find(row => helpers.lifecycleTag(row) === '' && row.category && row.effect && row.mode);
  const criteria = { ...baseCriteria, query: sample.name, filters: { category: sample.category, effect: sample.effect, mode: sample.mode } };
  assert.equal(helpers.filterDefinitions(policies.policies, criteria)[0], sample);
  assert.equal(helpers.filterDefinitions(policies.policies, { ...criteria, favoritesOnly: true }).length, 0);
  assert.equal(helpers.filterDefinitions(policies.policies, { ...criteria, favoritesOnly: true, favorites: new Set([sample.name]) }).length, 1);
  assert.equal(helpers.filterDefinitions(policies.policies, { ...baseCriteria, hidePreview: false, hideDeprecated: false }).length, policies.policies.length);
});

test('semantic version and member-count sorting are retained', () => {
  assert.ok(helpers.compareVersions('1.10.0', '1.9.0') > 0);
  const sample = [{ name: 'a', displayName: 'A', version: '1.9.0', policyCount: 2 }, { name: 'b', displayName: 'B', version: '1.10.0', policyCount: 10 }];
  assert.equal(helpers.sortDefinitions(sample, 'version', 'desc')[0].name, 'b');
  assert.equal(helpers.sortDefinitions(sample, 'policyCount', 'asc')[0].name, 'a');
});

test('each tab owns labelled filters, options and an accessible result count', () => {
  for (const prefix of ['policies', 'initiatives']) {
    assert.match(html, new RegExp(`id="${prefix}FilterToggle"[^>]*aria-controls="${prefix}Filters"`));
    assert.match(html, new RegExp(`id="${prefix}ResultCount" role="status" aria-live="polite" aria-atomic="true"`));
    assert.match(html, new RegExp(`id="${prefix}Panel" role="tabpanel" aria-labelledby="tab`));
    assert.ok(html.includes(`id="${prefix}Options"`));
  }
  assert.match(script, /displayed \/ \$\{state\.rows\.length/);
  assert.match(script, /match the active filters/);
  assert.match(script, /filter\.label} ×/);
  assert.match(html, /aria-describedby="effectsHelp"/);
});

test('details are separate from favorites and carry metadata and copy actions', () => {
  assert.match(script, /head\.append\(heading, favoriteButton\(row\)\)/);
  assert.match(script, /detail\.hidden = !open/);
  assert.match(script, /\["ID", row\.name\], \["Version", row\.version\]/);
  assert.match(script, /action\("Copy definition link"/);
  assert.match(script, /row\.displayName.*from.*favorites|from" : "to"} favorites/);
  assert.doesNotMatch(script, /execCommand/);
});

test('deep links and both sets of filters share one state controller', () => {
  assert.doesNotMatch(html, /data-url-state/);
  assert.match(script, /params\.get\("definition"\)/);
  assert.match(script, /url\.searchParams\.set\("tab", tab\)/);
  assert.match(script, /Object\.values\(browsers\)\.forEach\(browser => browser\.writeParams/);
  assert.match(script, /outside the current filters or visible batch/);
  assert.match(script, /not included in the displayed count/);
  assert.match(script, /linked definition was not found/);
});

test('existing storage keys, lazy rules and history destinations are preserved', () => {
  for (const key of ['azurePoliciesViewMode', 'azurePoliciesFavorites', 'azureInitiativesFavorites']) assert.ok(script.includes(key));
  assert.match(script, /function loadRules\(\)/);
  assert.match(script, /Retry definition/);
  assert.match(script, /if \(restoreFocus\) copy\.focus/);
  assert.match(script, /browsers\.initiatives\.refreshMembers\(\)/);
  assert.match(html, /href="policies-history\/"/);
  assert.match(html, /href="initiatives-history\/"/);
});

test('view-link buttons are removed while definition copying and URL failure feedback remain', () => {
  assert.doesNotMatch(html, /Copy view link|policiesShare|initiativesShare|Catalogue view link/);
  assert.doesNotMatch(script, /el\.share|share: node\("Share"\)/);
  assert.match(script, /action\("Copy ID"/);
  assert.match(script, /action\("Copy definition link"/);
  assert.match(script, /copyText\(json, copy, "Definition JSON"\)/);
  const status = { textContent: '' };
  const warnings = [];
  runInNewContext(`(${declaration('syncUrl')})()`, {
    catalogueUrl: () => ({ href: 'https://benoit-gaumard.io/azure-policies/?tab=initiatives' }),
    location: { href: 'https://benoit-gaumard.io/azure-policies/' },
    history: { state: null, pushState() { throw new Error('History is unavailable'); } },
    document: { getElementById: () => status },
    console: { warn: (...args) => warnings.push(args) },
  });
  assert.equal(status.textContent, 'This view works, but the address could not be updated.');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], 'Policy view URL could not be updated.');
});

test('secondary controls live inside mobile filter panels', () => {
  for (const prefix of ['policies', 'initiatives']) {
    const panelStart = html.indexOf(`id="${prefix}Filters"`);
    const done = html.indexOf(`id="${prefix}FiltersDone"`);
    for (const suffix of ['ActiveFilters', 'Clear']) {
      const control = html.indexOf(`id="${prefix}${suffix}"`);
      assert.ok(control > panelStart && control < done, prefix + suffix);
    }
  }
});

test('one manual ad follows both result panels and is requested at most once', () => {
  assert.equal([...html.matchAll(/data-ad-slot="/g)].length, 1);
  assert.ok(html.indexOf('id="policiesAd"') > html.indexOf('id="initiativesResults"'));
  assert.match(script, /if \(adRequested \|\| browsers\[activeTab\]/);
  assert.doesNotMatch(script, /policiesAd.*(?:remove\(|replaceChildren\()/);
});

test('inline scripts parse and IDs remain unique', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'azure-policies/index.html' });
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
