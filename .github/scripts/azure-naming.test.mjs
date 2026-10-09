import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('azure-naming-convention/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const data = JSON.parse(readFileSync(new URL('azure-naming-convention/abbreviations.json', root), 'utf8'));
const script = html.match(/<script data-naming-script>([\s\S]*?)<\/script>/)[1];
function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  const end = script.indexOf('\n    }', start);
  assert.ok(start >= 0 && end > start, name);
  return script.slice(start, end + 6);
}
const helpers = runInNewContext(`
  ${['normalizeComponent', 'evaluateName', 'buildProposal', 'validatePayload'].map(declaration).join('\n')}
  ({ normalizeComponent, evaluateName, buildProposal, validatePayload });
`);
const defaults = { workload: 'myapp', environment: 'prod', region: 'westus2', instance: '001' };
function proposal(abbreviation, values = defaults) {
  const resource = data.resources.find(item => item.abbreviation === abbreviation);
  return helpers.buildProposal(resource, data.namingRules[resource.provider.toLowerCase()], values);
}

test('catalogue validates with source-backed complete, partial and unknown coverage', () => {
  assert.equal(helpers.validatePayload(data).resources.length, 119);
  const rules = Object.values(data.namingRules);
  assert.ok(rules.length > 0);
  assert.ok(rules.some(rule => !rule.complete));
  assert.ok(data.resources.some(resource => !data.namingRules[resource.provider.toLowerCase()]));
  assert.ok(Number.isFinite(Date.parse(data.namingRulesCheckedAt)));
  for (const [key, rule] of Object.entries(data.namingRules)) {
    assert.equal(key, key.toLowerCase());
    assert.ok(rule.source.startsWith('https://learn.microsoft.com/'));
    assert.ok(new RegExp(rule.pattern).test('abc'));
  }
});

test('all recorded maximum lengths are enforced at the exact boundary without truncation', () => {
  for (const [provider, rule] of Object.entries(data.namingRules)) {
    if (rule.maxLength === null) continue;
    const atLimit = helpers.evaluateName('a'.repeat(rule.maxLength), rule);
    assert.notEqual(atLimit.status, 'invalid', provider);
    assert.equal(helpers.evaluateName('a'.repeat(rule.maxLength + 1), rule).status, 'invalid', provider);
    if (rule.minLength > 1) {
      assert.equal(helpers.evaluateName('a'.repeat(rule.minLength - 1), rule).status, 'invalid', provider);
      assert.notEqual(helpers.evaluateName('a'.repeat(rule.minLength), rule).status, 'invalid', provider);
    }
  }
});

test('storage accounts are compact and limited to 24, registries are not truncated at 24', () => {
  assert.equal(proposal('st').name, 'stmyappprodwestus2001');
  const longStorage = proposal('st', { ...defaults, workload: 'paymentplatformproduction' });
  assert.equal(longStorage.name, 'stpaymentplatformproductionprodwestus2001');
  assert.equal(longStorage.status, 'invalid');
  assert.match(longStorage.errors.join(' '), /No characters|no characters/);
  const registry = proposal('cr', { ...defaults, workload: 'paymentplatformproduction' });
  assert.ok(registry.name.length > 24 && registry.name.length <= 50);
  assert.equal(registry.status, 'compatible');
});

test('key vaults retain hyphens but enforce their own 24-character limit', () => {
  const vault = proposal('kv', { ...defaults, workload: 'pay', region: 'eastus', instance: '1' });
  assert.equal(vault.name, 'kv-pay-prod-eastus-1');
  assert.equal(vault.status, 'compatible');
  assert.equal(proposal('kv', { ...defaults, workload: 'paymentplatformproduction' }).status, 'invalid');
});

test('normalization is returned explicitly and invalid input has no silent defaults', () => {
  const value = proposal('vm', { ...defaults, workload: ' Équipe __ DATA! ', instance: ' 02 ' });
  assert.equal(value.name, 'vm-equipe-data-prod-westus2-02');
  assert.equal(value.fields.find(field => field.key === 'workload').original, ' Équipe __ DATA! ');
  assert.equal(value.fields.find(field => field.key === 'workload').normalized, 'equipe-data');
  for (const values of [{ ...defaults, workload: '' }, { ...defaults, workload: '!!!' }, { ...defaults, instance: '' }]) {
    const result = proposal('vm', values);
    assert.equal(result.name, '');
    assert.equal(result.status, 'invalid');
    assert.ok(Object.keys(result.fieldErrors).length);
  }
  assert.equal(helpers.buildProposal(null, null, defaults).status, 'invalid');
});

test('resource-specific exceptions are visible and blocked where checkable', () => {
  assert.equal(proposal('synw', { ...defaults, workload: 'ondemand' }).status, 'invalid');
  assert.equal(proposal('gal').format, 'compact');
  assert.equal(proposal('dec', { ...defaults, workload: 'paymentplatformproduction' }).status, 'invalid');
  assert.equal(data.namingRules['microsoft.compute/virtualmachines'].maxLength, 64);
  assert.match(data.namingRules['microsoft.compute/virtualmachines'].notes.join(' '), /Windows host names.*15/);
  assert.match(data.namingRules['microsoft.web/sites'].notes.join(' '), /32-character host ID/);
});

test('unknown and partial constraints never claim full compatibility', () => {
  assert.equal(proposal('ng').status, 'unverified');
  assert.equal(proposal('map').status, 'partial');
  assert.equal(proposal('cae').status, 'partial');
  assert.equal(proposal('mdp').status, 'partial');
  assert.ok(proposal('ng').name.length);
  const legacy = { ...data };
  delete legacy.namingRules;
  assert.equal(Object.keys(helpers.validatePayload(legacy).namingRules).length, 0);
});

test('preview precedes fields in the DOM and input errors have descriptive targets', () => {
  assert.ok(html.indexOf('id="namePreview"') < html.indexOf('id="generatorFields"'));
  assert.match(html, /id="resourceSelect"[^>]*list="resourceSuggestions"/);
  assert.match(html, /<datalist id="resourceSuggestions"><\/datalist>/);
  assert.match(html, /Name availability is not checked/);
  assert.doesNotMatch(script, /slice\(0,\s*24\)|execCommand/);
  for (const id of ['resourceError', 'workloadError', 'environmentError', 'regionError', 'instanceError']) {
    assert.ok(html.includes(`id="${id}"`), id);
    assert.ok(new RegExp(`aria-describedby="[^"]*${id}`).test(html), id);
  }
});

test('invalid datasets fail visibly instead of enabling a misleading generator', () => {
  assert.throws(() => helpers.validatePayload({ resources: [] }));
  assert.throws(() => helpers.validatePayload({ ...data, resources: [data.resources[0], data.resources[0]] }));
  assert.throws(() => helpers.validatePayload({ ...data, namingRules: { bad: { minLength: 5, maxLength: 3 } } }));
  assert.match(script, /if \(!response\.ok\) throw/);
  assert.match(script, /elements\.copyNameButton\.disabled = true/);
});

test('existing URL fields are restored only after the catalogue is ready', () => {
  for (const id of ['resourceSelect', 'workloadInput', 'envSelect', 'regionSelect', 'instanceInput', 'search']) assert.ok(script.includes(`"${id}"`));
  assert.doesNotMatch(html, /data-url-state/);
  assert.ok(script.indexOf('state.resources = payload.resources') < script.indexOf('        restoreUrl();'));
  assert.match(script, /window\.addEventListener\("popstate"/);
});

test('inline scripts parse and IDs remain unique', () => {
  for (const [, attrs, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attrs.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'azure-naming-convention/index.html' });
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
