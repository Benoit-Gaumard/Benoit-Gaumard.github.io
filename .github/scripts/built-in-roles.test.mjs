import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-built-in-roles/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const script = html.match(/<script data-roles-script>([\s\S]*?)<\/script>/)[1];
const raw = JSON.parse(readFileSync(new URL('azure-built-in-roles/roles.json', root), 'utf8'));
const original = JSON.stringify(raw);
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${script.match(/const BUCKETS = \[[\s\S]*?\n    \];/)[0]}
  ${['normalize', 'providerKey', 'roleKey', 'providerOptions', 'prepareRoles', 'datasetTotals', 'filterRoles', 'sortRoles', 'comparePatterns'].map(declaration).join('\n')}
  ({ providerOptions, prepareRoles, datasetTotals, filterRoles, sortRoles, comparePatterns });
`, { URL });
const roles = helpers.prepareRoles(raw);
const criteria = { search: '', category: '', provider: '', actionType: '', privilegedOnly: false };
const byName = name => roles.find(role => role.roleName === name);

test('all stored roles validate without rewriting IDs, permissions or descriptions', () => {
  assert.equal(roles.length, raw.roles.length);
  assert.equal(JSON.stringify(raw), original);
  assert.equal(byName('Owner').id, '8e3af657-a8ff-443c-a75c-2fe8c4bcb635');
  assert.deepEqual(byName('Contributor').notActions, raw.roles.find(role => role.roleName === 'Contributor').notActions);
});

test('whole-catalogue totals count category membership and source-flagged privileged roles', () => {
  const totals = helpers.datasetTotals(roles);
  assert.deepEqual({ ...totals }, {
    roles: raw.roles.length,
    categories: new Set(raw.roles.flatMap(role => role.categories)).size,
    privileged: raw.roles.filter(role => role.isPrivileged).length,
    providers: new Set(raw.roles.flatMap(role => role.providers).map(provider => provider.trim().toLowerCase())).size,
  });
  const fixture = helpers.datasetTotals([
    { categories: ['A', 'B'], providers: ['Microsoft.Storage'], isPrivileged: true },
    { categories: ['B', 'C'], providers: ['microsoft.storage', 'Microsoft.Compute'], isPrivileged: false },
  ]);
  assert.deepEqual({ ...fixture }, { roles: 2, categories: 3, privileged: 1, providers: 2 });
  assert.deepEqual({ ...helpers.datasetTotals([]) }, { roles: 0, categories: 0, privileged: 0, providers: 0 });
  assert.equal(JSON.stringify(raw), original);
});

test('counter rendering distinguishes loading, failure, ready and valid empty data', () => {
  const state = { status: 'loading', roles, filtered: [roles[0]] };
  const values = ['roles', 'categories', 'privileged', 'providers'].map(stat => ({ dataset: { stat } }));
  const el = {
    statsGrid: { querySelectorAll: () => values, setAttribute(name, value) { this[name] = value; } },
    datasetSummary: { textContent: '' },
  };
  const render = runInNewContext(`(${declaration('renderStats')})`, { state, el, datasetTotals: helpers.datasetTotals });
  for (const status of ['loading', 'fetching', 'error']) {
    state.status = status;
    render();
    assert.deepEqual(values.map(value => value.textContent), ['—', '—', '—', '—']);
    assert.equal(el.statsGrid['aria-busy'], String(status !== 'error'));
    assert.match(el.datasetSummary.textContent, status === 'error' ? /unavailable/ : /loading/);
  }
  state.status = 'ready';
  render();
  assert.deepEqual(values.map(value => value.textContent), Object.values(helpers.datasetTotals(roles)).map(value => value.toLocaleString('en-US')));
  assert.match(el.datasetSummary.textContent, /independent of filters/);
  assert.equal(el.statsGrid['aria-busy'], 'false');
  state.roles = [];
  render();
  assert.deepEqual(values.map(value => value.textContent), ['0', '0', '0', '0']);
  assert.match(script, /state\.status = "fetching";[\s\S]*?renderStats\(\)/);
  assert.match(script, /finally \{\s*clearTimeout\(timeout\);\s*renderStats\(\)/);
});

test('provider options merge case variants while original spellings remain available', () => {
  const options = helpers.providerOptions(roles);
  assert.equal(options.filter(option => option.key === 'microsoft.insights').length, 1);
  assert.equal(options.find(option => option.key === 'microsoft.insights').label, 'Microsoft.Insights');
  assert.equal(new Set(options.map(option => option.key)).size, options.length);
  const expected = raw.roles.filter(role => role.providers.some(provider => provider.toLowerCase() === 'microsoft.insights')).length;
  for (const provider of ['Microsoft.Insights', 'microsoft.insights', 'MICROSOFT.INSIGHTS']) assert.equal(helpers.filterRoles(roles, { ...criteria, provider }).length, expected);
  assert.equal(JSON.stringify(raw), original);
});

test('search includes IDs, exclusions and per-operation descriptions; filters compose', () => {
  assert.equal(helpers.filterRoles(roles, { ...criteria, search: byName('Reader').id }).length, 1);
  assert.ok(helpers.filterRoles(roles, { ...criteria, search: 'Microsoft.Authorization/elevateAccess/Action' }).some(role => role.roleName === 'Contributor'));
  const selected = helpers.filterRoles(roles, { ...criteria, category: 'Storage', provider: 'MICROSOFT.STORAGE', actionType: 'dataActions' });
  assert.ok(selected.some(role => role.roleName === 'Storage Blob Data Reader'));
  assert.ok(selected.every(role => role.categories.includes('Storage') && role.dataActions.length));
  assert.equal(helpers.filterRoles([byName('Owner')], { ...criteria, provider: 'Microsoft.Storage' }).length, 0, 'Explicit-provider filter does not evaluate wildcards');
  assert.ok(helpers.filterRoles(roles, { ...criteria, privilegedOnly: true }).every(role => role.isPrivileged));
});

test('sorting preserves alphabetical, numeric and ID ordering', () => {
  assert.equal(helpers.sortRoles(roles, 'nActions', 'desc')[0].nActions, Math.max(...roles.map(role => role.nActions)));
  const ids = helpers.sortRoles(roles, 'id', 'asc').map(role => role.id);
  assert.equal(ids[0], [...ids].sort()[0]);
});

test('comparison treats wildcard strings as declarations, not expanded permissions', () => {
  const comparison = helpers.comparePatterns(byName('Owner').actions, byName('Reader').actions);
  assert.equal(comparison.shared.length, 0);
  assert.equal(comparison.leftOnly[0].left[0][0], '*');
  assert.equal(comparison.rightOnly[0].right[0][0], '*/read');
  const exclusions = helpers.comparePatterns(byName('Owner').notActions, byName('Contributor').notActions);
  assert.equal(exclusions.leftOnly.length, 0);
  assert.equal(exclusions.rightOnly.length, new Set(byName('Contributor').notActions.map(pair => pair[0].toLowerCase())).size);
});

test('comparison deduplicates case-insensitive text while retaining all source evidence', () => {
  const left = [['Microsoft.Example/READ', 'Left description'], ['microsoft.example/read', 'Another recorded description']];
  const right = [['MICROSOFT.EXAMPLE/read', 'Right description']];
  const comparison = helpers.comparePatterns(left, right);
  assert.equal(comparison.shared.length, 1);
  assert.equal(comparison.leftOnly.length, 0);
  assert.equal(comparison.rightOnly.length, 0);
  assert.equal(JSON.stringify(comparison.shared[0].left), JSON.stringify(left));
  assert.equal(JSON.stringify(comparison.shared[0].right), JSON.stringify(right));
  assert.equal(comparison.shared[0].left[0], left[0]);
});

test('invalid or incomplete snapshots fail rather than showing missing groups as zero', () => {
  assert.throws(() => helpers.prepareRoles({}));
  assert.throws(() => helpers.prepareRoles({ roles: [raw.roles[0], raw.roles[0]] }));
  assert.throws(() => helpers.prepareRoles({ roles: [{ ...raw.roles[0], notActions: undefined }] }));
  assert.throws(() => helpers.prepareRoles({ roles: [{ ...raw.roles[0], docUrl: 'javascript:alert(1)' }] }));
  assert.throws(() => helpers.prepareRoles({ roles: [{ ...raw.roles[0], actions: [['action']] }] }));
});

test('expansion and sorting use native buttons rather than clickable table rows', () => {
  assert.match(script, /const row = node\("tr", undefined, "role-entry role-row"\)/);
  assert.match(script, /toggle\.setAttribute\("aria-controls"/);
  assert.match(script, /const sort = button\(label, \(\) => setSort\(key\)\)/);
  assert.doesNotMatch(script, /setAttribute\("role", "button"\)|row\.tabIndex|row\.addEventListener\("click"/);
});

test('role definition IDs are visible in the sortable table and the compact cards', () => {
  const table = declaration('roleTable');
  assert.match(table, /\["roleName", "Role"\], \["id", "Role Definition Id"\], \["category", "Category"\]/);
  assert.match(table, /identifier\.append\(technical\(role\.id, "Role Definition Id", "definition-id"\)\)/);
  assert.match(table, /row\.append\(name, identifier, node\("td", role\.categories\.join/);
  assert.match(table, /cell\.colSpan = headerRow\.children\.length/);
  assert.doesNotMatch(table, /colSpan = 7/);
  const card = declaration('roleCard');
  assert.match(card, /technical\(role\.id, "Role Definition Id", "definition-id"\)/);
  assert.match(card, /identifier\.append\(node\("dt", "Role Definition Id"\), value\)/);
  assert.match(card, /card\.append\(roleSummary\(role, true\), identifier, selection\(role\)\)/);
  assert.match(script, /id: "Role Definition Id"/);
});

test('permission columns show only their sortable titles without explanatory subtitles', () => {
  const table = declaration('roleTable');
  assert.match(table, /BUCKETS\.map\(bucket => \[bucket\.count, bucket\.title\]\)/);
  assert.doesNotMatch(table, /bucket\.hint|link\.href|cell\.append\(node\("span"/);
  assert.doesNotMatch(script, /hint: "(?:Allowed management patterns|Management exclusions|Allowed data patterns|Data exclusions)"/);
  assert.match(table, /comparisonHeader\.append\(node\("span", "Select up to two roles\.", "header-help"\)\)/);
});

test('mobile entries, primary detail actions and collapsed empty permission groups are explicit', () => {
  assert.match(script, /roles\.map|shown\.map\(roleCard\)/);
  assert.match(script, /actions\.append\(copyId, learn, copyName, link\)/);
  assert.match(script, /role\[bucket\.key\]\.length > 0/);
  assert.match(script, /No \$\{bucket\.title\} entries are recorded/);
  assert.match(html, /Conditions and permission-block boundaries are not present/);
  assert.match(html, /not a deny rule across other assignments/);
  assert.doesNotMatch(html, /cannot read your data, however broad/);
});

test('comparison, exact role links, legacy filters and missing-role recovery share one controller', () => {
  for (const key of ['role', 'compare', 'comparison', 'categoryFilter', 'providerFilter', 'actionTypeFilter', 'privilegedOnlyFilter']) assert.ok(script.includes(`"${key}"`));
  assert.match(script, /state\.selected\.length >= 2/);
  assert.match(script, /currentUrl\(role\.id, false\)/);
  assert.match(script, /The linked role was not found/);
  assert.match(script, /not included in the displayed count/);
  assert.doesNotMatch(html, /data-url-state|execCommand/);
});

test('four counter cards precede search and preserve contextual help destinations', () => {
  const stats = html.split('<section class="dataset-stats"')[1].split('</section>')[0];
  assert.deepEqual([...stats.matchAll(/<div class="stat-label">([^<]+)<\/div>/g)].map(match => match[1]), ['Built-in roles', 'Categories', 'Privileged roles', 'Providers']);
  assert.equal([...stats.matchAll(/class="stat-card"/g)].length, 4);
  assert.equal([...html.matchAll(/id="datasetSummary"/g)].length, 1);
  assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="search"'));
  assert.match(stats, /id="datasetSummary" role="status" aria-live="polite"/);
  assert.match(stats, /id="statsGrid" aria-busy="true"/);
  for (const key of ['actions', 'notActions', 'dataActions', 'notDataActions']) assert.ok(html.includes(`id="${key}-help"`));
  assert.match(html, /Counts on this page are recorded entries/);
  assert.match(html, /explicit provider names/);
});

test('all inline scripts parse and static IDs and labelled controls resolve', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
