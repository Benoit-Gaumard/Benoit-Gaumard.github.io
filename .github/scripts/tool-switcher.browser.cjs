// Run with SITE_UX_HARNESS pointing to the existing site-check-harness.cjs.
const runSuite = require(process.env.SITE_UX_HARNESS);

runSuite("tool-switcher", async ({ context, test, base, assert, fs, path, root, artifacts }) => {
  const catalogue = fs.readFileSync(path.join(root, "tools", "index.html"), "utf8");
  const tools = [...catalogue.matchAll(/<article class="tool-card" data-tool-id="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)]
    .map(([, href, card]) => ({ href, title: card.match(/<h2\b[^>]*>([^<]+)<\/h2>/)[1].replace(/&amp;/g, "&") }));
  const routes = ["/tools/", ...tools.map(tool => tool.href), "/azure-policies/policies-history/", "/azure-policies/initiatives-history/",
    "/azure-built-in-roles/roles-history/", "/azure-policy-aliases/aliases-history/", "/rss-watcher/activity/"];
  const open = async page => {
    await page.locator("#siteToolSwitcher > summary").click();
    await page.waitForFunction(() => document.activeElement.id === "siteToolSearch");
  };
  const assertClosed = page => page.waitForFunction(() => !document.getElementById("siteToolSwitcher").open);
  const visibleLinks = page => page.locator("#siteToolLinks > li:not([hidden]) > a");
  const assertLayout = async page => {
    const result = await page.evaluate(() => {
      const panel = document.getElementById("siteToolPanel").getBoundingClientRect();
      const header = document.querySelector(".site-header").getBoundingClientRect();
      const summary = document.querySelector("#siteToolSwitcher > summary").getBoundingClientRect();
      const controls = [...document.querySelectorAll(".site-header .brand,.site-header .menu-toggle,.site-header .header-links a,.site-header .social-link,.site-header .theme-toggle,#siteToolSwitcher > summary")]
        .filter(node => node.checkVisibility()).map(node => {
          const box = node.getBoundingClientRect();
          return { name: node.id || node.className || node.tagName, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        });
      return {
        panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom },
        header: { top: header.top, bottom: header.bottom },
        controls, summaryHeight: summary.height, viewport: { width: innerWidth, height: innerHeight },
        overflow: document.documentElement.scrollWidth - innerWidth,
        panelOverflow: document.getElementById("siteToolPanel").scrollWidth - document.getElementById("siteToolPanel").clientWidth,
        rows: [...document.querySelectorAll(".site-tool-link")].filter(node => node.checkVisibility()).map(node => node.getBoundingClientRect().height),
      };
    });
    assert.ok(result.overflow <= 1 && result.panelOverflow <= 1, JSON.stringify(result));
    assert.ok(result.panel.left >= 0 && result.panel.right <= result.viewport.width + 1, JSON.stringify(result.panel));
    assert.ok(result.panel.top >= result.header.bottom - 1 && result.panel.bottom <= result.viewport.height, JSON.stringify(result));
    assert.ok(result.summaryHeight >= 44 && result.rows.every(height => height >= 44));
    for (let i = 0; i < result.controls.length; i++) {
      const a = result.controls[i];
      assert.ok(a.left >= 0 && a.right <= result.viewport.width + 1, a.name);
      for (const b of result.controls.slice(i + 1)) {
        assert.ok(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1,
          `Header overlap: ${a.name} / ${b.name}`);
      }
    }
  };
  for (const [width, theme] of [[390, "dark"], [1440, "light"]]) {
    await test(`all 36 tool and nested pages expose working navigation ${width} ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const route of routes) {
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        assert.equal(await page.locator("#siteToolSwitcher").count(), 1, route);
        await open(page);
        const hrefs = await visibleLinks(page).evaluateAll(links => links.map(link => link.getAttribute("href")));
        assert.deepEqual([...hrefs].sort(), tools.map(tool => tool.href).sort(), route);
        const current = page.locator("#siteToolSwitcher a[aria-current]");
        assert.equal(await current.count(), 1, route);
        const expected = tools.find(tool => route.startsWith(tool.href))?.href || "/tools/";
        assert.equal(await current.getAttribute("href"), expected);
        assert.equal(await current.getAttribute("aria-current"), expected === route ? "page" : "location");
        await assertLayout(page);
        assert.equal(await page.locator("#primaryNav a[href='/tools/']").getAttribute("aria-current"), route === "/tools/" ? "page" : "location");
        if (route === "/friends-websites/") {
          await page.screenshot({ path: path.join(artifacts, `tool-switcher-${width}-${theme}.png`) });
        }
        await page.keyboard.press("Escape");
        await assertClosed(page);
        assert.equal(await page.locator("#siteToolSwitcher > summary").evaluate(node => node === document.activeElement), true);
        assert.deepEqual(errors, [], route);
      }
      await ctx.close();
    });
  }
  await test("search, direct navigation, keyboard and local state isolation", async () => {
    const ctx = await context(), page = await ctx.newPage();
    await page.goto(`${base}/friends-websites/?searchInput=David&utm_source=test#top`);
    await page.locator(".friend-card").first().waitFor();
    const originalUrl = page.url(), preferences = await page.evaluate(() => JSON.stringify(localStorage));
    await open(page);
    const input = page.locator("#siteToolSearch");
    await input.fill("àZURE RBAC");
    assert.equal(await visibleLinks(page).count(), 1);
    assert.equal(await visibleLinks(page).getAttribute("href"), "/azure-built-in-roles/");
    await input.fill("<no such tool>");
    assert.equal(await visibleLinks(page).count(), 0);
    assert.equal(await page.locator(".site-tool-empty").isVisible(), true);
    await input.press("Enter");
    assert.equal(page.url(), originalUrl);
    await page.locator("[data-tool-search-clear]").click();
    assert.equal(await visibleLinks(page).count(), 30);
    await input.press("ArrowDown");
    assert.equal(await visibleLinks(page).first().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("End");
    assert.equal(await visibleLinks(page).last().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("ArrowDown");
    assert.equal(await visibleLinks(page).first().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Home");
    assert.equal(await visibleLinks(page).first().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press("Escape");
    await assertClosed(page);
    assert.equal(page.url(), originalUrl);
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), preferences);
    assert.equal(await page.locator("#searchInput").inputValue(), "David");
    await open(page);
    await input.fill("world clock");
    await input.press("Enter");
    await page.waitForURL(base + "/world-clock/");
    assert.equal(ctx.pages().length, 1);
    await open(page);
    await input.fill("Icons");
    await page.locator(".site-tool-link[href='/icons/']").click();
    await page.waitForURL(base + "/icons/");
    await page.goBack();
    await assertClosed(page);
    await ctx.close();
  });
  await test("mobile primary menu, focus and outside click close the switcher", async () => {
    const ctx = await context({ viewport: { width: 320, height: 700 } }), page = await ctx.newPage();
    await page.goto(base + "/tools/");
    await page.locator("#menuToggle").click();
    assert.equal(await page.locator("#primaryNav").isVisible(), true);
    await open(page);
    assert.equal(await page.locator("#menuToggle").getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#primaryNav").isVisible(), false);
    await assertLayout(page);
    await page.locator("#menuToggle").click();
    await assertClosed(page);
    assert.equal(await page.locator("#primaryNav").isVisible(), true);
    await open(page);
    await page.locator("#themeToggle").click();
    await assertClosed(page);
    await open(page);
    await page.locator("#toolSearch").focus();
    await assertClosed(page);
    await open(page);
    await page.locator("body").click({ position: { x: 2, y: 400 } });
    await assertClosed(page);
    await ctx.close();
  });
  await test("narrow landscape and sticky headers keep the menu within the viewport", async () => {
    const ctx = await context({ viewport: { width: 320, height: 480 } }), page = await ctx.newPage();
    await page.goto(base + "/azure-policies/");
    await open(page);
    await assertLayout(page);
    await page.keyboard.press("Escape");
    await page.evaluate(() => scrollTo(0, 700));
    await open(page);
    await assertLayout(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await assertLayout(page);
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator("#siteToolSwitcher").isVisible(), false);
    await ctx.close();
  });
  for (const width of [320, 1440]) {
    await test(`native links remain available without JavaScript at ${width}px`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, javaScriptEnabled: false }), page = await ctx.newPage();
      await page.goto(base + "/friends-websites/");
      await page.locator("#siteToolSwitcher > summary").click();
      assert.equal(await page.locator("#siteToolSearch").isVisible(), false);
      assert.equal(await visibleLinks(page).count(), 30);
      await assertLayout(page);
      await page.locator(".site-tool-link[href='/world-clock/']").click();
      await page.waitForURL(base + "/world-clock/");
      await ctx.close();
    });
  }
  await test("primary non-tool pages remain unchanged and tool menus do not depend on stored data", async () => {
    const ctx = await context(), page = await ctx.newPage();
    for (const route of ["/", "/index_fr.html", "/articles/", "/articles/azure-policy-part-1-what-is-a-policy/", "/privacy/", "/404.html"]) {
      await page.goto(base + route);
      assert.equal(await page.locator("#siteToolSwitcher").count(), 0, route);
    }
    await ctx.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error("Storage disabled"); }; });
    await page.goto(base + "/tools/");
    await open(page);
    assert.equal(await visibleLinks(page).count(), 30);
    await page.locator("#siteToolSearch").fill("guid");
    assert.equal(await visibleLinks(page).count(), 1);
    await ctx.close();
  });
});
