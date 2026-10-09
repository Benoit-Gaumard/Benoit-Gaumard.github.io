import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Script, runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('tools/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const cards = [...html.matchAll(/<article class="tool-card" data-tool-id="([^"]+)" data-families="([^"]+)">([\s\S]*?)<\/article>/g)];
const script = html.match(/<script data-tools-script>([\s\S]*?)<\/script>/)[1];
const families = new Set(runInNewContext(script.match(/const familyNames = new Map\([\s\S]*?\n    \]\);/)[0] + '\nArray.from(familyNames.keys());'));

test('all 30 tools remain static links without nested controls', () => {
  assert.equal(cards.length, 30);
  assert.equal(new Set(cards.map(card => card[1])).size, 30);
  for (const [, id, , content] of cards) {
    const link = content.match(/<a class="tool-link" href="([^"]+)" aria-labelledby="([^"]+)">([\s\S]*?)<\/a>/);
    assert.ok(link, id);
    assert.equal(link[1], id);
    assert.ok(content.includes(`<h2 id="${link[2]}">`), id);
    assert.doesNotMatch(link[3], /<button|\brole="button"|tabindex=/);
    assert.ok(existsSync(fileURLToPath(new URL(id.slice(1) + 'index.html', root))), id);
  }
});

test('previously shared family URLs retain valid assignments for every tool', () => {
  for (const [, id, groups] of cards) {
    assert.ok(groups.length);
    for (const family of groups.split(' ')) assert.ok(families.has(family) && family !== 'all', `${id}: ${family}`);
  }
  for (const family of families) {
    if (family !== 'all') assert.ok(cards.some(card => card[2].split(' ').includes(family)), family);
  }
});

test('task-family buttons and the mobile family panel are removed', () => {
  assert.doesNotMatch(html, /data-family=|family-filters|class="family-filter"|filterToggle|filtersExpanded|syncFilterPanel/);
  assert.match(html, /id="toolSearch"/);
  assert.match(html, /id="favoritesFilter"/);
  assert.match(script, /const selected = \[\.\.\.families\]\.map/);
  assert.match(script, /families\.clear\(\)/);
});

test('the dedicated filtered-link button and its copy fallback are removed', () => {
  assert.doesNotMatch(html, /copyCatalogLink|shareLinkFallback|catalogShareUrl|Copy filtered link/);
  assert.match(script, /function catalogueUrl\(\)/);
  assert.match(script, /if \(updateUrl\) syncUrl\(\)/);
});

test('the favorites button and active filter summary use My favorites', () => {
  assert.match(html, /id="favoritesFilter"[^>]*>☆ My favorites \(0\)<\/button>/);
  assert.ok(script.includes('favoritesFilter.innerHTML = `${starIcon(favoritesOnly)} My favorites (${favorites.size})`'));
  assert.match(script, /if \(favoritesOnly\) selected\.push\("My favorites"\)/);
  assert.doesNotMatch(script, /Favorite tools/);
});

test('reorder tools is grouped beside My favorites in the primary toolbar', () => {
  const toolbar = html.slice(html.indexOf('<div class="tools-toolbar">'), html.indexOf('<p class="preference-hint">'));
  assert.match(toolbar, /aria-label="Personalize tools">\s*<button[^>]*id="favoritesFilter"[^>]*>[^<]+<\/button>\s*<button[^>]*id="reorderToggle"/);
  const results = html.slice(html.indexOf('<div class="results-toolbar">'), html.indexOf('<p class="sr-only" id="actionStatus"'));
  assert.doesNotMatch(results, /id="reorderToggle"/);
});

