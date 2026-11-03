import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { test } from "node:test";
import assert from "node:assert/strict";
import { frameToolControls, toolControlGroups, existingToolPanels } from "../../tool-controls.mjs";
import { enhancePage, parseToolNavigation } from "../../site-ui.mjs";

const read = path => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const routes = [...Object.keys(toolControlGroups), ...Object.keys(existingToolPanels)];

test("every registered tool uses the shared panel or the release reference panel", () => {
  for (const { href } of parseToolNavigation(read("tools/index.html"))) {
    const source = read(href.slice(1) + "index.html");
    assert.match(source, /class="[^"]*(?:tool-controls-panel|news-controls-panel)/, href);
  }
});

for (const path of routes) {
  test(`${path}: panels persist, remain standalone and are repeatable`, () => {
    const source = read(path.slice(1) + "index.html");
    assert.equal(frameToolControls(source, path), source);
    const regenerated = enhancePage(source, { path });
    assert.equal(enhancePage(regenerated, { path }), regenerated);
    assert.equal([...source.matchAll(/<style data-tool-controls>/g)].length, 1);
    assert.doesNotMatch(source, /\r\r/);
    assert.match(source, /border-radius:16px;background:var\(--cp-surface\)/);
    assert.match(source, /@media\(max-width:42rem\)/);
    const groups = toolControlGroups[path];
    if (groups) {
      assert.equal([...source.matchAll(/<!-- tool-controls:start -->/g)].length, groups.length);
      assert.equal([...source.matchAll(/<!-- tool-controls:end -->/g)].length, groups.length);
    }
    for (const [, attrs, body] of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (!/application\/(?:ld\+)?json/.test(attrs)) new Script(body, { filename: path });
    }
  });
}

test("wrapping never changes controls, scripts, IDs or result containers", () => {
  for (const path of Object.keys(toolControlGroups)) {
    const source = read(path.slice(1) + "index.html");
    const unwrapped = source.replace(/<style data-tool-controls>[\s\S]*?<\/style>\r?\n?/g, "")
      .replace(/<!-- tool-controls:start --><div class="tool-controls-panel" role="region" aria-label="Filters and options">/g, "")
      .replace(/<\/div><!-- tool-controls:end -->/g, "");
    const framed = frameToolControls(unwrapped, path);
    assert.equal(framed, source, path);
    const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(ids(framed), ids(unwrapped), path);
  }
});

test("unrelated content and existing release panels are not changed", () => {
  for (const path of ["/privacy/", "/articles/", "/azure-release-updates/", "/m365-release-updates/", "/aws-release-updates/"]) {
    const source = read(path.slice(1) + "index.html");
    assert.equal(frameToolControls(source, path), source);
  }
});
