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

test('PowerPoint creation prompt retains the full brief and exposes reusable fields', () => {
  const prompt = buildPrompts().find(p => p.id === 'powerpoint-deck-creation');
  assert.ok(prompt);
  assert.equal(prompt.title, 'PowerPoint deck creation');
  assert.deepEqual(prompt.variables, [
    'Topic',
    'Audience (for example, beginners, decision-makers or developers)',
    'Goal (for example, explain the basics, persuade or train)',
    'Deck name',
    'Author full name',
    'Company',
    'Month Year',
    'Sections to cover',
  ]);
  assert.equal([...prompt.body.matchAll(/^## \d\./gm)].length, 7);
  for (const text of [
    '{{Deck name}}-FR.pptx', '{{Deck name}}-EN.pptx', 'pptxgenjs',
    '#0D1117', '#39C5CF', '30 to 35 presentation slides',
    'no text, no letters, no logos', 'Search the web',
    'check the corrected slides a second time',
  ]) assert.ok(prompt.body.includes(text), text);
});

test('Funko pop prompt personalizes appearance and packaging with a shared character name', () => {
  const prompt = buildPrompts().find(p => p.id === 'funko-pop');
  assert.ok(prompt);
  assert.equal(prompt.title, 'Funko pop');
  assert.equal(prompt.models, 'AI image generator');
  assert.equal(prompt.variables.length, 16);
  assert.equal(prompt.variables.filter(name => name.startsWith('Character name')).length, 1);
  assert.equal([...prompt.body.matchAll(/\{\{Character name \(for example, Ben\)\}\}/g)].length, 2);
  for (const field of ['Gender or presentation', 'Hair', 'Facial hair', 'Clothing logo or text', 'Held accessory', 'Box colors', 'Front-of-box text', 'Background']) {
    assert.ok(prompt.variables.some(name => name.startsWith(`${field} (`)), field);
  }
  assert.match(prompt.body, /one inside its limited-edition collectible box and one standing outside/);
  assert.match(prompt.body, /same appearance, outfit and accessory/);
});

test('My sweet house prompt keeps photo analysis and image generation in separate approved stages', () => {
  const prompt = buildPrompts().find(p => p.id === 'my-sweet-house');
  assert.ok(prompt);
  assert.equal(prompt.title, 'My sweet house');
  assert.match(prompt.body, /explicit approval before starting Stage 2/);
  assert.match(prompt.body, /Do NOT generate any image yet/);
  assert.equal([...prompt.body.matchAll(/^[1-8]\. /gm)].length, 8);
  for (const instruction of [
    'Do not add or remove any building element',
    'true isometric view',
    'All exterior and interior lights OFF',
    'All garage doors, gates and shutters CLOSED',
    '#1C1C1C',
    'NO text, NO labels, NO people, NO cars, NO watermark',
    'Landscape 16:9, maximum resolution',
  ]) assert.ok(prompt.body.includes(instruction), instruction);
});

test('prompts page is wired, builds the DOM safely and is deployed', () => {
  assert.match(page, /<link rel="canonical" href="https:\/\/benoit-gaumard\.io\/prompts\/" \/>/);
  assert.match(page, /<title>Prompts - AI Prompt Library \| Benoit Gaumard<\/title>/);
  assert.match(page, /fetch\("prompts\.json"/);
  assert.doesNotMatch(page.match(/<script data-prompts-script>[\s\S]*?<\/script>/)[0], /innerHTML/);
  assert.match(deploy, /node \.\.\/prompts\/build-prompts\.mjs/);
  assert.match(deploy, /cp \.\.\/prompts\/prompts\.json public\/prompts\/prompts\.json/);
});
