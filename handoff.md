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

## 7. Known outstanding items

### From the 2026-08-21 audit of all 26 `/tools/` pages (still open)

The core design system (colors/fonts/header/footer/dark-mode/banner) is 100% consistent, but two real inconsistencies remain unaddressed:

1. **Two different class names for the same "stats summary" widget**: `.stats-grid` (azure-policy-aliases, azure-taggable-resources, azure-policies, microsoft-techcommunity-rss-feeds, it-images) vs `.stat-cards` (azure-regions, github-ip-ranges, azure-ip-ranges, workflows, world-clock). Purely a naming/DRY issue, not visually broken.
2. **Four different strategies for handling long lists**, inconsistent across pages:
   - Full Previous/Next pagination + "Per page" dropdown: `icons`, `emoji-sheet` only.
   - "Show more" load-more button: `azure-release-updates`, `m365-release-updates`, `aws-release-updates`.
   - Silent truncation at 400-500 rows with a "refine your search" message, no button: `azure-policy-aliases`, `azure-taggable-resources`, `azure-policies`, `github-ip-ranges`, `azure-ip-ranges`.
   - No limit at all (renders everything): `friends-websites`, `microsoft-portals`, `favorite-links` (522 cards), `azure-regions`, `workflows`, `world-clock`, `rss-watcher`, `microsoft-techcommunity-rss-feeds`.
   - The user has NOT yet asked to generalize the pagination pattern to the rest of these pages — only `favorite-links` got a targeted fix (3-column grid cap + no title truncation) and `emoji-sheet` got the icons-style pagination. If asked to continue this cleanup, prioritize `friends-websites`/`microsoft-portals` (similar card-grid pages with no limit at all).
3. Calculator/generator pages (`guid-generator`, `subnet-calculator`, `percentage-calculator`, `sla-calculator`, `units-converter`, `random-wheel`, `azure-naming-convention`) are intentionally simpler (no filter bar / pagination) — this is correct, not a bug.

### From the 2026-08-29 Impeccable critique + audit (homepage only)

The critique targeted `index.html` only. Everything it found there was fixed on `index.html` **and** `index_fr.html`, but the **other 61 pages were never audited to the same depth**. Expect the same classes of problem there:

4. **Heading hierarchy and landmark names.** The homepage had `h1` -> fifteen `h3` with a single trailing `h2`, and six unnamed `<section>` regions. Fixed there. `articles/index.html` and `world-clock/index.html` also use `<p class="sec-label">` as a section title and were **not** checked.
5. **No `<noscript>` and no `@media print` anywhere except the two homepages.** Only `index.html`/`index_fr.html` use `.reveal` (content hidden until IntersectionObserver fires), so the noscript gap is homepage-specific, but no page on the site is printable.
6. **Touch targets.** Header nav links render 26px tall, the theme/social buttons 32px, the banner close 28px, the footer language flags 29x22 (under the WCAG 2.2 SC 2.5.8 24px floor). Sitewide, untouched.
7. **Third-party image dependency.** The homepage still makes 28 requests to `google.com/s2/favicons` for the client-logo wall. If that host is blocked by an ad blocker or a corporate proxy, the entire credibility section silently disappears. Other pages use the same favicon trick.
8. **Design-direction items the owner has not decided on** (not defects): the homepage of a tools hub previews zero tools; 10 undifferentiated skill cards; a 22-logo client wall with no outcomes attached.

### Detector state (`npx impeccable detect`, config-aware)

`.impeccable/config.json` holds three confirmed-intentional exceptions: `marquee` project-wide (the sitewide banner), plus `dark-glow` and `gradient-text` scoped to `index.html`/`index_fr.html` only. **41 findings remain unsuppressed and undecided:**

- `side-tab` x33 — `border-left: 3px solid var(--cp-accent)` on article callouts.
- `em-dash-overuse` x6 — article prose.
- `broken-image` x2 — `<img id="dialogImage" alt="">` in `icons/` and `it-images/`. These are **false positives**: they are lightbox placeholders inside a closed `<dialog>` whose `src` is set by JS on open. (Real nit worth fixing though: the JS sets `.src` but never a meaningful `.alt`.)

Note: running the detector with `--no-config` reports ~32 extra `dark-glow` hits on the shared `--cp-shadow` elevation token. Those do **not** fire in a normal config-aware run; don't chase them.

## 8. Recent session history (most recent first, as of 2026-08-29)

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

- **`PRODUCT.md` at the repo root** (added 2026-08-29) is now the authority on product truth: who the users are, what the positioning is, what constraints future work must preserve, and — importantly — what evidence does **not** exist and must not be invented (no testimonials, no case studies, no outcome metrics; the "80+ projects" figure is self-reported). Read it before any design or copy work. Two facts in it are easy to get wrong from the code alone: the tools reference is the core of the product (the profile is the frame around it), and `tools.benoit-gaumard.io` / `blog.benoit-gaumard.io` are **retired** — everything must target `/tools/` and `/blog/` on the canonical domain.
- There is no `DESIGN.md` yet. This handoff's §2 is the closest thing to one; `/impeccable document` would generate a proper one from the incumbent code.
- `/memories/repo/benoit-gaumard-site.md` in this AI assistant's memory store has a much more detailed, chronological log of every fix made in past sessions (root causes, exact CSS/JS anchors used, gotchas) — if you're a different AI tool without access to that memory file, this handoff doc is your best summary, but the git commit history (`git log --oneline -50`) plus reading the actual current file contents is the ground truth.
- `.impeccable/critique/` holds the dated critique snapshots (heuristic scores, priority issues, persona findings) that `/impeccable polish` can pick up directly.
- No formal issue tracker / TODO list exists beyond what's in §7 above and whatever the user says next.
