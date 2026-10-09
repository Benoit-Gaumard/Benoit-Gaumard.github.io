import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheFeedIcons, resolveFeedIcon } from "../../rss-watcher/cache-icons.mjs";

const root = new URL("../../", import.meta.url);
const image = readFileSync(new URL("flags/fr.png", root));
const collector = readFileSync(new URL("rss-watcher/fetch-updates.mjs", root), "utf8").replace(/\r\n/g, "\n");
function declaration(name) {
  const start = collector.indexOf(`function ${name}(`);
  const end = collector.indexOf("\n}", start);
  assert.ok(start >= 0 && end > start, name);
  return collector.slice(start, end + 2);
}
const extractFeedIcon = runInNewContext(`
  ${collector.match(/const ENTITY_MAP = [^\n]+/)[0]}
  ${["decodeEntities", "stripHtml", "unwrapCdata", "extractTag", "extractFeedIcon"].map(declaration).join("\n")}
  extractFeedIcon;
`, { URL, resolveFeedIcon });
const item = overrides => ({ source: "Example", link: "https://site.example/post", icon: "https://cdn.example/logo.png", ...overrides });

async function withCache(action) {
  const directory = mkdtempSync(join(tmpdir(), "rss-icons-"));
  const faviconDirectory = join(directory, "favicons");
  mkdirSync(faviconDirectory);
  writeFileSync(join(faviconDirectory, "site.png"), image);
  writeFileSync(join(faviconDirectory, "lookup.json"), JSON.stringify({ "site.example": "site.png" }));
  const warnings = [];
  try { await action({ directory, faviconDirectory, warn: message => warnings.push(message) }, warnings); }
  finally { rmSync(directory, { recursive: true, force: true }); }
}

test("feed icon URLs resolve relative paths and reject unusable schemes or local addresses", () => {
  assert.equal(resolveFeedIcon("../logo.png?v=1#old", "https://site.example/news/feed.xml"), "https://site.example/logo.png?v=1");
  assert.equal(resolveFeedIcon("//cdn.example/logo.png", "https://site.example/feed"), "https://cdn.example/logo.png");
  for (const value of ["javascript:alert(1)", "data:image/png;base64,test", "file:///private/logo.png", "https://user:password@site.example/logo.png", "http://127.0.0.1/a", "http://localhost/a", "http://10.0.0.1/a", "http://169.254.169.254/a", "http://[::1]/a"]) {
    assert.equal(resolveFeedIcon(value, "https://site.example/feed"), null, value);
  }
});

test("RSS channel images and Atom icons/logos win over per-entry artwork", () => {
  const base = "https://site.example/news/feed.xml";
  const rss = '<rss><channel><item><image><url>https://evil.example/article.png</url></image></item><image><url><![CDATA[../brand.png?v=1&size=64]]></url></image></channel></rss>';
  assert.equal(extractFeedIcon(rss, base), "https://site.example/brand.png?v=1&size=64");
  assert.equal(extractFeedIcon('<feed><entry><icon>https://site.example/article.png</icon></entry><logo>/logo.png?a=1&amp;b=2</logo></feed>', base), "https://site.example/logo.png?a=1&b=2");
  assert.equal(extractFeedIcon('<atom:feed><atom:entry><atom:icon>/article.png</atom:icon></atom:entry><atom:icon>/brand.png</atom:icon></atom:feed>', base), "https://site.example/brand.png");
  assert.equal(extractFeedIcon('<feed><entry><logo>/article.png</logo></entry></feed>', base), "https://www.google.com/s2/favicons?sz=64&domain=site.example");
  assert.equal(extractFeedIcon('<rss><channel><image><url>javascript:alert(1)</url></image></channel></rss>', base), "https://www.google.com/s2/favicons?sz=64&domain=site.example");
  assert.match(collector, /extractFeedIcon\(xml, response\.url \|\| feed\.url\)/);
});

