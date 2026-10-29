import { readFileSync, existsSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const source = read('templates/templates.js');
const tools = runInNewContext(`${source.slice(source.indexOf('const tools ='), source.indexOf('const paths ='))}; tools;`);
const concepts = ['01-studio', '02-bento', '03-workspace', '04-spotlight', '05-journal'];

test('all five design studies include the full real Tools catalogue without duplicate entries', () => {
  const live = [...read('tools/index.html').matchAll(/data-tool-id="\/([^"]+)\//g)].map(match => match[1]);
  assert.equal(new Set(tools.map(tool => tool.id)).size, tools.length);
  assert.deepEqual([...tools.map(tool => tool.id)].sort(), [...new Set(live)].sort());
  for (const tool of tools) {
    assert.ok(existsSync(new URL(`${tool.id}/index.html`, root)), tool.id);
    assert.ok(tool.name && tool.description && tool.categories.length && tool.icon);
  }
});

test('prototypes are isolated, non-indexable, labelled and include their local dependencies', () => {
  new Script(source);
  for (const file of ['index', ...concepts]) {
    const html = read(`templates/${file}.html`);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
    assert.match(html, /<html lang="(?:fr|en)">/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, file);
    for (const [, code] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(code);
    assert.match(html, /scoutTheme/);
    for (const resource of ['theme.css', 'templates.css', 'templates.js']) {
      assert.ok(html.includes(`"${resource}"`));
      assert.ok(existsSync(new URL(`templates/${resource}`, root)));
    }
    if (file !== 'index') {
      for (const id of ['searchHost', 'filters', 'savedToggle', 'toolResults', 'resultCount', 'empty', 'emptyReset', 'clearFilters', 'storageNotice']) assert.ok(ids.includes(id), `${file}: ${id}`);
      assert.match(html, /<noscript>/);
      assert.match(html, /id="resultCount" role="status" aria-live="polite"/);
    }
  }
  assert.match(source, /tools-design-study-favorites/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  assert.match(source, /event\.key === "\/"/);
  assert.match(source, /matches\.length === 1/);
});

test('five compositions and deployment stay independently accessible', () => {
  const css = read('templates/templates.css');
  for (const concept of ['studio', 'bento', 'workspace', 'spotlight', 'journal']) assert.ok(css.includes(`.${concept}`));
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 700px/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|\brgba?\(/i);
  const index = read('templates/index.html');
  for (const concept of concepts) assert.ok(index.includes(`${concept}.html?scoutTheme=light`));
  assert.match(read('.github/workflows/deploy-hugo.yaml'), /cp \.\.\/templates\/\*\.html \.\.\/templates\/\*\.css \.\.\/templates\/\*\.js public\/templates\//);
});
