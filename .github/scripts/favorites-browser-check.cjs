// Run with SITE_UX_HARNESS pointing to the existing site-check-harness.cjs.
const runSuite = require(process.env.SITE_UX_HARNESS);

runSuite("favorite-stars", async ({ context, test, base, assert, artifacts, path }) => {
  const surfaces = [
    { route: "/tools/", star: ".favorite-button", filter: "#favoritesFilter", view: '[data-view="list"]' },
    { route: "/articles/", star: ".favorite-button", filter: "#favoritesFilter", view: "#viewList" },
    { route: "/icons/", star: ".favorite-button", filter: "#favoritesFilter" },
    { route: "/emoji-sheet/", star: ".favorite-button", filter: "#favoritesFilter" },
    { route: "/favorite-links/", star: ".favorite-button", filter: "#favoritesFilter" },
    { route: "/azure-policies/", star: ".fav-button", view: '[data-view="cards"]' },
    { route: "/azure-policies/?tab=initiatives", star: ".fav-button", view: '[data-view="cards"]' },
    { route: "/rss-watcher/?lastUpdate=", star: ".favorite-button", filter: "#favoritesToggle", view: "#viewList" },
    ...["azure", "m365", "aws"].map(provider => ({
      route: `/${provider}-release-updates/?lastUpdate=`,
      star: ".news-favorite", filter: "#favoritesFilter", disclosure: "#newsOptions > summary",
    })),
  ];
  const favoriteClasses = ".favorite-button,.fav-button,.news-favorite,.favorites-filter";
  const palette = { light: "rgb(150, 97, 10)", dark: "rgb(228, 169, 64)" };

  function rgba(value) {
    const match = value.match(/^rgba?\(([^)]+)\)$/);
    assert.ok(match, `Unsupported computed color: ${value}`);
    const values = match[1].split(",").map(Number);
    return [...values.slice(0, 3), values[3] ?? 1];
  }
  function luminance(rgb) {
    const linear = rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return linear.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  }
  async function readUnselected(page, selector) {
    const rendered = await page.waitForFunction(selector => {
      const node = [...document.querySelectorAll(selector)].find(node => node.getBoundingClientRect().height > 0);
      if (!node || node.getAttribute("aria-pressed") !== "false") return false;
      const style = {
        color: getComputedStyle(node).color,
        fill: getComputedStyle(node.querySelector("svg path")).fill,
      };
      return style.color && style.fill === "none" && style;
    }, selector, { timeout: 10000 });
    const style = await rendered.jsonValue();
    await rendered.dispose();
    return style;
  }
  async function checkSelected(page, selector, theme) {
    const rendered = await page.waitForFunction(({ selector, color }) => {
      const node = [...document.querySelectorAll(selector)].find(node => node.getBoundingClientRect().height > 0);
      if (!node || node.getAttribute("aria-pressed") !== "true") return false;
      const css = getComputedStyle(node), backgrounds = [];
      for (let parent = node; parent; parent = parent.parentElement) {
        backgrounds.push(getComputedStyle(parent).backgroundColor);
      }
      const style = {
        color: css.color, border: css.borderTopColor, background: css.backgroundColor, backgrounds,
        fills: [...node.querySelectorAll("svg path")].map(svg => getComputedStyle(svg).fill),
      };
      return style.color === color && style.border === color && style.fills.every(fill => fill === color) && style;
    }, { selector, color: palette[theme] }, { timeout: 10000 });
    const style = await rendered.jsonValue();
    await rendered.dispose();
    assert.equal(style.color, palette[theme]);
    assert.equal(style.border, style.color);
    assert.notEqual(style.background, "rgba(0, 0, 0, 0)");
    assert.ok(style.fills.every(fill => fill === style.color), JSON.stringify(style.fills));
    const background = style.backgrounds.reverse().reduce((under, color) => {
      const over = rgba(color);
      return under.map((value, index) => over[index] * over[3] + value * (1 - over[3]));
    }, [255, 255, 255]);
    const levels = [luminance(rgba(style.color).slice(0, 3)), luminance(background)].sort((a, b) => a - b);
    const contrast = (levels[1] + .05) / (levels[0] + .05);
    assert.ok(contrast >= 4.5, `Favorite contrast is ${contrast.toFixed(2)}:1`);
  }

  for (const width of [390, 1440]) {
    for (const theme of ["light", "dark"]) {
      for (const surface of surfaces) {
        await test(`${surface.route} ${width} ${theme}: favorite, hover, reload, view and removal`, async () => {
          const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
          try {
            const page = await ctx.newPage(), errors = [];
            page.on("pageerror", error => errors.push(error.message));
            const url = new URL(surface.route, base);
            url.searchParams.set("scoutTheme", theme);
            await page.goto(url.href);
            const first = page.locator(`${surface.star}:visible`).first();
            const selectedSelector = `${surface.star}[aria-pressed="true"]`;
            const selected = page.locator(`${selectedSelector}:visible`).first();
            await first.waitFor();
            assert.equal(await first.getAttribute("aria-pressed"), "false");
            const original = await readUnselected(page, surface.star);
            await first.press("Space");
            await selected.waitFor();
            await checkSelected(page, selectedSelector, theme);
            assert.equal(await selected.evaluate(node => node.matches(":focus-visible")), true);
            assert.notEqual(await selected.evaluate(node => getComputedStyle(node).outlineStyle), "none");
            await selected.hover();
            await checkSelected(page, selectedSelector, theme);

            if (surface.route.startsWith("/rss-watcher/") && ((width === 1440 && theme === "light") || (width === 390 && theme === "dark"))) {
              await selected.locator("xpath=..").screenshot({
                path: path.join(artifacts, `favorite-star-rss-${width}-${theme}.png`),
              });
            }
            await page.reload();
            await selected.waitFor();
            await checkSelected(page, selectedSelector, theme);
            if (surface.view) {
              await page.locator(surface.view).click();
              await selected.waitFor();
              await checkSelected(page, selectedSelector, theme);
            }
            if (surface.filter) {
              if (surface.disclosure) await page.locator(surface.disclosure).click();
              await page.locator(surface.filter).click();
              assert.equal(await page.locator(surface.filter).getAttribute("aria-pressed"), "true");
              await checkSelected(page, surface.filter, theme);
              await checkSelected(page, selectedSelector, theme);
            }
            const unrelated = await page.locator(`button[aria-pressed="true"]:not(:is(${favoriteClasses}))`).evaluateAll(nodes =>
              nodes.filter(node => node.getBoundingClientRect().height > 0).map(node => getComputedStyle(node).color));
            assert.ok(unrelated.every(color => color !== palette[theme]), JSON.stringify(unrelated));
            await selected.press("Space");
            assert.equal(await page.locator(`${surface.star}[aria-pressed="true"]:visible`).count(), 0);
            if (surface.filter) await page.locator(surface.filter).click();
            await page.mouse.move(0, 0);
            await page.reload();
            await first.waitFor();
            assert.equal(await first.getAttribute("aria-pressed"), "false");
            const removed = await readUnselected(page, surface.star);
            assert.deepEqual(removed, original);
            assert.equal(await page.locator('[data-share="favorite"][aria-pressed="true"]').count(), 0);
            assert.deepEqual(errors, []);
          } finally {
            await ctx.close();
          }
        });
      }
    }
  }
});