test('reset order requires confirmation and provides cancel and focus recovery', () => {
  assert.match(html, /<dialog[^>]*id="resetOrderDialog" aria-labelledby="resetOrderTitle" aria-describedby="resetOrderDescription"/);
  assert.match(html, /id="resetOrderButton" aria-haspopup="dialog" aria-controls="resetOrderDialog"/);
  assert.match(html, /id="cancelResetOrder" type="button" autofocus>Cancel/);
  assert.match(script, /resetOrderButton\.addEventListener\("click", \(\) => \{\s*resetOrderDialog\.showModal\(\);\s*\}\)/);
  assert.match(script, /getElementById\("cancelResetOrder"\)\.addEventListener\("click", \(\) => resetOrderDialog\.close\(\)\)/);
  assert.match(script, /getElementById\("confirmResetOrder"\)\.addEventListener\("click", \(\) => \{\s*orderedCards = \[\.\.\.defaultCards\];\s*savePreference\(ORDER_STORAGE_KEY, null\)/);
  assert.match(script, /resetOrderDialog\.addEventListener\("close", \(\) => \{\s*\(resetOrderButton\.hidden \? reorderToggle : resetOrderButton\)\.focus/);
  assert.doesNotMatch(script, /window\.confirm/);
});

test('drag direction follows the rendered grid rather than the removed mobile filters', () => {
  assert.doesNotMatch(script, /\bmobileFilters\b/);
  assert.match(script, /getComputedStyle\(target\.parentElement\)\.gridTemplateColumns/);
  assert.match(script, /filter\(size => parseFloat\(size\) > 0\)/);
  assert.match(script, /columns\.length === 1 \? move\.clientY/);
  assert.match(script, /window\.addEventListener\("pointercancel", onCancel\)/);
});

test('reorder buttons show directional icons and retain accessible action names', () => {
  assert.match(script, /const label = direction < 0 \? "Move earlier" : "Move later"/);
  assert.match(script, /button\.title = label/);
  assert.match(script, /button\.setAttribute\("aria-label", `\$\{label\}: \$\{toolTitle\(card\)\}`\)/);
  assert.match(script, /<svg class="reorder-arrow"[^>]*aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(script, /button\.textContent = direction/);
  assert.match(html, /\.tool-cards\.list-view \.reorder-arrow \{ transform: rotate\(90deg\); \}/);
  assert.match(html, /Use the arrow buttons, or drag a handle/);
});

test('reordering clearly highlights the moving card and its destination', () => {
  assert.match(html, /\.tool-card\.is-dragging, \.tool-card\.is-reordered \{[^}]*outline: 3px solid var\(--cp-accent\)/);
  assert.match(script, /placeholder\.textContent = "Drop here"/);
  assert.match(script, /feedback\.textContent = "Moving"/);
  assert.match(script, /card\.classList\.add\("is-reordered"\)/);
  assert.match(script, /card\.querySelector\("\.reorder-feedback"\)\.textContent = "Moved"/);
  assert.match(script, /setTimeout\(clearMoveHighlight, 2200\)/);
  assert.match(script, /card\.scrollIntoView\(\{ block: "nearest", inline: "nearest", behavior: "instant" \}\)/);
  assert.match(script, /function renderCards[\s\S]*?clearMoveHighlight\(\)/);
});

test('search and six static results precede one manual ad', () => {
  const adIndex = html.indexOf('<aside class="catalog-ad"');
  assert.ok(html.indexOf('id="toolSearch"') < adIndex);
  assert.equal(cards.filter(card => card.index < adIndex).length, 6);
  assert.equal([...html.matchAll(/data-ad-slot="/g)].length, 1);
  assert.match(html, /data-ad-client="ca-pub-6636684537203477"/);
  assert.match(html, /data-ad-slot="4494484671"/);
  assert.equal([...html.matchAll(/<script[^>]+src="[^"]*adsbygoogle\.js/g)].length, 1);
  assert.match(script, /if \(adRequested \|\| !visibleCards\.length\) return;/);
  assert.doesNotMatch(script, /toolsAd.*(?:remove\(|replaceChildren\()/);
});

test('catalogue counts and recovery actions are accessible', () => {
  assert.match(html, /id="resultCount" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /id="actionStatus" role="status" aria-live="polite"/);
  assert.match(html, /id="clearSearch"[^>]*>Clear search/);
  assert.match(html, /id="emptyClearFilters"[^>]*>Show all tools/);
  assert.match(html, /Press Enter when one result remains/);
  assert.match(script, /!event\.isComposing && visibleCards\.length === 1/);
});

test('stored href IDs and legacy search URLs remain compatible', () => {
  for (const key of ['tools-view-mode', 'tools-my-favorites', 'tools-card-order']) assert.ok(script.includes(key));
  assert.match(script, /params\.get\("q"\) \?\? params\.get\("toolSearch"\)/);
  assert.match(script, /window\.addEventListener\("popstate"/);
  assert.doesNotMatch(html, /data-url-state/);
  assert.match(script, /url\.pathname \+ url\.search \+ url\.hash/);
});

test('local-only tools do not advertise dataset refresh dates', () => {
  for (const slug of ['subnet-calculator', 'percentage-calculator', 'sla-calculator', 'units-converter', 'guid-generator', 'random-wheel', 'mini-games', 'world-clock']) {
    assert.doesNotMatch(cards.find(card => card[1] === `/${slug}/`)[3], /tool-updated/);
  }
});

test('filter search ignores case and accents', () => {
  const normalize = script.match(/function normalize\(value\) \{[\s\S]*?\n    \}/)[0];
  assert.equal(runInNewContext(`${normalize}; normalize("ÁZURE RÉGIONS")`), 'azure regions');
});

test('inline JavaScript and structured data parse', () => {
  for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attributes.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'tools/index.html' });
  }
});

test('all HTML IDs are unique and control targets exist', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const [, target] of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(target), target);
});
