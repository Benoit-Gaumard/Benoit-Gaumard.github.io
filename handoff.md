# Handoff - benoit-gaumard.io static site

Purpose of this file: let another AI coding assistant pick up work on this repo without re-discovering everything from scratch. Read this fully before making changes.

## 1. What this repo is

**Scope:** the site is the 65 standalone pages at the repo root. The Hugo blog under `blog/` is an external blog the owner is retiring - out of scope, never audited, not counted.

Personal site + tools hub for Benoit Gaumard, deployed to **https://benoit-gaumard.io** via GitHub Pages.

- Repo: `Benoit-Gaumard/Benoit-Gaumard.github.io` (GitHub), local clone at `c:\REPOS\VIBE\Benoit-Gaumard.github.io`.
- **No build step for tool pages.** Every `/<slug>/index.html` is a single self-contained file: inline `<style>` + inline `<script>`, vanilla JS, zero npm dependencies (one exception: Leaflet.js loaded from a CDN on `/azure-regions/`).
- `/blog/` is the only part that uses a real static-site generator (Hugo, theme "hugo-clarity"). Sitewide codemods in this repo deliberately **exclude** `/blog/` - it's a separate theme system, out of scope unless the user explicitly asks for blog changes.
- `/articles/` is a hybrid: 32 article pages are **generated** from `articles/build-articles.mjs`'s `pageShell()` template (run `node articles/build-articles.mjs` to rebuild all of them after touching the template). `articles/index.html` (the hub/index of articles) is **hand-authored**, not generated - edit it directly.
- Deployment: `.github/workflows/deploy-hugo.yaml` builds the Hugo blog AND copies every other top-level tool page's `index.html` + data JSON into `public/<slug>/`, then deploys the whole `public/` folder to GitHub Pages. This workflow is triggered by push to `main` OR by `workflow_run` when one of the data-refresh workflows (see §4) completes.

## 2. Design system (must match on every page)

Every hand-authored page shares byte-identical (or near-identical) boilerplate:

- `<!doctype html><html lang="en"><head>` with a synchronous inline `<script>` right after `<meta name="color-scheme" content="light">` that:
  1. Reads `localStorage["site-theme"]`, falls back to `prefers-color-scheme`, sets `<html data-theme="dark">` before first paint (theme FOUC prevention).
  2. Reads `localStorage["news-banner-dismissed"]`, compares to a **version string** (currently `"2026-08-21"`), sets `<html data-news-banner="hidden">` if it matches (banner FOUC prevention - see §5).
- `<style>` block: `:root { --cp-bg; --cp-surface; --cp-border; --cp-text; --cp-accent; --cp-link; --cp-shadow; --cp-panel-strong; ... }` (~20 core vars, some pages add extras like `--cp-violet`, `--cp-cyan`, `--cp-highlight-bg`) + a `:root[data-theme="dark"] { ... }` override block with a full canonical dark palette. Font: `font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;` on `body`. Aurora background via `body::before`/`body::after` radial-gradients - identical on every page.
- Header: `<header class="site-header">` (sticky, blurred) → `.header-inner` → brand logo, `.menu-toggle` (mobile hamburger), `<nav class="header-links" id="primaryNav">` with **exactly 4 links** (Home, Blog, Articles, Tools - deliberately trimmed from a longer list), `.header-actions` div containing LinkedIn `.social-link` + `.theme-toggle` glued together (shared border, no individual borders).
- `<main>` → `.intro` section (h1 + `.intro-text` + optional `.refresh-meta` "Last refreshed: ..." paragraph) → the page's actual content.
- Footer: `<footer class="site-footer">` → `.footer-main` (about / Explore nav / Tools links) → `.footer-bottom` (copyright).
- `.news-banner` - first element inside `<body>`, before `<header>` (see §5).
- `.back-to-top` floating button, scroll listener toggles `.visible`.
- Bottom `<script>` blocks (separate tags): menu-toggle open/close logic, theme-toggle click handler, news-banner close handler.

**"Last refreshed" convention**: `<p class="refresh-meta">Last refreshed: <strong id="refreshedAt">...</strong></p>` right after `.intro-text`. JS sets it via `new Date(x).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })` - **always hardcode `"en-US"`**, never `undefined`, or the format silently changes per visitor locale (this bit us once, see memory notes for the full story).

**Cards/List view toggle** (used on azure-regions, friends-websites, microsoft-portals, rss-watcher, workflows, world-clock, tools, favorite-links): `.view-toggle { border-radius: 10px; border: 1px solid var(--cp-border); padding: .25rem; gap: .25rem; }` + `.view-toggle-button { border-radius: 7px; padding: .45rem .9rem; font-size: .85rem; }`, active state `background: var(--cp-accent-soft); color: var(--cp-accent);`. Do NOT reinvent a round-pill variant - copy this exact CSS.

