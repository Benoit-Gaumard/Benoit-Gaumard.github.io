import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPrompts, renderJson, parsePrompt } from '../../prompts/build-prompts.mjs';

const page = readFileSync(new URL('../../prompts/index.html', import.meta.url), 'utf8');
const deploy = readFileSync(new URL('../workflows/deploy-hugo.yaml', import.meta.url), 'utf8');

test('prompt library files are valid and have unique ids', () => {
  const prompts = buildPrompts();
  assert.ok(prompts.length >= 1);
  assert.equal(new Set(prompts.map(p => p.id)).size, prompts.length);
  for (const p of prompts) {
    assert.ok(p.title && p.category && p.body, p.id);
    assert.ok(Array.isArray(p.tags), p.id);
  }
});

test('prompts.json is in sync with the library', () => {
  const committed = readFileSync(new URL('../../prompts/prompts.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(committed, renderJson(buildPrompts()), 'Run: node prompts/build-prompts.mjs');
});

test('prompt parser extracts variables and rejects invalid files', () => {
  const p = parsePrompt('---\ntitle: T\ncategory: C\ntags: [a, b]\n---\nHello {{Name}} and {{ Name }} in {{City}}\n', 'sample-prompt.md');
  assert.deepEqual(p.variables, ['Name', 'City']);
  assert.deepEqual(p.tags, ['a', 'b']);
  assert.equal(p.models, 'Any LLM');
  assert.throws(() => parsePrompt('no front matter', 'x.md'), /front matter/);
  assert.throws(() => parsePrompt('---\ntitle: T\n---\nbody', 'x.md'), /category/);
  assert.throws(() => parsePrompt('---\ntitle: T\ncategory: C\n---\nbody', 'Bad Name.md'), /kebab-case/);
});

test('prompts page is wired, builds the DOM safely and is deployed', () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/benoit-gaumard\.io\/prompts\/" \/>/);
  assert.match(page, /<title>Prompts - AI Prompt Library \| Benoit Gaumard<\/title>/);
  assert.match(page, /fetch\("prompts\.json"/);
  assert.doesNotMatch(page.match(/<script data-prompts-script>[\s\S]*?<\/script>/)[0], /innerHTML/);
  assert.match(deploy, /node \.\.\/prompts\/build-prompts\.mjs/);
  assert.match(deploy, /cp \.\.\/prompts\/prompts\.json public\/prompts\/prompts\.json/);
});
