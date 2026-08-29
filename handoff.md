# Handoff — benoit-gaumard.io static site

Purpose of this file: let another AI coding assistant pick up work on this repo without re-discovering everything from scratch. Read this fully before making changes.

## 1. What this repo is

Personal site + tools hub for Benoit Gaumard, deployed to **https://benoit-gaumard.io** via GitHub Pages.

- Repo: `Benoit-Gaumard/Benoit-Gaumard.github.io` (GitHub), local clone at `c:\REPOS\VIBE\Benoit-Gaumard.github.io`.
- **No build step for tool pages.** Every `/<slug>/index.html` is a single self-contained file: inline `<style>` + inline `<script>`, vanilla JS, zero npm dependencies (one exception: Leaflet.js loaded from a CDN on `/azure-regions/`).
- `/blog/` is the only part that uses a real static-site generator (Hugo, theme "hugo-clarity"). Sitewide codemods in this repo deliberately **exclude** `/blog/` — it's a separate theme system, out of scope unless the user explicitly asks for blog changes.
- `/articles/` is a hybrid: 32 article pages are **generated** from `articles/build-articles.mjs`'s `pageShell()` template (run `node articles/build-articles.mjs` to rebuild all of them after touching the template). `articles/index.html` (the hub/index of articles) is **hand-authored**, not generated — edit it directly.
- Deployment: `.github/workflows/deploy-hugo.yaml` builds the Hugo blog AND copies every other top-level tool page's `index.html` + data JSON into `public/<slug>/`, then deploys the whole `public/` folder to GitHub Pages. This workflow is triggered by push to `main` OR by `workflow_run` when one of the data-refresh workflows (see §4) completes.

## 2. Design system (must match on every page)

Every hand-authored page shares byte-identical (or near-identical) boilerplate:

- `<!doctype html><html lang="en"><head>` with a synchronous inline `<script>` right after `<meta name="color-scheme" content="light">` that:
  1. Reads `localStorage["site-theme"]`, falls back to `prefers-color-scheme`, sets `<html data-theme="dark">` before first paint (theme FOUC prevention).
  2. Reads `localStorage["news-banner-dismissed"]`, compares to a **version string** (currently `"2026-08-21"`), sets `<html data-news-banner="hidden">` if it matches (banner FOUC prevention — see §5).
- `<style>` block: `:root { --cp-bg; --cp-surface; --cp-border; --cp-text; --cp-accent; --cp-link; --cp-shadow; --cp-panel-strong; ... }` (~20 core vars, some pages add extras like `--cp-violet`, `--cp-cyan`, `--cp-highlight-bg`) + a `:root[data-theme="dark"] { ... }` override block with a full canonical dark palette. Font: `font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;` on `body`. Aurora background via `body::before`/`body::after` radial-gradients — identical on every page.
- Header: `<header class="site-header">` (sticky, blurred) → `.header-inner` → brand logo, `.menu-toggle` (mobile hamburger), `<nav class="header-links" id="primaryNav">` with **exactly 4 links** (Home, Blog, Articles, Tools — deliberately trimmed from a longer list), `.header-actions` div containing LinkedIn `.social-link` + `.theme-toggle` glued together (shared border, no individual borders).
- `<main>` → `.intro` section (h1 + `.intro-text` + optional `.refresh-meta` "Last refreshed: ..." paragraph) → the page's actual content.
- Footer: `<footer class="site-footer">` → `.footer-main` (about / Explore nav / Tools links) → `.footer-bottom` (copyright).
- `.news-banner` — first element inside `<body>`, before `<header>` (see §5).
- `.back-to-top` floating button, scroll listener toggles `.visible`.
- Bottom `<script>` blocks (separate tags): menu-toggle open/close logic, theme-toggle click handler, news-banner close handler.

