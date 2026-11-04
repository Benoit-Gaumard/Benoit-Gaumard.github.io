import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../../rss-watcher/fetch-updates.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const declaration = name => {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf("\n}", start) + 2);
};
const { decodeFeed, extractTag } = runInNewContext(`
  ${source.match(/const ENTITY_MAP = [^\n]+/)[0]}
  ${["decodeEntities", "decodeFeed", "stripHtml", "unwrapCdata", "extractTag"].map(declaration).join("\n")}
  ({ decodeFeed, extractTag });
`, { TextDecoder, Uint8Array });

test("RSS decoding respects HTTP charset, XML encoding and UTF-8 accents", () => {
  const latin = Buffer.from('<?xml version="1.0" encoding="ISO-8859-1"?><title>Google d\xe9voile Gemini</title>', "latin1");
  assert.equal(extractTag(decodeFeed(latin), "title"), "Google d\u00e9voile Gemini");
  assert.equal(decodeFeed(Buffer.from("caf\xe9", "latin1"), 'text/xml; charset="windows-1252"'), "caf\u00e9");
  assert.equal(decodeFeed(Buffer.from("caf\u00e9")), "caf\u00e9");
  assert.equal(decodeFeed(Buffer.from("\ufeffcaf\u00e9", "utf16le")), "caf\u00e9");
  assert.throws(() => decodeFeed(Buffer.from([0xe9])), /encoded data/i);
});

test("nested HTML entities preserve case, French accents and plain-text descriptions", () => {
  assert.equal(extractTag("<title>Google d&#233;voile Gemini</title>", "title"), "Google d\u00e9voile Gemini");
  assert.equal(extractTag("<description><![CDATA[&#38;Agrave; peine apr&#38;egrave;s les abonn&#38;eacute;s &amp; d&eacute;veloppeurs&nbsp;&oelig;]]></description>", "description"), "\u00c0 peine apr\u00e8s les abonn\u00e9s & d\u00e9veloppeurs \u0153");
  assert.equal(extractTag("<description>&lt;p&gt;Un &eacute;t&eacute;&lt;/p&gt;</description>", "description"), "Un \u00e9t\u00e9");
  assert.equal(extractTag("<title>&#999999999; &unknown;</title>", "title"), "&#999999999; &unknown;");
});
