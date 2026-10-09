import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-policies/initiatives-history/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const script = html.match(/<script data-history-script>([\s\S]*?)<\/script>/)[1];
const payload = JSON.parse(readFileSync(new URL('azure-policies/policy-changes.json', root), 'utf8'));
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${script.match(/const CHANGE_LABELS = [^\n]+/)[0]}
  ${script.match(/const FIELD_LABELS = [^\n]+/)[0]}
  ${['normalize', 'entryTimestamp', 'dayKey', 'memberCount', 'validateComposition', 'validateHistory', 'periodCutoff', 'filterEntries', 'formatValue', 'changeKinds', 'summarizeChange', 'buildExport'].map(declaration).join('\n')}
  ({ validateComposition, validateHistory, memberCount, changeKinds, summarizeChange, filterEntries, buildExport, dayKey });
`);
const member = (id, referenceId = id, displayName = `Recorded ${id}`) => ({ id, referenceId, displayName });
const event = (overrides = {}) => ({ kind: 'initiative', change: 'modified', name: 'fixture', displayName: 'Fixture initiative', category: 'Security', detectedAt: '2026-10-06T12:00:00Z', fields: [], ...overrides });
const compared = (added, removed, beforeCount = 20) => ({ status: 'compared', beforeCount, afterCount: beforeCount + added.length - removed.length, added, removed });

test('the real log is scoped to initiatives without treating other entries as initiative events', () => {
  assert.equal(helpers.validateHistory(payload).length, payload.entries.filter(entry => entry.kind === 'initiative').length);
  assert.equal(helpers.validateHistory({ entries: [event(), event({ kind: 'policy' })] }).length, 1);
});

test('composition at unchanged count remains a composition change, not a version or metadata claim', () => {
  const row = event({ composition: compared([member('new')], [member('old')]) });
  helpers.validateComposition(row);
  assert.equal(helpers.changeKinds(row).join(','), 'Composition');
  assert.match(helpers.summarizeChange(row), /1 added \/ 1 removed \(net 0\)/);
});

test('simultaneous additions and removals are not misrepresented as the net count', () => {
  const row = event({
    fields: [{ field: 'policyCount', from: '20', to: '29' }, { field: 'version', from: '1', to: '2' }],
    composition: compared(Array.from({ length: 10 }, (_, i) => member(`new-${i}`)), [member('old')]),
  });
  helpers.validateComposition(row);
  assert.equal(helpers.changeKinds(row).join(','), 'Composition,Version');
  assert.match(helpers.summarizeChange(row), /10 added \/ 1 removed \(net \+9\)/);
});

test('legacy count changes report only a net delta and never infer identities', () => {
  const row = event({ fields: [{ field: 'policyCount', from: '20', to: '29' }] });
  helpers.validateComposition(row);
  assert.equal(helpers.changeKinds(row).join(','), 'Count only');
  assert.match(helpers.summarizeChange(row), /Net \+9 members; exact additions and removals were not recorded/);
  assert.match(helpers.summarizeChange(event({ fields: [{ field: 'policyCount', from: '29', to: '20' }] })), /Net -9 members/);
  assert.equal(helpers.memberCount(null), null);
  assert.equal(helpers.memberCount(''), null);
  assert.equal(helpers.memberCount(false), null);
  assert.equal(helpers.memberCount('1e3'), null);
  assert.equal(helpers.memberCount('0'), 0);
  assert.doesNotMatch(helpers.summarizeChange(event({ fields: [{ field: 'policyCount', to: '29' }] })), /Net/);
});

test('unknown composition is distinct from a verified unchanged member list', () => {
  const fields = [{ field: 'version', from: '1', to: '2' }];
  const unknown = event({ fields, composition: { status: 'unavailable', reason: 'Incomplete snapshot' } });
  const known = event({ fields, composition: compared([], []) });
  helpers.validateComposition(unknown);
  helpers.validateComposition(known);
  assert.match(helpers.summarizeChange(unknown), /differences.*not recorded/);
  assert.match(helpers.summarizeChange(known), /identities are unchanged/);
  assert.equal(helpers.changeKinds(known).join(','), 'Version');
});

test('metadata, versions and composition remain independently identified', () => {
  const row = event({ fields: [{ field: 'version', from: '1', to: '2' }, { field: 'category', from: 'Old', to: 'New' }], composition: compared([member('new')], []) });
  assert.equal(helpers.changeKinds(row).join(','), 'Composition,Version,Metadata');
  assert.equal(helpers.changeKinds(event({ fields: [{ field: 'category' }] })).join(','), 'Metadata');
  assert.equal(helpers.changeKinds(event({ change: 'added' })).length, 0);
});

test('inconsistent evidence is rejected instead of displayed as a trustworthy zero or net delta', () => {
  assert.throws(() => helpers.validateComposition(event({ composition: { ...compared([], []), afterCount: 29 } })));
  assert.throws(() => helpers.validateComposition(event({ fields: [{ field: 'policyCount', from: 1, to: 2 }], composition: compared([member('new')], []) })));
  assert.throws(() => helpers.validateComposition(event({ composition: compared([member('same'), member('same')], []) })));
  assert.throws(() => helpers.validateComposition(event({ composition: compared([member('SAME')], [member('same', 'SAME')]) })));
  assert.throws(() => helpers.validateComposition(event({ composition: compared([{ id: 'id' }], []) })));
  assert.throws(() => helpers.validateHistory({ entries: [event({ composition: { status: 'assumed' } })] }));
});

test('repeated policy IDs under distinct reference IDs are valid and names may be unavailable', () => {
  const row = event({ composition: compared([member('SAME', 'ref-one', null), member('SAME', 'ref-two')], [], 0) });
  helpers.validateComposition(row);
  assert.equal(row.composition.added[0].id, 'SAME');
  assert.equal(row.composition.added[0].displayName, null);
  assert.match(script, /Policy name not recorded/);
  assert.match(script, /member\.referenceId/);
});

test('periods and detection dates use all matching events, not a fixed audit count', () => {
  const rows = [event(), event({ name: 'old', detectedAt: '2026-08-31T00:00:00Z' })];
  const filtered = helpers.filterEntries(rows, { search: '', change: '', category: '', days: 7 }, Date.parse('2026-10-06T17:00:00Z'));
  assert.equal(filtered.length, 1);
  assert.equal(helpers.dayKey(filtered[0]), '2026-10-06');
  assert.match(script, /Matching detection dates \(UTC\)/);
  assert.match(script, /state\.filtered\.map\(dayKey\)/);
  assert.match(script, /Show all retained dates/);
});

test('exports preserve names, member IDs and complete filtered evidence', () => {
  const rows = Array.from({ length: 71 }, (_, i) => event({ name: String(i), composition: compared([member('NEW', 'ref', 'Recorded old name')], []) }));
  const exported = helpers.buildExport(rows, { search: '', change: '', category: '', days: null }, payload.generatedAt, 180, '2026-10-06T17:00:00Z', '2026-10-06T17:01:00Z');
  assert.equal(exported.kind, 'initiative');
  assert.equal(exported.entries.length, 71);
  assert.equal(exported.entries[0].composition.added[0].displayName, 'Recorded old name');
  assert.equal(exported.entries[0].composition.added[0].id, 'NEW');
  assert.match(exported.coverage, /Legacy counts do not reconstruct identities/);
});

test('initiative and member links target their own catalogue tabs and technical IDs remain in details', () => {
  assert.match(script, /function catalogueUrl\(name, tab = "initiatives"\)/);
  assert.match(script, /catalogueUrl\(member\.id, "policies"\)/);
  assert.match(script, /identifiers\.append\(summary, metadata, copy\)/);
  assert.match(script, /details\.append\(metadata, copy\)/);
  assert.ok(script.indexOf('details.append(renderComposition(entry))') < script.indexOf('details.append(metadata, copy)'));
  assert.match(html, /href="\.\.\/policies-history\/"/);
  assert.match(html, /href="\.\.\/\?tab=initiatives"/);
  assert.match(html, /Renaming|renaming the reference/);
  assert.doesNotMatch(script, /innerHTML|execCommand/);
});

test('inline scripts, unique IDs and the collector check are wired for deployment', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
  const workflow = readFileSync(new URL('.github/workflows/azure-policies-updates.yaml', root), 'utf8');
  assert.ok(workflow.indexOf('initiative-history.test.ps1') < workflow.indexOf('name: Fetch latest Azure Policies'));
});
