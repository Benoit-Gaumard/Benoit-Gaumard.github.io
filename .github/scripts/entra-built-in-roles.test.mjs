import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('entra-built-in-roles/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const script = html.match(/<script data-entra-roles-script>([\s\S]*?)<\/script>/)[1];
const payload = JSON.parse(readFileSync(new URL('entra-built-in-roles/roles.json', root), 'utf8'));
const original = JSON.stringify(payload);
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${['normalize', 'roleKey', 'actionService', 'groupActions', 'prepareRoles', 'datasetTotals', 'filterRoles', 'sortRoles'].map(declaration).join('\n')}
  ({ groupActions, prepareRoles, datasetTotals, filterRoles, sortRoles });
`, { URL });
const roles = helpers.prepareRoles(payload);
const globalAdmin = roles.find(role => role.displayName === 'Global Administrator');
const criteria = { search: '', service: '', privilegedOnly: false };

test('actual directory roles validate without rewriting template IDs, actions or descriptions', () => {
  assert.equal(roles.length, payload.roles.length);
  assert.equal(globalAdmin.templateId, '62e90394-69f5-4237-9190-012177145e10');
  assert.equal(JSON.stringify(payload), original);
  assert.equal(globalAdmin.permissions, payload.roles.find(role => role.templateId === globalAdmin.templateId).permissions);
});

test('four whole-catalogue cards precede search and distinguish permission entries from distinct actions', () => {
  const stats = html.split('<section class="dataset-stats"')[1].split('</section>')[0];
  assert.deepEqual([...stats.matchAll(/<div class="stat-label">([^<]+)<\/div>/g)].map(match => match[1]), ['Built-in roles', 'Permissions', 'Services', 'Privileged roles']);
  assert.equal([...stats.matchAll(/class="stat-card"/g)].length, 4);
  assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="search"'));
  assert.equal([...html.matchAll(/id="datasetSummary"/g)].length, 1);
  assert.match(stats, /id="datasetSummary" role="status" aria-live="polite"/);
  assert.match(stats, /id="distinctPermissions"/);
  const totals = helpers.datasetTotals(roles);
  const actions = payload.roles.flatMap(role => role.permissions.map(pair => pair[0].toLowerCase()));
  assert.deepEqual({ ...totals }, {
    roles: payload.roles.length, permissions: actions.length, distinctPermissions: new Set(actions).size,
    services: new Set(payload.roles.flatMap(role => role.services.map(service => service.toLowerCase()))).size,
    privileged: payload.roles.filter(role => role.isPrivileged).length,
  });
  const fixture = helpers.prepareRoles({ roles: [
    { ...payload.roles[0], templateId: 'fixture-a', permissions: [['Microsoft.Example/read', 'Read']], services: ['Microsoft.Example'], isPrivileged: true },
    { ...payload.roles[0], templateId: 'fixture-b', permissions: [['microsoft.example/read', 'Other description'], ['microsoft.example/write', 'Write']], services: ['microsoft.example'], isPrivileged: false },
  ] });
  assert.deepEqual({ ...helpers.datasetTotals(fixture) }, { roles: 2, permissions: 3, distinctPermissions: 2, services: 1, privileged: 1 });
  assert.equal(JSON.stringify(payload), original);
});

test('counter and privilege-filter states agree during loading, failure, recovery and empty data', () => {
  const state = { status: 'loading', roles, filtered: [globalAdmin] };
  const values = ['roles', 'permissions', 'services', 'privileged'].map(stat => ({ dataset: { stat } }));
  const el = {
    statsGrid: { querySelectorAll: () => values, setAttribute(name, value) { this[name] = value; } },
    datasetSummary: {}, distinctPermissions: {}, privilegedCount: {},
  };
  const render = runInNewContext(`(${declaration('renderStats')})`, { state, el, datasetTotals: helpers.datasetTotals });
  for (const status of ['loading', 'fetching', 'error']) {
    state.status = status;
    render();
    assert.deepEqual(values.map(value => value.textContent), ['—', '—', '—', '—']);
    assert.equal(el.statsGrid['aria-busy'], String(status !== 'error'));
    assert.match(el.distinctPermissions.textContent, status === 'error' ? /unavailable/ : /loading/);
    assert.match(el.privilegedCount.textContent, status === 'error' ? /unavailable/ : /loading/);
  }
  state.status = 'ready';
  render();
  const totals = helpers.datasetTotals(roles);
  assert.deepEqual(values.map(value => value.textContent), [totals.roles, totals.permissions, totals.services, totals.privileged].map(value => value.toLocaleString('en-US')));
  assert.equal(el.distinctPermissions.textContent, `${totals.distinctPermissions.toLocaleString('en-US')} distinct actions`);
  assert.equal(el.privilegedCount.textContent, `(${totals.privileged} total)`);
  assert.match(el.datasetSummary.textContent, /independent of filters/);
  state.roles = [];
  render();
  assert.deepEqual(values.map(value => value.textContent), ['0', '0', '0', '0']);
  assert.equal(el.distinctPermissions.textContent, '0 distinct actions');
  assert.match(script, /finally \{\s*clearTimeout\(timeout\);\s*renderStats\(\)/);
});

test('service groups preserve every action and prioritize the largest groups', () => {
  for (const role of roles) {
    const groups = helpers.groupActions(role.permissions);
    assert.equal(groups.reduce((sum, group) => sum + group.total, 0), role.permissions.length);
    assert.equal(new Set(groups.flatMap(group => group.matches.map(entry => entry.index))).size, role.permissions.length);
  }
  const groups = helpers.groupActions(globalAdmin.permissions);
  assert.equal(groups.length, 55);
  assert.equal(groups[0].key, 'microsoft.directory');
  assert.equal(groups[0].total, 187);
});

test('in-role search covers all batches and descriptions without filtering other roles', () => {
  const last = globalAdmin.permissions.at(-1);
  const groups = helpers.groupActions(globalAdmin.permissions, last[0]);
  assert.ok(groups.some(group => group.matches.some(entry => entry.pair === last)));
  const description = globalAdmin.permissions.find(pair => pair[1].includes('Agent Registry'));
  assert.ok(helpers.groupActions(globalAdmin.permissions, 'Agent Registry').some(group => group.matches.some(entry => entry.pair === description)));
  assert.equal(helpers.groupActions(globalAdmin.permissions, 'no-such-recorded-action-xyz').length, 0);
  assert.equal(JSON.stringify(payload), original);
});

test('grouping merges service casing without deduplicating or altering source entries', () => {
  const pairs = [['Microsoft.Example/items/read', 'One'], ['microsoft.example/items/read', 'Two'], ['unclassified-action', 'Other']];
  const groups = helpers.groupActions(pairs);
  assert.equal(groups[0].total, 2);
  assert.equal(groups[0].matches[0].pair[0], 'Microsoft.Example/items/read');
  assert.equal(groups[0].matches[1].pair[1], 'Two');
  assert.equal(groups[1].label, 'Unclassified actions');
  assert.equal(groups[1].total, 1);
});

test('catalogue filters combine name, template ID, descriptions, services and source privilege flags', () => {
  assert.equal(helpers.filterRoles(roles, { ...criteria, search: globalAdmin.templateId }).length, 1);
  const expected = roles.filter(role => role.isPrivileged).length;
  assert.equal(helpers.filterRoles(roles, { ...criteria, privilegedOnly: true }).length, expected);
  const filtered = helpers.filterRoles(roles, { ...criteria, service: 'MICROSOFT.DIRECTORY', privilegedOnly: true });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(role => role.isPrivileged && role.serviceKeys.has('microsoft.directory')));
});

test('numeric and privileged sorting retain the real counts', () => {
  assert.equal(helpers.sortRoles(roles, 'permissionCount', 'desc')[0].templateId, globalAdmin.templateId);
  assert.equal(helpers.sortRoles(roles, 'isPrivileged', 'desc')[0].isPrivileged, true);
});

test('missing action data is not silently converted into no permissions', () => {
  assert.throws(() => helpers.prepareRoles({}));
  assert.throws(() => helpers.prepareRoles({ roles: [{ ...payload.roles[0], permissions: null }] }));
  assert.throws(() => helpers.prepareRoles({ roles: [{ ...payload.roles[0], isPrivileged: null }] }));
  assert.throws(() => helpers.prepareRoles({ roles: [payload.roles[0], payload.roles[0]] }));
  assert.throws(() => helpers.prepareRoles({ roles: [{ ...payload.roles[0], docUrl: 'javascript:alert(1)' }] }));
  assert.match(script, /This does not mean the role has no permissions/);
});

test('copying explicitly identifies a template, not a tenant directoryRole object', () => {
  assert.match(script, /copy\(role\.templateId, copyTemplate, "Built-in template ID"\)/);
  assert.match(script, /copyTemplate\.setAttribute\("aria-describedby", explanation\.id\)/);
  assert.match(script, /not an activated directoryRole\.id/);
  assert.match(html, /does not retrieve tenant-specific object IDs/);
  assert.doesNotMatch(html, /role definition ID that is only stable within one tenant/);
});

test('progressive limits and per-role state bound the initial detail instead of exposing every action', () => {
  assert.match(script, /const SERVICE_BATCH = 8/);
  assert.match(script, /const ACTION_BATCH = 20/);
  assert.match(script, /all\.slice\(0, info\.visibleServices\)/);
  assert.match(script, /group\.matches\.slice\(0, limit\)/);
  assert.match(script, /openServices: new Set\(\)/);
  assert.match(script, /if \(details\.open && !built\) fill\(\)/);
  assert.match(script, /input\.addEventListener\("input", updateQuery\)/);
});

test('native buttons, responsive role articles and missing-role recovery preserve semantics', () => {
  assert.doesNotMatch(script, /setAttribute\("role", "button"\)|entry\.tabIndex|row\.addEventListener\("click"/);
  assert.match(script, /node\("article", undefined, "directory-entry directory-card"\)/);
  assert.match(script, /toggle\.setAttribute\("aria-controls"/);
  assert.match(script, /not included in the displayed count/);
  assert.match(script, /The linked template ID was not found/);
});

test('role and action-search deep links use explicit state rather than the generic URL script', () => {
  assert.match(script, /url\.searchParams\.set\("role", id\)/);
  assert.match(script, /url\.searchParams\.set\("actionSearch", query\)/);
  assert.match(script, /info\.query = params\.get\("actionSearch"\)/);
  assert.doesNotMatch(html, /data-url-state|execCommand/);
  assert.match(html, /href="\/graph-permissions\/"/);
});

test('inline scripts parse, IDs are unique and static labels resolve', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
