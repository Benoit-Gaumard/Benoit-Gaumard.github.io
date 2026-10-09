// Run with SITE_UX_HARNESS pointing to the existing site-check-harness.cjs.
const runSuite = require(process.env.SITE_UX_HARNESS);

runSuite("world-clock-details", async ({ context, test, base, assert, artifacts, path }) => {
  const city = (page, name) => page.locator(".world-zone").filter({ has: page.getByRole("heading", { name: new RegExp(name) }) });
  async function ready(page) {
    await page.waitForFunction(() => document.getElementById("parisTime").textContent !== "--:--:--");
    await page.waitForFunction(() => [...document.querySelectorAll("img.country-flag")].every(flag => flag.complete && flag.naturalWidth === 24));
  }
  async function addCity(page, value) {
    await page.locator("#zoneInput").fill(value);
    await page.locator("#addZone").click();
  }
  for (const [width, theme] of [[320, "light"], [390, "dark"], [1440, "light"], [1440, "dark"]]) {
    await test(`calendar cards, GMT badges and local flags ${width} ${theme}`, async () => {
      const ctx = await context({ viewport: { width, height: 900 }, colorScheme: theme });
      await ctx.addInitScript(() => { Date.now = () => Date.parse("2026-10-08T12:00:00Z"); });
      const page = await ctx.newPage(), errors = [], flagRequests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/flags/")) flagRequests.push(request.url()); });
      await page.goto(`${base}/world-clock/?scoutTheme=${theme}`);
      await ready(page);
      assert.equal(await page.locator(".clock-calendar-card:visible").count(), 2);
      assert.equal(await page.locator("#dayOfYear").textContent(), "281");
      assert.equal(await page.locator("#yearProgress").textContent(), "of 365 · 77.0%");
      assert.equal(await page.locator("#weekOfYear").textContent(), "41");
      assert.equal(await page.locator("#weekContext").textContent(), "ISO week · 2026");
      assert.equal(await page.locator("#parisOffset").textContent(), "GMT+2");
      assert.equal(await page.locator("img.country-flag").count(), 8);
      assert.equal(await city(page, "Johannesburg").locator(".timezone-offset").textContent(), "GMT+2");
      assert.equal(await city(page, "Johannesburg").locator("img.country-flag").getAttribute("src"), "/flags/za.png");
      assert.equal(await city(page, "Hyderabad").locator(".timezone-offset").textContent(), "GMT+5:30");
      assert.equal(await city(page, "London").locator("img.country-flag").getAttribute("src"), "/flags/gb.png");
      assert.ok(flagRequests.length && flagRequests.every(url => new URL(url).origin === base));
      const colors = await page.locator(".timezone-offset,.clock-calendar-card h2,.clock-calendar-note").evaluateAll(nodes => nodes.map(node => {
        const css = getComputedStyle(node), panel = node.closest(".world-primary,.world-zone,.clock-calendar-card");
        return [css.color, css.backgroundColor, getComputedStyle(panel).backgroundColor];
      }));
      const rgba = value => value.match(/[\d.]+/g).map(Number);
      const luminance = values => values.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      for (const [foreground, overlay, panel] of colors) {
        const paint = rgba(overlay), alpha = paint[3] ?? 1;
        const background = rgba(panel).slice(0, 3).map((value, index) => value * (1 - alpha) + paint[index] * alpha);
        const levels = [luminance(rgba(foreground).slice(0, 3)), luminance(background)].sort((a, b) => a - b);
        assert.ok((levels[1] + .05) / (levels[0] + .05) >= 4.5, `${foreground} on ${overlay} / ${panel}`);
      }
      for (const view of ["cards", "list"]) {
        await page.locator(`[data-clock-view="${view}"]`).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        assert.equal(await page.locator(".timezone-offset:visible").count(), 8);
        assert.equal(await page.locator("details .timezone-offset").count(), 0);
        const badHeaders = await page.locator(".world-zone-head").evaluateAll(headers => headers.filter(header => {
          const name = header.querySelector(".world-place-heading").getBoundingClientRect();
          const action = header.querySelector("button").getBoundingClientRect();
          return name.right > action.left + 1;
        }).length);
        assert.equal(badHeaders, 0);
      }
      assert.equal(await page.locator("#parisTime").getAttribute("aria-live"), "off");
      assert.equal(await page.locator("#dayOfYear").getAttribute("aria-live"), "off");
      await page.locator('[data-clock-view="cards"]').click();
      if ((width === 1440 && theme === "light") || width === 390) {
        await page.evaluate(() => scrollTo(0, 0));
        await page.waitForFunction(() => scrollY === 0);
        await page.locator(".world-overview").screenshot({ path: path.join(artifacts, `clock-calendar-${width}-${theme}.png`) });
        await city(page, "Johannesburg").screenshot({ path: path.join(artifacts, `clock-country-${width}-${theme}.png`) });
      }
      assert.deepEqual(errors, []);
    });
  }
  await test("added countries, geographic aliases, UTC and saved cities", async () => {
    const ctx = await context({ viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/world-clock/`);
    await ready(page);
    for (const zone of ["Asia/Tokyo", "Asia/Kathmandu", "Europe/Copenhagen", "Africa/Asmera", "UTC"]) await addCity(page, zone);
    await ready(page);
    assert.equal(await city(page, "Tokyo").locator("img.country-flag").getAttribute("src"), "/flags/jp.png");
    assert.equal(await city(page, "Kathmandu").locator(".timezone-offset").textContent(), "GMT+5:45");
    assert.equal(await city(page, "Copenhagen").locator("img.country-flag").getAttribute("src"), "/flags/dk.png");
    assert.equal(await city(page, "Asmera").locator("img.country-flag").getAttribute("src"), "/flags/er.png");
    assert.equal(await city(page, "UTC").locator("img.country-flag").count(), 0);
    assert.equal(await city(page, "UTC").locator(".clock-flag-neutral").count(), 1);
    await page.reload();
    await ready(page);
    assert.equal(await city(page, "Tokyo").count(), 1);
    assert.equal(await city(page, "Copenhagen").count(), 1);
    await addCity(page, "US/Eastern");
    assert.match(await page.locator("#zoneError").textContent(), /New York is already shown/);
    assert.equal(await city(page, "New York").count(), 1);
    await addCity(page, "Not/AZone");
    assert.equal(await page.locator("#zoneInput").getAttribute("aria-invalid"), "true");
    await city(page, "Tokyo").getByRole("button", { name: "Remove Tokyo" }).click();
    assert.equal(await city(page, "Tokyo").count(), 0);
  });
  await test("meeting dates update year cards and GMT badges without losing DST safeguards", async () => {
    const ctx = await context(), page = await ctx.newPage();
    await page.goto(`${base}/world-clock/`);
    await ready(page);
    await page.locator("#meetingPlanner > summary").click();
    for (const [value, offset, day, progress] of [
      ["2026-01-15T09:00", "GMT+1", "15", "of 365 · 4.1%"],
      ["2026-07-15T09:00", "GMT+2", "196", "of 365 · 53.7%"],
      ["2024-02-29T09:00", "GMT+1", "60", "of 366 · 16.4%"],
      ["2027-01-01T09:00", "GMT+1", "1", "of 365 · 0.3%"],
    ]) {
      await page.locator("#meetingTime").fill(value);
      await page.locator("#previewMeeting").click();
      assert.equal(await page.locator("#parisOffset").textContent(), offset);
      assert.equal(await page.locator("#dayOfYear").textContent(), day);
      assert.equal(await page.locator("#yearProgress").textContent(), progress);
    }
    assert.equal(await page.locator("#weekOfYear").textContent(), "53");
    assert.equal(await page.locator("#weekContext").textContent(), "ISO week · 2026");
    await page.locator("#meetingTime").fill("2026-03-29T02:30");
    await page.locator("#previewMeeting").click();
    assert.equal(await page.locator("#meetingTime").getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator("#dayOfYear").textContent(), "1");
    await page.locator("#meetingTime").fill("2026-10-25T02:30");
    await page.locator("#previewMeeting").click();
    assert.equal(await page.locator("#occurrenceField").isVisible(), true);
    await page.locator("#meetingOccurrence").selectOption({ index: 1 });
    assert.equal(await page.locator("#parisOffset").textContent(), "GMT+2");
    await page.locator("#meetingOccurrence").selectOption({ index: 2 });
    assert.equal(await page.locator("#parisOffset").textContent(), "GMT+1");
    await page.locator("#liveClock").click();
    assert.equal(await page.locator("#clockMode").textContent(), "Live clocks");
  });
  await test("an unavailable flag keeps a named country fallback", async () => {
    const ctx = await context(), page = await ctx.newPage();
    await page.route("**/flags/jp.png", route => route.fulfill({ status: 404, body: "Unavailable" }));
    await page.goto(`${base}/world-clock/`);
    await ready(page);
    await addCity(page, "Asia/Tokyo");
    const fallback = city(page, "Tokyo").locator(".clock-flag-neutral");
    await fallback.waitFor();
    assert.equal(await fallback.textContent(), "JP");
    assert.match(await fallback.getAttribute("aria-label"), /Japan: flag unavailable/);
  });
});