**"Last refreshed" convention**: `<p class="refresh-meta">Last refreshed: <strong id="refreshedAt">...</strong></p>` right after `.intro-text`. JS sets it via `new Date(x).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })` — **always hardcode `"en-US"`**, never `undefined`, or the format silently changes per visitor locale (this bit us once, see memory notes for the full story).

**Cards/List view toggle** (used on azure-regions, friends-websites, microsoft-portals, rss-watcher, workflows, world-clock, tools, favorite-links): `.view-toggle { border-radius: 10px; border: 1px solid var(--cp-border); padding: .25rem; gap: .25rem; }` + `.view-toggle-button { border-radius: 7px; padding: .45rem .9rem; font-size: .85rem; }`, active state `background: var(--cp-accent-soft); color: var(--cp-accent);`. Do NOT reinvent a round-pill variant — copy this exact CSS.

**Accessible colour tokens (do not lighten these back)**: `--cp-warning: #96610a`, `--cp-success: #157f57` and `--cp-cyan: #0d93b0` were darkened on 2026-08-29 to clear WCAG AA in **light** mode (`.skill h3`/`.exp-card .hash` were at 3.03:1, `.grad-text` at 2.44:1, `.tl-note` at 4.46:1). The dark-theme values are separate and were already compliant — don't "resync" the two palettes. Any new token used for text must be checked against `--cp-bg` **and** `--cp-surface` in light mode.

**Section navigation (homepage only)**: `index.html` / `index_fr.html` carry a sticky `.section-nav` under the header. Its offset comes from a `--header-h` custom property that a `ResizeObserver` keeps in sync with the real header height, so never hard-code a `top` value for it. Sections use `main [id] { scroll-margin-top: calc(var(--header-h) + 4rem); }` so anchor jumps clear both sticky bars. No other page has this component.

## 3. Standard pipeline for adding a new `/<slug>/` tool page

1. Research the data source.
2. If data needs periodic refresh: `<slug>/fetch-updates.mjs` (Node ESM, zero deps, global `fetch`) OR `<slug>/fetch-updates.ps1` (PowerShell, for anything backed by an `Get-Az*` cmdlet — see §4) writing `<slug>/<data>.json`.
3. Build `<slug>/index.html` by **copying the most recently built similar page** and adapting — never write the boilerplate from scratch.
4. If a refresh workflow is needed: `.github/workflows/<slug>-updates.yaml` — cron `'0 6 * * *'`,`'0 9 * * *'`,`'0 12 * * *'`,`'0 15 * * *'` (4x/day) + `workflow_dispatch`, `permissions: contents: write`, a `concurrency` group, steps: checkout → run script → conditional git commit/push (`git add <file>; git diff --cached --quiet || (commit && push)`).
5. Update `.github/workflows/deploy-hugo.yaml`: add the workflow's `name:` to the `workflow_run.workflows` trigger array (**easy to forget** — always grep for it when adding a workflow) AND add `mkdir -p public/<slug>` + `cp` steps for the page + data files (needed even for pages with no refresh workflow).
6. Add a card to `tools/index.html` (pick an unused emoji or reuse an existing icon asset).
7. If a refresh workflow was added, add an entry to the `WORKFLOWS` array in `workflows/index.html`.
8. Validate: `get_errors`, and for standalone scripts, syntax-check (`node -c`, or for PowerShell: `pwsh -Command "[scriptblock]::Create((Get-Content -Raw './file.ps1')) | Out-Null"`), JSON via `python -c "import json; json.load(...)"`, YAML via `python -c "import yaml; yaml.safe_load(...)"`.
9. Test locally: `python -m http.server <port> -WorkingDirectory "<repo path>"` — **must use `-WorkingDirectory`, not `cd` first**, `cd` before `Start-Process` doesn't reliably change the spawned process's cwd in this environment. Then Playwright: `open_browser_page` + `run_playwright_code`, check stats/search/sort/filter + no horizontal overflow at 1440×900 and 375×812.
10. Commit, `git pull --rebase origin main`, `git push`.
11. Verify production via `Invoke-WebRequest -UseBasicParsing "<url>?cb=$(Get-Random)"` (cache-busting) — do NOT hammer the GitHub Actions API to poll deploy status, it's rate-limited (60/hr unauthenticated) and there's no `gh` CLI/token available in this environment.

