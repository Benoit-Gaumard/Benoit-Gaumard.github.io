// Run with SITE_UX_HARNESS pointing to the existing site-check-harness.cjs.
const runSuite = require(process.env.SITE_UX_HARNESS);

runSuite("tools-reorder-confirmation", async ({ context, test, base, assert, fs, path, root, artifacts }) => {
  const html = fs.readFileSync(path.join(root, "tools", "index.html"), "utf8");
  const defaultIds = [...html.matchAll(/<article class="tool-card" data-tool-id="([^"]+)"/g)].map(match => match[1]);
  const visibleIds = page => page.locator(".tool-card:not([hidden])").evaluateAll(cards => cards.map(card => card.dataset.toolId));
  const savedOrder = page => page.evaluate(() => localStorage.getItem("tools-card-order"));
  const waitForFocus = (page, id) => page.waitForFunction(id => document.activeElement.id === id, id);
  const waitForClose = page => page.waitForFunction(() => !document.getElementById("resetOrderDialog").open);

  for (const [width, theme, view] of [[320, "light", "cards"], [390, "dark", "list"], [1440, "light", "cards"], [1440, "dark", "list"]]) {
    await test(`adjacent controls and confirmed reset ${width} ${theme} ${view}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      await ctx.addInitScript(ids => {
        if (!localStorage.getItem("tools-my-favorites")) localStorage.setItem("tools-my-favorites", JSON.stringify(ids));
      }, defaultIds);
      const page = await ctx.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}/tools/?q=Azure&family=azure-reference&favorites=1&view=${view}&utm_source=confirmation#top`);
      await page.locator(".favorite-button").first().waitFor();
      await page.locator(`[data-view="${view}"]`).click();
      const original = await visibleIds(page);
      const adjacency = await page.evaluate(() => {
        const favorites = document.getElementById("favoritesFilter"), reorder = document.getElementById("reorderToggle");
        const a = favorites.getBoundingClientRect(), b = reorder.getBoundingClientRect();
        return { sameParent: favorites.parentElement === reorder.parentElement, next: favorites.nextElementSibling === reorder,
          top: Math.abs(a.top - b.top), gap: b.left - a.right, heights: [a.height, b.height], overflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert.ok(adjacency.sameParent && adjacency.next);
      assert.ok(adjacency.top < 1 && adjacency.gap >= 0 && adjacency.gap <= 16, JSON.stringify(adjacency));
      assert.ok(adjacency.heights.every(height => height >= 44));
      assert.ok(adjacency.overflow <= 1);
      await page.locator("#reorderToggle").click();
      await page.locator(`.tool-card[data-tool-id="${original[0]}"] [data-move="1"]`).click();
      const custom = await visibleIds(page), stored = await savedOrder(page);
      assert.deepEqual(custom.slice(0, 2), [original[1], original[0]]);
      const preferences = await page.evaluate(() => ({
        favorites: localStorage.getItem("tools-my-favorites"), view: localStorage.getItem("tools-view-mode"), url: location.href,
      }));
      const reset = page.locator("#resetOrderButton"), dialog = page.getByRole("dialog", { name: "Reset tool order?" });
      await reset.click();
      await waitForFocus(page, "cancelResetOrder");
      assert.equal(await dialog.evaluate(node => node.matches(":modal")), true);
      assert.deepEqual(await visibleIds(page), custom);
      assert.equal(await savedOrder(page), stored);
      const modalBounds = await dialog.boundingBox();
      assert.ok(modalBounds.x >= 0 && modalBounds.y >= 0 && modalBounds.x + modalBounds.width <= width);
      assert.equal(await dialog.getAttribute("aria-describedby"), "resetOrderDescription");
      await page.keyboard.press("Tab");
      await waitForFocus(page, "confirmResetOrder");
      await page.keyboard.press("Shift+Tab");
      await waitForFocus(page, "cancelResetOrder");
      await page.evaluate(() => document.getElementById("toolSearch").focus());
      assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
      if ((width === 1440 && theme === "light") || width === 390) {
        await dialog.screenshot({ path: path.join(artifacts, `tools-reset-confirm-${width}-${theme}.png`) });
      }
      await page.locator("#cancelResetOrder").click();
      await waitForClose(page);
      await waitForFocus(page, "resetOrderButton");
      assert.deepEqual(await visibleIds(page), custom);
      assert.equal(await savedOrder(page), stored);
      await reset.click();
      await page.keyboard.press("Escape");
      await waitForClose(page);
      await waitForFocus(page, "resetOrderButton");
      assert.deepEqual(await visibleIds(page), custom);
      assert.equal(await savedOrder(page), stored);
      await reset.click();
      await page.keyboard.press("Enter");
      await waitForClose(page);
      assert.equal(await savedOrder(page), stored, "Enter initially activates Cancel, not reset");
      await reset.click();
      await page.locator("#confirmResetOrder").click();
      await waitForClose(page);
      await waitForFocus(page, "reorderToggle");
      assert.deepEqual(await visibleIds(page), original);
      assert.equal(await savedOrder(page), null);
      assert.equal(await reset.isVisible(), false);
      assert.equal(await page.locator("#reorderToggle").getAttribute("aria-pressed"), "true");
      assert.equal(await page.locator(".is-reordered,.is-dragging,.drag-placeholder").count(), 0);
      assert.match(await page.locator("#actionStatus").textContent(), /Default tool order restored/);
      assert.deepEqual(await page.evaluate(() => ({
        favorites: localStorage.getItem("tools-my-favorites"), view: localStorage.getItem("tools-view-mode"), url: location.href,
      })), preferences);
      if ((width === 1440 && theme === "light") || width === 390) {
        await page.locator(".tools-toolbar").screenshot({ path: path.join(artifacts, `tools-adjacent-reorder-${width}-${theme}.png`) });
      }
      await page.reload();
      await page.locator(".favorite-button").first().waitFor();
      assert.deepEqual(await visibleIds(page), original);
      assert.equal(await reset.isVisible(), false);
      assert.equal(await dialog.count(), 0);
      assert.deepEqual(errors, []);
      await ctx.close();
    });
  }
  await test("confirmed reset also restores hidden tools without clearing saved favorites", async () => {
    const ctx = await context();
    await ctx.addInitScript(ids => {
      localStorage.setItem("tools-card-order", JSON.stringify([...ids].reverse()));
      localStorage.setItem("tools-my-favorites", JSON.stringify(ids.slice(0, 3)));
    }, defaultIds);
    const page = await ctx.newPage();
    await page.goto(`${base}/tools/?favorites=1`);
    await page.locator("#resetOrderButton").click();
    await page.locator("#confirmResetOrder").click();
    await waitForClose(page);
    assert.deepEqual(await visibleIds(page), defaultIds.slice(0, 3));
    await page.locator("#favoritesFilter").click();
    assert.deepEqual(await visibleIds(page), defaultIds);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("tools-my-favorites"))), defaultIds.slice(0, 3));
    await ctx.close();
  });
  await test("a blocked storage reset retains explicit failure feedback", async () => {
    const ctx = await context(), page = await ctx.newPage();
    await page.goto(`${base}/tools/`);
    await page.locator("#reorderToggle").click();
    await page.locator('.tool-card[data-tool-id="/azure-regions/"] [data-move="1"]').click();
    const stored = await savedOrder(page);
    await page.evaluate(() => {
      const removeItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function(key) {
        if (key === "tools-card-order") throw new DOMException("Storage denied", "SecurityError");
        return removeItem.call(this, key);
      };
    });
    await page.locator("#resetOrderButton").click();
    await page.locator("#confirmResetOrder").click();
    await waitForClose(page);
    assert.deepEqual(await visibleIds(page), defaultIds);
    assert.equal(await savedOrder(page), stored);
    assert.equal(await page.locator("#catalogNotice").isVisible(), true);
    assert.match(await page.locator("#catalogNotice").textContent(), /this tab.*could not save/);
    await waitForFocus(page, "reorderToggle");
    await ctx.close();
  });
});
