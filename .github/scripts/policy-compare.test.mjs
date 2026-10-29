import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enhancePage } from '../../site-ui.mjs';

const root = new URL('../../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const html = read('azure-policies/compare/index.html');
const script = html.match(/<script data-compare-script>([\s\S]*?)<\/script>/)[1];
const helpers = runInNewContext(`${script.slice(script.indexOf('function stableJson('), script.indexOf('async function fetchJson('))}; ({ stableJson, jsonDifferences, memberDifferences, versionDefinition });`);
const plain = value => JSON.parse(JSON.stringify(value));

test('comparison uses the shared Azure page design and responsive navigation', () => {
  const reference = read('azure-policies/initiatives-history/index.html');
  for (const selector of ['news-banner', 'site-header', 'menu-toggle', 'header-links', 'social-link', 'theme-toggle', 'site-footer', 'footer-main']) {
    assert.ok(html.includes(`class="${selector}`), selector);
  }
  for (const value of ['#f5faff', '#0c1420', '#0b6fb8', '#4fa8ea']) {
    assert.ok(reference.includes(value));
    assert.ok(html.includes(value));
  }
  assert.match(html, /"menu":true,"theme":true,"banner":true/);
  assert.match(html, /class="compare-sources"/);
  assert.match(html, /<main id="main" tabindex="-1">/);
  assert.doesNotMatch(html, /class="history-filter-grid"/);
});

test('policy JSON differences ignore object order, preserve array order and escape JSON pointer keys', () => {
  assert.equal(helpers.jsonDifferences({ b: 2, a: 1 }, { a: 1, b: 2 }).length, 0);
  const left = { parameters: { x: { defaultValue: false } }, policyRule: { then: { effect: 'Audit' } } };
  const right = { parameters: { x: { defaultValue: true } }, policyRule: { then: { effect: 'Deny' } } };
  assert.deepEqual(plain(helpers.jsonDifferences(left, right)), [
    { path: '/parameters/x/defaultValue', left: false, right: true },
    { path: '/policyRule/then/effect', left: 'Audit', right: 'Deny' },
  ]);
  assert.deepEqual(plain(helpers.jsonDifferences({ 'a/b~c': null }, {})), [{ path: '/a~1b~0c', left: null }]);
  assert.equal(helpers.jsonDifferences([1, 2], [2, 1]).length, 1);
  assert.equal(helpers.jsonDifferences({}, []).length, 1);
  assert.equal(helpers.jsonDifferences({ x: [] }, { x: {} }).length, 1);
});

test('members match policy IDs and reference IDs and expose side-only and changed groups', () => {
  const left = [
    { id: 'POLICY-A', referenceId: 'ref', groupNames: ['two', 'one', null] },
    { id: 'policy-b', referenceId: 'old', groupNames: [] },
    { id: 'policy-c', referenceId: 'same', groupNames: ['before'] },
  ];
  const right = [
    { id: 'policy-a', referenceId: 'ref', groupNames: ['one', 'two'] },
    { id: 'policy-b', referenceId: 'new', groupNames: [] },
    { id: 'policy-c', referenceId: 'same', groupNames: ['after'] },
  ];
  const diff = helpers.memberDifferences(left, right);
  assert.equal(diff.length, 4);
  assert.equal(diff.filter(row => row.left && row.right && !row.changed).length, 1);
  assert.equal(diff.filter(row => row.left && row.right && row.changed).length, 1);
  assert.equal(diff.filter(row => !row.left).length, 1);
  assert.equal(diff.filter(row => !row.right).length, 1);
  assert.equal(helpers.memberDifferences([], []).length, 0);
});

test('self comparison is identical for real policies and initiatives', () => {
  const rules = JSON.parse(read('azure-policies/policyrules.json')).rules;
  const definitions = Object.values(rules);
  assert.equal(helpers.jsonDifferences(definitions[0], definitions[0]).length, 0);
  assert.ok(helpers.jsonDifferences(definitions[0], definitions[1]).length > 0);
  const initiatives = JSON.parse(read('azure-policies/policysetdefinitions.json')).initiatives;
  for (const initiative of initiatives) {
    const diff = helpers.memberDifferences(initiative.policies, initiative.policies);
    assert.equal(diff.length, initiative.policies.length, initiative.name);
    assert.ok(diff.every(row => !row.changed));
  }
});

test('comparison scripts parse, IDs are unique, and the shared shell remains repeatable', () => {
  for (const [, attrs, code] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!attrs.includes('application/ld+json')) new Script(code);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(enhancePage(html, { path: '/azure-policies/compare/' }), html);
  assert.match(html, /aria-current="location"/);
  assert.match(script, /revision !== state\.revision/);
  assert.match(script, /Retry selected versions/);
  assert.match(script, /linked definition was not found/);
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(script, /\.innerHTML\s*=/);
});

test('comparison is discoverable, deployed and uses the existing refreshed datasets', () => {
  assert.ok(read('azure-policies/index.html').includes('href="compare/"'));
  assert.ok(read('azure-policies/index.html').includes('Compare this definition'));
  assert.ok(read('.github/workflows/deploy-hugo.yaml').includes('cp ../azure-policies/compare/index.html public/azure-policies/compare/index.html'));
  assert.ok(read('sitemap.xml').includes('https://benoit-gaumard.io/azure-policies/compare/'));
  assert.match(script, /fetchJson\("\.\.\/policydefinitions\.json"\)/);
  assert.match(script, /fetchJson\("\.\.\/policysetdefinitions\.json"\)/);
  assert.match(script, /fetchJson\("\.\.\/versions-index\.json"\)/);
  assert.match(script, /fetchJson\(`\.\.\/versions\//);
  const refresh = read('.github/workflows/azure-policies-updates.yaml');
  assert.match(refresh, /actions\/setup-node/);
  assert.match(refresh, /git add azure-policies\/versions-index\.json azure-policies\/versions/);
  assert.match(read('azure-policies/fetch-updates.ps1'), /fetch-versions\.mjs/);
  assert.match(read('.github/workflows/deploy-hugo.yaml'), /cp -R \.\.\/azure-policies\/versions public\/azure-policies\/versions/);
});

test('versioned metadata comes from the chosen definition, not the current catalogue', () => {
  const row = { name: 'policy-id', displayName: 'Current', version: '3.0.0', category: 'Current category', policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/policy-id' };
  const old = helpers.versionDefinition(row, '1.0.0', {
    displayName: 'Old name', metadata: { category: 'Old category' }, mode: 'All', policyType: 'BuiltIn',
    parameters: { effect: { defaultValue: 'Deny' } }, policyRule: { then: { effect: "[parameters('effect')]" } },
  });
  assert.equal(old.version, '1.0.0');
  assert.equal(old.displayName, 'Old name');
  assert.equal(old.category, 'Old category');
  assert.equal(old.effect, 'Deny');
  assert.ok(old.policyDefinitionId.endsWith('/versions/1.0.0'));
  const initiative = helpers.versionDefinition(row, '2.0.0', {
    displayName: 'Initiative', policyDefinitions: [{ policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/member-id', policyDefinitionReferenceId: 'ref', definitionVersion: '1.*.*', parameters: { effect: { value: 'Audit' } } }],
  });
  assert.equal(initiative.policies[0].id, 'member-id');
  assert.equal(initiative.policies[0].definitionVersion, '1.*.*');
  assert.equal(initiative.policies[0].parameters.effect.value, 'Audit');
});

test('initiative comparison highlights version pins and parameter mappings', () => {
  const member = { id: 'policy', referenceId: 'ref', definitionVersion: '1.*.*', parameters: { x: { value: false } } };
  assert.equal(helpers.memberDifferences([member], [{ ...member, definitionVersion: '2.*.*' }])[0].changed, true);
  assert.equal(helpers.memberDifferences([member], [{ ...member, parameters: { x: { value: true } } }])[0].changed, true);
  assert.equal(helpers.memberDifferences([member], [member])[0].changed, false);
  for (const side of ['left', 'right']) assert.ok(html.includes(`id="${side}Version"`));
  assert.match(script, /\[state\.leftVersion, state\.rightVersion\] = \[state\.rightVersion, state\.leftVersion\]/);
});

test('version sorting orders stable releases above prereleases and handles numeric components', () => {
  const compare = runInNewContext(`${script.slice(script.indexOf('function compareVersions('), script.indexOf('function paintSelection('))}; compareVersions;`);
  assert.ok(compare('2.10.0', '2.9.0') > 0);
  assert.ok(compare('2.0.0', '2.0.0-preview') > 0);
  assert.ok(compare('2.0.0-preview.10', '2.0.0-preview.2') > 0);
  assert.ok(compare('2.0.0-1', '2.0.0-alpha') < 0);
  assert.equal(compare('1.0.0', '1.0.0'), 0);
});
