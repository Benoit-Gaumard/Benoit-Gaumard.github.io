// Build-time wrappers keep the published pages standalone and generator-safe.
const id = value => new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bid="${value}"[^>]*>`, "i");
const cssClass = value => new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bclass="[^"]*\\b${value}\\b[^"]*"[^>]*>`, "i");
const range = (start, end = start) => ({ start, end });

export const toolControlGroups = {
  "/ai-leaderboard/": [range(id("lbControls"), cssClass("lb-toolbar"))],
  "/azure-built-in-roles/": [range(id("rolesControls"))],
  "/azure-ip-ranges/": [range(id("lookupFields")), range(id("browseFields"))],
  "/github-ip-ranges/": [range(id("lookupFields")), range(id("browseFields"))],
  "/azure-policies/": [range(id("policiesControls")), range(id("initiativesControls"))],
  "/azure-policy-aliases/": [range(id("filterControls"))],
  "/azure-taggable-resources/": [range(id("filterControls"))],
  "/azure-regions/": [range(id("directoryControls"))],
  "/emoji-sheet/": [range(cssClass("toolbar"), cssClass("results-bar"))],
  "/icons/": [range(cssClass("toolbar"), cssClass("results-bar"))],
  "/entra-built-in-roles/": [range(id("directoryControls"))],
  "/graph-permissions/": [range(id("graphControls"))],
  "/favorite-links/": [range(cssClass("filter-bar"), cssClass("links-toolbar"))],
  "/friends-websites/": [range(cssClass("filter-bar"), cssClass("friends-toolbar"))],
  "/microsoft-portals/": [range(cssClass("filter-bar"), cssClass("portals-toolbar"))],
  "/it-images/": [range(cssClass("category-bar")), range(cssClass("filter-bar"))],
  "/microsoft-techcommunity-rss-feeds/": [range(id("feedControls"))],
  "/rss-watcher/activity/": [range(id("feedControls"))],
  "/rss-watcher/": [range(id("rssControls"), cssClass("results-bar"))],
  "/prompts/": [range(cssClass("lib-toolbar"), id("categoryChips"))],
  "/slideshow/": [range(cssClass("lib-toolbar"))],
  "/mini-games/": [range(cssClass("game-picker"))],
  "/workflows/": [range(cssClass("workflow-toolbar"), cssClass("workflow-controls"))],
  "/world-clock/": [range(/<(div) class="clock-fields">(?=<div class="clock-field"><label for="zoneInput">)/,
    /<(div) class="clock-actions" role="group" aria-label="Clock view">/)],
  "/azure-built-in-roles/roles-history/": [range(id("historyControls"))],
  "/azure-policy-aliases/aliases-history/": [range(id("historyControls"))],
  "/azure-policies/policies-history/": [range(id("historyControls"))],
  "/azure-policies/initiatives-history/": [range(id("historyControls"))],
  "/azure-policies/compare/": [range(id("controls"))],
};

export const existingToolPanels = {
  "/tools/": "#catalogControls",
  "/azure-naming-convention/": "calculator-card",
  "/guid-generator/": "calculator-card",
  "/percentage-calculator/": "calculator-card",
  "/sla-calculator/": "calculator-card",
  "/subnet-calculator/": "calculator-card",
  "/units-converter/": "converter-card",
  "/random-wheel/": "wheel-panel",
};

const styles = `
  main .tool-controls-panel {
    min-width:0;padding:1.25rem;margin:0 0 1rem;border:1px solid var(--cp-border);
    border-radius:16px;background:var(--cp-surface);
  }
  main .tool-controls-panel[hidden] { display:none; }
  .tool-controls-panel > fieldset { margin-bottom:0; }
  .tool-controls-panel > .toolbar {
    position:static;top:auto;margin:0 0 1rem;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;
  }
  .tool-controls-panel > :last-child { margin-bottom:0; }
  .tool-controls-panel .filter-panel,.tool-controls-panel .roles-filters,.tool-controls-panel .history-extra {
    border:0;background:transparent;padding-inline:0;
  }
  .tool-controls-panel > .filter-bar { margin-bottom:1rem; }
  .tool-controls-panel .category-filter { flex-wrap:wrap;min-width:0;max-width:100%; }
  .tool-controls-panel .category-filter select { flex:1 1 12rem;width:auto;min-width:0;max-width:100%; }
  .ip-section:has(> .tool-controls-panel) {
    padding:0;border:0;border-radius:0;background:transparent;
  }
  .tool-controls-panel > .toolbar::before { content:none; }
  @media(max-width:42rem) { main .tool-controls-panel { padding:.75rem; } }
`;

function elementEnd(html, match) {
  const tag = match[1];
  const tokens = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  tokens.lastIndex = match.index;
  let depth = 0;
  for (let token; (token = tokens.exec(html));) {
    depth += token[0].startsWith("</") ? -1 : 1;
    if (!depth) return tokens.lastIndex;
  }
  throw new Error(`Unclosed tool control element: ${match[0]}`);
}

export function frameToolControls(input, path) {
  const groups = toolControlGroups[path];
  const existing = existingToolPanels[path];
  if (!groups && !existing) return input;
  const eol = input.includes("\r\n") ? "\r\n" : "\n";
  let html = input.replace(/\r\n/g, "\n");
  html = html.replace(/<style data-tool-controls>[\s\S]*?<\/style>\n?/g, "");
  const mainStart = html.indexOf("<main"), mainEnd = html.indexOf("</main>", mainStart);
  if (mainStart < 0 || mainEnd < 0) throw new Error(`Missing tool page main: ${path}`);
  let main = html.slice(mainStart, mainEnd);
  if (existing) {
    if (existing.startsWith("#")) {
      main = main.replace(id(existing.slice(1)), opening => opening.includes('class="tool-controls-panel"')
        ? opening : opening.replace(">", ' class="tool-controls-panel">'));
    } else {
      main = main.replace(new RegExp(`class="${existing}"`, "g"), `class="${existing} tool-controls-panel"`);
    }
    if (!main.includes('tool-controls-panel"')) throw new Error(`Missing existing tool panel on ${path}`);
  } else {
    // Wrappers are persisted in source; generators may replace their contents or entire sections.
    // Remove only our markers before regrouping, never IDs or control state.
    main = main.replace(/<!-- tool-controls:start --><div class="tool-controls-panel"(?: role="region" aria-label="Filters and options")?>/g, "")
      .replace(/<\/div><!-- tool-controls:end -->/g, "");
    let cursor = 0;
    for (const group of groups) {
      const remainder = main.slice(cursor);
      const first = group.start.exec(remainder);
      if (!first) throw new Error(`Missing tool controls on ${path}: ${group.start}`);
      const start = cursor + first.index;
      const last = group.end.exec(main.slice(start));
      if (!last) throw new Error(`Missing tool control group end on ${path}: ${group.end}`);
      last.index += start;
      const end = elementEnd(main, last);
      const content = main.slice(start, end);
      const opening = '<!-- tool-controls:start --><div class="tool-controls-panel" role="region" aria-label="Filters and options">';
      main = main.slice(0, start) + opening + content + "</div><!-- tool-controls:end -->" + main.slice(end);
      cursor = start + opening.length + content.length + "</div><!-- tool-controls:end -->".length;
    }
  }
  html = html.slice(0, mainStart) + main + html.slice(mainEnd);
  html = html.replace("</head>", `<style data-tool-controls>${styles}</style>\n</head>`);
  return html.replace(/\n/g, eol);
}
