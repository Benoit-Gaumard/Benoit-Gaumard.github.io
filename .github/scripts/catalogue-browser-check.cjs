// Run with SITE_UX_HARNESS pointing to the session's site-check-harness.cjs.
const runSuite = require(process.env.SITE_UX_HARNESS);
runSuite("catalogue-ux", async ({ context, test, base, assert, artifacts, path }) => {
  const pages = {
    icons: ".icon-card", "emoji-sheet": ".emoji-card", "it-images": ".image-card",
    "favorite-links": ".link-card", "friends-websites": ".friend-card", "microsoft-portals": ".portal-card",
  };
  for (const width of [320, 390, 1440]) {
    for (const theme of ["light", "dark"]) {
      await test(`six-page layout ${width} ${theme}`, async () => {
        const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        for (const [slug, card] of Object.entries(pages)) {
          await page.goto(`${base}/${slug}/?scoutTheme=${theme}`);
          await page.locator(card).first().waitFor();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${slug}: horizontal overflow`);
          assert.equal((await page.locator("html").getAttribute("data-theme")) || "light", theme);
          const controls = await page.locator("main input:not([type=checkbox]), main select").evaluateAll((nodes) => nodes.filter((node) => node.getBoundingClientRect().height > 0).map((node) => ({ id: node.id, height: node.getBoundingClientRect().height })));
          assert.ok(controls.every((control) => control.height >= 44 && control.height < 75), JSON.stringify({ slug, controls }));
          if (slug === "icons" || slug === "emoji-sheet") {
            assert.equal(await page.locator("#perPage").isVisible(), false);
            await page.locator(".extra-filters summary").click();
            assert.equal(await page.locator("#perPage").isVisible(), true);
            await page.locator(".extra-filters summary").click();
          }
          if (slug === "it-images") {
            const image = await page.locator(".preview-button").first().boundingBox();
            const text = await page.locator(".card-copy").first().boundingBox();
            assert.ok(text.y >= image.y + image.height - 1, "description must not overlay image");
          }
          await page.screenshot({ path: path.join(artifacts, `catalogue-${slug}-${width}-${theme}.png`) });
        }
        assert.deepEqual(errors, []);
      });
    }
  }
  await test("icons URL filters, compact preview, density and favorite focus isolation", async () => {
    const ctx = await context();
    const page = await ctx.newPage();
    await page.goto(`${base}/icons/?search=virtual&source=Microsoft&category=compute&density=compact&scoutTheme=dark`);
    await page.waitForFunction(() => document.querySelector("#gallery").getAttribute("aria-busy") === "false");
    assert.equal(await page.locator("#source").inputValue(), "Microsoft");
    assert.equal(await page.locator("#category").inputValue(), "compute");
    assert.equal(await page.locator("#gallery").getAttribute("data-density"), "compact");
    assert.ok(await page.locator(".icon-card").count());
    assert.match(await page.locator(".icon-card .category").first().textContent(), /Microsoft/);
    assert.equal(await page.locator(".icon-card .variant").count(), 0);
    await page.locator(".favorite-button").first().click();
    assert.equal(await page.locator("#previewDialog").evaluate((node) => node.open), false);
    await page.locator("#favoritesFilter").click();
    await page.locator(".favorite-button").first().click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "favoritesFilter");
    await page.locator("#clearFilters").click();
    await page.locator("#source").selectOption("Sandro");
    await page.reload();
    await page.locator(".icon-card").first().waitFor();
    assert.equal(await page.locator("#source").inputValue(), "Sandro");
    assert.equal(new URL(page.url()).searchParams.get("scoutTheme"), "dark");
    await page.locator(".preview-button").first().click();
    assert.equal(await page.locator("#dialogLicense,#dialogVariant").count(), 0);
    assert.equal(await page.locator("#dialogSourceLink").isVisible(), true);
    assert.equal(await page.locator("#previewDialog .dialog-actions > .dialog-action:visible").count(), 4);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.className), "preview-button");
  });
  for (const [width, theme] of [[1440, "light"], [390, "dark"], [320, "light"]]) {
    await test(`icons preview repeats the thumbnail collection above source terms ${width} ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage();
      await page.goto(`${base}/icons/?source=Ben%20Coleman&category=azure-icons&search=ABS&scoutTheme=${theme}`);
      const card = page.locator(".icon-card").filter({ has: page.getByText("ABS Member", { exact: true }) }).first();
      await card.waitFor();
      const label = await card.locator(".category").textContent();
      assert.equal(label, "Ben Coleman · azure-icons");
      await card.locator(".preview-button").click();
      assert.equal(await page.locator("#dialogCollection").textContent(), label);
      assert.equal(await page.locator("#previewDialog").getAttribute("aria-describedby"), "dialogCollection");
      const collection = await page.locator("#dialogCollection").boundingBox();
      const terms = await page.locator("#dialogSourceLink").boundingBox();
      assert.ok(collection.height > 0 && collection.y + collection.height <= terms.y);
      assert.equal(await page.locator("#dialogLicense,#dialogVariant").count(), 0);
      assert.equal(await page.locator("#previewDialog .dialog-actions > .dialog-action:visible").count(), 4);
      assert.equal(await page.locator("#previewDialog").evaluate(node => node.scrollWidth <= node.clientWidth + 1), true);
      if (width !== 320) await page.locator("#previewDialog").screenshot({ path: path.join(artifacts, `icons-preview-collection-${width}-${theme}.png`) });
      await page.keyboard.press("Escape");
      assert.equal(await card.locator(".preview-button").evaluate(node => node === document.activeElement), true);
      await page.locator("#search").fill("");
      await page.locator("#source").selectOption("Microsoft");
      const next = page.locator(".icon-card").filter({ has: page.locator(".category").filter({ hasText: /^Microsoft/ }) }).first();
      await next.waitFor();
      const nextLabel = await next.locator(".category").textContent();
      await next.locator(".preview-button").click();
      assert.equal(await page.locator("#dialogCollection").textContent(), nextLabel);
      assert.notEqual(nextLabel, label);
      await ctx.close();
    });
  }
  await test("icons SVG manual copy, clipboard capabilities and fetch failures", async () => {
    const ctx = await context();
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); } } });
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/icons/`);
    await page.locator(".preview-button").first().click();
    assert.equal(await page.locator("#copyPng").isDisabled(), true);
    assert.match(await page.locator("#pngCapability").textContent(), /unavailable/);
    await page.locator("#copySvg").click();
    await page.locator("#siteCopyDialog[open]").waitFor();
    assert.match(await page.locator("#siteCopyDialog textarea").inputValue(), /<svg/);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "copySvg");
    await page.route("**/icons/export/**", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
    await page.locator("#copySvg").click();
    await page.waitForFunction(() => document.querySelector("#dialogStatus").textContent.includes("503"));
  });
  await test("icons PNG export, denied binary copy and unavailable download", async () => {
    const ctx = await context();
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { write: async () => { throw new DOMException("Denied", "NotAllowedError"); }, writeText: async () => {} } });
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/icons/?source=Microsoft`);
    await page.locator(".preview-button").first().click();
    const download = page.waitForEvent("download");
    await page.locator("#downloadPng").click();
    assert.match((await download).suggestedFilename(), /\.png$/);
    await page.waitForFunction(() => document.querySelector("#dialogStatus").textContent.includes("download requested"));
    await page.locator("#copyPng").click();
    await page.waitForFunction(() => document.querySelector("#dialogStatus").textContent.includes("denied"));
    await page.evaluate(() => { HTMLAnchorElement.prototype.click = function () { throw new Error("Download blocked by browser"); }; });
    await page.locator("#downloadPng").click();
    await page.waitForFunction(() => document.querySelector("#dialogStatus").textContent.includes("Download blocked"));
    assert.equal(await page.locator("#siteCopyDialog[open]").count(), 0, "binary failures must not offer unusable Blob text");
    await page.evaluate(() => { URL.createObjectURL = undefined; });
    await page.locator("#downloadSvg").click();
    await page.waitForFunction(() => document.querySelector("#dialogStatus").textContent.includes("unavailable"));
  });
  await test("emoji named copy, separate favorite and shortcode, local persistence", async () => {
    const ctx = await context({ viewport: { width: 320, height: 900 } });
    await ctx.addInitScript(() => {
      window.copied = [];
      Object.defineProperty(navigator, "clipboard", { value: { writeText: async (text) => { window.copied.push(text); } } });
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/emoji-sheet/`);
    await page.locator(".emoji-card").first().waitFor();
    assert.equal(await page.locator(".emoji-card").count(), 50);
    const card = page.locator(".emoji-card").first();
    for (const selector of [".emoji-glyph", ".emoji-code", ".favorite-button"]) {
      const box = await card.locator(selector).first().boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44, selector);
    }
    await card.locator(".favorite-button").click();
    assert.equal(await page.evaluate(() => window.copied.length), 0);
    await card.locator(".emoji-glyph").click();
    assert.match(await page.locator("#siteUxStatus").textContent(), /Emoji grinning face copied/);
    await card.locator(".emoji-code").click();
    assert.equal((await page.evaluate(() => window.copied))[1], ":grinning:");
    await page.reload();
    await page.locator(".emoji-card").first().waitFor();
    assert.equal(await page.locator(".favorite-button").first().getAttribute("aria-pressed"), "true");
    await page.locator("#favoritesFilter").click();
    await page.locator(".favorite-button").first().click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "favoritesFilter");
    await page.locator("#clearFilters").click();
    await page.locator("#search").fill("coeur");
    await page.waitForFunction(() => document.querySelector("#resultCount").textContent !== "1,870 emojis found");
    assert.ok(await page.locator(".emoji-card").count());
  });
  await test("emoji unavailable clipboard manual dialog and Escape focus return", async () => {
    const ctx = await context();
    await ctx.addInitScript(() => Object.defineProperty(navigator, "clipboard", { value: undefined }));
    const page = await ctx.newPage();
    await page.goto(`${base}/emoji-sheet/`);
    await page.locator(".emoji-glyph").first().click();
    await page.locator("#siteCopyDialog[open]").waitFor();
    assert.equal(await page.locator("#siteCopyDialog textarea").inputValue(), "😀");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.className), "emoji-glyph");
  });
  for (const [width, theme] of [[390, "dark"], [1440, "light"]]) {
    await test(`IT images: simplified cards and keyboard dialogs ${width} ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage();
      await page.goto(`${base}/it-images/?scoutTheme=${theme}`);
      await page.locator(".image-card").first().waitFor();
      assert.equal(await page.locator(".image-card").count(), 2);
      assert.equal(await page.locator("#search").isVisible(), false);
      assert.ok((await page.locator(".preview-button img").first().boundingBox()).width > 300);
      assert.equal(await page.locator(".image-card :is(.image-details,.image-transcription,.image-credit)").count(), 0);
      assert.equal(await page.getByText("Image text, source & usage", { exact: true }).count(), 0);
      assert.equal(await page.locator(".image-description").count(), 0);
      assert.deepEqual(await page.locator(".image-card .card-copy").evaluateAll(cards =>
        cards.map(card => [...card.children].map(child => child.tagName))), [["H2"], ["H2"]]);
      await page.locator(".image-card").first().screenshot({ path: path.join(artifacts, `it-image-simplified-${width}-${theme}.png`) });
      await page.locator(".preview-button").first().click();
      await page.keyboard.press("ArrowRight");
      assert.match(await page.locator("#dialogDescription").textContent(), /PiGA/);
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => document.activeElement.className), "preview-button");
      await page.locator("#submitOpen").click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "submitTitleInput");
      await page.keyboard.press("Escape");
      assert.equal(await page.evaluate(() => document.activeElement.id), "submitOpen");
      assert.match(await page.locator("#submitHelp").textContent(), /GitHub account/);
    });
  }
  async function checkLinkMetadata(page) {
    const cards = await page.locator(".link-card").evaluateAll(cards => cards.map(card => {
      const row = card.querySelector(".link-card-row2");
      const bounds = row.getBoundingClientRect();
      const cells = [...row.children].map(cell => {
        const box = cell.getBoundingClientRect();
        return { className: cell.className, width: box.width, height: box.height, center: box.y + box.height / 2, right: box.right, left: box.left };
      });
      const link = card.querySelector("h2 a");
      const favorite = card.querySelector(".favorite-button").getBoundingClientRect();
      const linkBounds = link.getBoundingClientRect();
      return {
        cells, left: bounds.left, right: bounds.right,
        direct: row.parentElement === card,
        url: link.getAttribute("href"), text: link.textContent, title: link.title,
        linkHeight: linkBounds.height, linkRight: linkBounds.right, favoriteLeft: favorite.left,
        favoriteWidth: favorite.width, favoriteHeight: favorite.height,
        stars: row.querySelectorAll(".link-rating svg").length,
        ratingRole: row.querySelector(".link-rating").getAttribute("role"),
        detailsCount: card.querySelectorAll("details,.link-details,.link-usefulness").length,
        children: [...card.children].map(child => child.className),
        faviconPresent: !!card.querySelector(".link-avatar img") || !!card.querySelector(".link-avatar").textContent.trim(),
      };
    }));
    assert.ok(cards.length);
    for (const card of cards) {
      assert.equal(card.direct, true);
      assert.deepEqual(card.cells.map(cell => cell.className), ["link-tag", "link-date", "link-rating"]);
      assert.ok(card.cells.every(cell => cell.width > 0 && cell.height > 0));
      assert.ok(Math.max(...card.cells.map(cell => cell.center)) - Math.min(...card.cells.map(cell => cell.center)) < 1, JSON.stringify(card.cells));
      assert.ok(card.cells.every(cell => cell.left >= card.left - 1 && cell.right <= card.right + 1));
      assert.equal(card.text, card.url);
      assert.ok(card.title.includes(card.url));
      assert.ok(card.linkHeight >= 44 && card.linkHeight <= 46);
      assert.ok(card.linkRight <= card.favoriteLeft);
      assert.ok(card.favoriteWidth >= 44 && card.favoriteHeight >= 44);
      assert.equal(card.stars, 5);
      assert.equal(card.ratingRole, "img");
      assert.equal(card.detailsCount, 0);
      assert.deepEqual(card.children, ["favorite-button", "link-card-row1", "link-card-row2"]);
      assert.equal(card.faviconPresent, true);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  }
  for (const [width, theme] of [[320, "light"], [390, "dark"], [1440, "light"], [1440, "dark"]]) {
    await test(`favorite links: compact visible metadata in both views ${width} ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage();
      await page.goto(`${base}/favorite-links/?scoutTheme=${theme}`);
      await page.locator(".link-card").first().waitFor();
      for (const view of ["cards", "list"]) {
        await page.locator(`[data-view="${view}"]`).click();
        await checkLinkMetadata(page);
        if (view === "cards" && ((width === 1440 && theme === "light") || width === 390)) {
          await page.locator(".link-card").first().screenshot({ path: path.join(artifacts, `favorite-links-compact-${width}-${theme}.png`) });
        }
      }
    });
  }
  await test("favorite links: long URL, category and recorded or missing dates", async () => {
    const ctx = await context({ viewport: { width: 320, height: 900 }, colorScheme: "dark", timezoneId: "UTC" });
    const page = await ctx.newPage();
    const longUrl = "https://github.com/Azure/Enterprise-Scale/tree/main/docs/" + "very-long-destination-".repeat(10);
    const fixture = [
      "title,url,description,category,rating,isHighlighted,dateAdded",
      `Long destination,${longUrl},Search-only description,Virtual Machines Scale Set,5,true,2026-09-08`,
      "Undated,https://example.org/undated,Undated description,Policies,2,false,",
      "Invalid,https://example.org/invalid,Invalid date description,,1,false,not-a-date",
    ].join("\n");
    await page.route("**/favorite-links.csv", route => route.fulfill({ contentType: "text/csv", body: fixture }));
    await page.goto(`${base}/favorite-links/?scoutTheme=dark`);
    await page.locator(".link-card").first().waitFor();
    assert.equal(await page.locator(".link-card").count(), 3);
    await checkLinkMetadata(page);
    const dates = await page.locator(".link-card").evaluateAll(cards => Object.fromEntries(cards.map(card => [
      card.querySelector("h2 a").getAttribute("href"), card.querySelector(".link-date").textContent,
    ])));
    assert.deepEqual(dates, { [longUrl]: "Sep 8, 2026", "https://example.org/undated": "Not dated", "https://example.org/invalid": "Invalid date" });
    const longCard = page.locator(".link-card").filter({ has: page.getByRole("link", { name: longUrl, exact: true }) });
    assert.equal(await longCard.locator(".link-tag").getAttribute("title"), "Virtual Machines Scale Set");
    await longCard.screenshot({ path: path.join(artifacts, "favorite-links-compact-long-320-dark.png") });
    assert.doesNotMatch(await longCard.textContent(), /Search-only description|Last verified|Report/);
  });
  await test("curated labels, exact destinations, isolated favorites and compact filters", async () => {
    const ctx = await context({ viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/favorite-links/`);
    await page.locator(".link-card").first().waitFor();
    assert.equal(await page.locator(".link-card").count(), 60);
    assert.match(await page.locator("#favoritesFilter").textContent(), /My favorites \(0\)/);
    const title = page.locator(".link-card h2 a").first();
    const href = await title.getAttribute("href");
    assert.equal(await title.textContent(), href);
    await page.locator(".favorite-button").first().click();
    assert.equal(ctx.pages().length, 1);
    assert.match(await page.locator("#favoritesFilter").textContent(), /My favorites \(1\)/);
    assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem("favorite-links-my-favorites")))).includes(href));
    await page.locator("#favoritesFilter").click();
    await page.locator(".favorite-button").first().click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "favoritesFilter");
    assert.match(await page.locator("#favoritesFilter").textContent(), /My favorites \(0\)/);
    await page.locator("#submitLinkOpen").click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "submitLinkTitleInput");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "submitLinkOpen");
  });
  await test("friends: real specialties, visible filters and editable submission defaults", async () => {
    const ctx = await context({ viewport: { width: 320, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/friends-websites/`);
    await page.locator(".friend-card").first().waitFor();
    assert.equal(await page.locator(".friend-card").count(), 2);
    assert.doesNotMatch(await page.locator("#friendCards").textContent(), /Description\./);
    assert.equal(await page.locator(".filter-bar").getByLabel("Search", { exact: true }).isVisible(), true);
    assert.equal(await page.locator(".filter-bar").getByLabel("Category", { exact: true }).isVisible(), true);
    assert.equal(await page.locator(".filter-bar").getByLabel("Country", { exact: true }).isVisible(), true);
    assert.deepEqual(await page.locator("#categoryFilter option").allTextContents(), ["All categories", "Blog"]);
    assert.deepEqual(await page.locator("#countryFilter option").allTextContents(), ["All countries", "France"]);
    assert.match(await page.locator("#friendCards").textContent(), /Infrastructure/);
    assert.match(await page.locator("#friendCards").textContent(), /Networking/);
    await page.locator("#searchInput").fill("infrastructure");
    assert.equal(await page.locator(".friend-card").count(), 1);
    assert.match(await page.locator(".friend-card h2").textContent(), /Florent/);
    await page.locator("#searchInput").fill("davidsantiago.fr");
    assert.equal(await page.locator(".friend-card").count(), 1);
    assert.match(await page.locator(".friend-card h2").textContent(), /David/);
    await page.locator("#searchInput").fill("");
    await page.locator("#submitOpen").click();
    assert.equal(await page.locator("#submitCategoryInput").inputValue(), "Blog");
    assert.equal(await page.locator("#submitCountryInput").inputValue(), "France");
    await page.locator("#submitCountryInput").fill("Belgium");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "submitOpen");
  });
  for (const [width, theme] of [[320, "light"], [390, "dark"], [1440, "light"]]) {
    await test(`friends: controls stay above cards and list ${width} ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/friends-websites/?scoutTheme=${theme}`);
      await page.locator(".friend-card").first().waitFor();
      const searchColors = await page.locator("#searchInput").evaluate(node => [
        getComputedStyle(node, "::placeholder").color, getComputedStyle(node).backgroundColor,
      ]);
      const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const levels = searchColors.map(luminance).sort((a, b) => a - b);
      assert.ok((levels[1] + .05) / (levels[0] + .05) >= 4.5, searchColors.join(" on "));
      for (const view of ["cards", "list"]) {
        await page.locator(`[data-view="${view}"]`).click();
        const bounds = await page.locator("#friendCards").boundingBox();
        for (const selector of ["#searchInput", "#categoryFilter", "#countryFilter", ".view-toggle", "#submitOpen"]) {
          const control = page.locator(selector), box = await control.boundingBox();
          assert.ok(box && box.height >= 44 && box.height < 80, selector);
          assert.ok(box.y + box.height <= bounds.y, `${selector} must precede results`);
          assert.ok(box.x >= 0 && box.x + box.width <= width + 1, selector);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        if (view === "cards" && width !== 320) await page.screenshot({ path: path.join(artifacts, `friends-top-controls-${width}-${theme}.png`) });
      }
      assert.deepEqual(errors, []);
      await ctx.close();
    });
  }
  await test("friends: combined search, category and country retain URL and view state", async () => {
    const ctx = await context({ viewport: { width: 390, height: 900 } }), page = await ctx.newPage();
    const csv = [
      "name,category,subcategory,country,url,enabled",
      "Alice Cloud,Blog,Infra,France,https://example.org/alice,TRUE",
      "Bob Cloud,Blog,Network,Belgium,https://example.org/bob,TRUE",
      "Carol Designs,Portfolio,Design,Belgium,https://example.org/carol,TRUE",
      "Disabled Site,News,Infra,Canada,https://example.org/disabled,FALSE",
    ].join("\n");
    await page.route("**/friends-websites.csv", route => route.fulfill({ contentType: "text/csv", body: csv }));
    await page.route("**/websites-meta.json", route => route.fulfill({ json: { sites: [] } }));
    await page.goto(`${base}/friends-websites/?utm_source=controls#top`);
    await page.locator(".friend-card").first().waitFor();
    assert.deepEqual(await page.locator("#categoryFilter option").allTextContents(), ["All categories", "Blog", "Portfolio"]);
    assert.deepEqual(await page.locator("#countryFilter option").allTextContents(), ["All countries", "Belgium", "France"]);
    await page.locator("#categoryFilter").selectOption("Blog");
    assert.equal(await page.locator(".friend-card").count(), 2);
    await page.locator("#countryFilter").selectOption("Belgium");
    assert.equal(await page.locator(".friend-card").count(), 1);
    await page.locator("#searchInput").fill("no-match");
    assert.equal(await page.locator(".friend-card").count(), 0);
    assert.match(await page.locator(".empty-state").textContent(), /No websites match/);
    assert.equal(await page.locator("#submitOpen").isVisible(), true);
    await page.locator("#searchInput").fill("NETWORKING");
    assert.equal(await page.locator(".friend-card h2").textContent(), "Bob Cloud");
    await page.locator('[data-view="list"]').click();
    await page.waitForURL(url => url.searchParams.get("searchInput") === "NETWORKING" && url.searchParams.get("countryFilter") === "Belgium");
    await page.reload();
    await page.locator(".friend-card").first().waitFor();
    assert.equal(await page.locator("#searchInput").inputValue(), "NETWORKING");
    assert.equal(await page.locator("#categoryFilter").inputValue(), "Blog");
    assert.equal(await page.locator("#countryFilter").inputValue(), "Belgium");
    assert.equal(await page.locator(".friend-card h2").textContent(), "Bob Cloud");
    assert.equal(await page.locator("#friendCards.list-view").count(), 1);
    assert.equal(new URL(page.url()).searchParams.get("utm_source"), "controls");
    await page.evaluate(() => {
      history.pushState({}, "", "?categoryFilter=Portfolio&countryFilter=Belgium#top");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    assert.equal(await page.locator(".friend-card h2").textContent(), "Carol Designs");
    await page.locator("#categoryFilter").selectOption("");
    await page.locator("#countryFilter").selectOption("");
    assert.equal(await page.locator(".friend-card").count(), 3);
    await ctx.close();
  });
  await test("friends: visible filters honestly distinguish loading and data failure", async () => {
    const ctx = await context(), page = await ctx.newPage();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route("**/friends-websites.csv", async route => {
      await gate;
      await route.fulfill({ status: 503, body: "Unavailable" });
    });
    try {
      await page.goto(`${base}/friends-websites/`, { waitUntil: "domcontentloaded" });
      for (const id of ["searchInput", "categoryFilter", "countryFilter"]) {
        assert.equal(await page.locator(`#${id}`).isVisible(), true);
        assert.equal(await page.locator(`#${id}`).isDisabled(), true);
      }
      assert.equal(await page.locator("#resultsCount").textContent(), "Loading websites...");
      assert.equal(await page.locator(".empty-state").count(), 0);
      release();
      await page.locator(".data-error").waitFor();
      assert.equal(await page.locator("#resultsCount").textContent(), "Websites unavailable.");
      assert.equal(await page.locator("#categoryFilter").isDisabled(), true);
      await page.locator("#submitOpen").click();
      assert.equal(await page.locator("#submitDialog").evaluate(node => node.open), true);
    } finally {
      release();
      await ctx.close();
    }
  });
  await test("friends: empty datasets retain all filters without fabricated options", async () => {
    const ctx = await context(), page = await ctx.newPage();
    await page.route("**/friends-websites.csv", route => route.fulfill({ contentType: "text/csv", body: "name,category,subcategory,country,url,enabled\n" }));
    await page.route("**/websites-meta.json", route => route.fulfill({ json: { sites: [] } }));
    await page.goto(`${base}/friends-websites/`);
    await page.locator(".empty-state").waitFor();
    assert.equal(await page.locator("#resultsCount").textContent(), "0 friends' websites found.");
    for (const id of ["searchInput", "categoryFilter", "countryFilter"]) {
      assert.equal(await page.locator(`#${id}`).isVisible(), true);
      assert.equal(await page.locator(`#${id}`).isEnabled(), true);
    }
    assert.equal(await page.locator("#categoryFilter option").count(), 1);
    assert.equal(await page.locator("#countryFilter option").count(), 1);
    await ctx.close();
  });
  await test("portals: actual list matches notes, task search and submission", async () => {
    const ctx = await context({ viewport: { width: 320, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/microsoft-portals/`);
    await page.locator(".portal-card").first().waitFor();
    assert.equal(await page.locator(".portal-card").count(), 6);
    await page.locator("#searchInput").fill("conditional access");
    assert.equal(await page.locator(".portal-card").count(), 1);
    assert.equal(await page.locator(".portal-card").getAttribute("href"), "https://entra.microsoft.com/");
    await page.locator("#submitOpen").click();
    assert.equal(await page.locator("#submitDialog").evaluate((node) => node.open), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "submitOpen");
  });
  await test("all submission flows retain encoded GitHub handoffs without posting", async () => {
    const ctx = await context();
    await ctx.addInitScript(() => { window.proposals = []; window.open = (url) => { window.proposals.push(url); return null; }; });
    const page = await ctx.newPage();
    const scenarios = [
      { slug: "it-images", open: "#submitOpen", dialog: "#submitDialog", template: "submit-image.yml", fields: { submitTitleInput: "Browser test image" } },
      { slug: "favorite-links", open: "#submitLinkOpen", dialog: "#submitLinkDialog", template: "submit-link.yml", fields: { submitLinkTitleInput: "Browser test reference", submitLinkUrlInput: "https://example.org/a?b=1&c=2", submitLinkCategoryInput: "Tools" } },
      { slug: "friends-websites", open: "#submitOpen", dialog: "#submitDialog", template: "submit-friend-website.yml", fields: { submitOwnerInput: "Browser Test", submitUrlInput: "https://example.org/blog/", submitTopicInput: "Automation" } },
      { slug: "microsoft-portals", open: "#submitOpen", dialog: "#submitDialog", template: "submit-portal.yml", fields: { submitNameInput: "Browser test portal", submitUrlInput: "https://admin.powerplatform.microsoft.com/", submitCategoryInput: "Power Platform" } },
    ];
    for (const scenario of scenarios) {
      await page.goto(`${base}/${scenario.slug}/`);
      await page.locator(pages[scenario.slug]).first().waitFor();
      await page.locator(scenario.open).click();
      for (const [id, value] of Object.entries(scenario.fields)) await page.locator(`#${id}`).fill(value);
      await page.locator(`${scenario.dialog} button[type=submit]`).click();
      const opened = await page.evaluate(() => window.proposals);
      assert.equal(opened.length, 1, scenario.slug);
      const url = new URL(opened[0]);
      assert.equal(url.origin, "https://github.com");
      assert.equal(url.searchParams.get("template"), scenario.template);
      assert.equal(await page.locator(scenario.dialog).evaluate((node) => node.open), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), scenario.open.slice(1));
    }
  });
  await test("favorites remain usable with an honest storage-denied notice", async () => {
    const ctx = await context();
    await ctx.addInitScript(() => {
      Storage.prototype.setItem = function () { throw new DOMException("Storage denied", "SecurityError"); };
    });
    const page = await ctx.newPage();
    for (const slug of ["icons", "emoji-sheet", "favorite-links"]) {
      await page.goto(`${base}/${slug}/`);
      await page.locator(".favorite-button").first().click();
      assert.equal(await page.locator(".favorite-button").first().getAttribute("aria-pressed"), "true");
      assert.match(await page.locator("#siteUxStatus").textContent(), /this visit only/);
      assert.equal(ctx.pages().length, 1);
    }
  });
  await test("asynchronous category filters restore from URLs and browser history", async () => {
    const ctx = await context();
    const page = await ctx.newPage();
    for (const scenario of [
      { slug: "emoji-sheet", query: "category=Smileys%20%26%20Emotion&perPage=100", control: "#category", value: "Smileys & Emotion" },
      { slug: "favorite-links", query: "categoryFilter=Networking&topicFilter=DNS", control: "#categoryFilter", value: "Networking" },
      { slug: "microsoft-portals", query: "categoryFilter=Identity&searchInput=conditional", control: "#categoryFilter", value: "Identity" },
    ]) {
      await page.goto(`${base}/${scenario.slug}/?${scenario.query}&scoutTheme=light`);
      await page.locator(pages[scenario.slug]).first().waitFor();
      await page.waitForFunction(({ control, value }) => document.querySelector(control).value === value, scenario);
      assert.ok(await page.locator(pages[scenario.slug]).count());
      await page.evaluate(() => { history.pushState(null, "", location.pathname); window.dispatchEvent(new PopStateEvent("popstate")); });
      assert.equal(await page.locator(scenario.control).inputValue(), "");
    }
  });
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
