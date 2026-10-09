import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-policies/policies-history/index.html', root), 'utf8').replace(/\r\n/g, '\n');
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
  ${['normalize', 'entryTimestamp', 'dayKey', 'validateHistory', 'periodCutoff', 'filterEntries', 'formatValue', 'summarizeChange', 'buildExport'].map(declaration).join('\n')}
  ({ validateHistory, dayKey, filterEntries, formatValue, summarizeChange, buildExport });
`);
const fixture = (overrides = {}) => ({ kind: 'policy', change: 'modified', name: 'fixture-id', displayName: 'Fixture policy', category: 'Security', detectedAt: '2026-10-06T10:00:00Z', fields: [{ field: 'version', from: '1.0', to: '1.1' }], ...overrides });
const filters = { search: '', change: '', category: '', days: null };
const now = Date.parse('2026-10-06T17:00:00Z');

test('the actual retained log validates and is scoped to policies', () => {
  assert.equal(helpers.validateHistory(payload).length, payload.entries.filter(entry => entry.kind === 'policy').length);
  assert.equal(helpers.validateHistory({ entries: [fixture(), fixture({ kind: 'initiative' })] }).length, 1);
  assert.throws(() => helpers.validateHistory({}));
  assert.throws(() => helpers.validateHistory({ entries: [fixture({ change: 'unknown' })] }));
  assert.throws(() => helpers.validateHistory({ entries: [fixture({ fields: [{}] })] }));
});

test('events are sorted by actual timestamps and grouped in UTC, with undated events last', () => {
  const entries = [fixture({ name: 'undated', detectedAt: 'invalid' }), fixture({ name: 'offset', detectedAt: '2026-10-05T23:30:00-02:00' }), fixture({ name: 'earlier', detectedAt: '2026-10-06T00:00:00Z' })];
  const sorted = helpers.validateHistory({ entries });
  assert.equal(sorted[0].name, 'offset');
  assert.equal(sorted.at(-1).name, 'undated');
  assert.equal(helpers.dayKey(sorted[0]), '2026-10-06');
  assert.equal(helpers.dayKey(sorted.at(-1)), 'undated');
});

test('periods include today and preceding UTC calendar days, not the stale scan date', () => {
  const entries = [
    fixture({ name: 'boundary', detectedAt: '2026-09-30T00:00:00Z' }),
    fixture({ name: 'old', detectedAt: '2026-09-29T23:59:59Z' }),
    fixture({ name: 'unknown', detectedAt: null }),
    fixture({ name: 'future', detectedAt: '2026-10-07T00:00:00Z' }),
  ];
  const result = helpers.filterEntries(entries, { ...filters, days: 7 }, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'boundary');
  assert.equal(helpers.filterEntries(entries, filters, now).length, 4);
});

test('search, nature and category compose without affecting the source entries', () => {
  const entries = [fixture({ name: 'ID-ONE', displayName: 'Sécurité policy' }), fixture({ name: 'two', change: 'added' })];
  assert.equal(helpers.filterEntries(entries, { ...filters, search: 'securite', category: 'Security', change: 'modified' }, now).length, 1);
  assert.equal(helpers.filterEntries(entries, { ...filters, search: 'id-one' }, now)[0].name, 'ID-ONE');
  assert.equal(entries.length, 2);
});

test('comparisons distinguish missing, empty, null, false and zero without fabricating a rule diff', () => {
  assert.equal(helpers.formatValue({}, 'from'), 'Not recorded');
  assert.equal(helpers.formatValue({ from: '' }, 'from'), '(empty string)');
  assert.equal(helpers.formatValue({ from: null }, 'from'), 'null');
  assert.equal(helpers.formatValue({ from: false }, 'from'), 'false');
  assert.equal(helpers.formatValue({ from: 0 }, 'from'), '0');
  assert.equal(helpers.formatValue({ to: '<script>test</script>' }, 'to'), '<script>test</script>');
  assert.match(helpers.summarizeChange(fixture()), /impact on rule behavior is not recorded/);
  assert.match(helpers.summarizeChange(fixture({ fields: [] })), /unavailable/);
  assert.match(helpers.summarizeChange(fixture({ fields: [{ field: 'mode' }, { field: 'effect' }] })), /Mode, Effect/);
  assert.doesNotMatch(script, /fetch\([^)]*policyrules/);
});

test('export contains every matching event, original evidence and filtering provenance', () => {
  const entries = Array.from({ length: 121 }, (_, index) => fixture({ name: String(index) }));
  const exported = helpers.buildExport(entries, { ...filters, days: 7 }, payload.generatedAt, 180, new Date(now).toISOString(), new Date(now + 100).toISOString());
  assert.equal(exported.totalMatchingEvents, 121);
  assert.equal(exported.entries, entries);
  assert.equal(exported.filters.fromInclusiveUtc, '2026-09-30T00:00:00.000Z');
  assert.equal(exported.generatedAt, payload.generatedAt);
  assert.match(exported.coverage, /no historical rule JSON/);
});

test('metadata and copy controls are inside native disclosures and labels remain textual', () => {
  assert.match(script, /document\.createElement\("details"\)/);
  assert.match(script, /details\.append\(metadata, copy\)/);
  assert.match(script, /\["from", "Before", "before"\], \["to", "After", "after"\]/);
  assert.match(script, /CHANGE_LABELS\[entry\.change\]/);
  assert.doesNotMatch(script, /innerHTML|execCommand/);
  assert.match(script, /No recorded event|no changes occurred or that the current catalogue is up to date/);
});

test('filtered counts, widening the period and full reset are explicit', () => {
  assert.match(script, /Active filters ·/);
  assert.match(script, /retained policy events in the source log/);
  assert.match(script, /matching events shown/);
  assert.match(script, /Show all retained dates/);
  assert.match(html, /id="resultCount" role="status" aria-live="polite"/);
  assert.match(html, /All retained/);
  assert.doesNotMatch(html, /<option[^>]*>Full history/);
});

test('catalogue deep links match the current definition contract and preserve removed IDs', () => {
  assert.match(script, /url\.searchParams\.set\("tab", "policies"\)/);
  assert.match(script, /url\.searchParams\.set\("definition", name\)/);
  assert.match(script, /Look up current definition/);
  assert.ok(html.indexOf('Back to the current policy catalogue') < html.indexOf('<section class="page-notes"'));
});

test('retention and collector limitations agree with the data producer', () => {
  const collector = readFileSync(new URL('azure-policies/fetch-updates.ps1', root), 'utf8');
  const workflow = readFileSync(new URL('.github/workflows/azure-policies-updates.yaml', root), 'utf8');
  assert.match(collector, /\$ChangeLogMaxEntries = 3000/);
  assert.match(collector, /\$TrackedPolicyFields = @\("displayName", "category", "effect", "mode", "version", "policyType"\)/);
  assert.match(workflow, /cron: '0 6 \* \* \*'/);
  assert.match(html, /shared limit of 3,000 policy and initiative events/);
  assert.match(html, /untracked rule-only changes may not appear/);
  assert.doesNotMatch(html, /real edit bumps the version/);
});

test('one sticky mobile date, retry and URL restoration replace the legacy generic controller', () => {
  assert.match(html, /\.site-header \{ position: relative; \}/);
  assert.match(html, /\.timeline-heading \{ position: sticky; top: 0;/);
  assert.match(script, /restoreFilters\(\)/);
  assert.match(script, /elements\.retryHistory\.addEventListener\("click", init\)/);
  assert.match(script, /Clipboard access is unavailable/);
  assert.doesNotMatch(html, /data-url-state/);
  assert.match(html, /noscript/);
});

test('all inline scripts parse, IDs are unique and labelled controls resolve', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, id] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(id), id);
});
