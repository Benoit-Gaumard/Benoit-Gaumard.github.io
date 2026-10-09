// Usage: node .github/scripts/article-reading.browser.cjs <path-to-site-check-harness.cjs>
// The harness supplies Edge/Playwright, localhost hosting, external-request blocking and cleanup.
const runSuite = require(require("node:path").resolve(process.argv[2]));
runSuite("article-reading", async ({ context, test, base, assert, fs, path, root, artifacts }) => {
  const metadata = JSON.parse(fs.readFileSync(path.join(root, "articles", "articles.json"), "utf8")).articles;
  const evidence = [];
  const capture = async (page, name) => page.screenshot({ path: path.relative(root, path.join(artifacts, name)), fullPage: false });
  const assertArticleFrame = async page => {
    const frame = await page.evaluate(() => {
      const main = document.querySelector("main").getBoundingClientRect();
      const image = document.querySelector(".article-feature-image").getBoundingClientRect();
      return {
        main: { left: main.left, right: main.right, width: main.width },
        blocks: [...document.querySelectorAll(".article-header, .article-title, .article-description, .article-share, .series-nav, .article-related")].map(node => {
          const bounds = node.getBoundingClientRect();
          return { name: node.className, left: bounds.left, right: bounds.right };
        }),
        image: { center: image.left + image.width / 2, width: image.width },
        imageMax: parseFloat(getComputedStyle(document.documentElement).fontSize) * 50,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    for (const block of frame.blocks) {
      assert.ok(Math.abs(block.left - frame.main.left) < 2, `${block.name}: left edge`);
      assert.ok(Math.abs(block.right - frame.main.right) < 2, `${block.name}: right edge`);
    }
    assert.ok(Math.abs(frame.image.center - (frame.main.left + frame.main.width / 2)) < 2, "Illustration stays centered");
    assert.ok(Math.abs(frame.image.width - Math.min(frame.imageMax, frame.main.width)) < 2, "Illustration retains its existing width");
    assert.ok(frame.overflow <= 2, `Page overflow: ${frame.overflow}`);
  };
  for (const width of [1440, 390]) {
    const ctx = await context({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await test(`Cover illustrations and full-width article framing for all 48 articles at ${width}px`, async () => {
      for (const article of metadata) {
        errors.length = 0;
        await page.goto(base + article.url, { waitUntil: "domcontentloaded" });
        const image = page.locator(".article-feature-image img");
        assert.equal(await image.count(), 1, article.slug);
        await image.evaluate(image => image.decode());
        const result = await image.evaluate(image => {
          const figure = image.closest("figure");
          const header = document.querySelector(".article-header");
          const reading = document.querySelector(".reading-layout");
          const share = document.querySelector(".article-share");
          const link = image.closest("a");
          const bounds = figure.getBoundingClientRect(), linkBounds = link.getBoundingClientRect();
          return {
            src: image.getAttribute("src"),
            loaded: image.complete && image.naturalWidth > 0,
            loading: image.loading,
            priority: image.fetchPriority,
            afterHeader: header.getBoundingClientRect().bottom <= bounds.top + 1,
            beforeShare: bounds.bottom <= share.getBoundingClientRect().top + 1,
            beforeReading: bounds.bottom <= reading.getBoundingClientRect().top + 1,
            imageTop: image.getBoundingClientRect().top,
            height: linkBounds.height,
            ratio: linkBounds.width / linkBounds.height,
            fit: getComputedStyle(image).objectFit,
            overflow: document.documentElement.scrollWidth - innerWidth,
            logo: figure.classList.contains("is-logo"),
          };
        });
        assert.equal(result.src, article.featureImage, article.slug);
        assert.ok(result.loaded && result.afterHeader && result.beforeShare && result.beforeReading, article.slug);
        assert.equal(result.loading, "eager", article.slug);
        assert.equal(result.priority, "high", article.slug);
        assert.equal(result.fit, "contain", article.slug);
        assert.ok(result.overflow <= 2, article.slug);
        await assertArticleFrame(page);
        if (result.logo) assert.equal(result.height, width === 390 ? 160 : 208, article.slug);
        else assert.ok(Math.abs(result.ratio - 16 / 9) < .01, article.slug);
        if (article.slug === "network-security-perimeter") {
          assert.ok(result.imageTop < 900, "NSP illustration must appear in the initial viewport");
          await capture(page, `article-cover-nsp-${width}.png`);
        }
        if (article.slug === "azure-policy-part-1-what-is-a-policy") {
          await capture(page, `article-cover-policy-${width}.png`);
          await page.locator(".article-share").scrollIntoViewIfNeeded();
          await capture(page, `article-wide-share-series-${width}.png`);
          await page.locator(".article-related").scrollIntoViewIfNeeded();
          await capture(page, `article-wide-related-${width}.png`);
        }
        assert.deepEqual(errors, [], article.slug);
      }
    });
    await test(`All 48 article bodies: layout, links and scripts at ${width}px`, async () => {
      for (const article of metadata) {
        errors.length = 0;
        await page.goto(base + article.url, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => !!window.SiteUX);
        const result = await page.evaluate(() => {
          const body = document.querySelector(".article-body");
          const para = body.querySelector(":scope > p");
          const canvas = document.createElement("canvas");
          const style = para ? getComputedStyle(para) : null;
          const measure = canvas.getContext("2d");
          if (style) measure.font = `${style.fontSize} ${style.fontFamily}`;
          const duplicate = [...document.querySelectorAll("[id]")].map(node => node.id);
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            proseWidth: para?.getBoundingClientRect().width || 0,
            maxProseWidth: style ? measure.measureText("0").width * 75 + 2 : 0,
            duplicates: duplicate.filter((id, index) => duplicate.indexOf(id) !== index),
            tocOpen: document.querySelector(".reading-toc")?.open,
            shareOpen: document.querySelector(".article-share").open,
            images: [...body.querySelectorAll("figure img")].every(image => image.closest("a[data-image-zoom]") && image.closest("figure").querySelector("figcaption")),
            adAfterBody: document.querySelector(".article-ad").compareDocumentPosition(body) & Node.DOCUMENT_POSITION_PRECEDING,
          };
        });
        assert.ok(result.overflow <= 2, `${article.slug}: overflow ${result.overflow}`);
        assert.ok(result.proseWidth <= result.maxProseWidth + 2, `${article.slug}: prose too wide`);
        assert.deepEqual(result.duplicates, [], article.slug);
        assert.equal(result.shareOpen, width === 1440, article.slug);
        assert.ok(result.images, article.slug);
        assert.ok(result.adAfterBody, article.slug);
        assert.deepEqual(errors, [], article.slug);
        evidence.push({ slug: article.slug, width, ...result });
      }
    });
    await test(`TOC width toggle and keyboard reopening at ${width}px`, async () => {
      await page.goto(base + "/articles/allow-icmp-ping-on-an-azure-vm/");
      const toc = page.locator(".reading-layout > .reading-toc");
      const summary = toc.locator("summary");
      const measure = () => page.evaluate(() => {
        const body = document.getElementById("article-content");
        const style = getComputedStyle(body);
        return {
          layout: document.querySelector(".reading-layout").getBoundingClientRect().width,
          body: body.getBoundingClientRect().width,
          prose: body.querySelector(":scope > p").getBoundingClientRect().width,
          padding: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      if (width === 390) await summary.click();
      assert.equal(await toc.evaluate(toc => toc.open), true);
      assert.equal(await summary.innerText(), "Hide table of contents");
      const open = await measure();
      if (width === 1440) assert.ok(open.body < open.layout - 200);
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await toc.evaluate(toc => toc.open), false);
      assert.equal(await summary.innerText(), "Show table of contents");
      assert.equal(await toc.locator("nav").isVisible(), false);
      const closed = await measure();
      assert.ok(Math.abs(closed.body - closed.layout) < 2);
      assert.ok(Math.abs(closed.prose - (closed.body - closed.padding - 2)) < 3);
      assert.ok(closed.overflow <= 2);
      assert.equal(await summary.evaluate(summary => summary === document.activeElement), true);
      await capture(page, `article-toc-closed-${width}.png`);
      await page.keyboard.press("Space");
      assert.equal(await toc.evaluate(toc => toc.open), true);
      assert.ok(Math.abs((await measure()).body - open.body) < 2);
      if (width === 1440) {
        await page.locator("#article-content h2").last().scrollIntoViewIfNeeded();
        await summary.click();
        await page.waitForFunction(() => {
          const summary = document.querySelector(".reading-toc summary").getBoundingClientRect();
          return summary.top >= 0 && summary.bottom <= innerHeight;
        });
        assert.equal(await toc.evaluate(toc => toc.open), false);
        await page.keyboard.press("Enter");
        assert.equal(await toc.evaluate(toc => toc.open), true);
      } else {
        await toc.locator('a[href="#2-add-the-guest-firewall-rule"]').click();
        assert.equal(await toc.evaluate(toc => toc.open), false);
        assert.equal(await page.evaluate(() => document.activeElement.id), "2-add-the-guest-firewall-rule");
      }
    });
    await test(`TOC, local image viewer and clipboard denial at ${width}px`, async () => {
      await page.goto(base + "/articles/allow-icmp-ping-on-an-azure-vm/");
      if (width === 390) await page.locator(".reading-toc summary").click();
      await page.locator('.reading-toc a[href="#2-add-the-guest-firewall-rule"]').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), "2-add-the-guest-firewall-rule");
      const zoom = page.locator(".article-body [data-image-zoom]").first();
      await zoom.focus();
      await page.keyboard.press("Enter");
      await page.waitForSelector(".image-dialog[open]");
      assert.equal(await page.locator(".image-dialog img").evaluate(image => image.complete && image.naturalWidth > 0), true);
      await capture(page, `article-image-${width}.png`);
      await page.keyboard.press("Escape");
      assert.equal(await zoom.evaluate(node => node === document.activeElement), true);
      await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) } }));
      const copy = page.locator("[data-code-copy]").first();
      await copy.click();
      await page.waitForSelector("#siteCopyDialog[open]");
      assert.match(await page.locator("#siteCopyDialog textarea").inputValue(), /New-NetFirewallRule/);
      assert.match(await page.locator("#siteCopyDialog").innerText(), /denied/i);
      await capture(page, `article-copy-denied-${width}.png`);
      await page.keyboard.press("Escape");
      assert.equal(await copy.evaluate(node => node === document.activeElement), true);
    });
    await test(`DNS decision tree keyboard, trail and shared result at ${width}px`, async () => {
      await page.goto(base + "/articles/dns-in-azure-part-8-decision-tree/");
      await page.evaluate(() => {
        window.copied = [];
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => window.copied.push(text) } });
      });
      for (let n = 0; n < 8 && await page.locator(".dtree-option").count(); n++) {
        const button = page.locator(".dtree-option").first();
        await button.focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.evaluate(() => document.activeElement.id), "dtree-current");
      }
      const title = await page.locator(".dtree-outcome-title").innerText();
      assert.ok(title.length > 0);
      assert.ok(await page.locator(".dtree-crumb").count() > 0);
      await page.getByRole("button", { name: "Copy diagnostic", exact: true }).click();
      assert.ok((await page.evaluate(() => window.copied.at(-1))).includes(title));
      await page.getByRole("button", { name: "Copy link to this path", exact: true }).click();
      const shared = new URL(await page.evaluate(() => window.copied.at(-1)));
      await capture(page, `article-dns-result-${width}.png`);
      await page.goto(base + shared.pathname + shared.search + shared.hash);
      assert.equal(await page.locator(".dtree-outcome-title").innerText(), title);
      await page.locator(".dtree-crumb").first().focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => document.activeElement.id), "dtree-current");
      assert.ok(await page.locator(".dtree-option").count() > 0);
      assert.equal(new URL(page.url()).searchParams.has("dnsPath"), false);
    });
    await test(`Private DNS zone search, empty state and copy at ${width}px`, async () => {
      await page.goto(base + "/articles/dns-in-azure-part-5-private-endpoint-dns/");
      await page.evaluate(() => {
        window.copied = [];
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async text => window.copied.push(text) } });
      });
      await page.locator("#zone-search").fill("Storage - Blob");
      assert.equal(await page.locator("[data-zone-table] tbody tr:visible").count(), 1);
      await page.locator("[data-zone-table] tbody tr:visible").getByRole("button", { name: "Copy privatelink.blob.core.windows.net", exact: true }).click();
      assert.equal(await page.evaluate(() => window.copied.at(-1)), "privatelink.blob.core.windows.net");
      await capture(page, `article-dns-zones-${width}.png`);
      await page.locator("#zone-search").fill("no-such-service-fixture");
      assert.match(await page.locator("#zone-count").innerText(), /0 of.*Try another/);
      await page.locator("#zone-reset").click();
      assert.ok(await page.locator("[data-zone-table] tbody tr:visible").count() > 15);
    });
    await test(`KQL and Git libraries search, categories and deep links at ${width}px`, async () => {
      for (const slug of ["kql-query-collection", "git-basics"]) {
        await page.goto(base + "/articles/" + slug + "/");
        const total = await page.locator(".library-entry").count();
        assert.ok(total > 10);
        await page.locator("#library-search").fill(slug === "git-basics" ? "remote branch deletion" : "List node pools");
        assert.ok(await page.locator(".library-entry:visible").count() > 0);
        assert.ok(await page.locator(".library-entry:visible").count() < total);
        const link = await page.locator(".library-entry:visible a[href^='#']").first().getAttribute("href");
        await capture(page, `article-${slug}-${width}.png`);
        await page.goto(base + "/articles/" + slug + "/" + link);
        const heading = page.locator(link);
        assert.equal(await heading.isVisible(), true);
        await page.locator("#library-search").fill("no-such-query-fixture");
        assert.match(await page.locator("#library-count").innerText(), /0 of/);
        await page.locator("#library-reset").click();
        assert.match(await page.locator("#library-count").innerText(), new RegExp(`${total} of ${total}`));
        const option = await page.locator("#library-category option").nth(1).getAttribute("value");
        await page.locator("#library-category").selectOption(option);
        assert.equal(await page.locator(".library-group:visible").count(), 1);
      }
    });
    await test(`Privacy summary, no choice buttons and unchanged consent defaults at ${width}px`, async () => {
      await page.goto(base + "/privacy/");
      assert.equal(await page.locator("ins.adsbygoogle,script[src*='adsbygoogle.js']").count(), 0);
      assert.equal(await page.locator("#privacy-summary").isVisible(), true);
      assert.equal(await page.locator("[data-privacy-choices]").count(), 0);
      assert.equal(await page.getByRole("button", { name: "Change my privacy choices", exact: true }).count(), 0);
      assert.doesNotMatch(await page.locator("#article-content").textContent(), /This action asks|pressing the button/);
      const defaults = await page.evaluate(() => {
        const entry = (window.dataLayer || []).find(item => item[0] === "consent" && item[1] === "default");
        return entry?.[2];
      });
      for (const purpose of ["ad_storage", "analytics_storage", "ad_user_data", "ad_personalization"]) assert.equal(defaults[purpose], "denied");
      assert.equal(await page.evaluate(() => (window.dataLayer || []).some(item => item[0] === "consent" && item[1] === "update")), false);
      await capture(page, `article-privacy-${width}.png`);
    });
    await ctx.close();
  }
  for (const [width, theme, javaScriptEnabled] of [[1440, "light", true], [390, "dark", true], [320, "light", true], [1920, "dark", true], [1440, "light", false], [390, "light", false]]) {
    await test(`Privacy matches article layout at ${width}px ${theme} ${javaScriptEnabled ? "with" : "without"} JavaScript`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme, javaScriptEnabled });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const metrics = () => page.evaluate(() => {
        const main = document.querySelector("main"), header = document.querySelector(".article-header");
        const body = document.getElementById("article-content"), toc = document.querySelector(".reading-layout > .reading-toc");
        const bodyStyle = getComputedStyle(body), titleStyle = getComputedStyle(document.querySelector("h1"));
        return {
          mainWidth: main.getBoundingClientRect().width,
          mainPadding: getComputedStyle(main).paddingTop,
          headerLeft: header.getBoundingClientRect().left,
          headerWidth: header.getBoundingClientRect().width,
          titleSize: titleStyle.fontSize,
          titleWeight: titleStyle.fontWeight,
          bodyWidth: body.getBoundingClientRect().width,
          bodyPadding: bodyStyle.padding,
          bodyFontSize: bodyStyle.fontSize,
          bodyLineHeight: bodyStyle.lineHeight,
          bodyBackground: bodyStyle.backgroundColor,
          bodyBorder: bodyStyle.border,
          proseWidth: body.querySelector(":scope > p").getBoundingClientRect().width,
          tocOpen: toc.open,
          tocPosition: getComputedStyle(toc).position,
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      await page.goto(base + "/articles/azure-policy-part-1-what-is-a-policy/");
      const reference = await metrics();
      await page.goto(base + "/privacy/");
      assert.deepEqual(await metrics(), reference);
      assert.equal(reference.headerWidth, reference.mainWidth);
      assert.ok(reference.overflow <= 2);
      assert.equal(await page.locator(".reading-layout > .reading-toc").count(), 1);
      assert.equal(await page.locator(".article-body .reading-toc").count(), 0);
      assert.equal(await page.locator(".reading-toc a").count(), 9);
      assert.equal(await page.locator("#article-content h2").count(), 9);
      assert.equal(await page.locator("#article-content .table-wrap tbody tr").count(), 5);
      assert.equal(await page.locator("main [data-privacy-choices]").count(), 0);
      assert.equal(await page.locator("ins.adsbygoogle,script[src*='adsbygoogle.js'],.article-share,.article-feature-image,.series-nav,.article-related").count(), 0);
      assert.match(await page.locator(".article-footer-nav").textContent(), /Back to home/);
      if (javaScriptEnabled && ((width === 1440 && theme === "light") || (width === 390 && theme === "dark"))) {
        await capture(page, `privacy-article-layout-${width}-${theme}.png`);
      }
      const toc = page.locator(".reading-layout > .reading-toc"), summary = toc.locator("summary");
      if (await toc.evaluate(node => node.open)) await summary.click();
      assert.equal(await summary.innerText(), "Show table of contents");
      const collapsed = await metrics();
      assert.equal(collapsed.bodyWidth, collapsed.mainWidth);
      await summary.focus();
      await page.keyboard.press("Enter");
      assert.equal(await summary.innerText(), "Hide table of contents");
      if (width >= 1200) assert.ok((await metrics()).bodyWidth < collapsed.bodyWidth - 200);
      await toc.locator('a[href="#cookies-and-consent"]').click();
      assert.equal(new URL(page.url()).hash, "#cookies-and-consent");
      if (javaScriptEnabled) {
        assert.equal(await page.evaluate(() => document.activeElement.id), "cookies-and-consent");
        assert.equal(await toc.evaluate(node => node.open), width >= 1200);
      }
      await page.emulateMedia({ media: "print" });
      await page.waitForFunction(() => getComputedStyle(document.querySelector(".reading-toc")).display === "none");
      assert.equal(await page.locator("#privacy-summary").isVisible(), true);
      assert.equal(await page.locator("#changes").isVisible(), true);
      assert.deepEqual(errors, []);
      await ctx.close();
    });
  }
  await test("Article framing stays full-width at wide, tablet and narrow widths in dark mode and without JavaScript", async () => {
    for (const width of [1920, 1024, 320]) {
      for (const javaScriptEnabled of [true, false]) {
        const ctx = await context({ viewport: { width, height: 900 }, javaScriptEnabled, colorScheme: javaScriptEnabled ? "dark" : "light" });
        const page = await ctx.newPage();
        await page.goto(base + "/articles/azure-policy-part-1-what-is-a-policy/");
        await assertArticleFrame(page);
        for (const selector of [".article-share", ".series-map"]) {
          const disclosure = page.locator(selector).first();
          const wasOpen = await disclosure.evaluate(node => node.open);
          await disclosure.locator("summary").focus();
          await page.keyboard.press("Enter");
          assert.equal(await disclosure.evaluate(node => node.open), !wasOpen);
          await assertArticleFrame(page);
        }
        if (width === 1920) {
          await page.goto(base + "/privacy/");
          assert.ok(await page.evaluate(() => Math.abs(document.querySelector(".article-header").getBoundingClientRect().width - document.querySelector("main").getBoundingClientRect().width) < 2));
        }
        await ctx.close();
      }
    }
  });
  await test("TOC width toggle also works without JavaScript", async () => {
    const ctx = await context({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + "/articles/allow-icmp-ping-on-an-azure-vm/");
    const toc = page.locator(".reading-layout > .reading-toc");
    const widths = () => page.evaluate(() => ({
      body: document.getElementById("article-content").getBoundingClientRect().width,
      layout: document.querySelector(".reading-layout").getBoundingClientRect().width,
    }));
    assert.equal(await toc.evaluate(toc => toc.open), false);
    const initial = await widths();
    assert.ok(Math.abs(initial.body - initial.layout) < 2);
    await toc.locator("summary").click();
    assert.equal(await toc.evaluate(toc => toc.open), true);
    const open = await widths();
    assert.ok(open.body < open.layout - 200);
    await toc.locator("summary").click();
    assert.equal(await toc.evaluate(toc => toc.open), false);
    assert.ok(Math.abs((await widths()).body - initial.body) < 2);
  });
  const dark = await context({ viewport: { width: 390, height: 900 }, colorScheme: "dark" });
  const darkPage = await dark.newPage();
  await test("Dark mobile article controls and no-JavaScript fallback", async () => {
    await darkPage.goto(base + "/articles/azure-policy-part-1-what-is-a-policy/");
    assert.equal(await darkPage.locator("html").getAttribute("data-theme"), "dark");
    await capture(darkPage, "article-policy-dark-mobile.png");
    const nojs = await context({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    const page = await nojs.newPage();
    await page.goto(base + "/articles/dns-in-azure-part-8-decision-tree/");
    assert.equal(await page.locator("#every-path-at-a-glance").isVisible(), true);
    assert.ok(await page.locator(".article-body table tr").count() > 10);
    await page.goto(base + "/articles/kql-query-collection/");
    assert.ok(await page.locator(".library-entry:visible").count() > 10);
    await nojs.close();
  });
  fs.writeFileSync(path.relative(root, path.join(artifacts, "article-reading-layout-evidence.json")), JSON.stringify(evidence, null, 2));
}).catch(error => { console.error(error); process.exitCode = 1; });
