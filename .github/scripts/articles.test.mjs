import { readFileSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('articles/index.html', root), 'utf8').replace(/\r\n/g, '\n');
const payload = JSON.parse(readFileSync(new URL('articles/articles.json', root), 'utf8'));
const script = html.match(/<script data-article-catalogue>([\s\S]*?)<\/script>/)[1];
const generator = readFileSync(new URL('articles/build-articles.mjs', root), 'utf8').replace(/\r\n/g, '\n');
const indexed = payload.articles.filter(article => !article.noindex && !article.draft);

function declaration(name, source = script, indent = '    ') {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf(`\n${indent}}`, start);
  assert.ok(end > start, name);
  return source.slice(start, end + indent.length + 2);
}

test('search is in the DOM before results, advertising and secondary content', () => {
  const ids = ['searchInput', 'resultsCount', 'featuredSection', 'articleCards', 'loadMore', 'catalogueAd', 'series', 'articleSidebar', 'categoryList', 'archivePanel', 'tagList', 'recentList'];
  const positions = ids.map(id => html.indexOf(`id="${id}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.doesNotMatch(html, /statsGrid|order:\s*-1/);
  assert.match(html, /<label for="searchInput">Search articles<\/label>/);
});

test('all five sidebar blocks are restored and stay connected to catalogue filters', () => {
  const sidebar = html.split('<aside class="articles-sidebar"')[1].split('</aside>')[0];
  assert.match(sidebar, /The opinions expressed on this site are my own personal opinions and do not represent my employer&rsquo;s view in any way\./);
  for (const heading of ['Categories', 'Archives', 'Tags', 'Recent Posts']) assert.ok(sidebar.includes(`>${heading}</h2>`));
  for (const field of ['categoryList', 'archiveList', 'tagList']) assert.ok(script.includes(`renderSidebarFilters(elements.${field},`));
  assert.match(script, /button\.setAttribute\("aria-pressed", String\(value === selected\)\)/);
  assert.match(script, /elements\.resultsCount\.focus\(\)/);
  assert.match(script, /const TAGS_COLLAPSED_COUNT = 18;/);
  assert.match(script, /index < TAGS_COLLAPSED_COUNT \|\| name === state\.tag/);
  assert.match(script, /sidebarMessage\("Menu unavailable\. Use Retry loading catalogue above\."\)/);
});

test('RSS Feed sits beside the view controls without the old bottom explanations', () => {
  assert.match(html, /<div class="view-actions">[\s\S]*?id="viewCards"[\s\S]*?id="viewList"[\s\S]*?<a class="rss-link" id="rssFeedLink" href="\/articles\/rss\.xml" type="application\/rss\+xml"><svg\b[^>]*width="16"[^>]*height="16"[^>]*aria-hidden="true">[\s\S]*?<\/svg>RSS Feed<\/a>/);
  assert.ok(html.indexOf('id="rssFeedLink"') < html.indexOf('id="resultsCount"'));
  assert.match(html, /<noscript>[\s\S]*?href="\/articles\/rss\.xml"[^>]*>RSS Feed<\/a>/);
  assert.doesNotMatch(html, /rss-section|About these articles|What you will find|How to browse|id="notes-heading"/);
});

test('recent posts always list the ten newest articles without changing catalogue order', () => {
  const recent = runInNewContext(`(${declaration('recentArticles')})`, { RECENT_COUNT: 10 });
  const reversed = [...indexed].reverse();
  const previous = reversed.map(article => article.url);
  const expected = [...indexed].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'en') || a.url.localeCompare(b.url)).slice(0, 10);
  assert.deepEqual(Array.from(recent(reversed), article => article.url), expected.map(article => article.url));
  assert.deepEqual(reversed.map(article => article.url), previous);
});

test('all published indexable article links remain pre-generated', () => {
  const block = html.split('<!-- articles:static:start -->')[1].split('<!-- articles:static:end -->')[0];
  const links = [...block.matchAll(/<a class="article-card" href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(links, indexed.map(article => article.url));
  assert.equal(new Set(links).size, indexed.length);
});

test('the existing generator preserves the new catalogue shell', () => {
  const start = generator.indexOf('const LIST_START =');
  const end = generator.indexOf('function buildRss(', start);
  const output = runInNewContext(`
    ${declaration('escapeHtml', generator, '')}
    ${declaration('formatDisplayDate', generator, '')}
    ${generator.slice(start, end)}
    injectStaticList(html, articles);
  `, { html, articles: indexed });
  assert.equal(output.slice(0, output.indexOf('<!-- articles:static:start -->')), html.slice(0, html.indexOf('<!-- articles:static:start -->')));
  assert.equal(output.slice(output.indexOf('<!-- articles:static:end -->')), html.slice(html.indexOf('<!-- articles:static:end -->')));
});

test('page size and featured limit apply to one deduplicated catalogue', () => {
  assert.match(script, /const PAGE_SIZE = 12;/);
  assert.match(script, /const FEATURED_LIMIT = 3;/);
  assert.match(script, /filter\(\(article\) => !state\.featuredUrls\.has\(article\.url\)\)/);
  assert.match(script, /shown - state\.featuredUrls\.size/);
  assert.match(script, /state\.visibleCount \+= PAGE_SIZE/);
  assert.match(html, /id="resultsCount" role="status" aria-live="polite" aria-atomic="true"/);
});

test('series entries point to real first parts and preserve all installments', () => {
  for (const [prefix, count, first] of [
    ['azure-policy-part-', 7, '/articles/azure-policy-part-1-what-is-a-policy/'],
    ['dns-in-azure-part-', 8, '/articles/dns-in-azure-part-1-fundamentals/'],
  ]) {
    assert.equal(indexed.filter(article => article.slug.startsWith(prefix)).length, count);
    assert.ok(indexed.some(article => article.url === first));
    assert.ok(html.includes(`href="${first}">Start with part 1</a>`));
  }
  assert.match(html, /value="newest">Newest first/);
  assert.match(html, /value="oldest">Oldest first/);
});

test('metadata validation rejects unusable data instead of hiding a failure', () => {
  const validate = runInNewContext(`(${declaration('validateArticles')})`);
  assert.equal(validate(payload).length, indexed.length);
  assert.throws(() => validate({ articles: [{ ...payload.articles[0], url: 'javascript:alert(1)' }] }));
  assert.throws(() => validate({ articles: [payload.articles[0], payload.articles[0]] }));
  assert.throws(() => validate({ articles: [{ ...payload.articles[0], readingMinutes: '13' }] }));
  assert.equal(validate({ articles: [{ ...payload.articles[0], noindex: true }] }).length, 0);
  assert.match(script, /if \(!response\.ok\) throw/);
  assert.match(script, /elements\.articleCards\.append\(\.\.\.staticCards\)/);
  assert.match(html, /id="loadError" role="alert"/);
});

test('one manual advertisement follows the results and pagination', () => {
  assert.equal([...html.matchAll(/data-ad-slot="/g)].length, 1);
  assert.match(html, /data-ad-slot="4494484671"/);
  assert.ok(html.indexOf('id="loadMore"') < html.indexOf('id="catalogueAd"'));
  assert.match(script, /if \(!adRequested && filtered\.length\)/);
  assert.doesNotMatch(script, /catalogueAd.*(?:remove\(|replaceChildren\()/);
});

test('legacy preferences and URLs remain supported by one state controller', () => {
  for (const key of ['articles-favorites', 'articles-view', 'articles-show-featured']) assert.ok(script.includes(key));
  for (const key of ['searchInput', 'featuredToggle', 'category', 'tag', 'month', 'series', 'sort', 'shown']) assert.ok(script.includes(`"${key}"`));
  assert.doesNotMatch(html, /data-url-state/);
  assert.match(script, /window\.addEventListener\("popstate"/);
});

test('inline scripts parse and IDs remain unique', () => {
  for (const [, attributes, content] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (attributes.includes('application/ld+json')) JSON.parse(content);
    else new Script(content, { filename: 'articles/index.html' });
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
