import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportVersions } from '../../azure-policies/fetch-versions.mjs';

const policy = version => ({ displayName: `Policy ${version}`, policyType: 'BuiltIn', version, metadata: { version, category: 'Test' }, policyRule: { then: { effect: version === '1.0.0' ? 'Audit' : 'Deny' } } });
const initiative = { displayName: 'Initiative', policyType: 'BuiltIn', version: '1.0.0', policyDefinitions: [{ policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/test', policyDefinitionReferenceId: 'ref', parameters: { x: { value: 'sample' } } }] };

function fixture({ badPage = false, wrongVersion = false, incomplete = false } = {}) {
  const calls = [];
  return {
    calls,
    request: async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      calls.push(url);
      if (url.includes('/policyDefinitions/test/versions/1.0.0')) return Response.json({ properties: { ...policy(wrongVersion ? '3.0.0' : '1.0.0'), ...(incomplete ? { policyRule: undefined } : {}) } });
      if (url.includes('$skiptoken')) return Response.json({ value: [{ name: 'static', properties: { ...policy('1.0.0'), policyType: 'Static' } }] });
      if (url.includes('/policyDefinitions?')) return Response.json({
        value: [{ name: 'test', properties: { ...policy('2.0.0'), versions: ['1.0.0', '2.0.0'] } }],
        nextLink: badPage ? 'https://example.com/steal-token' : 'https://management.azure.com/providers/Microsoft.Authorization/policyDefinitions?api-version=2026-07-01&$skiptoken=second',
      });
      if (url.includes('/policySetDefinitions?')) return Response.json({ value: [{ name: 'set', properties: initiative }] });
      throw new Error(`Unexpected request: ${url}`);
    },
  };
}

test('Azure exporter follows pagination and caches complete versioned rules and member parameters', async () => {
  const root = await mkdtemp(join(tmpdir(), 'policy-version-test-'));
  try {
    const first = fixture();
    const result = await exportVersions({ root, token: 'test-token', request: first.request });
    assert.deepEqual(result.policies.test, ['1.0.0', '2.0.0']);
    assert.deepEqual(result.policies.static, ['1.0.0']);
    assert.deepEqual(result.initiatives.set, ['1.0.0']);
    const old = JSON.parse(await readFile(join(root, 'versions', 'policies', 'test', '1.0.0.json'), 'utf8'));
    const current = JSON.parse(await readFile(join(root, 'versions', 'policies', 'test', '2.0.0.json'), 'utf8'));
    assert.equal(old.policyRule.then.effect, 'Audit');
    assert.equal(current.policyRule.then.effect, 'Deny');
    assert.equal(current.versions, undefined);
    const set = JSON.parse(await readFile(join(root, 'versions', 'initiatives', 'set', '1.0.0.json'), 'utf8'));
    assert.equal(set.policyDefinitions[0].parameters.x.value, 'sample');
    const second = fixture();
    await exportVersions({ root, token: 'test-token', request: second.request });
    assert.equal(second.calls.some(url => url.includes('/versions/1.0.0')), false);
    assert.ok(!(await readFile(join(root, 'versions-index.json'), 'utf8')).includes('test-token'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Azure exporter preserves the index on invalid data and never forwards a token to an external pagination host', async () => {
  for (const options of [{ badPage: true }, { wrongVersion: true }, { incomplete: true }]) {
    const root = await mkdtemp(join(tmpdir(), 'policy-version-test-'));
    try {
      const mock = fixture(options);
      const previousIndex = '{"generatedAt":"previous-successful-export"}\n';
      await writeFile(join(root, 'versions-index.json'), previousIndex);
      await assert.rejects(exportVersions({ root, token: 'test-token', request: mock.request }), options.badPage ? /Unexpected Azure pagination URL/ : options.incomplete ? /Incomplete/ : /instead of/);
      assert.ok(mock.calls.every(url => url.startsWith('https://management.azure.com/')));
      assert.equal(await readFile(join(root, 'versions-index.json'), 'utf8'), previousIndex);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
