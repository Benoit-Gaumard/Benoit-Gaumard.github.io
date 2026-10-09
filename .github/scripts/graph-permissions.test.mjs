import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('graph-permissions/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const script = html.match(/<script data-graph-permissions-script>([\s\S]*?)<\/script>/)[1];
const payload = JSON.parse(readFileSync(new URL('graph-permissions/permissions.json', root), 'utf8'));
const original = JSON.stringify(payload);
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${script.match(/const TYPES = [^\n]+/)[0]}
  ${['normalize', 'availableTypes', 'consentFlag', 'preparePermissions', 'permissionCounts', 'filterPermissions', 'sortPermissions'].map(declaration).join('\n')}
  ({ availableTypes, consentFlag, preparePermissions, permissionCounts, filterPermissions, sortPermissions });
`, { URL });
const permissions = helpers.preparePermissions(payload);
const mail = permissions.find(permission => permission.name === 'Mail.Read');
const delegatedOnly = permissions.find(permission => permission.name === 'User.Read');
const rsc = permissions.find(permission => permission.rsc);
const criteria = { search: '', type: '', resource: '', adminOnly: false };

test('real permission metadata validates without changing names, GUIDs or descriptions', () => {
  assert.equal(permissions.length, payload.permissions.length);
  assert.equal(JSON.stringify(payload), original);
  assert.equal(mail.delegated, payload.permissions.find(permission => permission.name === 'Mail.Read').delegated);
  assert.notEqual(mail.delegated.id, mail.application.id);
});

test('unique-name and overlapping-type counters are derived independently', () => {
  const counts = helpers.permissionCounts(permissions);
  assert.equal(counts.names, payload.permissions.length);
  assert.equal(counts.delegated, payload.permissions.filter(permission => permission.delegated).length);
  assert.equal(counts.application, payload.permissions.filter(permission => permission.application).length);
  assert.equal(counts.rsc, payload.permissions.filter(permission => permission.rsc).length);
  assert.equal(counts.both, payload.permissions.filter(permission => permission.delegated && permission.application).length);
  assert.equal(counts.resources, new Set(payload.permissions.map(permission => permission.resource).filter(Boolean)).size);
  assert.equal(counts.admin, payload.permissions.filter(permission => [permission.delegated, permission.application].some(variant => variant?.adminConsent === true)).length);
  assert.ok(counts.delegated + counts.application > counts.names);
  assert.match(script, /Do not add the type counts/);
});

test('six cards above search replace the old bottom totals and make their scope explicit', () => {
  const stats = html.split('<section class="dataset-stats"')[1].split('</section>')[0];
  assert.deepEqual([...stats.matchAll(/<div class="stat-label">([^<]+)<\/div>/g)].map(match => match[1]), ['Permissions', 'Delegated', 'Applications', 'Need admin consent', 'RSC', 'Resources']);
  assert.equal([...stats.matchAll(/class="stat-card"/g)].length, 6);
  assert.ok(html.indexOf('id="statsGrid"') < html.indexOf('id="typeFilter"'));
  assert.match(stats, /Unique names/);
  assert.match(stats, /At least one standard variant/);
  assert.match(stats, /id="datasetSummary" role="status" aria-live="polite"/);
  assert.equal([...html.matchAll(/id="datasetSummary"/g)].length, 1);
  assert.doesNotMatch(html, /datasetCounts|dataset-counts/);
});

test('counter states distinguish missing data from zeros and never follow the selected type', () => {
  const state = { status: 'loading', permissions, filtered: [mail] };
  const keys = ['names', 'delegated', 'application', 'admin', 'rsc', 'resources'];
  const values = keys.map(stat => ({ dataset: { stat } }));
  const el = {
    statsGrid: { querySelectorAll: () => values, setAttribute(name, value) { this[name] = value; } },
    datasetSummary: {}, overlapHelp: {},
  };
  const render = runInNewContext(`(${declaration('renderStats')})`, { state, el, permissionCounts: helpers.permissionCounts });
  for (const status of ['loading', 'fetching', 'error']) {
    state.status = status;
    render();
    assert.deepEqual(values.map(value => value.textContent), keys.map(() => '—'));
    assert.equal(el.statsGrid['aria-busy'], String(status !== 'error'));
    assert.match(el.datasetSummary.textContent, status === 'error' ? /unavailable/ : /loading/);
  }
  state.status = 'ready';
  render();
  const counts = helpers.permissionCounts(permissions);
  assert.deepEqual(values.map(value => value.textContent), keys.map(key => counts[key].toLocaleString('en-US')));
  assert.match(el.overlapHelp.textContent, new RegExp(`${counts.both} names have both`));
  assert.match(el.datasetSummary.textContent, /independent of filters/);
  state.permissions = [];
  render();
  assert.deepEqual(values.map(value => value.textContent), keys.map(() => '0'));
  assert.match(script, /finally \{\s*clearTimeout\(timeout\);\s*renderStats\(\)/);
});

test('admin counter counts a mixed name once and excludes unknown and RSC flags', () => {
  assert.equal(helpers.permissionCounts([mail]).admin, 1);
  const bothRequired = { ...mail, delegated: { ...mail.delegated, adminConsent: true } };
  assert.equal(helpers.permissionCounts([bothRequired]).admin, 1);
  const unknown = { ...delegatedOnly, delegated: { ...delegatedOnly.delegated, adminConsent: null } };
  assert.equal(helpers.permissionCounts([unknown, rsc]).admin, 0);
  assert.equal(helpers.permissionCounts([{ ...rsc, rsc: { ...rsc.rsc, adminConsent: true } }]).admin, 0);
});

test('admin consent is checked for the selected variant, not another variant of that name', () => {
  assert.equal(helpers.consentFlag(mail, 'delegated'), false);
  assert.equal(helpers.consentFlag(mail, 'application'), true);
  assert.equal(helpers.consentFlag(mail), true);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, type: 'delegated', adminOnly: true }).length, 0);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, type: 'application', adminOnly: true }).length, 1);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, adminOnly: true }).length, 1);
});

test('all actual mixed-consent variants follow the same type-scoped filtering rule', () => {
  const mixed = permissions.filter(permission => permission.delegated?.adminConsent === false && permission.application?.adminConsent === true);
  assert.ok(mixed.length > 0);
  assert.equal(helpers.filterPermissions(mixed, { ...criteria, type: 'delegated', adminOnly: true }).length, 0);
  assert.equal(helpers.filterPermissions(mixed, { ...criteria, type: 'application', adminOnly: true }).length, mixed.length);
});

test('RSC and missing consent flags are unknown, not false or standard application consent', () => {
  assert.equal(helpers.consentFlag(rsc), null);
  assert.equal(helpers.consentFlag(rsc, 'rsc'), null);
  assert.equal(helpers.filterPermissions([rsc], { ...criteria, type: 'rsc', adminOnly: true }).length, 0);
  const unknown = helpers.preparePermissions({ permissions: [{ ...delegatedOnly, delegated: { ...delegatedOnly.delegated, adminConsent: null } }] })[0];
  assert.equal(helpers.consentFlag(unknown, 'delegated'), null);
  assert.equal(helpers.filterPermissions([unknown], { ...criteria, adminOnly: true }).length, 0);
});

test('search finds both GUIDs in All types and only the chosen GUID/wording in a selected type', () => {
  assert.equal(helpers.filterPermissions([mail], { ...criteria, search: mail.application.id }).length, 1);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, search: mail.application.id, type: 'delegated' }).length, 0);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, search: mail.application.id, type: 'application' }).length, 1);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, search: 'all mailboxes', type: 'delegated' }).length, 0);
  assert.equal(helpers.filterPermissions([mail], { ...criteria, search: 'MAIL.READ', resource: 'Mail', type: 'delegated' }).length, 1);
});

test('sort supports old availability keys and the active type consent flag', () => {
  assert.equal(helpers.sortPermissions(permissions, 'hasDelegated', 'desc', '')[0].hasDelegated, 1);
  const sorted = helpers.sortPermissions(permissions, 'needsAdminConsent', 'desc', 'delegated');
  assert.equal(helpers.consentFlag(sorted[0], 'delegated'), true);
});

test('bad GUIDs, contradictory variants and non-boolean consent values fail explicitly', () => {
  assert.throws(() => helpers.preparePermissions({}));
  assert.throws(() => helpers.preparePermissions({ permissions: [payload.permissions[0], payload.permissions[0]] }));
  assert.throws(() => helpers.preparePermissions({ permissions: [{ ...mail, delegated: { ...mail.delegated, id: 'not-a-guid' } }] }));
  assert.throws(() => helpers.preparePermissions({ permissions: [{ ...mail, types: ['delegated'] }] }));
  assert.throws(() => helpers.preparePermissions({ permissions: [{ ...mail, delegated: { ...mail.delegated, adminConsent: 'No' } }] }));
  assert.throws(() => helpers.preparePermissions({ permissions: [{ ...mail, docUrl: 'javascript:alert(1)' }] }));
});

test('each GUID has a typed label and a typed copy action without generic Copy buttons', () => {
  assert.match(script, /copy: "Copy delegated ID"/);
  assert.match(script, /copy: "Copy application ID"/);
  assert.match(script, /copy: "Copy RSC ID"/);
  assert.match(script, /copy\(variant\.id, copyId, `\$\{info\.label\} ID for/);
  assert.match(script, /variant\.description \|\| "Description not recorded/);
  assert.match(script, /No other type or GUID has been substituted/);
  assert.doesNotMatch(script, /button\("Copy",|yesNo|innerHTML|execCommand/);
});