test("exact feed logos are cached locally and shared URLs are downloaded only once", async () => {
  await withCache(async options => {
    const requests = [];
    const manifest = await cacheFeedIcons([item(), item({ source: "Another source" })], {
      ...options, fetcher: async url => { requests.push(url); return new Response(image); },
    });
    assert.deepEqual(requests, ["https://cdn.example/logo.png"]);
    assert.equal(manifest.sources.Example.via, "feed");
    assert.equal(manifest.sources.Example.sourceUrl, "https://cdn.example/logo.png");
    assert.match(manifest.sources.Example.src, /^\/rss-watcher\/source-icons\/[a-f0-9]{64}\.png$/);
    assert.equal(manifest.sources.Example.src, manifest.sources["Another source"].src);
    const file = join(options.directory, "source-icons", manifest.sources.Example.src.split("/").at(-1));
    assert.deepEqual(readFileSync(file), image);
  });
});

test("legacy Google fallback URLs use the existing site favicon without contacting Google", async () => {
  await withCache(async options => {
    const manifest = await cacheFeedIcons([item({ icon: "https://www.google.com/s2/favicons?sz=64&domain=site.example", link: "https://another.example/article" })], {
      ...options, fetcher: () => { throw new Error("No network request expected"); },
    });
    assert.equal(manifest.sources.Example.src, "/favicons/site.png");
    assert.equal(manifest.sources.Example.via, "favicon");
  });
});

test("failed logos retain a cached feed image or fall back to a site favicon with explicit errors", async () => {
  await withCache(async (options, warnings) => {
    const first = await cacheFeedIcons([item()], { ...options, fetcher: async () => new Response(image) });
    const stale = await cacheFeedIcons([item()], { ...options, fetcher: async () => new Response("", { status: 503 }) });
    assert.equal(stale.sources.Example.src, first.sources.Example.src);
    assert.equal(stale.sources.Example.via, "cached-feed");
    assert.match(stale.sources.Example.errors[0], /HTTP 503/);
    const fallback = await cacheFeedIcons([item({ icon: "https://cdn.example/new-logo.png" })], {
      ...options, fetcher: async () => new Response("<html>not an image</html>", { headers: { "content-type": "image/png" } }),
    });
    assert.equal(fallback.sources.Example.src, "/favicons/site.png");
    assert.equal(fallback.sources.Example.via, "favicon");
    assert.ok(warnings.length >= 2);
  });
});

test("oversized, HTML and active SVG responses are not published as source images", async () => {
  await withCache(async options => {
    for (const response of [
      new Response(image, { headers: { "content-length": String(2 * 1024 * 1024 + 1) } }),
      new Response(Buffer.alloc(2 * 1024 * 1024 + 1)),
      new Response('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    ]) {
      const manifest = await cacheFeedIcons([item()], { ...options, fetcher: async () => response });
      assert.equal(manifest.sources.Example.src, "/favicons/site.png");
      assert.ok(manifest.sources.Example.errors.length > 0);
    }
  });
});

test("unknown sites can use their own favicon, otherwise keep an explicit initials fallback", async () => {
  await withCache(async (options, warnings) => {
    const unknown = item({ icon: "", link: "https://unknown.example/story" });
    const requests = [];
    const direct = await cacheFeedIcons([unknown], { ...options, fetcher: async url => { requests.push(url); return new Response(image); } });
    assert.deepEqual(requests, ["https://unknown.example/favicon.ico"]);
    assert.equal(direct.sources.Example.via, "site-favicon");
    const cached = await cacheFeedIcons([unknown], { ...options, fetcher: async () => new Response("", { status: 404 }) });
    assert.equal(cached.sources.Example.src, direct.sources.Example.src);
    assert.equal(cached.sources.Example.via, "cached-site-favicon");
    const missing = await cacheFeedIcons([{ ...unknown, source: "Never cached" }], { ...options, fetcher: async () => new Response("", { status: 404 }) });
    assert.equal(missing.sources["Never cached"].src, null);
    assert.equal(missing.sources["Never cached"].via, "initials");
    assert.ok(warnings.some(message => message.includes("initials will be displayed")));
  });
});

test("invalid manifests fail explicitly and importing the favicon helper has no refresh side effects", async () => {
  await withCache(async options => {
    const file = join(options.directory, "source-icons.json");
    writeFileSync(file, "invalid json");
    await assert.rejects(cacheFeedIcons([item()], options), SyntaxError);
    assert.equal(readFileSync(file, "utf8"), "invalid json");
    assert.equal(existsSync(join(options.directory, "manifest.json")), false);
  });
});