## 4. Two data-fetch paradigms

**A. `fetch-updates.mjs`** (Node, most pages) — scrapes/fetches a public feed or CSV (RSS feeds, Azure IP ranges JSON, GitHub Meta API, an external Hugo-generated aggregator site, etc.).

**B. `fetch-updates.ps1`** (PowerShell, Azure-authoritative pages: `azure-policy-aliases`, `azure-regions`, `azure-policies`) — connects directly to Azure instead of scraping a doc site:
```powershell
Connect-AzAccount -ServicePrincipal -Credential (PSCredential from $env:AZURE_CLIENT_ID/$env:AZURE_CLIENT_SECRET) -Tenant $env:AZURE_TENANT_ID
```
using the **"scan-benoit-gaumard.io"** Entra app. The 3 secrets (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`) are **GitHub Environment secrets** on the `github-pages` environment (NOT repo secrets) — any workflow job using them needs `environment: github-pages`. Az PowerShell objects expose fields both top-level and nested under `.Properties`/`.Metadata` depending on module version — read defensively. These 3 pipelines also write **weekly dated snapshots** (`<slug>/history/<data>-YYYY-MM-DD.json`, Monday 18:00 UTC cron + a `workflow_dispatch.inputs.snapshot` boolean for manual testing) so catalogs can be diffed over time.

## 5. Sitewide components added this project (in case they need extending)

- **Dark/light theme toggle** — `data-theme` attribute + FOUC-prevention script (see §2).
- **News/welcome banner** — `.news-banner` marquee at top of every page, dismiss button, versioned localStorage key `news-banner-dismissed`. **To push a new announcement**: change the message text in the banner HTML on all pages AND bump the version string (currently `"2026-08-21"`) in both the FOUC-check script and the close-button handler, on all 63 pages (31 direct + 32 generated articles) — this is a full sitewide codemod, see the pattern below.
  - **Gotcha, fixed 2026-08-29**: the close handler sets `hidden` on the banner, but `.news-banner { display: flex }` is an author rule and beats the UA `[hidden] { display: none }`, so for a long time clicking Dismiss did nothing on the current page (it only took effect on the next load, via `data-news-banner`). All 63 pages now carry `.news-banner[hidden] { display: none; }` right after the `:root[data-news-banner="hidden"]` rule. **Keep that rule** if you ever rewrite the banner CSS.
- **Azure Regions interactive map** — Leaflet.js via CDN, Cards/List/Map 3-way toggle.
- **Emoji Sheet & Icons "Per page" pagination** — Previous/Next + a `<select id="perPage">` (50/100/200/All) dropdown, replacing older "Show more" or unlimited-render patterns.

### Sitewide codemod recipe (used repeatedly, works well)
When a change needs to touch all ~63 pages:
1. Write a throwaway Node script (`.mjs`) with a hardcoded list of the ~31 direct-patch files (all hand-authored pages + `articles/index.html`, **excluding** the 32 generated `articles/<slug>/index.html` files).
2. For each file: read, normalize `\r\n` → `\n`, do plain-substring `.replace()` calls against known-unique anchors (e.g. `.site-header {` for CSS insertion, `<body>` for HTML insertion, `</body>` for a closing script, the exact theme-FOUC script block for extending it), convert back to `\r\n`, write.
3. Separately, make the equivalent edits directly inside `articles/build-articles.mjs`'s `pageShell()` template (anchors differ slightly, e.g. body tag is `` <body class="${bodyClass}"> `` not bare `<body>`), then run `node articles/build-articles.mjs` to regenerate all 32 article pages (this also touches `articles/articles.json`/`articles/rss.xml` with a trivial timestamp diff — expected).
4. Delete the throwaway codemod script before committing.
5. Verify coverage with a throwaway Python script grepping all 63 output files for the expected marker string(s).
6. `index.html` and `index_fr.html` sometimes have structural quirks vs the other 61 pages (e.g. an extra blank line after `<body>`) — anchor on the shortest reliable unique substring (`<body>` alone, not `<body>\n<header...>`) to avoid missing them.

## 6. Git workflow quirks — READ THIS BEFORE YOU PANIC

- **An external automated process periodically commits+pushes pending changes** under the user's own git identity with generic messages like "new version" or `chore: refresh <X> data` (visible in `git log` — several of these appear between sessions, e.g. scheduled data-refresh workflows' own commits). If `git status` shows "nothing to commit" right after you made edits you know weren't committed by you, **do not assume something went wrong** — run `git log --oneline -5 -- <file>` to confirm the edit is already committed, then check `git log --oneline -3` to confirm `HEAD`/`origin/main` alignment. If already pushed, skip straight to production verification.
- Standard push sequence: `git add <specific files>` (avoid `git add -A` blindly if `tools/index.html` might have unrelated concurrent edits from another process — check `git diff --stat tools/index.html` first) → `git commit -m "..."` → `git pull --rebase origin main` → `git push origin main`.
- Repo files are CRLF. When writing files programmatically (Node scripts, `create_file`), the working tree normalizes to CRLF on commit regardless (confirmed via byte-count check) — safe to always convert `\n` → `\r\n` before `writeFileSync` in codemods to avoid a print of "LF will be replaced by CRLF" warnings/big diffs.
- No `gh` CLI/token available in this environment — can't dispatch workflows or query the Actions API with authentication. Verify deploys by polling the live production URL instead.

## 7. Backlog — prioritised, measured 2026-08-29

Everything below was verified in a browser or by scanning all 63 pages, not inferred. Counts are real.

### P1 — worth doing next

1. **No skip link on any of the 63 pages.** WCAG 2.4.1 Bypass Blocks is **Level A**, and this is the site's only remaining Level A failure. Every visit begins with roughly nine header tab stops before the content. `<main id="top">` already exists everywhere, so the fix is a visually-hidden link that becomes visible on focus — one sitewide codemod plus a `pageShell()` edit.
2. **Render cost on the two heaviest pages.** `/favorite-links/` builds **11,249 DOM nodes / 1.3 MB of HTML** in a single pass; `/azure-policies/` builds **10,588 nodes / 1.7 MB**. Both are far past the point where mobile paint suffers, and `/favorite-links/` is one of the most-used tools. Virtualise or chunk the render.
3. **Four long-list mechanisms.** Pagination on 2 pages, show-more on 3, cap-with-message on 5, unlimited elsewhere. Note the nuance: **every capped list does state its cap** ("Showing 500 of 76,497 matching aliases"), so this is a consistency problem, not misleading state. Pick one default — "showing N of M" plus Load More — and keep pagination on `/icons/`, where the per-page dropdown is already muscle memory.

### P2 — worth doing, not urgent

4. **Colour drift**: 53 `design-system-color` findings across 41 pages *after* the deliberate literals were documented. These are genuine one-offs (`#244f73`, `#6eb5e8`, `#dcefff`, `#fff8e8`, `#8a5a08`, `#9ee8c8`…) that should become tokens or map onto existing ones.
5. **The type scale is genuinely ad hoc**: 555 `design-system-font-size` findings across all 63 pages, from 24 distinct sizes. Decide a real ramp and map onto it. **Do not simply bless all 24 in DESIGN.md** — that documents disorder rather than a system.
6. **`.stats-grid` vs `.stat-cards`**: one widget, two class names, 7 pages versus 3. Invisible today, drifts further with every new page.
7. **Extend click-to-copy.** Done on `/subnet-calculator/`. The same affordance belongs on `azure-regions` programmatic names, the IP-range CIDRs, and `azure-policy-aliases` — every page whose purpose is producing a value to paste elsewhere.
8. **`/rss-watcher/` mobile CLS 0.165** (down from 0.365; desktop is 0.001). The remaining shift sources report as `section.` and `a.`, i.e. something *above* the container already reserved.
9. **Third-party favicons**: ~560 requests to Google per full browse. Mitigated — `no-referrer`, lazy, intrinsic sizes, and a verified fallback to initials — but not removed. Caching them into the repo via a refresh workflow would close it and would match this site's own "every page stands alone" principle.

### P3 — cleanup

10. **Record the confirmed false positives** so the hook stops reporting them: `side-tab` ×33 (article blockquotes and callouts, not navigation) and `broken-image` ×2 (lightbox placeholders in a *closed* `<dialog>` whose `src` is set on open). Both were verified.
11. **Print stylesheet** exists on 2 of 63 pages. Low value for tool pages; the articles are a plausible print target.
12. **`em-dash-overuse`** on 6 article pages. Cosmetic.
13. **Small UI items**: the `All > All` breadcrumb on `/icons/`; the patronising "Click a card to open it" hub subtitle; the Refresh action sitting inside the Cards/List view toggle on `/workflows/`; `.drag-handle` and some SVG transitions escaping `prefers-reduced-motion`; hub tool icons loading from external CDNs with no fallback.
14. **Tools hub information scent** *(design direction — owner's call)*: 26 undifferentiated cards with no grouping, no record counts and no refresh timestamps, so the site's stated differentiator — authoritative, self-refreshing data — is invisible on its most important surface.

### Closed this session (do not re-raise)

WCAG AA contrast in both themes · 24×24 touch targets sitewide · heading hierarchy and landmark names · horizontal overflow at every width · reflow at 320px · the closed token graph (28/28) · desktop CLS on articles, favorite-links, icons, workflows, azure-regions, azure-policies and emoji-sheet · 27 unnamed filter controls · 18 silent result counters · the `/workflows/` 403 storefront · filter state in the URL across 26 pages · back-to-hub breadcrumbs on 25 tool pages.

**The homepage deliberately does not showcase tools** — considered and rejected by the owner, recorded in `PRODUCT.md`.


## 7b. Measurement gotchas — read before you trust a number

These three cost real time this session. Each one produced confident, wrong conclusions.

**Do not reuse a Playwright page across CLS measurements.** `addInitScript` accumulates, so every extra iteration registers another observer incrementing the same counter and each successive page reports an inflated multiple. This produced a reading of 14.47 before it was caught. Use a fresh `browser.newContext()` per measurement.

**Composite alpha and gradient backgrounds before believing a contrast failure.** `--cp-accent-soft` is `rgba(11,111,184,0.09)` and the news banner's background is a `linear-gradient`. Both read as `transparent` from `getComputedStyle().backgroundColor`, so a naive walker falls through to the page background and reports spectacular false failures — 1.05:1 on white-on-blue text that actually measures 5–6.5:1. A naive probe reported 27 distinct "failures" sitewide; almost all were artefacts.

**Counting attributes is not measuring.** A pass began from "712 images lack `width`/`height`" and it was almost entirely a false alarm: the CSS already reserves the box nearly everywhere, and `/favorite-links/` renders 522 dimensionless images at **CLS 0**. The real shift came from JS-rendered lists starting at zero height and shoving the footer down. Measure the outcome, not the proxy.

**Verify agent findings before repeating them.** Across two sub-agent assessments this session, four confident claims were disproved by direct checking: the favicon fallback *does* work (zero broken images with Google fully blocked), the `/favorite-links/` empty state *does* render its message, the hub drag handles *do* carry `aria-label`, and every capped list *does* announce its cap.

**Custom properties: check both directions.** `var(--cp-panel)` was referenced on 29 pages and declared nowhere — it silently killed a mobile nav hover and the `/icons/` empty-state background. Four other tokens were declared on 29–31 pages and used zero times. Reading one page will never catch this; collect every `--cp-x:` declaration and every `var(--cp-x)` reference across all 63 pages and diff the two sets. The graph is currently closed at 28/28.

**Run the detector config-aware.** `--no-config` strips project context and reports ~32 known-false `dark-glow` hits on the shared `--cp-shadow` elevation token. `.impeccable/config.json` holds three confirmed-intentional exceptions: `marquee` project-wide, plus `dark-glow` and `gradient-text` scoped to the two homepages.

**Calculator and generator pages are intentionally simpler** — no filter bar, no pagination, no stats row. That is correct, not an omission.
## 8. Recent session history (most recent first, as of 2026-08-29)

- **2026-08-29, `/impeccable polish` across all 63 pages.**
  - **Touch targets closed sitewide** — see §7 item 7.
  - **Undefined `var(--cp-panel)` on 29 pages** — a bug the earlier passes missed because they only checked the homepages. It killed the `/icons/` empty-state background outright. See the custom-property hygiene note in §7.
  - Four dead tokens removed; the token graph is now closed at 28/28.
  - The last two marginal contrasts (`.link-tag` 4.41:1, `.article-category-tag` 4.45:1) cleared by switching those two classes to `--cp-accent-hover`, which is darker in light and lighter in dark — a gain in both themes without touching the shared `--cp-accent-soft` tint the active toggle state depends on.
  - Verified across 16 representative pages at 1440 and 375, light and dark: zero small targets, zero overflow, zero heading skips, zero unnamed sections, zero unresolved tokens, zero JS errors.
- **2026-08-29, sitewide audit of the remaining 61 pages.** Browser-measured every page at 1440 and 375.
  - Article template (`pageShell()`): `var(--cp-panel)` was still undefined and the "Back to top" link pointed at a `#top` that did not exist — both were fixed on the homepages earlier but never in the template, so all 32 generated pages carried them. `<main>` is now `<main id="top">`.
  - `articles/index.html`: section titles were `<p class="sec-label">` while all 39 article card titles were `<h2>`, giving a screen reader `h1` + 39 flat `h2`s. Card titles are now `<h3>` (CSS selectors moved with them) and the section titles are `<h2>`. Same `<p>`-as-title fix on `world-clock/index.html`.
  - `azure-taggable-resources`: the mobile rule `.filter-bar input { width: 100% }` also matched the "Taggable only" **checkbox** (equal specificity, declared later than `.filter-toggle input`), blowing it up to 344px and overflowing the page. Now scoped with `:not([type="checkbox"])`.
  - `favorite-links`: `minmax(23rem, 1fr)` = 368px could not shrink below a 360px viewport. Now `minmax(min(23rem, 100%), 1fr)`.
  - Favicon images on `favorite-links` / `microsoft-portals` / `friends-websites` got intrinsic sizes and `referrerPolicy = "no-referrer"` (every one of those ~530 requests was leaking the visited page URL to Google). No fallback was added: all three already remove the image and show initials on error.
  - CLS work and contrast work as described in section 7.
- **2026-08-29, Impeccable `critique` + `audit` + `init` (PR #6).** Design health scored 19/36, audit health 11/20.
  - Sitewide (63 pages): fixed the banner Dismiss no-op (see §5); darkened three colour tokens for light-mode WCAG AA (see §2); fixed the contact GitHub CTA, which pointed at `https://github.com/` root.
  - Homepage pair only: added the sticky `.section-nav` (see §2) because six section `id`s existed with nothing linking to them; converted the four `.sec-label` titles to `<h2>` and named every `<section>`; repointed the Tools cards off the retired `tools.`/`blog.benoit-gaumard.io` subdomains to `/blog/`, `/tools/`, `/icons/`, `/favorite-links/`; added `<noscript>` and `@media print` fallbacks; plus a batch of small defects (undefined `var(--cp-panel)`, `.hero p` overriding `.loc-badge`'s green, a stat animating `7x`->`7+` against its own label, duplicated PHP entry, dev-vocabulary `og:description`, missing `og:url`/`canonical`/`hreflang`, `width`/`height` on 41 images, and deletion of a dead Languages CSS block).
  - **`PRODUCT.md` was created** — see §9.

- **2026-08-29, Impeccable `critique` + `audit` + `init` (PR #6).** Design health scored 19/36, audit health 11/20.
  - Sitewide (63 pages): fixed the banner Dismiss no-op (see §5); darkened three colour tokens for light-mode WCAG AA (see §2); fixed the contact GitHub CTA, which pointed at `https://github.com/` root.
  - Homepage pair only: added the sticky `.section-nav` (see §2) because six section `id`s existed with nothing linking to them; converted the four `.sec-label` titles to `<h2>` and named every `<section>`; repointed the Tools cards off the retired `tools.`/`blog.benoit-gaumard.io` subdomains to `/blog/`, `/tools/`, `/icons/`, `/favorite-links/`; added `<noscript>` and `@media print` fallbacks; plus a batch of small defects (undefined `var(--cp-panel)`, `.hero p` overriding `.loc-badge`'s green, a stat animating `7x`->`7+` against its own label, duplicated PHP entry, dev-vocabulary `og:description`, missing `og:url`/`canonical`/`hreflang`, `width`/`height` on 41 images, and deletion of a dead Languages CSS block).
  - **`PRODUCT.md` was created** — see §9.

- `favorite-links`: removed title/URL truncation (was `text-overflow: ellipsis`), capped grid to 3 columns (`minmax(23rem, 1fr)` instead of `15rem`).
- `favorite-links`: redesigned cards to a compact 2-line layout (favicon+clickable title / category+date+rating), added `dateAdded` CSV column (empty for existing 522 rows — user chose not to backfill), replaced the "featured link" star badge with a 🔥 flame emoji.
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

- **`PRODUCT.md` at the repo root** (added 2026-08-29) is now the authority on product truth: who the users are, what the positioning is, what constraints future work must preserve, and — importantly — what evidence does **not** exist and must not be invented (no testimonials, no case studies, no outcome metrics; the "80+ projects" figure is self-reported). Read it before any design or copy work. Two facts in it are easy to get wrong from the code alone: the tools reference is the core of the product (the profile is the frame around it), and `tools.benoit-gaumard.io` / `blog.benoit-gaumard.io` are **retired** — everything must target `/tools/` and `/blog/` on the canonical domain. It also records one **settled decision**: the homepage deliberately does not showcase tools, and that is not to be re-raised.
- **`DESIGN.md` at the repo root** (added 2026-08-29) is the visual authority: token frontmatter (colours in both themes, type roles, radius and spacing scales, component tokens) plus the prose that says how to apply them. Its North Star is **"The Practitioner's Console"**. Its Don'ts are the load-bearing part — light/dark parity, no build step or dependency, and no per-page divergence of the shared shell. `.impeccable/design.json` carries what the DESIGN.md frontmatter schema can't hold: tonal ramps, shadow and motion vocabularies, breakpoints, and drop-in component snippets.
- Section 2 of this handoff remains the practical, code-level companion to `DESIGN.md` — the exact anchors and gotchas, where `DESIGN.md` carries intent and rules.
- `/memories/repo/benoit-gaumard-site.md` in this AI assistant's memory store has a much more detailed, chronological log of every fix made in past sessions (root causes, exact CSS/JS anchors used, gotchas) — if you're a different AI tool without access to that memory file, this handoff doc is your best summary, but the git commit history (`git log --oneline -50`) plus reading the actual current file contents is the ground truth.
- `.impeccable/critique/` holds the dated critique snapshots (heuristic scores, priority issues, persona findings) that `/impeccable polish` can pick up directly.
- No formal issue tracker / TODO list exists beyond what's in §7 above and whatever the user says next.
