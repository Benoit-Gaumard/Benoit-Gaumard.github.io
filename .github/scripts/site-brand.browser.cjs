// Run with SITE_UX_HARNESS pointing to the existing site-check-harness.cjs.
const runSuite = require(process.env.SITE_UX_HARNESS);

runSuite("site-branding", async ({ context, test, base, assert, path, artifacts }) => {
  const routes = ["/", "/index_fr.html", "/tools/", "/icons/", "/privacy/", "/articles/azure-policy-part-1-what-is-a-policy/"];
  for (const [width, theme] of [[320, "light"], [390, "dark"], [768, "light"], [1440, "dark"]]) {
    await test(`site name and navigation stay visible at ${width}px ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await ctx.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      for (const route of routes) {
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        for (const selector of [".site-header .site-branding", ".site-footer .site-branding"]) {
          const brand = page.locator(selector), name = brand.locator(".site-brand-name");
          assert.equal(await brand.count(), 1, route);
          assert.equal(await name.textContent(), "benoit-gaumard.io", route);
          assert.equal(await name.getAttribute("href"), "https://benoit-gaumard.io/");
          assert.equal(await brand.locator(".brand").getAttribute("href"), route === "/index_fr.html" ? "/index_fr.html" : "/");
          const bounds = await brand.evaluate(node => {
            const image = node.querySelector("img").getBoundingClientRect(), label = node.querySelector(".site-brand-name").getBoundingClientRect();
            return { imageRight: image.right, labelLeft: label.left, labelRight: label.right, labelHeight: label.height,
              sameLine: Math.abs(image.y + image.height / 2 - label.y - label.height / 2) < 1 };
          });
          assert.ok(bounds.sameLine && bounds.imageRight < bounds.labelLeft && bounds.labelRight <= width + 1, route + selector);
          assert.ok(bounds.labelHeight >= 44);
        }
        const extra = page.locator(".site-footer-extra");
        const role = route === "/index_fr.html" ? "Consultant Azure Infrastructure et DevOps" : "Azure Infrastructure and DevOps Consultant";
        assert.ok((await page.locator(".footer-about > p").textContent()).startsWith(role));
        if (route === "/" || route === "/index_fr.html") {
          assert.equal((await page.locator(".role").textContent()).trim(), role);
          assert.equal(await page.locator(".exp-head h3").first().textContent(),
            route === "/" ? "Infrastructure and DevOps Consultant" : role);
        }
        assert.equal(await page.locator(".site-footer [data-privacy-choices]").count(), 0);
        assert.equal(await page.locator(".site-footer a[href='/privacy/']").count(), 1);
        const privacyLink = page.locator(".site-footer .footer-group:not(.site-footer-extra) > a[href='/privacy/']");
        assert.equal(await privacyLink.textContent(), "Privacy & cookies");
        assert.equal(await privacyLink.evaluate(node => node.parentElement.querySelector("strong").textContent),
          route === "/index_fr.html" ? "Explorer" : "Explore");
        assert.equal(await page.locator(".footer-bottom a[href='/privacy/']").count(), 0);
        if (route === "/privacy/") assert.equal(await page.locator("main [data-privacy-choices]").count(), 0);
        assert.equal(await page.locator(".footer-bottom > span").first().textContent(),
          `© ${new Date().getFullYear()} Benoit Gaumard - Built with ❤️ - All Rights Reserved`);
        if (route === "/icons/") await page.waitForFunction(() => document.getElementById("libraryCount").textContent.trim().length > 0);
        const copyright = await page.locator(".footer-bottom > span").first().evaluate(node => {
          const text = node.getBoundingClientRect(), row = node.parentElement.getBoundingClientRect();
          return { centerDifference: Math.abs(text.left + text.width / 2 - row.left - row.width / 2), alignment: getComputedStyle(node).textAlign };
        });
        assert.ok(copyright.centerDifference < 1, route);
        assert.equal(copyright.alignment, "center", route);
        assert.equal(await extra.getByRole("link").count(), 2, route);
        assert.equal(await extra.locator("strong").textContent(), route === "/index_fr.html" ? "Liens supplémentaires" : "Extra links");
        assert.deepEqual(await extra.getByRole("link").allTextContents(), [
          "quickquotemaker.com",
          "travelstorymaker.com",
        ]);
        assert.equal(await extra.evaluate(node => node.parentElement.classList.contains("footer-main")), true);
        const columns = await page.locator(".footer-main").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(/\s+/).length);
        assert.equal(columns, width <= 512 ? 1 : width <= 1024 ? 2 : 4);
        const spacing = await extra.evaluate(node => {
          const reference = document.querySelector(".site-footer .footer-group:not(.site-footer-extra)");
          const links = node.querySelectorAll(":scope > a");
          return {
            gap: getComputedStyle(node).gap,
            referenceGap: getComputedStyle(reference).gap,
            actualGap: links[1].getBoundingClientRect().top - links[0].getBoundingClientRect().bottom,
            referenceHeight: reference.querySelector(":scope > a").getBoundingClientRect().height,
          };
        });
        assert.equal(spacing.gap, spacing.referenceGap);
        assert.equal(spacing.actualGap, 4);
        for (const link of await extra.getByRole("link").all()) {
          const box = await link.boundingBox();
          assert.ok(box.width > 0 && box.height >= (width <= 512 ? 32 : 24) && box.x + box.width <= width + 1);
          assert.ok(Math.abs(box.height - spacing.referenceHeight) < 1);
          assert.equal(await link.getAttribute("target"), "_blank");
          assert.equal(await link.getAttribute("rel"), "noopener noreferrer");
        }
        const controls = await page.locator(".site-header a,.site-header button,.site-header summary").evaluateAll(nodes => nodes
          .filter(node => node.checkVisibility()).map(node => {
            const r = node.getBoundingClientRect();
            return { name: node.getAttribute("aria-label") || node.textContent, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
          }));
        for (let index = 0; index < controls.length; index++) {
          const a = controls[index];
          assert.ok(a.left >= 0 && a.right <= width + 1, route + ": " + a.name);
          for (const b of controls.slice(index + 1)) {
            assert.ok(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1,
              `${route}: header overlap between ${a.name} and ${b.name}`);
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, route);
        if (width < 769) {
          await page.locator("#menuToggle").click();
          assert.equal(await page.locator("#primaryNav").isVisible(), true);
          await page.keyboard.press("Escape");
          assert.equal(await page.locator("#primaryNav").isVisible(), false);
        }
        if ((route === "/" && width === 320) || (route === "/tools/" && [390, 1440].includes(width))) {
          await page.locator(".site-header").screenshot({ path: path.join(artifacts, `site-name-header-${route === "/" ? "home" : "tools"}-${width}-${theme}.png`) });
          await page.locator(".site-footer .site-branding").screenshot({ path: path.join(artifacts, `site-name-footer-${width}-${theme}.png`) });
          await page.locator(".footer-main").screenshot({ path: path.join(artifacts, `footer-extra-links-${width}-${theme}.png`) });
          await page.locator(".footer-bottom").screenshot({ path: path.join(artifacts, `footer-copyright-${width}-${theme}.png`) });
          if (width <= 512) {
            const clearOfBackToTop = await page.locator(".footer-bottom > span").first().evaluate(node => {
              const button = document.getElementById("backToTop");
              return !button?.checkVisibility() || node.getBoundingClientRect().bottom <= button.getBoundingClientRect().top;
            });
            assert.equal(clearOfBackToTop, true, "The back-to-top button must not cover the copyright");
          }
        }
        assert.deepEqual(errors, [], route);
      }
      await ctx.close();
    });
  }
  await test("taller mobile headers preserve homepage and article anchor visibility", async () => {
    const ctx = await context({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage();
    await page.goto(base + "/");
    await page.locator(".section-nav a[href='#tools']").click();
    await page.waitForFunction(() => {
      const heading = document.querySelector("#tools-title").getBoundingClientRect();
      return heading.top >= document.querySelector(".section-nav").getBoundingClientRect().bottom - 1 && heading.top < innerHeight;
    });
    await page.goto(base + "/privacy/");
    await page.locator(".reading-toc summary").click();
    await page.locator(".reading-toc a[href='#cookies-and-consent']").click();
    await page.waitForFunction(() => {
      const heading = document.getElementById("cookies-and-consent").getBoundingClientRect();
      return heading.top >= document.querySelector(".site-header").getBoundingClientRect().bottom - 1 && heading.top < innerHeight;
    });
    await ctx.close();
  });
  await test("branding remains present without JavaScript and the added text follows its supplied URL", async () => {
    const ctx = await context({ viewport: { width: 320, height: 900 }, javaScriptEnabled: false }), page = await ctx.newPage();
    await page.route("https://benoit-gaumard.io/**", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Requested site link</title>" }));
    await page.goto(base + "/index_fr.html");
    assert.equal(await page.locator(".site-brand-name:visible").count(), 2);
    assert.equal(await page.locator(".footer-group > a[href='/privacy/']").isVisible(), true);
    assert.equal(await page.locator(".footer-bottom > span").first().textContent(), "© 2026 Benoit Gaumard - Built with ❤️ - All Rights Reserved");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.locator(".site-header .site-brand-name").click();
    await page.waitForURL("https://benoit-gaumard.io/");
    await ctx.close();
  });
  await test("footer site links open separate tabs without JavaScript", async () => {
    const ctx = await context({ javaScriptEnabled: false }), page = await ctx.newPage();
    const targets = ["https://www.quickquotemaker.com/", "https://www.travelstorymaker.com/"];
    for (const url of targets) await ctx.route(url, route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>External site fixture</title>" }));
    await page.goto(base + "/");
    for (const url of targets) {
      const popupPromise = page.waitForEvent("popup");
      await page.locator(`.site-footer-extra a[href="${url}"]`).click();
      const popup = await popupPromise;
      await popup.waitForLoadState("domcontentloaded");
      assert.equal(popup.url(), url);
      assert.equal(await popup.evaluate(() => window.opener === null), true);
      assert.equal(page.url(), base + "/");
      await popup.close();
    }
    await ctx.close();
  });
});