**Accessible colour tokens (do not lighten these back)**: `--cp-warning: #96610a`, `--cp-success: #157f57` and `--cp-cyan: #0d93b0` were darkened on 2026-08-29 to clear WCAG AA in **light** mode (`.skill h3`/`.exp-card .hash` were at 3.03:1, `.grad-text` at 2.44:1, `.tl-note` at 4.46:1). The dark-theme values are separate and were already compliant - don't "resync" the two palettes. Any new token used for text must be checked against `--cp-bg` **and** `--cp-surface` in light mode.

**Section navigation (homepage only)**: `index.html` / `index_fr.html` carry a sticky `.section-nav` under the header. Its offset comes from a `--header-h` custom property that a `ResizeObserver` keeps in sync with the real header height, so never hard-code a `top` value for it. Sections use `main [id] { scroll-margin-top: calc(var(--header-h) + 4rem); }` so anchor jumps clear both sticky bars. No other page has this component.

## 3. Standard pipeline for adding a new `/<slug>/` tool page

1. Research the data source.
2. If data needs periodic refresh: `<slug>/fetch-updates.mjs` (Node ESM, zero deps, global `fetch`) OR `<slug>/fetch-updates.ps1` (PowerShell, for anything backed by an `Get-Az*` cmdlet - see §4) writing `<slug>/<data>.json`.
3. Build `<slug>/index.html` by **copying the most recently built similar page** and adapting - never write the boilerplate from scratch.
4. If a refresh workflow is needed: `.github/workflows/<slug>-updates.yaml` - cron `'0 6 * * *'`,`'0 9 * * *'`,`'0 12 * * *'`,`'0 15 * * *'` (4x/day) + `workflow_dispatch`, `permissions: contents: write`, a `concurrency` group, steps: checkout → run script → conditional git commit/push (`git add <file>; git diff --cached --quiet || (commit && push)`).
5. Update `.github/workflows/deploy-hugo.yaml`: add the workflow's `name:` to the `workflow_run.workflows` trigger array (**easy to forget** - always grep for it when adding a workflow) AND add `mkdir -p public/<slug>` + `cp` steps for the page + data files (needed even for pages with no refresh workflow).
6. Add a card to `tools/index.html` (pick an unused emoji or reuse an existing icon asset).
7. If a refresh workflow was added, add an entry to the `WORKFLOWS` array in `workflows/index.html`.
8. Validate: `get_errors`, and for standalone scripts, syntax-check (`node -c`, or for PowerShell: `pwsh -Command "[scriptblock]::Create((Get-Content -Raw './file.ps1')) | Out-Null"`), JSON via `python -c "import json; json.load(...)"`, YAML via `python -c "import yaml; yaml.safe_load(...)"`.
9. Test locally: `python -m http.server <port> -WorkingDirectory "<repo path>"` - **must use `-WorkingDirectory`, not `cd` first**, `cd` before `Start-Process` doesn't reliably change the spawned process's cwd in this environment. Then Playwright: `open_browser_page` + `run_playwright_code`, check stats/search/sort/filter + no horizontal overflow at 1440×900 and 375×812.
10. Commit, `git pull --rebase origin main`, `git push`.
11. Verify production via `Invoke-WebRequest -UseBasicParsing "<url>?cb=$(Get-Random)"` (cache-busting) - do NOT hammer the GitHub Actions API to poll deploy status, it's rate-limited (60/hr unauthenticated) and there's no `gh` CLI/token available in this environment.

## 4. Two data-fetch paradigms

**A. `fetch-updates.mjs`** (Node, most pages) - scrapes/fetches a public feed or CSV (RSS feeds, Azure IP ranges JSON, GitHub Meta API, an external Hugo-generated aggregator site, etc.).