test('native table buttons and mobile cards replace row buttons and context-free Yes values', () => {
  assert.match(script, /node\("article", undefined, "permission-entry permission-card"\)/);
  assert.match(script, /toggle\.setAttribute\("aria-controls"/);
  assert.doesNotMatch(script, /setAttribute\("role", "button"\)|row\.tabIndex|row\.addEventListener\("click"/);
  assert.ok(html.indexOf('id="typeFilter"') < html.indexOf('id="search"'));
  assert.match(html, /href="\/entra-built-in-roles\/"/);
});

test('Admin consent is a sortable table column with type-labelled requirements in both layouts', () => {
  const table = declaration('permissionTable');
  assert.match(table, /\[null, "Available types"\], \["needsAdminConsent", "Admin consent"\], \["resource", "Resource"\]/);
  assert.match(table, /consent\.append\(adminConsent\(permission\)\)/);
  assert.match(table, /row\.append\(name, types, consent, node\("td", permission\.resource\)\)/);
  assert.match(table, /cell\.colSpan = headerRow\.children\.length/);
  assert.match(declaration('permissionCard'), /consent\.append\(node\("strong", "Admin consent"\), adminConsent\(permission\)\)/);
  const consent = declaration('adminConsent');
  assert.match(consent, /el\.typeFilter\.value && permission\[el\.typeFilter\.value\] \? \[el\.typeFilter\.value\] : permission\.available/);
  assert.match(consent, /consentFlag\(permission, type\)/);
  assert.match(consent, /type === "rsc" \? "Resource-specific consent"/);
  assert.match(consent, /flag === true \? "Required" : flag === false \? "Not required by source" : "Not recorded"/);
  assert.match(consent, /node\("dt", TYPE_INFO\[type\]\.label\)/);
});

test('personal-account flags are not silently lost or applied to unsupported access types', () => {
  assert.match(script, /type === "delegated" && permission\.personalAccounts/);
  assert.match(script, /permission\.personalAccounts && !permission\.delegated/);
  assert.match(script, /Account support cannot be inferred from this flag alone/);
});

test('deep links retain both permission and explicit type, including missing-type recovery', () => {
  assert.match(script, /url\.searchParams\.set\("permission", name\)/);
  assert.match(script, /url\.searchParams\.set\("variant", variant\)/);
  assert.match(script, /currentUrl\(permission\.name, type\)/);
  assert.match(script, /unavailable-variant/);
  assert.match(script, /not included in the displayed count/);
  assert.match(script, /Clear admin-consent filter/);
  assert.doesNotMatch(html, /data-url-state/);
});

test('inline scripts parse and static control labels and IDs remain valid', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
