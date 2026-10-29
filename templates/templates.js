(() => {
  "use strict";
  const concepts = [
    ["01-studio.html", "01 / Studio"],
    ["02-bento.html", "02 / Bento"],
    ["03-workspace.html", "03 / Workspace"],
    ["04-spotlight.html", "04 / Spotlight"],
    ["05-journal.html", "05 / Journal"],
  ];
  const groups = [
    ["all", "All tools"],
    ["azure", "Cloud & identity"],
    ["news", "News & AI"],
    ["calculators", "Calculators"],
    ["utilities", "Utilities"],
    ["assets", "Creative library"],
    ["community", "Community"],
  ];
  const tools = [
    ["azure-policies", "Azure Policies", "Explore built-in policies, initiatives and their official versions.", "azure", "shield"],
    ["ai-leaderboard", "AI Leaderboard", "Compare the latest language models, rankings, context windows and prices.", "news", "chart"],
    ["prompts", "Prompts", "Ready-to-use prompts for Azure, infrastructure as code and DevOps.", "assets", "spark"],
    ["subnet-calculator", "Subnet Calculator", "Calculate IPv4 subnets, network ranges and address allocations.", "calculators", "network"],
    ["azure-regions", "Azure Regions", "Explore Azure datacenter locations and regional information worldwide.", "azure", "globe"],
    ["azure-naming-convention", "Azure Naming Convention", "Generate resource names using Cloud Adoption Framework conventions.", "azure utilities", "code"],
    ["azure-taggable-resources", "Azure Taggable Resources", "Check resource tag support and visibility in cost reports.", "azure", "tag"],
    ["azure-policy-aliases", "Azure Policy Aliases", "Find supported aliases when authoring custom policy definitions.", "azure", "code"],
    ["azure-built-in-roles", "Azure Built-in Roles", "Find RBAC roles, assignable scopes and per-action descriptions.", "azure", "shield"],
    ["entra-built-in-roles", "Entra ID Built-in Roles", "Browse directory roles, permissions and privileged-role indicators.", "azure", "shield"],
    ["graph-permissions", "Microsoft Graph Permissions", "Explore delegated, application and resource-specific permissions.", "azure", "network"],
    ["azure-ip-ranges", "Azure IP Ranges", "Look up Azure IP addresses and service tags from official data.", "azure", "network"],
    ["github-ip-ranges", "GitHub IP Ranges", "Look up the IP address ranges used by GitHub services.", "utilities", "code"],
    ["azure-release-updates", "Azure Release Updates", "Keep up with the latest Azure service announcements.", "news", "news"],
    ["m365-release-updates", "M365 Updates", "Follow the Microsoft 365 roadmap and product updates.", "news", "news"],
    ["aws-release-updates", "AWS Updates", "Discover the latest announcements from AWS What's New.", "news", "news"],
    ["rss-watcher", "RSS Watcher", "Read current tech news from multiple feeds in one place.", "news", "news"],
    ["microsoft-techcommunity-rss-feeds", "Microsoft Techcommunity RSS Feeds", "Bring Microsoft Tech Community blog activity into one feed.", "news", "news"],
    ["percentage-calculator", "Percentage Calculator", "Calculate percentages, changes, increases and reductions.", "calculators", "calculator"],
    ["sla-calculator", "SLA Calculator", "Translate service availability targets into allowed downtime.", "calculators", "shield"],
    ["units-converter", "Units Converter", "Convert length, weight, temperature, data, time and more.", "calculators", "calculator"],
    ["guid-generator", "GUID Generator", "Generate random UUIDs with flexible formatting options.", "utilities", "code"],
    ["random-wheel", "Random Wheel", "Pick a random letter or number, without repeating previous picks.", "utilities", "spark"],
    ["mini-games", "Mini Games", "Take a break with five keyboard, mouse and touch-friendly games.", "utilities", "grid"],
    ["icons", "Icons", "Find and download Azure SVG icons for diagrams and documents.", "assets", "grid"],
    ["emoji-sheet", "Emoji", "Discover copy-ready emojis and their shortcodes.", "assets", "spark"],
    ["it-images", "IT Images & Memes", "A collection of developer humor and technology memes.", "assets", "image"],
    ["slideshow", "Slideshow", "Explore presentation decks with chapters and full-screen playback.", "assets", "image"],
    ["favorite-links", "My Favorite Links", "A curated collection of useful websites, references and resources.", "community", "bookmark"],
    ["friends-websites", "My Friends' Websites", "Meet the websites of friends and colleagues in the community.", "community", "globe"],
    ["microsoft-portals", "Microsoft Portals", "Find the right Microsoft administration portal for your task.", "azure community", "grid"],
    ["world-clock", "World Clock", "See the time in Paris and your colleagues' time zones at a glance.", "utilities", "clock"],
    ["workflows", "Workflows", "Check the live status of the site's scheduled data refreshes.", "utilities", "network"],
  ].map(([id, name, description, categories, icon]) => ({ id, name, description, categories: categories.split(" "), icon }));
  const paths = {
    search: ["M21 21l-5-5", "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"],
    shield: ["M12 3l8 3v6c0 5-8 9-8 9S4 17 4 12V6z", "m8 12 3 3 5-6"],
    chart: ["M4 3v17h17", "M8 15v-4m5 4V7m5 8V4"],
    spark: ["m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"],
    network: ["M9 3h6v5H9z", "M2 16h6v5H2zm14 0h6v5h-6z", "M12 8v4M5 16v-4h14v4"],
    globe: ["M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0", "M3 12h18", "M12 3c-5 5-5 13 0 18 5-5 5-13 0-18"],
    code: ["m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 20"],
    tag: ["M3 3h8l10 10-8 8L3 11z", "M7 7h.01"],
    news: ["M4 3h16v18H4z", "M8 7h8M8 11h8m-8 4h3m-3 3h8"],
    calculator: ["M5 2h14v20H5z", "M8 6h8m-8 5h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"],
    grid: ["M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z"],
    image: ["M3 4h18v16H3z", "m3 13 5-5 7 8 3-3 3 3", "M16 8h.01"],
    bookmark: ["M6 3h12v18l-6-4-6 4z"],
    clock: ["M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0", "M12 7v5l3 2"],
    theme: ["M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0", "M12 3v18"],
  };
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(key, value);
    for (const d of paths[name] || paths.grid) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", d);
      svg.append(path);
    }
    return svg;
  }
  function link(href, text, className) {
    const a = node("a", className, text);
    a.href = href;
    return a;
  }
  const design = document.body.dataset.design;
  const review = document.getElementById("review");
  if (review) {
    const inner = node("div", "wrap review-inner");
    const label = node("div", "review-label");
    label.append(link("./", "All 5 concepts", "back-link"), node("span", "", "/"), node("strong", "", "Design study"));
    inner.append(label);
    if (design) {
      const select = node("select");
      select.setAttribute("aria-label", "Switch design concept");
      for (const [href, name] of concepts) {
        const option = new Option(name, href);
        option.selected = href.includes(design);
        select.add(option);
      }
      select.addEventListener("change", () => {
        const destination = new URL(select.value, location.href);
        destination.searchParams.set("scoutTheme", document.documentElement.dataset.theme);
        location.href = destination.href;
      });
      inner.append(select);
    } else inner.append(node("span", "muted", "Tools / UI exploration"));
    review.append(inner);
  }
  const header = document.getElementById("header");
  if (header) {
    const inner = node("div", "wrap header-inner");
    const brand = link("/", "", "brand");
    brand.append(node("span", "brand-mark", "BG"), node("span", "", "benoit-gaumard.io"));
    const nav = node("nav", "top-nav");
    nav.setAttribute("aria-label", "Main navigation");
    nav.append(link("/", "Home"), link("/articles/", "Articles"));
    const toolsLink = link("/tools/", "Tools");
    toolsLink.setAttribute("aria-current", "page");
    const theme = node("button", "theme-button");
    theme.type = "button";
    theme.append(icon("theme"));
    function updateThemeLabel() {
      theme.setAttribute("aria-label", document.documentElement.dataset.theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    theme.addEventListener("click", () => {
      const value = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = value;
      const url = new URL(location.href);
      url.searchParams.set("scoutTheme", value);
      history.replaceState(null, "", url);
      updateThemeLabel();
    });
    updateThemeLabel();
    nav.append(toolsLink, theme);
    inner.append(brand, nav);
    header.append(inner);
  }
  document.querySelectorAll("[data-icon]").forEach(element => element.append(icon(element.dataset.icon)));
  if (!design) return;

  const storageKey = "tools-design-study-favorites";
  const state = { query: "", category: "all", savedOnly: false, favorites: new Set() };
  const notice = document.getElementById("storageNotice");
  function storageError(error) {
    console.warn("Design study favorites could not be stored.", error);
    notice.hidden = false;
    notice.textContent = "Favorites work for this visit, but your browser could not save them.";
  }
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(stored) || stored.some(id => typeof id !== "string")) throw new Error("Invalid saved tool list.");
    state.favorites = new Set(stored.filter(id => tools.some(tool => tool.id === id)));
  } catch (error) { storageError(error); }
  const searchHost = document.getElementById("searchHost");
  const search = node("div", "search-box");
  const input = node("input");
  input.type = "search";
  input.id = "toolSearch";
  input.autocomplete = "off";
  input.placeholder = design === "spotlight" ? "What would you like to do?" : "Find a tool, a reference, an idea...";
  input.setAttribute("aria-label", "Search tools");
  input.setAttribute("aria-controls", "toolResults");
  search.append(icon("search"), input, node("kbd", "", "/"));
  searchHost.append(search);
  const filterHost = document.getElementById("filters");
  filterHost.setAttribute("role", "group");
  filterHost.setAttribute("aria-label", "Filter by collection");
  const filterButtons = new Map();
  for (const [value, label] of groups) {
    const button = node("button", "filter", label);
    button.type = "button";
    button.dataset.category = value;
    button.append(node("span", "", String(tools.filter(tool => value === "all" || tool.categories.includes(value)).length)));
    button.addEventListener("click", () => { state.category = value; render(); });
    filterHost.append(button);
    filterButtons.set(value, button);
  }
  const saved = document.getElementById("savedToggle");
  saved.append(icon("bookmark"), node("span"));
  saved.addEventListener("click", () => { state.savedOnly = !state.savedOnly; render(); });
  const resultHost = document.getElementById("toolResults");
  const resultCount = document.getElementById("resultCount");
  const empty = document.getElementById("empty");
  const clear = document.getElementById("clearFilters");
  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function reset() {
    state.query = ""; state.category = "all"; state.savedOnly = false; input.value = ""; render(); input.focus();
  }
  clear.addEventListener("click", reset);
  document.getElementById("emptyReset").addEventListener("click", reset);
  input.addEventListener("input", () => { state.query = input.value; render(); });
  input.addEventListener("keydown", event => {
    if (event.key === "Escape") { input.value = ""; state.query = ""; render(); }
    if (event.key === "Enter") {
      const matches = resultHost.querySelectorAll(".tool-link");
      if (matches.length === 1) matches[0].click();
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest("input, textarea, select, [contenteditable]")) {
      event.preventDefault(); input.focus();
    }
  });
  function saveFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
    try { localStorage.setItem(storageKey, JSON.stringify([...state.favorites])); }
    catch (error) { storageError(error); }
  }
  function toolCard(tool) {
    const card = node("article", "tool");
    card.dataset.tool = tool.id;
    const a = link(`/${tool.id}/`, "", "tool-link");
    const symbol = node("span", "tool-icon");
    symbol.append(icon(tool.icon));
    const title = node("h3", "", tool.name);
    const category = groups.find(([id]) => id === tool.categories[0])[1];
    const action = node("span", "tool-action");
    action.append(node("span", "", "Open tool"), node("span", "arrow", "\u2192"));
    action.lastChild.setAttribute("aria-hidden", "true");
    a.append(symbol, node("span", "tool-category", category), title, node("p", "", tool.description), action);
    const button = node("button", "save");
    button.type = "button";
    button.dataset.save = tool.id;
    const updateButton = () => {
      const active = state.favorites.has(tool.id);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", `${active ? "Unsave" : "Save"} ${tool.name}`);
    };
    button.append(icon("bookmark"));
    updateButton();
    button.addEventListener("click", () => {
      saveFavorite(tool.id);
      if (state.savedOnly) {
        const previous = [...resultHost.querySelectorAll(".save")].indexOf(button);
        render();
        const buttons = resultHost.querySelectorAll(".save");
        (buttons[Math.min(previous, buttons.length - 1)] || saved).focus();
      } else {
        updateButton(); updateSaved();
      }
    });
    card.append(a, button);
    return card;
  }
  function updateSaved() {
    saved.setAttribute("aria-pressed", String(state.savedOnly));
    saved.querySelector("span").textContent = `Saved (${state.favorites.size})`;
  }
  function render() {
    const query = normalize(state.query.trim());
    const matches = tools.filter(tool =>
      (state.category === "all" || tool.categories.includes(state.category)) &&
      (!state.savedOnly || state.favorites.has(tool.id)) &&
      normalize(`${tool.name} ${tool.description} ${tool.categories.join(" ")} ${groups.find(([id]) => id === tool.categories[0])[1]}`).includes(query));
    resultHost.replaceChildren();
    const isFiltered = Boolean(query || state.category !== "all" || state.savedOnly);
    resultHost.classList.toggle("is-curated", !isFiltered);
    resultCount.textContent = `${matches.length} ${matches.length === 1 ? "tool" : "tools"}${isFiltered ? " found" : " to explore"}`;
    empty.hidden = matches.length > 0;
    clear.hidden = !isFiltered;
    updateSaved();
    filterButtons.forEach((button, value) => button.setAttribute("aria-pressed", String(state.category === value)));
    const grouped = ["spotlight", "journal"].includes(design);
    if (!grouped) { resultHost.append(...matches.map(toolCard)); return; }
    const sections = state.category === "all" ? groups.slice(1) : groups.filter(([id]) => id === state.category);
    let number = 0;
    for (const [id, label] of sections) {
      const rows = matches.filter(tool => state.category === "all" ? tool.categories[0] === id : tool.categories.includes(id));
      if (!rows.length) continue;
      number++;
      const section = node("section", "collection");
      const heading = node("div", "collection-heading");
      const title = node("h2", "", label);
      if (design === "journal") title.prepend(node("small", "", `COLLECTION ${String(number).padStart(2, "0")}`));
      heading.append(title, node("span", "", `${rows.length} tools`));
      const grid = node("div", "section-tools");
      grid.append(...rows.map(toolCard));
      section.append(heading, grid);
      resultHost.append(section);
    }
  }
  window.addEventListener("storage", event => {
    if (event.key !== storageKey) return;
    try {
      const next = JSON.parse(event.newValue || "[]");
      if (!Array.isArray(next) || next.some(id => typeof id !== "string")) throw new Error("Invalid saved tool list.");
      state.favorites = new Set(next.filter(id => tools.some(tool => tool.id === id)));
      render();
    } catch (error) { storageError(error); }
  });
  render();
})();