**B. `fetch-updates.ps1`** (PowerShell, Azure-authoritative pages: `azure-policy-aliases`, `azure-regions`, `azure-policies`) - connects directly to Azure instead of scraping a doc site:
```powershell
Connect-AzAccount -ServicePrincipal -Credential (PSCredential from $env:AZURE_CLIENT_ID/$env:AZURE_CLIENT_SECRET) -Tenant $env:AZURE_TENANT_ID
```
using the **"scan-benoit-gaumard.io"** Entra app. The 3 secrets (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`) are **GitHub Environment secrets** on the `github-pages` environment (NOT repo secrets) - any workflow job using them needs `environment: github-pages`. Az PowerShell objects expose fields both top-level and nested under `.Properties`/`.Metadata` depending on module version - read defensively. These 3 pipelines also write **weekly dated snapshots** (`<slug>/history/<data>-YYYY-MM-DD.json`, Monday 18:00 UTC cron + a `workflow_dispatch.inputs.snapshot` boolean for manual testing) so catalogs can be diffed over time.

## 5. Sitewide components added this project (in case they need extending)

- **Dark/light theme toggle** - `data-theme` attribute + FOUC-prevention script (see §2).
- **News/welcome banner** - `.news-banner` marquee at top of every page, dismiss button, versioned localStorage key `news-banner-dismissed`. **To push a new announcement**: change the message text in the banner HTML on all pages AND bump the version string (currently `"2026-08-21"`) in both the FOUC-check script and the close-button handler, on all 65 pages (33 direct + 32 generated articles) - this is a full sitewide codemod, see the pattern below.
  - **Gotcha, fixed 2026-08-29**: the close handler sets `hidden` on the banner, but `.news-banner { display: flex }` is an author rule and beats the UA `[hidden] { display: none }`, so for a long time clicking Dismiss did nothing on the current page (it only took effect on the next load, via `data-news-banner`). All 63 pages now carry `.news-banner[hidden] { display: none; }` right after the `:root[data-news-banner="hidden"]` rule. **Keep that rule** if you ever rewrite the banner CSS.
- **Azure Regions interactive map** - Leaflet.js via CDN, Cards/List/Map 3-way toggle.
- **Emoji Sheet & Icons "Per page" pagination** - Previous/Next + a `<select id="perPage">` (50/100/200/All) dropdown, replacing older "Show more" or unlimited-render patterns.

### Sitewide codemod recipe (used repeatedly, works well)
When a change needs to touch all ~65 pages:
1. Write a throwaway Node script (`.mjs`) with a hardcoded list of the ~33 direct-patch files (all hand-authored pages + `articles/index.html`, **excluding** the 32 generated `articles/<slug>/index.html` files).
2. For each file: read, normalize `\r\n` → `\n`, do plain-substring `.replace()` calls against known-unique anchors (e.g. `.site-header {` for CSS insertion, `<body>` for HTML insertion, `</body>` for a closing script, the exact theme-FOUC script block for extending it), convert back to `\r\n`, write.
3. Separately, make the equivalent edits directly inside `articles/build-articles.mjs`'s `pageShell()` template (anchors differ slightly, e.g. body tag is `` <body class="${bodyClass}"> `` not bare `<body>`), then run `node articles/build-articles.mjs` to regenerate all 32 article pages (this also touches `articles/articles.json`/`articles/rss.xml` with a trivial timestamp diff - expected).
4. Delete the throwaway codemod script before committing.
5. Verify coverage with a throwaway Python script grepping all 65 output files for the expected marker string(s).
6. `index.html` and `index_fr.html` sometimes have structural quirks vs the other 63 pages (e.g. an extra blank line after `<body>`) - anchor on the shortest reliable unique substring (`<body>` alone, not `<body>\n<header...>`) to avoid missing them.

## 6. Git workflow quirks - READ THIS BEFORE YOU PANIC

- **An external automated process periodically commits+pushes pending changes** under the user's own git identity with generic messages like "new version" or `chore: refresh <X> data` (visible in `git log` - several of these appear between sessions, e.g. scheduled data-refresh workflows' own commits). If `git status` shows "nothing to commit" right after you made edits you know weren't committed by you, **do not assume something went wrong** - run `git log --oneline -5 -- <file>` to confirm the edit is already committed, then check `git log --oneline -3` to confirm `HEAD`/`origin/main` alignment. If already pushed, skip straight to production verification.
- Standard push sequence: `git add <specific files>` (avoid `git add -A` blindly if `tools/index.html` might have unrelated concurrent edits from another process - check `git diff --stat tools/index.html` first) → `git commit -m "..."` → `git pull --rebase origin main` → `git push origin main`.
- Repo files are CRLF. When writing files programmatically (Node scripts, `create_file`), the working tree normalizes to CRLF on commit regardless (confirmed via byte-count check) - safe to always convert `\n` → `\r\n` before `writeFileSync` in codemods to avoid a print of "LF will be replaced by CRLF" warnings/big diffs.
- No `gh` CLI/token available in this environment - can't dispatch workflows or query the Actions API with authentication. Verify deploys by polling the live production URL instead.

## 7. Backlog - prioritised, measured 2026-08-29

Every count below was verified in a browser or by scanning all 63 shell pages. Nothing here is inferred. Each item has an ID so it can be picked off individually.

Priority means **user harm**, not effort: P1 is something broken or missing for a real visitor today, P2 is real but tolerable, P3 is hygiene and taste.

---

### P1 - real harm to a visitor today

---

### P2 - real, but tolerable

---

### P3 - hygiene, taste, and open questions

---

### Closed this session - do not re-raise

- **P1-1 to P1-5 were already done** and had simply been left in the open list from an earlier session. Re-measured before closing: skip link 62/62 pages, `og:image` 62/62, `sitemap.xml` and `robots.txt` both present, paging on 29 pages, and the silent-failure message on the 6 data pages that needed it.
- **P2-10 · Third-party favicons eliminated** - 320 of 363 domains are now cached in `/favicons/` and served from the site, so **no visitor request reaches Google at all**. `build-favicons.mjs` refreshes them; `.github/workflows/favicons-refresh.yaml` runs it weekly and only fetches what is missing. Three things worth keeping in mind: the endpoint answers with PNG for most domains but JPEG and ICO for others, so the extension is sniffed from the bytes rather than assumed; the 43 domains Google has no icon for fall back to initials, which is what the pages already did for a failed image; and `/favicons/` must stay in `deploy-hugo.yaml` or none of it reaches production. A lean `lookup.json` (13 KB, 320 entries) maps domain to filename for the four pages that build icon URLs in script - one request replacing the 42 to 522 they each used to make.
- **P2-11 + every other CLS source** - `bdd2146`. The four backlog pages are 0.000 at 1280/768/390. The sweep that verified it found three more nobody had measured, the worst being `/rss-watcher/activity/` at 0.566 - a sub-page, which is why it never appeared in a list. **Tables cannot be reserved with a fixed height** (they settle between 5,000px and 89,000px); `.table-wrap:has(tbody:empty) { min-height: 65vh }` keeps the footer below the fold at first paint and releases on first render.
- **P2-5 · Colour drift, and the bug under it** - `e35bd2c`. The 53 findings were mostly the light theme's *missing* tokens written out by hand. Four pages referenced `--cp-warning`/`--cp-danger`/`--cp-danger-bg` with no light declaration at all. Two real dark-mode defects surfaced: the `/icons/` disclaimer panel and rss-watcher's keyword mark both stayed light-themed on a dark page. Token graph verified closed across 64 pages x 2 themes. **Take values from DESIGN.md, not from the literals you find** - my first pass adopted the drifted `#fff8e8`/`#fbe9e9` when the system documents `#fdf3e1`/`#fdf2f2`.
- **P2-6 · Type scale** - `cd24b40`. 30 distinct sizes -> 17 named steps, nothing moved more than 0.05rem. **Do not snap onto the 7 named roles** - that moves headings up to 30% and is a redesign, not a cleanup. Merge near-duplicates only. The detector reads `typography.scale`, not a top-level key.
- **P2-7 · `.stat-cards` unified into `.stats-grid`** - `e35bd2c`. One widget, one name, 10 pages.
- **P3-1 · Detector false positives** - recorded via `hook-admin.mjs`, not hand-edited config: `side-tab` x33, `broken-image` x2, and `em-dash-overuse` as an owner style decision.
- **P3-4 · JSON-LD** - `9c16aa0`. 63 pages, typed by what the page is. Values are read back out of the existing meta tags, so structured data cannot drift from them.
- **P3-5 · Print stylesheet** - `9c16aa0`. 63 pages; chrome hidden, black on white, table headers repeat, no breaks inside rows or code blocks, external links print their URL.
- **P3-6 · Em-dashes** - `7bf20fd`. 360 replaced across 82 files; 0 remain. **Deliberately not touched**: the ~244 in `*/updates.json` and rss-watcher feed titles are fetched from Microsoft, AWS and external feeds - rewriting them would misquote the source and the next refresh would undo it.
- **P3-7 · UI details** - `5776b56`. The reduced-motion blocks named selectors, so everything added since escaped them; all 64 pages now carry the catch-all. `/icons/` no longer opens on "All > All". Enter in the hub search opens the last remaining card. Two items in that entry were stale: the hub loads no third-party icons, and Refresh already sat outside the view toggle.
- **P3-8 · Tools hub** - `624fde5`. Six groups with counts, and an "Updated" date on 18 of 26 cards read from the same git-stamped manifest the data pages use, so the hub cannot advertise a freshness the tool would contradict.
- **P3-9 · French parity** - settled by the owner: English everywhere except the portfolio homepage, which stays EN/FR. Not a gap.

- **The Hugo blog under `blog/` is out of scope permanently** - owner's decision, 2026-08-29. It is an external blog he intends to delete. **Do not audit it, do not critique it, do not count it in page totals, and do not raise it as a gap.** Earlier notes in this file treated its ~45 pages as an unaudited half of the site; that framing is withdrawn. The site is the 63 pages at the repo root. Leave `blog/` alone unless the owner asks.
- **P3-2 · `404.html`** - built *from* `guid-generator/index.html` by script rather than hand-written, so the shell (theme boot, tokens, header, footer, banner) stays byte-identical instead of becoming the one page that drifts. Carries `meta robots noindex, follow` in place of a canonical, and `build-sitemap.mjs` now excludes it - a noindex page listed in a sitemap is a contradiction search engines report as an error.
- **P3-3 · App icons and manifest** - `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` rasterised from the real `favicon.svg` through Playwright, plus `site.webmanifest`. Linked on 64/64 pages *and* in `articles/build-articles.mjs`, so a rebuild keeps them. Verified: manifest parses, all icons return 200 with the right content-type, and the PNGs are exactly 192/512/180.
- **Deploy wiring** - `404.html`, `site.webmanifest` and the three PNGs are in `deploy-hugo.yaml`. **Nothing at the repo root reaches production unless it is copied there**; this is the third time that has nearly bitten.
- **P2-8 · Click-to-copy on the paste-target pages** - `azure-regions` programmatic names (61) and `github-ip-ranges` CIDRs (200). `azure-policies` and `azure-policy-aliases` already had it, so the backlog over-scoped this too. The row **is** the button rather than value-plus-icon-button: one element per row instead of two, which matters on lists that run to hundreds. **Clipboard writes cannot be verified in this headless environment** - a control probe writing a known string also reads back empty - so what is confirmed is that `writeText` resolves without throwing (the primary path, not the `execCommand` fallback), the `is-copied` state flips, and the visually-hidden `role=status` announces the value. `azure-ip-ranges` has the same code but renders 0 rows because of its pre-existing empty tag list, so it is unverified there.
- **P2-4 · Calculator validation** - the backlog entry said "none of the six give validation feedback" and **that was wrong**. Measured: `subnet-calculator` shows "Enter a valid IPv4 address (e.g. 192.168.1.10)", `sla-calculator` "Enter a valid SLA percentage between 0 and 100", `units-converter` "Enter a value to convert", `percentage-calculator` "Enter valid numbers", `guid-generator` clamps to 1-500 and rewrites the field, and `azure-naming-convention` sanitises input, which is correct behaviour for a naming tool. Five of six already told the visitor. My first probe read the wrong container and my second one missed that the GUID clamp only runs on Generate, so **two of my own measurements were wrong before the page was**. The real gap was accessibility: 0 `aria-invalid`, 0 `aria-describedby` and 0 live regions across 25 inputs, so a screen reader never learned which field was at fault. Now wired on all five, with the messages announced. **Watch for stuck state**: `sla-calculator` initially set `aria-invalid` and never cleared it, which is worse than not setting it at all, because the field keeps announcing an error the visitor has already fixed. Every branch now clears before it re-tests.
- **P2-1 · `canonical` on every page** - verified 62/62 `index.html` files carry `rel="canonical"`. This was finished earlier in the session but left sitting in the open list; re-measured before closing it.
- **P2-2 · Data freshness on six pages** - `ff0dd0b`. `build-freshness.mjs` stamps each data file's real git commit date into `freshness.json` at deploy time and the pages read it. **Do not "simplify" this to the `Last-Modified` header**: that reports the deploy, not the edit, and five of the six files are hand-curated, so every one of them would claim to be fresh the moment an unrelated page ships. Label reads "Data updated", not "refreshed", for the same reason.
- **P2-3 · Long-list mechanisms unified** - `57ced53`. The four strategies collapsed to one: a page plus Load More with "Showing N of M", on `azure-policies`, `azure-policy-aliases`, `azure-taggable-resources`, `github-ip-ranges`, `azure-ip-ranges` and `favorite-links`. Pagination stays on `/icons/` only. This also finished P1-5 and made 76,894 aliases reachable that the old 500-row cap had put permanently out of reach.
- **P2-9 · `/rss-watcher/` mobile CLS 0.1516 → 0** - `ff0dd0b`. Two wrong guesses first (reserving the count's *height*, then the date's *width*). `.refresh-meta` is a wrapping flex row, so the empty feed count is 0 wide and 106px filled, which pushed a link onto a third line. Reserving its **width** fixed it.
- **Six script-filled containers reserved** - `1593a4a`. `#statCards`, `#categoryTabs`, `#cidrList`, `#statsGrid`, `#gallery`, `#portalCards`, all 0.000 at 1280/768/390. Reservations are tiered on the pages' existing 48rem/32rem breakpoints and scoped to `:empty` so no blank hole survives a no-match filter.

WCAG AA contrast in both themes · 24×24 touch targets sitewide · heading hierarchy and landmark names · horizontal overflow at every width · reflow at 320px · closed token graph (28 declared / 28 used) · desktop CLS on articles, favorite-links, icons, workflows, azure-regions, azure-policies, emoji-sheet · 27 unnamed filter controls · 18 silent result counters · the `/workflows/` 403 storefront · filter and calculator state in the URL across 26 pages · back-to-hub breadcrumbs on 25 tool pages · click-to-copy on the subnet calculator · the news-banner dismiss no-op · the dead GitHub CTA · the retired `tools.`/`blog.` subdomain links.

**The homepage deliberately does not showcase tools** - considered and rejected by the owner, recorded in `PRODUCT.md`.

## 7b. Measurement gotchas - read before you trust a number

**A generated page will silently undo you.** Both the em-dash pass and the JSON-LD pass were applied to the 32 article pages, and the very next `node articles/build-articles.mjs` stripped them straight back out. Anything sitewide must go into `articles/build-articles.mjs` *and* the pages, then be re-verified after a rebuild. Watch for escape sequences too: the template stored `\\u2014`, which a search for the literal character will never find.

**A blind string replace will rewrite declarations as well as usages.** Swapping `#fff8e8` for `var(--cp-warning-bg)` also rewrote `--cp-warning-bg: #fff8e8` into `--cp-warning-bg: var(--cp-warning-bg)` on 35 files. A property that resolves to itself resolves to nothing, so the fix briefly deleted the theme it was repairing. Only usages may hold a `var()`.

**Check the token graph per theme, not per page.** "Is this token declared somewhere?" is the wrong question; "does every token this page *uses* resolve in *both* themes?" is the right one. That is what caught four pages rendering no danger border in light mode.

**Sweep, do not work the list.** Every batch this session found something the backlog never mentioned, because sub-pages and non-obvious surfaces never make it into a list: `/rss-watcher/activity/` at 0.566 CLS, a 404ing article image, three unmeasured CLS regressions. The list is a starting point, not the scope.

**Serve the previous commit on a second port before blaming your own change.** After adding the freshness row, three pages showed new CLS and four more showed large numbers. Running `git worktree add --detach <tmp> <prev-commit>` and serving it on another port answered in one pass what guessing would not have: `azure-policy-aliases` 0.604 and `azure-policies` 0.085 were **identical before the change**, so the paging work was innocent, while three genuinely were mine. Without that comparison the obvious move was to revert good work chasing a cause it did not have.

**A layout fix that only holds at one width is not a fix.** These grids reflow - `#portalCards` settles at 188px, 395px and 811px at the three tiers - so a single reserved height left mobile shifting exactly as before, and in one case turned a clean 0 into 0.143. Measure the settled height at every breakpoint the page actually defines.

**Prefer `:empty` to an unconditional `min-height`.** Reserving a container permanently trades a layout jump for a blank hole: filter `microsoft-portals` to nothing on a phone and 811px of empty box would sit under the message. Scoped to `:empty`, the box is held only until the first render.

These three cost real time this session. Each one produced confident, wrong conclusions.

**Do not reuse a Playwright page across CLS measurements.** `addInitScript` accumulates, so every extra iteration registers another observer incrementing the same counter and each successive page reports an inflated multiple. This produced a reading of 14.47 before it was caught. Use a fresh `browser.newContext()` per measurement.

**Composite alpha and gradient backgrounds before believing a contrast failure.** `--cp-accent-soft` is `rgba(11,111,184,0.09)` and the news banner's background is a `linear-gradient`. Both read as `transparent` from `getComputedStyle().backgroundColor`, so a naive walker falls through to the page background and reports spectacular false failures - 1.05:1 on white-on-blue text that actually measures 5-6.5:1. A naive probe reported 27 distinct "failures" sitewide; almost all were artefacts.

**Counting attributes is not measuring.** A pass began from "712 images lack `width`/`height`" and it was almost entirely a false alarm: the CSS already reserves the box nearly everywhere, and `/favorite-links/` renders 522 dimensionless images at **CLS 0**. The real shift came from JS-rendered lists starting at zero height and shoving the footer down. Measure the outcome, not the proxy.

**Verify agent findings before repeating them.** Across two sub-agent assessments this session, four confident claims were disproved by direct checking: the favicon fallback *does* work (zero broken images with Google fully blocked), the `/favorite-links/` empty state *does* render its message, the hub drag handles *do* carry `aria-label`, and every capped list *does* announce its cap.

**Custom properties: check both directions.** `var(--cp-panel)` was referenced on 29 pages and declared nowhere - it silently killed a mobile nav hover and the `/icons/` empty-state background. Four other tokens were declared on 29-31 pages and used zero times. Reading one page will never catch this; collect every `--cp-x:` declaration and every `var(--cp-x)` reference across all 63 pages and diff the two sets. The graph is currently closed at 28/28.

**Run the detector config-aware.** `--no-config` strips project context and reports ~32 known-false `dark-glow` hits on the shared `--cp-shadow` elevation token. `.impeccable/config.json` holds three confirmed-intentional exceptions: `marquee` project-wide, plus `dark-glow` and `gradient-text` scoped to the two homepages.

**Calculator and generator pages are intentionally simpler** - no filter bar, no pagination, no stats row. That is correct, not an omission.
## 8. Recent session history (most recent first, as of 2026-08-29)

- **2026-08-29, `/impeccable polish` across all 63 pages.**
  - **Touch targets closed sitewide** - see §7 item 7.
  - **Undefined `var(--cp-panel)` on 29 pages** - a bug the earlier passes missed because they only checked the homepages. It killed the `/icons/` empty-state background outright. See the custom-property hygiene note in §7.
  - Four dead tokens removed; the token graph is now closed at 28/28.
  - The last two marginal contrasts (`.link-tag` 4.41:1, `.article-category-tag` 4.45:1) cleared by switching those two classes to `--cp-accent-hover`, which is darker in light and lighter in dark - a gain in both themes without touching the shared `--cp-accent-soft` tint the active toggle state depends on.
  - Verified across 16 representative pages at 1440 and 375, light and dark: zero small targets, zero overflow, zero heading skips, zero unnamed sections, zero unresolved tokens, zero JS errors.
- **2026-08-29, sitewide audit of the remaining 61 pages.** Browser-measured every page at 1440 and 375.
  - Article template (`pageShell()`): `var(--cp-panel)` was still undefined and the "Back to top" link pointed at a `#top` that did not exist - both were fixed on the homepages earlier but never in the template, so all 32 generated pages carried them. `<main>` is now `<main id="top">`.
  - `articles/index.html`: section titles were `<p class="sec-label">` while all 39 article card titles were `<h2>`, giving a screen reader `h1` + 39 flat `h2`s. Card titles are now `<h3>` (CSS selectors moved with them) and the section titles are `<h2>`. Same `<p>`-as-title fix on `world-clock/index.html`.
  - `azure-taggable-resources`: the mobile rule `.filter-bar input { width: 100% }` also matched the "Taggable only" **checkbox** (equal specificity, declared later than `.filter-toggle input`), blowing it up to 344px and overflowing the page. Now scoped with `:not([type="checkbox"])`.
  - `favorite-links`: `minmax(23rem, 1fr)` = 368px could not shrink below a 360px viewport. Now `minmax(min(23rem, 100%), 1fr)`.
  - Favicon images on `favorite-links` / `microsoft-portals` / `friends-websites` got intrinsic sizes and `referrerPolicy = "no-referrer"` (every one of those ~530 requests was leaking the visited page URL to Google). No fallback was added: all three already remove the image and show initials on error.
  - CLS work and contrast work as described in section 7.
- **2026-08-29, Impeccable `critique` + `audit` + `init` (PR #6).** Design health scored 19/36, audit health 11/20.
  - Sitewide (63 pages): fixed the banner Dismiss no-op (see §5); darkened three colour tokens for light-mode WCAG AA (see §2); fixed the contact GitHub CTA, which pointed at `https://github.com/` root.
  - Homepage pair only: added the sticky `.section-nav` (see §2) because six section `id`s existed with nothing linking to them; converted the four `.sec-label` titles to `<h2>` and named every `<section>`; repointed the Tools cards off the retired `tools.`/`blog.benoit-gaumard.io` subdomains to `/blog/`, `/tools/`, `/icons/`, `/favorite-links/`; added `<noscript>` and `@media print` fallbacks; plus a batch of small defects (undefined `var(--cp-panel)`, `.hero p` overriding `.loc-badge`'s green, a stat animating `7x`->`7+` against its own label, duplicated PHP entry, dev-vocabulary `og:description`, missing `og:url`/`canonical`/`hreflang`, `width`/`height` on 41 images, and deletion of a dead Languages CSS block).
  - **`PRODUCT.md` was created** - see §9.

- **2026-08-29, Impeccable `critique` + `audit` + `init` (PR #6).** Design health scored 19/36, audit health 11/20.
  - Sitewide (63 pages): fixed the banner Dismiss no-op (see §5); darkened three colour tokens for light-mode WCAG AA (see §2); fixed the contact GitHub CTA, which pointed at `https://github.com/` root.
  - Homepage pair only: added the sticky `.section-nav` (see §2) because six section `id`s existed with nothing linking to them; converted the four `.sec-label` titles to `<h2>` and named every `<section>`; repointed the Tools cards off the retired `tools.`/`blog.benoit-gaumard.io` subdomains to `/blog/`, `/tools/`, `/icons/`, `/favorite-links/`; added `<noscript>` and `@media print` fallbacks; plus a batch of small defects (undefined `var(--cp-panel)`, `.hero p` overriding `.loc-badge`'s green, a stat animating `7x`->`7+` against its own label, duplicated PHP entry, dev-vocabulary `og:description`, missing `og:url`/`canonical`/`hreflang`, `width`/`height` on 41 images, and deletion of a dead Languages CSS block).
  - **`PRODUCT.md` was created** - see §9.

- `favorite-links`: removed title/URL truncation (was `text-overflow: ellipsis`), capped grid to 3 columns (`minmax(23rem, 1fr)` instead of `15rem`).
- `favorite-links`: redesigned cards to a compact 2-line layout (favicon+clickable title / category+date+rating), added `dateAdded` CSV column (empty for existing 522 rows - user chose not to backfill), replaced the "featured link" star badge with a 🔥 flame emoji.
- `emoji-sheet`: replaced "Show more" load-more button with the same Previous/Next pagination + "Per page" dropdown (50/100/200/All) pattern as `/icons/`.
- Sitewide: added hover-to-pause (`animation-play-state: paused`) on the news-banner marquee text.
- Sitewide: added the dismissible scrolling welcome banner (see §5) to all 63 pages.
- `azure-regions`: added a Leaflet.js interactive Map view (3rd option next to Cards/List), backfilled `latitude`/`longitude` into the live `regions.json` and into `fetch-updates.ps1`'s output schema.
- New page **`/azure-policies/`** + `.github/workflows/azure-policies-updates.yaml`: browses built-in Azure Policy definitions (`Get-AzPolicyDefinition -Builtin`) and initiatives (`Get-AzPolicySetDefinition -Builtin`) with a Policies/Initiatives tab switcher. Also fixed a pre-existing gap where `azure-regions-updates.yaml` was never added to `deploy-hugo.yaml`'s trigger array or `workflows/index.html`.
- Added weekly dated-snapshot history (`<slug>/history/*.json`) to the `azure-policy-aliases` and `azure-regions` refresh pipelines.
- New page **`/azure-regions/`** pipeline switched from scraping a Microsoft Learn doc page to calling `Get-AzLocation` directly (see §4-B).
- New page **`/azure-policy-aliases/`** pipeline switched from scraping `policyalias.mats.codes` to calling `Get-AzPolicyAlias` directly.
- Various default-filter fixes (`azure-release-updates`, `aws-release-updates`: "Last update" filter now defaults to "Today" instead of "All time").

## 9. Where to look for more context

- **`PRODUCT.md` at the repo root** (added 2026-08-29) is now the authority on product truth: who the users are, what the positioning is, what constraints future work must preserve, and - importantly - what evidence does **not** exist and must not be invented (no testimonials, no case studies, no outcome metrics; the "80+ projects" figure is self-reported). Read it before any design or copy work. Two facts in it are easy to get wrong from the code alone: the tools reference is the core of the product (the profile is the frame around it), and `tools.benoit-gaumard.io` / `blog.benoit-gaumard.io` are **retired** - everything must target `/tools/` and `/blog/` on the canonical domain. It also records one **settled decision**: the homepage deliberately does not showcase tools, and that is not to be re-raised.
- **`DESIGN.md` at the repo root** (added 2026-08-29) is the visual authority: token frontmatter (colours in both themes, type roles, radius and spacing scales, component tokens) plus the prose that says how to apply them. Its North Star is **"The Practitioner's Console"**. Its Don'ts are the load-bearing part - light/dark parity, no build step or dependency, and no per-page divergence of the shared shell. `.impeccable/design.json` carries what the DESIGN.md frontmatter schema can't hold: tonal ramps, shadow and motion vocabularies, breakpoints, and drop-in component snippets.
- Section 2 of this handoff remains the practical, code-level companion to `DESIGN.md` - the exact anchors and gotchas, where `DESIGN.md` carries intent and rules.
- `/memories/repo/benoit-gaumard-site.md` in this AI assistant's memory store has a much more detailed, chronological log of every fix made in past sessions (root causes, exact CSS/JS anchors used, gotchas) - if you're a different AI tool without access to that memory file, this handoff doc is your best summary, but the git commit history (`git log --oneline -50`) plus reading the actual current file contents is the ground truth.
- `.impeccable/critique/` holds the dated critique snapshots (heuristic scores, priority issues, persona findings) that `/impeccable polish` can pick up directly.
- No formal issue tracker / TODO list exists beyond what's in §7 above and whatever the user says next.
