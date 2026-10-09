---
name: benoit-gaumard.io
description: A practitioner's Azure console that doubles as a portfolio - 89 standalone pages sharing one inline shell.
colors:
  page-frost: "#f5faff"
  surface-white: "#ffffff"
  surface-frost: "#eef7ff"
  hairline: "#d8e8f5"
  hairline-strong: "#89afd0"
  ink-navy: "#17324d"
  ink-slate: "#536f88"
  azure-signal: "#0b6fb8"
  azure-signal-deep: "#075b98"
  azure-wash: "rgba(11, 111, 184, 0.09)"
  pass-green: "#157f57"
  pass-green-surface: "#eefaf5"
  fail-red: "#c93636"
  fail-red-surface: "#fdf2f2"
  warn-ochre: "#96610a"
  warn-ochre-surface: "#fdf3e1"
  index-violet: "#6a4fd6"
  index-violet-surface: "#efeaff"
  probe-cyan: "#0d93b0"
  link-blue: "#0969b5"
  panel-veil: "rgba(255, 255, 255, 0.97)"
  overlay-veil: "rgba(238, 247, 255, 0.84)"
  night-void: "#0c1420"
  night-surface: "#16233a"
  night-surface-soft: "#1c2c42"
  night-hairline: "#253b52"
  night-hairline-strong: "#3f6280"
  night-ink: "#e8f1fa"
  night-ink-muted: "#9db3c7"
  night-azure-signal: "#4fa8ea"
  night-panel-veil: "rgba(16, 26, 41, 0.97)"
  night-overlay-veil: "rgba(10, 17, 28, 0.84)"
  # Deliberately literal, not tokenised - documented so they read as system, not drift.
  aurora-cyan: "rgba(15, 176, 212, 0.22)"
  aurora-violet: "rgba(123, 97, 255, 0.16)"
  aurora-blue: "rgba(47, 127, 245, 0.16)"
  chrome-dot-red: "#ff5f56"
  chrome-dot-amber: "#ffbd2e"
  chrome-dot-green: "#27c93f"
  print-ink: "#000"
  print-rule: "#bbb"
  logo-backplate: "#fff"
  # Article code blocks are an always-dark surface in both themes, the way an
  # editor pane is. Their colours must NOT be tokenised: swapping in a theme
  # token would render dark-on-dark in light mode.
  code-surface: "#0f1b2b"
  code-surface-header: "#16273d"
  code-ink: "#e3edf7"
  code-ink-muted: "#b9d3ea"
  code-button-ink: "#d7e8f7"
  code-copied-ink: "#9ee8c8"
typography:
  display:
    fontFamily: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "clamp(2rem, 5vw, 4rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "clamp(1.6rem, 4vw, 2.4rem)"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "1.2rem"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: '"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif'
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.7
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.7
  code:
    fontFamily: '"Cascadia Code", "Consolas", ui-monospace, SFMono-Regular, monospace'
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.7
  # The named roles above describe intent; `scale` is the closed set of sizes
  # the whole UI may use. Consolidated from 30 ad hoc sizes: near-duplicates
  # such as .72/.75/.76 and .87/.875/.88 were one intent spelled several ways
  # and were merged onto the nearest step. Nothing moved more than 0.05rem.
  # Always write the leading zero.
  scale:
    micro: "0.7rem"
    caption: "0.75rem"
    mono: "0.8rem"
    label: "0.85rem"
    small: "0.9rem"
    compact: "0.95rem"
    body: "1rem"
    lead: "1.05rem"
    title: "1.2rem"
    subhead: "1.25rem"
    section: "1.35rem"
    heading: "1.5rem"
    headingLg: "1.65rem"
    h2: "1.9rem"
    h1: "2rem"
    hero: "2.25rem"
    display: "2.5rem"
    # Fluid endpoints: the min/max terms of clamp() on headings that scale with
    # the viewport, not extra static steps. No element renders at a size between
    # them by accident.
    fluidH2Min: "1.8rem"
    fluidHeroMax: "2.75rem"
    fluidTitleMax: "2.85rem"
    fluidDisplayMax: "3.25rem"
    fluidDisplayMaxLg: "3.5rem"
    fluidClockMax: "4.5rem"   # world-clock face, the largest type on the site
rounded:
  # 2px is the tightest radius: flag swatches and inline keyword highlights,
  # where anything rounder reads as a button rather than a mark.
  tight: "2px"
  hairline: "3px"
  xs: "4px"
  chip: "5px"
  sm: "6px"
  control: "7px"
  md: "8px"
  lg: "10px"
  panel: "12px"
  xl: "14px"
  xxl: "16px"
  pill: "999px"
  circle: "50%"
spacing:
  hairline: "0.25rem"
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  card: "22px"
  section: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.azure-signal}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.sm}"
    padding: "0.625rem 1.25rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.azure-signal-deep}"
  button-ghost:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.sm}"
    padding: "0.625rem 1.25rem"
  button-ghost-hover:
    backgroundColor: "{colors.azure-wash}"
    textColor: "{colors.azure-signal}"
  card-glass:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.md}"
    padding: "{spacing.card}"
  chip-tag:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.ink-slate}"
    rounded: "{rounded.sm}"
    padding: "5px 12px"
  chip-pill:
    backgroundColor: "{colors.surface-frost}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
  input-filter:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-navy}"
    rounded: "{rounded.md}"
    height: "2.9rem"
  toggle-active:
    backgroundColor: "{colors.azure-wash}"
    textColor: "{colors.azure-signal}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.9rem"
---

# Design System: benoit-gaumard.io

## Overview

**Creative North Star: "The Practitioner's Console"**

This is the workbench of a working Azure engineer that happens to also be his portfolio. The person using it is mid-task: an incident is open, a policy alias needs resolving, a region's zone support has to be confirmed *now*. Every visual decision answers to that scene. The palette is cool and low-drama so that a green PASS or a red FAIL is the only thing that shouts. Density is deliberately high - a console that makes you scroll to find one value has failed. Type is the OS UI stack, not a personality font, because this should feel like a tool you already know how to operate rather than a designed artifact you have to learn.

The frame around that instrument is a light PowerShell metaphor: a terminal chrome bar on the homepage hero, `PS>` prefixes on section labels, `.\Start-Collaboration.ps1` as a subtitle beneath the plain-language contact heading. It is a costume, worn lightly and only where the site talks about its author. It never enters a tool page, where the data is the point.

The system's real signature is the **shared shell**: one header, aurora backdrop, static dismissible banner, footer, theme toggle, and back-to-top across 89 standalone pages. Thirty unrelated utilities read as one product because that shell is consistent. `site-ui.mjs` embeds the shared enhancement into checked-in HTML without a new browser dependency.

**Key Characteristics:**
- Cool blue-frost neutrals; colour reserved almost entirely for status
- Dense, scannable, built for a visitor who arrived from search and needs one answer
- Full light/dark parity, both themes measured at WCAG AA
- Flat surfaces with hairline borders; elevation is rare and functional
- OS-native type stack, monospace only where the terminal metaphor speaks
- Zero dependencies, zero build, one shell across every page

## Colors

### Shared favorite state

- At the owner's request, saved-item stars use the yellow/amber `--cp-warning` foreground and border with `--cp-warning-bg` highlighting in both themes. A saved star is filled, stays yellow on hover and keyboard focus, and returns to its normal outlined appearance when removed. The shared `site-ui.mjs` styles derive this state from the existing `aria-pressed="true"` attributes on favorite buttons and favorites-only filters; keep each page's storage, labels and focus behavior unchanged.
- RSS Watcher's favorite control also carries the shared `favorite-button` class, separate from its generic share control. Do not recolor other active toggles or mark footer browser-bookmark instructions as saved: the site cannot observe actual browser bookmarks.

### Homepage interaction contract (EN and FR)

The two homepages keep matching inline styles and interaction scripts; other page shells are unchanged by this refinement.

- The hero presents identity, role, location, biography and portrait without contact buttons, at the owner's request. Preserve the full Cloud Consultant and Architect introduction, including Azure, automation, IaC, DevOps and cloud-native interests, with its French counterpart rather than shortening it. The availability status is a non-interactive green pill using the location badge's surface and border tokens, not a button. Email and LinkedIn actions remain in the lower contact section; other LinkedIn links are unchanged. Its content and proof figures never wait for an animation.
- Microsoft is the primary experience. At the owner's request, all five roles show only their provided responsibility lists, with a green `+` prefix and no introductory summary, accordion or open/close controls. The 22 client references form one fully visible wrapping list, ending with the non-interactive "And more..." badge ("Et bien d'autres..." in French), after HB Antwerp; the badge is not included in the 22 named references. Preserve every role's dates, responsibilities and logos.
- The eight detailed certification cards link to their official references, and that section retains the transcript link. At the owner's explicit request, the key figures show `8x` Microsoft certifications, `20+` years of experience and `80+` projects as non-interactive cards; omit the transcript link and caption from the `8x` card. These are static figures without a count-up animation; the 2005 career-start summary card is removed, while the career timeline retains its actual dates. Use three columns on desktop and one on narrow mobile screens.
- At the owner's explicit request, expertise retains its original nine sections: Azure Cloud, FinOps, Identity & Security, Infrastructure, Automation & Scripting, Security & Compliance, DevOps, Sovereign Cloud and Development (localized on the French page). Restore each section's original logo or icon and detailed technology list; use the existing local `/icons/export/` assets rather than remote raw-GitHub dependencies. Keep the responsive grid floor bounded by the available width.
- The TravelStoryMaker resource card uses a local 64px copy of the favicon declared at `https://www.travelstorymaker.com/icon.png`, displayed at 26px. Its URL includes a content-hash version so updating the cached icon also refreshes previously cached browser copies.
- At the owner's request, every card in My sites & resources / Mes sites & ressources opens in a new tab using `target="_blank"` and `rel="noopener"`, including Articles, Tools, Icons and Favorite Links. Preserve destinations, French language hints and the current-tab behavior of header and in-page navigation.
- Mobile preserves identity, role and biography before the compact portrait. The section navigation stays on one scrollable row; its actual height and the header height determine anchor offsets.
- The footer folds to two columns at 60rem and one at 32rem. Header controls have at least 44px targets. Non-interactive experience and client cards do not lift on hover.
- Both homepages expose flag-only language navigation in the header, matching the 24x18 PNG flags used by FlowHunt's footer: `/flags/fr.png` from `https://static.flowhunt.io/flags/fr.png`, and `/flags/en.png` from `https://static.flowhunt.io/flags/gb.png`. Keep only these two flags in the language navigation, with no surrounding box or slash separator; World Clock country flags also live in `/flags/`. Links retain accessible names, language tooltips, 44px targets and keyboard focus; a short underline marks the current language. The footer has no duplicate selector and uses three desktop columns (identity, Explore, Tools). On mobile, the header LinkedIn icon yields space to the flags; LinkedIn remains available in the contact section. French home links remain on `/index_fr.html`; only the English flag returns to `/`.
- French navigation and resource links disclose English-only destinations with visible language hints and `hreflang="en"`. Official certification names and reference URLs are unchanged, with a French explanatory note. Roles and dates use consistent French wording.
- Homepage filled controls use `--cp-action-bg`, `--cp-action-hover`, `--cp-action-fg`, `--cp-mail-bg` and `--cp-mail-fg`, separately from text accents. Light mode uses white on blue/green; dark mode uses `#0c1420` on the brighter blue/green surfaces, including banner and return-to-top controls.

Run `node --test .github\scripts\homepage.test.mjs` after editing either homepage to check bilingual parity, static contact actions, retained career/reference content, certification links and section targets. Also verify responsive layouts, contrast and keyboard behavior in a browser.

### Tools catalogue contract

- The tool catalogue, every tool page and nested history/activity pages expose a shared Switch tool disclosure in the sticky header, outside the mobile hamburger. It opens an in-place navigation panel with labelled search and the complete alphabetized tool list derived at build time from the static catalogue; no second manually maintained catalogue or browser fetch. Mark the current tool, including its nested pages. Links navigate directly in the current tab without forwarding another tool's query or modifying local preferences.
- The switcher uses native details/summary and ordinary links, not a modal or ARIA application menu. Without JavaScript, its complete link list remains usable; JavaScript adds accent-insensitive multiword search over names, descriptions and routes, result counts, clear-empty-state recovery, arrow navigation and Enter for a unique search match. Escape, outside click and focus leaving close it; Escape restores the trigger. Opening it closes the mobile primary menu and vice versa. Preserve existing header links, breadcrumbs, consent controls and page behavior. Do not add it to the homepages, article pages, Privacy or 404.
- `/tools/` uses static `article.tool-card` entries with one named navigation link each. Favorite buttons and reorder controls are siblings of the link, never nested inside it. Preserve each `data-tool-id` URL because existing favorites and order preferences use those IDs.
- At the owner's request, the task-family button row and its mobile Filters toggle are removed. Search, favorite tools, view preference and reordering remain available. Previously shared family URLs still work; the result summary names any selected family and Clear all filters removes it, so no legacy filter is invisible.
- `q`, repeated `family`, `favorites=1` and `view` describe the view in the address bar; legacy `toolSearch` links still load. Preserve unrelated query parameters and fragments. At the owner's request, the dedicated Copy filtered link button and its manual-copy fallback are removed. Favorite selections and custom order remain browser-local rather than embedded in the URL.
- Mobile starts with search, followed by the view and favorite controls, without an empty filter panel. List rows retain their description and action beneath the title and 44px star. Controls are not sticky. At the owner's request, the favorite filter reads My favorites (count), and its active result-summary label is My favorites. Result counts are announced; removing a filtered-out favorite restores focus to My favorites.
- Reorder tools exposes 44px arrow buttons alongside pointer handles instead of visible Move earlier / Move later text. Keep those action names in tooltips and contextual accessible labels. Arrows point left/right in a multi-column grid and up/down in list or narrow single-column layouts. Drag placement follows the actual non-collapsed grid columns, independently of filter controls: single-column layouts use vertical position, multi-column grids use horizontal position. Moves operate on visible neighbors while retaining hidden tools in the full saved order; Escape and pointer cancellation do not commit a drag. Reset order retains search, families, favorites and view.
- At the owner's request, Reorder tools sits immediately beside My favorites in a grouped primary toolbar, including mobile. Reset order opens a labelled native confirmation dialog using the shared dialog styles; focus Cancel initially. Cancel and Escape keep the custom order and return focus to Reset order. Only confirmation restores the order of all tools and clears the saved order, preserving favorites, filters, view and reordering mode; focus returns to Reorder tools because the reset trigger is then hidden. Keep the existing explicit notice if browser storage cannot persist the reset.
- Make reordering visually explicit: the dragged card has a 3px accent outline, tinted content and a Moving badge; the dashed accent placeholder says Drop here. After drag or arrow movement, keep the moved card in view and show the same highlight with a Moved badge for 2.2 seconds. Clear transient feedback on cancellation, reset, filtering or a new move. Do not dim other cards or add flashing/motion effects.
- One stationary responsive ad unit follows the first six matching results. Only cards move between the two grids; filtering and reordering do not recreate or relocate the requested ad. Dates are reserved for data-backed catalogues, not local calculators and generators.

**AdSense account action required before deployment:** the owner chose to retain advertising and will add an Auto ads page exclusion for `/tools/` in AdSense. The manual unit reuses the existing responsive slot `4494484671`. HTML placement does not disable account-controlled Auto ads; without that exclusion, Google may still insert an ad above search. No global monetization or consent settings are changed by this page.

Run `node --test .github\scripts\tools.test.mjs` for static catalogue, script, URL-compatibility and ad-placement regressions. Browser checks must also cover stored preferences, filtering, keyboard/pointer reordering, empty results, unavailable storage/clipboard/data, and card/list layouts at narrow widths.

### Article catalogue contract

- `/articles/` places its labelled search first, then a compact filter panel and toolbar, results, pagination and series. At the owner's request, RSS Feed sits immediately beside Cards/List, including on mobile, with the standard decorative RSS icon before its text label; retain a no-JavaScript feed link. Remove the former bottom subscription row and About these articles explanation. The desktop right sidebar retains the personal-opinions disclaimer, Categories, Archives, Tags and Recent Posts; on mobile it follows the main content instead of preceding search. Keep it in normal document flow so a long sidebar remains scrollable.
- Sidebar categories, months and tags use the same state, URL parameters and result counts as the main controls. Counts cover the complete published catalogue. Selecting a sidebar filter focuses the updated results; all menus display an explicit unavailable state with the existing Retry action if metadata cannot load.
- Tags initially show 18 entries plus any selected tag outside that subset, with a Show all / Show fewer control. Recent Posts lists the ten newest articles independently of the current filter/sort, as supplementary navigation rather than additional main result cards.
- The default page displays 12 unique articles in total: at most three featured selections plus the remaining regular results. Further batches add 12. Featured URLs are excluded from the regular list; hiding the selection returns those articles to their chronological position. Filtered or oldest-first views do not promote a featured strip.
- Category, tag, month, series, query and favorites compose. Search and filter changes reset the visible limit; view changes preserve it. `shown` preserves the expanded list in shared URLs and browser history. The old `searchInput`, `featuredToggle`, category/tag/month URLs and article preference storage keys remain supported.
- Series entries expose Azure Policy (seven parts) and DNS in Azure (eight parts), using the existing first-part links. Browse in order resets conflicting filters and sorts chronologically, with numerical part order for same-date installments.
- Runtime cards use one article link and a sibling favorite button. Titles, topics, dates and reading time remain visible; descriptions are clamped to two lines. Removing an article under the favorites filter restores focus; loading another batch focuses its first new article.
- The `articles:static` markers remain compatible with `articles/build-articles.mjs`. All indexable links remain available without JavaScript. With JavaScript, the first 12 prebuilt cards remain visible while metadata loads; an explicit failure restores all prebuilt links, disables unavailable filters and offers Retry.
- A single stationary manual ad follows the results and pagination. **The owner must add an Auto ads exclusion for the exact catalogue URL `/articles/` before deployment**, as for `/tools/`; this does not request excluding every individual article. Code placement alone cannot prevent an account-controlled automatic ad above search.

Run `node --test .github\scripts\articles.test.mjs` for catalogue structure, static-generation compatibility, metadata validation, series and URL contracts. Verify runtime pagination/deduplication, filters/history, favorites, loading/error recovery, both views/themes and narrow screens in a browser.

### Azure Regions evidence and interaction contract

- `regions.json` schema 2 retains the ARM metadata collection date and records a separate Microsoft Learn check date in `sources`. A reference-only repair must not claim a new ARM scan. Historical snapshots remain untouched.
- Positive root-level `location.availabilityZoneMappings` confirms zone support. Missing/empty mappings are unknown unless the public Microsoft Learn table explicitly documents a zone count or N/A. The directory uses `true`, `false`, and `null`, with `availabilityZonesSource` identifying the evidence. Unproven flags from older schemas are treated as unknown by the UI.
- Restriction evidence comes from the region's own Microsoft Learn table cell, never its partner's icon or ARM's Recommended/Other category. Preview annotations remain visible. Regional coordinates are not datacenter addresses; continent groups are derived from ARM geography.
- Search, 48px labelled filters and accessible region results precede the map and collapsed statistics. The directory and map contain only physical regions. Totals explicitly distinguish physical regions, logical ARM locations and their sum; charts disclose their scope and use "no pair reported", not an inferred standalone status.
- Programmatic names stay visible and selectable in both views. At the owner's request, remove the Copy name button and its manual-copy fallback. Collapsible region details and Sources & confidence explain provenance by attribute. Empty results and network failures provide recovery actions.
- Leaflet and tiles load only when the map is opened. Pan/zoom/keyboard interaction starts disabled; Interact with the map enables it, while Stop interacting, Escape and closing the panel disable it. The filtered directory is the accessible alternative, including records without coordinates.
- Map asset errors and tile failures do not block region data or controls. Legacy `searchInput`, `continentFilter` and `azOnlyFilter=1` URLs remain usable with the new tri-state filter.

Run `pwsh -NoProfile -File .github\scripts\azure-regions.test.ps1` to validate parser/evidence rules without Azure authentication; the refresh workflow runs this before collection. The page-level regression tests and browser checks cover all-unknown/legacy data, counts, filters, visible identifiers, lazy map loading and gesture locking.

### Azure Naming Convention contract

- The page proposes names rather than claiming that Azure has approved or reserved them. `abbreviations.json` retains the CAF catalogue and adds per-provider naming rules, reference URLs and a separate rule-review timestamp. Public reference gaps remain explicit, not a generic 63-character limit.
- One preview precedes the fields in DOM order and appears beside them on desktop. It displays the selected resource, full proposed name, character count, validation status and nearby Copy action. Compact formatting is recommended only for types whose recorded format requires no hyphens; key vaults keep their hyphenated proposal.
- Never truncate a name or silently replace an empty component. Show normalization from raw input to lowercase ASCII components, preserve the original fields, and block the normal Copy action for known invalid names. Unknown and partial rules allow copying only an explicitly unverified proposal.
- Validation covers recorded lengths, the generator's conservative ASCII character subset and checkable exceptions. Reserved words, trademarks, availability, policy and deployment eligibility are not checked. VM resource names are distinguished from Windows/Linux host names, and Function App host-ID caveats remain visible.
- Native type-search suggestions accept a catalogue name or exact abbreviation. Each catalogue row has an accessible Use this type action that preserves the other inputs and returns focus to the generator. Mobile rows keep this action visible rather than hiding it off-screen in a wide table.
- The old resource/component/search URL parameters remain supported after the data loads, including intentionally empty or invalid values. Failed clipboard access offers a selectable field, not a success message. Network or malformed-data failures disable unavailable actions and expose Retry.

Run `node --test .github\scripts\azure-naming.test.mjs` to verify exact rule boundaries, complete/partial/unknown states, normalization, URL compatibility and static contracts. Browser checks cover catalogue-to-generator selection, live validation, copy failure, keyboard sorting, network recovery and both themes at narrow/intermediate/wide widths.

### Azure Taggable Resources contract

- At the owner's request, four always-visible cards precede the search and labelled 48px filters: Resource types, Providers, Support tags and Don't support tags. They describe the whole catalogue, independently of filters, and derive their values from loaded rows rather than trusting payload totals. Use four columns on desktop and two on narrow screens; loading and failures must not appear as zero.
- Taggable only and Tags in cost reports only are independent predicates, combined with provider and text search. The cost filter does not implicitly require tag support: the reference can contain No/Yes records.
- At the owner's request, the table has four columns in this order: Provider, Resource type, Support tags, Tags in cost reports. Provider and resource type remain visible and selectable with their original spelling, but the Copy type button and its fallback are removed. Mobile cards label the provider and resource type above the two Yes/No properties; no semantic distinction relies on colour alone.
- At the owner's request, table headers contain only their titles and sort controls, without explanatory text or links. Tag-support and cost-report guidance remains near the mobile filters and in the notes; checkbox descriptions retain valid accessible targets. Cost Management tag inheritance is explicitly separate from resource tag inheritance and from these capability flags.
- Keyboard-accessible sorting remains available on mobile even when table headers are hidden. Filters reset the 100-row batch; Load more moves focus to the first newly added result. Reset filters clears search/provider/both flags while retaining the user's sort.
- Existing search/provider/taggable URL parameters remain supported with the new cost filter, sort and visible-count state. Invalid data or network failure disables unavailable controls, reports the failure and offers Retry; missing booleans are not converted to No.

Run `node --test .github\scripts\azure-taggable.test.mjs` for predicate independence, exact identifiers, sorting, dataset and accessibility contracts. Browser checks cover narrow fields, card properties, URL restoration, pagination focus, reset and failure recovery. The source dataset and refresh pipeline are unchanged by this UI refinement.

### Azure Policy Aliases catalogue contract

- At the owner's request, three visible cards show the complete catalogue's aliases, resource types and providers above search, derived from loaded data and unchanged by filters. Loading and errors use dashes with an explicit status, not zero. Search is followed by a provider selector and native searchable type suggestions scoped to that provider. Empty type means all types within the provider; unmatched or conflicting type input yields an explicit error and no silently broadened results. Changing provider clears the previous type but retains the alias query.
- At the owner's request, results use a semantic sortable table with Resource type, Default path and Alias columns, in that order. Each header has a native sort button and the active column exposes `aria-sort`; preserve the existing sort menu and shared URL state. The Copy alias buttons are removed; aliases remain selectable text, and Load more focuses the first newly added alias value. On narrow screens, table rows stack with the same three explicit labels and sorting remains available in the toolbar. Monospace fields keep complete strings on one line with local horizontal scrolling; only overflowing fields join the tab order. They never compress identifiers into single-character columns.
- The default batch is 25, with explicit 50/100 options and progressive loading. Sort and batch size live in a native disclosure so results are not pushed down by secondary controls. Search/type/provider changes reset the batch; sorting retains the visible limit. The three whole-catalogue totals are compact and remain distinct from the filtered count.
- Existing `search` and full `resourceTypeFilter` URLs still restore after loading, inferring the provider for old links. New URLs include provider, exact selected type, sort and batch state while retaining unrelated parameters and fragments. Footer sharing follows the current address. At the owner's request, remove Copy search link and its manual-copy fallback; preserve automatic address-bar updates and explicit feedback when those updates fail.
- All fields have fixed 48px minimum targets without vertical flex-basis carryover. At the owner's request, remove the "What does [*] mean in an alias?" disclosure near search; retain the existing array-alias guidance in the reference notes below the results. Alias text preserves casing, `[*]` and the entire value.
- Failed or timed-out loading updates the timestamp, totals, results and enabled controls coherently and exposes Retry. Missing default paths are explicitly labelled; malformed metadata fails instead of inventing aliases. No-JavaScript users retain links to the dataset and PowerShell reference.

Run `node --test .github\scripts\azure-policy-aliases.test.mjs` for hierarchy, exact-value, sorting, URL and failure-state contracts. Browser checks must measure narrow field heights, result row/page heights, local overflow, pagination focus, legacy links and network recovery with the actual alias dataset. The catalogue schema and original snapshots are unchanged; the collector now also publishes the change log described below.

### Azure Policy Aliases history contract

- `/azure-policy-aliases/aliases-history/` is linked beside the catalogue's source/refresh metadata and uses the existing UTC history timeline. Search matches alias names, resource types and recorded paths; period, change type and provider filters compose. Keep 60-event pagination, all-matching-event JSON export, accessible before/after comparisons, source observation intervals and links back to the catalogue with `search`, `providerFilter` and `resourceTypeFilter`.
- `alias-history.mjs` identifies entries by the exact resource type plus alias name. Added/Removed means presence changed between observed snapshots, not an official publication or retirement. Modified tracks default-path differences only, including null versus empty values and exact casing. Preserve `[*]` and original strings; do not guess renames, API-version-specific paths, modifiability or policy effects.
- The initial `alias-changes.json` is reconstructed from the 50 retained Git snapshots, starting August 18, 2026. Record before/after commit IDs and snapshot timestamps; preserve at most the newest 3,000 events and 180 days. The cap may omit older events or part of a busy day. The first snapshot is a baseline, not additions. The current catalogue and dated snapshots are not rewritten by this initialization.
- Future refreshes pass the complete PowerShell payload to the dependency-free Node publisher, which validates snapshots and existing history before staging both files. Invalid, duplicate, mismatched or empty collections fail explicitly rather than creating false deletions or discarding the log. The workflow retains its daily 06:00 UTC and weekly/manual schedules and commits the log alongside the catalogue after success.
- Test with `node --test .github\scripts\alias-history-data.test.mjs .github\scripts\alias-history.test.mjs`; use simulated errors and modified paths rather than contacting Azure. The history is a derived `noindex, follow` page with the same shared shell and desktop/mobile behavior as the other histories.

### Azure Policies catalogue contract

- Policies and Initiatives have independent search, dropdown, lifecycle, favorite, sort and visible-batch state. Tabs have keyboard navigation and labelled panels. The global List/Cards preference retains `azurePoliciesViewMode`; favorite keys remain `azurePoliciesFavorites` and `azureInitiativesFavorites`.
- At the owner's request, four visible cards above the catalogue show Policies, Initiatives, Categories and Policy effects. Derive totals from both complete validated datasets, including preview/deprecated entries, independently of tabs and filters. Categories are the distinct union across policies and initiatives; effects are distinct recorded policy effects. Use four columns on desktop and two on mobile. Keep each available dataset's totals during partial failures, but show dashes for dependent counts until their data is ready; the category count requires both catalogues. Loading/failure status is explicit, while valid empty datasets show zero.
- Counts distinguish rendered entries, the complete dataset and matching entries. Active-filter chips include the initially enabled Preview/Deprecated exclusions; the mobile Filters button counts them. Reset all filters clears every criterion, including these exclusions, without deleting saved favorites or changing the other tab.
- Desktop groups category/effect/mode, while secondary exclusions, favorites and sorting live under Options. Mobile keeps search and Filters together; the panel also contains active-filter chips and reset. Done and Escape return focus to Filters. Effect guidance is linked from the filter; the counter cards replace the old whole-dataset summary below the results.
- Both views render readable definition entries, not compressed multi-column tables. Title/open, favorite and copy are separate controls. IDs, versions, modes, full descriptions, rule JSON or initiative membership appear in the open detail only. JSON bodies remain lazy-loaded with an explicit retry path.
- Shareable URLs retain both tabs' filters plus the active tab, view and open definition. At the owner's request, remove Copy view link from both tabs; retain automatic address updates, explicit URL failure feedback and definition-specific ID/link/JSON copy actions. One definition is open per tab. If a linked definition falls outside the current filters or visible batch, show it separately with an explicit notice and do not count it as a displayed matching entry. Missing IDs get an honest not-found message. View changes preserve the open detail.
- Manual ID/JSON/link copying is offered when clipboard access fails. Removing a favorite under an active favorite filter restores focus. The two data requests fail independently, allowing the other catalogue to remain usable; dates follow the active dataset.
- A stationary manual ad follows both result panels. **Exclude the exact `/azure-policies/` catalogue URL from Auto ads in AdSense before deployment** to prevent automatic placement above the results; history pages are not part of that requested exclusion.

Run `node --test .github\scripts\azure-policies.test.mjs` for lifecycle filtering, semantic sorts, state, data and markup contracts. Browser coverage includes tab-specific state, keyboard/focus, deep links inside/outside filters, JSON/member details, copy failures, independent data retries and both views/themes on mobile and desktop.

### Policies History contract

- Read `policy-changes.json` without rewriting or backfilling it. This page includes only `kind: "policy"` events; its event schema and stored snapshots are unchanged by the initiative composition extension below.
- Added/Removed describe differences between observed catalogue scans, not confirmed publication/retirement dates. Modified means the tracked metadata changed. Version-only events explicitly do not establish rule-level impact. Expandable comparisons use the recorded `fields[].from/to` values; distinguish missing, empty, null, zero and false. Do not fabricate historical rule JSON, parameter or description diffs.
- Keep names, textual change badges, detection time and current-catalogue lookup visible. Native disclosures hold GUID, category, exact UTC timestamp and before/after values. Values are side by side on desktop and stacked on mobile. Current lookups use `tab=policies&definition=ID`; removed definitions may legitimately be absent.
- Counts distinguish the displayed batch (60), every matching event and the complete retained policy-event total. Group counts also distinguish displayed versus matching events when pagination splits a date. Added/Removed/Modified counters describe active filters, not just rendered rows.
- Recent periods include today and preceding UTC calendar days, relative to the current time rather than the last refresh. Unknown-date events stay available under All retained and are explicitly excluded by recent-period filters. Empty results can widen only the period or reset all criteria. Preserve the existing search/change/category/period URL keys and restore categories after loading.
- Mobile keeps search and period visible, with change/category behind More filters and focus restoration on Done/Escape. Only the current group date is sticky; the mobile site header is not stacked above it.
- Export filtered JSON includes all matches, source/export timestamps, filtering criteria and original evidence, not only the displayed page. Clipboard or export failures must expose recovery rather than report success. A catalogue return follows the final visible event/load-more action, before notes and the shared footer.
- Explain the 180-day retention policy as a limit applied at refresh, possibly shortened by the shared 3,000-event cap. Recording begins with the collector; an empty log cannot prove absence of earlier changes or catalogue freshness. Collection is scheduled daily, with additional weekly/manual runs; actual changes need not be daily.

Run `node --test .github\scripts\policy-history.test.mjs`. Browser checks cover the real retained log plus clearly identified synthetic event fixtures for comparisons, UTC filtering, pagination, downloads, catalogue links, keyboard/mobile behavior and recovery. Synthetic events must never be written into the published log.

### Initiatives History and composition evidence

- Keep the same retained-log conventions as Policies History: UTC periods, scoped counts, 60-event batches, mobile secondary filters, one sticky date, full filtered JSON export and explicit empty/error recovery. Show the actual date range of all matching initiative events; never hardcode a count or infer the recording start from the oldest retained event.
- Distinguish Composition, Version, Metadata and legacy Count only changes. A net count increase is not a list of additions. Older events without member evidence must say that exact additions/removals were not recorded; do not reconstruct them from current catalogues or nonconsecutive weekly snapshots.
- New collector comparisons use policy ID (case-insensitive) plus reference ID (ordinal, case-sensitive). Reordering is ignored. Multiple references to the same policy remain distinct. A changed target or renamed reference produces a removal and addition, including when the total is unchanged. Missing lists, missing/duplicate reference IDs or count mismatches yield `composition.status: "unavailable"`, not an empty diff.
- Modified initiative events now carry `composition: { status: "compared", beforeCount, afterCount, added, removed }` when comparable. Changed members retain their exact ID/reference ID and available display name: prior policy catalogue for removals, current catalogue for additions. Unknown names remain null. The initial collection remains a baseline; only genuine metadata or membership changes produce Modified events.
- Expanded events lead with member evidence, then metadata comparisons and technical event IDs. Member names link to `tab=policies&definition=ID`; initiative links use `tab=initiatives&definition=ID`. Member identifiers remain under their own disclosure. Names are recorded evidence, not a promise that those definitions still exist today.
- Parameter values, group assignments, descriptions and rule bodies are outside this comparison. Neither a version bump nor a membership diff proves assignment impact. Retained events and snapshots are not rewritten or backfilled by this UI change.

Run `pwsh -NoProfile -File .github\scripts\initiative-history.test.ps1` and `node --test .github\scripts\initiative-history.test.mjs .github\scripts\policy-history.test.mjs`. The PowerShell checks extract pure comparator functions without loading Azure modules or authenticating; the refresh workflow runs them before collection. Browser checks use the actual empty/retained log plus clearly named synthetic event fixtures, never published as history.

### Azure Built-in Roles contract

- At the owner's request, four visible cards above search show Built-in roles, Categories, Privileged roles and Providers, replacing the former text summary below results. Derive totals from all validated roles independently of filters, sort and pagination. Count distinct category memberships, preserve the source's `isPrivileged` classification, and reuse case-insensitive provider grouping without inferring wildcard coverage. Use four columns on desktop and two on mobile. Loading/failure shows dashes with explicit status; valid empty data shows zero. Keep the source and actual dataset timestamp, and distinguish displayed/matching/available roles.
- Search includes IDs and all four permission buckets with their descriptions. Category/provider/type/privileged filters retain their existing URL keys.
- Provider filtering is case-insensitive and offers one representative spelling per namespace, chosen deterministically from recorded spellings. Do not rewrite source IDs, action strings or copied values. The filter matches explicit provider names; it does not infer the coverage of broad wildcard roles.
- Desktop uses a native eight-column table: role, Role Definition Id, category, four recorded-entry counts and comparison selection. At the owner's request, the complete source GUID is visible directly after the role name, as selectable monospace text, and the new column shares the existing ID sort. Header sorting and expansion use native buttons, never button-like rows. At the owner's request, remove the four explanatory subtitles beneath Actions, NotActions, DataActions and NotDataActions; keep their sortable titles, the comparison guidance and contextual-help links within expanded permission groups. Expanded details span every column and retain their ID/copy controls. At 1024px and below, render actual role articles with a labelled Role Definition Id visible before expansion; long IDs scroll locally rather than forcing page-wide overflow.
- Role details begin with Copy ID and Microsoft Learn; retain Copy name/link, complete role descriptions, assignable scopes and every per-action description. Nonempty permission groups are initially open; empty groups show an explicit zero and remain collapsed. Technical strings scroll locally. Multiple open roles and group disclosures survive filtering, sorting and layout changes.
- Two roles can be selected independently of filtering or pagination. Selection is limited to two and can be cleared/replaced. Comparison opens explicitly, preserves original patterns/descriptions and separates distinct case-insensitive text into A-only/shared/B-only lists. It never expands wildcards, computes effective access, ranks privileges or treats exclusions as deny assignments.
- State URLs support `role`, `compare`, `comparison`, `sort`, `dir` and `shown`. `role` addresses the most recently opened role; other open rows remain in memory. A linked role outside current filters/batch is shown separately and not included in displayed counts. Missing roles and unavailable comparison selections must remain explicit, with recovery.
- Explain that the collector flattens permission blocks and omits conditions; assignments, denies and service authentication affect actual access. An empty DataActions bucket is not proof that data cannot be reached through other mechanisms. The Privileged badge follows the source classification, not a risk score.
- The role dataset schema remains unchanged. The collector now records source-backed history as described below. Failed data loads, invalid payloads, clipboard denial and unsupported URL values must not produce success-shaped fallbacks.

Run `node --test .github\scripts\built-in-roles.test.mjs`. Browser checks cover both themes and layouts, provider variants, native keyboard controls, two-role selection, deep links, comparison semantics, copy recovery, multiple disclosures, pagination and error retries.

### Azure Built-in Roles history contract

- `/azure-built-in-roles/roles-history/` is linked beside the catalogue's refresh timestamp and reuses the policy-history timeline: UTC dates, Added/Removed/Modified labels, name/ID/category/period filters, 60-event pagination, accessible Before/After disclosures and export of every matching event. Role links use the catalogue's `role` parameter, including removed IDs. The page retains the shared theme/shell and is a `noindex, follow` derived view like the other histories.
- `role-history.ps1` compares complete validated snapshots by role GUID. Track names, descriptions, categories, Microsoft's privileged flag, assignable scopes and all four permission buckets, including per-pattern descriptions. Ignore array order, preserve original values and compare permission strings exactly; never infer effective access, expand wildcards or reconstruct omitted conditions and permission-block boundaries.
- `role-changes.json` begins with the recorded current baseline, not a fabricated set of additions. The committed source snapshots reviewed from September 4–7, 2026 contain identical role data. No earlier Azure history is invented. Show the baseline and last compared snapshot timestamps and distinguish an empty retained log from an unavailable log.
- Future successful refreshes write both the catalogue and changelog, retaining up to 180 days and 3,000 events. Missing categories, unreadable definitions or corrupted previous evidence abort collection instead of producing false deletions or discarding history. The existing daily 06:15 UTC and weekly/manual refresh schedules remain unchanged. Collection timestamps are observations of Microsoft's reference, not official release/retirement dates.
- Run `.github\scripts\role-history.test.ps1` offline for diff, source-preservation and failure tests, and `node --test .github\scripts\role-history.test.mjs` for UI, filtering, export and deployment contracts. Never run the live collector merely to verify the interface.

### Entra ID directory roles contract

- Preserve the distinction from Azure RBAC and Microsoft Graph API permissions. The source date is the dataset timestamp. Keep the Graph Permissions cross-link. Do not present this snapshot as a tenant-assignment or effective-access view.
- At the owner's request, four cards above search show Built-in roles, Permissions, Services and Privileged roles, replacing the former bottom totals. Permissions counts every recorded role-action entry; its secondary note shows distinct action strings, ignoring case and counting shared actions only once. Services use the same case-insensitive keys as the existing filter; privileged roles use the source flag. Totals cover the complete validated catalogue, independently of filters, sort and pagination, with four desktop columns and two mobile columns. Loading and failure show dashes with explicit status, valid empty data shows zeros, and the privilege-filter count stays synchronized.
- Desktop uses native role-expansion and header-sort buttons in a three-column table. Mobile uses role articles showing the name, explicit privileged classification and recorded-action count; template IDs and full descriptions appear in the detail. Multiple open roles survive sorting, catalogue filters and responsive changes.
- The Privileged filter shows the dataset-wide count and an accessible explanation of Microsoft's classification. False is labelled Not flagged as privileged, not Safe or No privilege. Combined filters affect the result count without rewriting the classification.
- Copy template ID sits next to an associated explanation distinguishing the built-in template from an activated tenant `directoryRole.id`. Do not claim that every role-definition ID is tenant-specific or that a template can replace any API parameter called `id`. Link to the official resource definitions and preserve the copied GUID exactly.
- Per-role action explorers group by the namespace before the first slash, retain descriptions and source spellings, and prioritize larger matching groups. Start with eight collapsed service groups. Opening a service renders 20 actions at a time; both service and action pagination announce remaining entries and focus newly revealed content.
- Each open role has its own action search. It searches all recorded strings and descriptions, including undisplayed services/batches, and leaves the catalogue filters unchanged. Search results open matching groups progressively; clearing the query restores ordinary disclosure choices and resets batching. Sort/resize preserve queries, disclosure state and keyboard position.
- URLs retain `search`, `serviceFilter` and `privilegedOnlyFilter`, plus `role` (a template ID), `actionSearch`, sort/direction and visible-role count. Role links carry that role's internal query. Out-of-filter linked roles are displayed separately without inflating counts; missing templates and invalid settings get explicit recovery.
- An empty recorded action list is not proof that a role has no permissions. Missing or invalid arrays/classification fields trigger load errors, not empty-success defaults. Dataset/collector/history are unchanged by the UI work.

Run `node --test .github\scripts\entra-built-in-roles.test.mjs`. Browser coverage uses the real catalogue, including the 252-action role and roles without recorded actions, to check progressive limits, all-action search, independent role state, exact template copying, role links, focus, filtering and data/clipboard failures.

### Microsoft Graph Permissions contract

- Prioritize the type selector beside search. Preserve the original search/resource/type/admin-consent URL keys. A selected type scopes both text search (including GUIDs/descriptions) and the admin-consent filter to that variant, not another variant sharing the same name. With All types, the consent filter matches any known-required standard variant.
- At the owner's request, six cards above the catalogue show Permissions, Delegated, Applications, Need admin consent, RSC and Resources. Reuse the complete validated dataset's counters, independently of filters, type, sort and pagination. Permissions counts unique names; Need admin consent counts each name once if any standard delegated/application variant is explicitly flagged true, never treating RSC or missing flags as true. Resources counts distinct nonempty source resource labels. Display six columns on wide desktop, three at intermediate widths and two on mobile. Loading/failure uses dashes and explicit feedback; valid empty data shows zeros.
- Explain overlapping type memberships in the initial help and How these totals are counted, including the number with both Delegated and Application. These cards replace the old bottom totals rather than duplicating them. Dataset counters are not filtered-result counters. Preserve RSC as a separate recorded category without inventing its access mode or an admin-consent flag.
- Desktop lists Permission name, Available types, Admin consent and Resource. At the owner's request, the Admin consent column shows requirements labelled by variant, not an ambiguous Yes/No for a shared name. All types shows each available variant; selecting a type scopes this column and its existing consent sort to that type. Required, Not required by source and Not recorded remain distinct; RSC reads Resource-specific consent. Mobile cards show the same labelled information without requiring expansion. Detail rows span all columns. Use native expansion/sort buttons, not button-like rows. Type buttons open and focus the corresponding detail block; the preferred type appears first. Both standard variants remain available for description comparison.
- Each type block owns its heading, scenario, labelled GUID, consent information, display text and description. Copy delegated ID, Copy application ID and Copy RSC ID always copy that exact variant. Success and fallback messages retain the type and permission context. Do not replace an unavailable requested variant with another GUID; show a missing-type message with no invalid copy action.
- Use `permission` and `variant` for deep links, independently of the catalogue filters. Copy-type links retain the requested variant. Out-of-filter/batch names are displayed separately without inflating the displayed count. Preserve other open entries and their preferred types during filtering, sorting and layout changes; URLs address the active permission.
- A false delegated consent flag does not override tenant consent policies. Missing flags remain unknown. RSC does not use the standard flag in this snapshot; combining RSC and Admin consent required gets an explanatory empty state and a targeted clear action.
- Preserve personal-account source flags without extending them to unsupported types. When a name has such a flag but no Delegated variant, show an explicit source-note limitation rather than hiding the flag or implying app-only personal-account support.
- Keep the Entra Roles cross-link and explain that Graph permissions, directory roles and actual consent grants are different concepts. IDs, names, descriptions, the collector and historical snapshots remain unchanged.

Run `node --test .github\scripts\graph-permissions.test.mjs`. Browser checks cover paired GUID copies, typed descriptions and links, scoped consent/search, overlap counts, missing variants, RSC, responsive and keyboard behavior, pagination and clipboard/network/schema recovery.

### Shared interaction and delivery contract

- `site-ui.mjs` is the repeatable authoring source for the inline shell. Preserve isolated page controllers and all external scripts; removing an empty script body must never remove its `src`. Article generation and SEO enrichment both call the enhancer. Normalize repeated carriage returns before preserving CRLF.
- Header menu, theme, social and close controls have 44px targets. Escape returns focus to the menu trigger; an open dialog owns Escape first. Theme labels describe the next action. Browser storage failure must not disable theme switching.
- The footer uses the same BG image (`/favicon.svg`, `.mark`) as the header instead of the textual B.G wordmark. Preserve the homepage destination, including `/index_fr.html` on the French homepage, and give the logo link a localized accessible home label.
- The announcement is short and static. Footer columns wrap at intermediate widths. At the owner's request, footer text links use 24px minimum height and 4px group gaps, increasing to 32px minimum height on narrow mobile screens; language links, buttons and header controls retain 44px targets. A hidden back-to-top button is not keyboard-focusable. Browser-bookmark guidance distinguishes desktop shortcuts from mobile menus.
- Shared `SiteUX.copy` reports successful clipboard writes only after resolution; denial opens a native manual-copy dialog with focus restoration. Downloads say requested, not saved. Toasts never intercept pointer input.
- Privacy choices are a real user-initiated Google Funding Choices revocation request, with a bounded unavailable state and no claim that new choices were saved. Privacy and 404 contain neither an ad loader nor an ad slot. Other pages retain the existing publisher and consent-default-before-analytics order.
- Account-controlled Auto ads placement is not governed by script location. Exact catalogue exclusions for `/tools/`, `/articles/` and `/azure-policies/` remain owner-side settings; local code must not claim to have configured them.

### IP range lookup contract

- Azure and GitHub pages put IPv4/IPv6 lookup and real examples first. Invalid input, valid non-match and matches are separate states, with associated errors. CIDR parsing validates complete syntax and prefix lengths; membership uses integers, not string matching.
- Collection time and Azure source-file date have separate labels. Entry counts are not unique-address counts. Browsing starts with 12 Azure tags and 100 prefixes per opened selection; GitHub requires an explicit category rather than opening the 7,000-plus Actions ranges by default.
- At the owner's request, `/azure-ip-ranges/` exposes six cards before the task navigation: Groups, Prefix entries across groups, IPv4 entries, IPv6 entries, Service-tags version and Source file date. Keep totals independent of tag selection, prefix filtering and IP lookup; count repeated group memberships and show unique literal prefix strings as secondary context, never as unique IP addresses. The file-date card uses a valid date from the source filename, not the collection timestamp, with missing metadata explicitly marked Not recorded. Loading/errors show dashes. The cards replace the Azure bottom statistics disclosure. Maintain the shared inline generator and its idempotence for both pages.
- `/github-ip-ranges/` follows the same card layout with source-appropriate metrics: Categories, Prefix entries across categories, IPv4 entries, IPv6 entries, Unique prefix strings and Snapshot collected (UTC date). Do not invent an Azure service-tags version or source-file date for the Meta API. Totals remain independent of category, prefix and lookup state; retain explicit category selection and the API's verification flag under Technical metadata. Missing collection timestamps show Not recorded; loading/failure replaces all values coherently.
- Exact copy, filtered TXT export and URL lookup/category/query state retain the actual range strings. Selecting or loading more results has predictable headings/focus. Source data and historical files are unchanged.

### Release news and RSS contract

- Azure, Microsoft 365 and AWS news start with search and UTC period, defaulting to Today (UTC). Explicit URL periods override the default, including `lastUpdate=` for All retained; preserve that empty value when sharing or reloading any release feed. Reset all filters and Show latest available dates still allow All retained, without silently widening an empty Today view. Secondary filters/favorites are disclosed. Render 20 announcements initially and distinguish displayed, matching and retained counts; an empty short period offers widening rather than an unexplained blank list.
- At the owner's request, release-news pages and RSS Watcher label their saved-item filter My favorites (count), never Saved in this browser. Match the existing favorites button: 44px minimum height, compact padding, a 16px decorative star and the amber warning palette with a filled star while active. Preserve storage keys, saved entries, counters, filter composition, URL restoration and removal-focus behavior; the explanatory browser-local storage note remains.
- Microsoft announcement statuses are visible non-interactive pill badges using source labels unchanged. Azure: General Availability green, Public Preview blue, Private Preview / In development violet, Announcement amber and Retirement red. M365: In development violet, Rolling out blue, Launched green and Cancelled red; colors do not rename statuses or imply tenant-wide availability. Reuse the page's palette, add a thin border and allow wrapping. Unknown statuses get a neutral badge; absent labels do not create an invented status. The current AWS feed has no status field, so do not infer one from titles or topics; any explicitly supplied future label uses a neutral badge.
- All three release feeds retain the absolute publication/feed date and show a relative-age pill: Today, Yesterday, X days ago, then compact week/month/year wording. Use `pubDate` and the current UTC calendar day, not collection time or elapsed 24-hour blocks. M365's badge describes roadmap feed age, not GA/Preview target dates or a deployment date. Today/Yesterday use a static accent fill without pulsing; invalid dates have no invented age and future dates are labelled honestly.
- All three release feeds display products as individual neutral pill badges in a wrapping Products list, not a middle-dot-separated sentence. Preserve source order, keep badges non-interactive, omit empty rows and allow long labels to wrap on mobile. Reuse the existing update-tag styling. AWS display labels retain the existing acronym normalization (AI/ML, EC2, etc.); raw product/category filter values and stored source data stay unchanged.
- At the owner's request, all three release feeds omit Full source summary and redundant Read the Azure/AWS announcement / Open roadmap item links. Keep the compact description preview and the clickable title as the only article link. Preserve M365's structured roadmap targets and explanatory date/status disclosure.
- M365 roadmap feed dates are not launch dates. GA/Preview month/quarter wording stays as supplied, with rollout caveats and source IDs. Azure has a retirement shortcut; AWS brand normalization affects labels/search, not source links.
- RSS Watcher preserves its source grouping, views, favorite/highlight storage keys and GitHub submission flow. Source/language filters are primary; secondary filters are disclosed. Source view starts with 12 groups and 10 items per source; list view starts with 30. Summaries are expandable and do not widen mobile rows.
- At the owner's request, RSS Watcher's language filter uses the existing 24×18 UK (`/flags/en.png`) and French (`/flags/fr.png`) flags instead of visible English/French text, with a globe for All languages. Keep the three native buttons, 44px targets, accessible labels/tooltips, keyboard focus and active styling. Preserve the `languageAll`/`languageEn`/`languageFr` IDs, empty/EN/FR values, URL restoration and combined-filter behavior.
- Every RSS source shows a reserved 24px icon before its source name in grouped cards and list rows, including mobile. Prefer the exact channel-level RSS image or Atom icon/logo from `source-icons.json`, not a favicon for the image CDN. Source logos are downloaded by `rss-watcher/cache-icons.mjs` into content-addressed local files; visitors never request third-party images. Relative feed-icon URLs resolve against the final feed URL, ignoring per-entry artwork.
- When a feed logo is absent or unavailable, keep a valid cached logo or use the local source favicon; the last resort is visible initials with an unavailable-icon tooltip, never a disappearing or broken image. Log errors without blocking the news catalogue. Cache downloads are deduplicated, bounded by timeout and size, and accept recognized raster/ICO formats; unsupported images use the fallback. The RSS refresh workflow updates the icon manifest/assets and deployment includes them. Logo refreshes do not rewrite article publication dates or fabricate feed collection timestamps.
- Feed counts distinguish configured sources, successful fetches and failures. Feed Activity and Tech Community separate collection status from editorial recency; an old/no publication date is not a dead feed. Per-feed recency labels remain relative to the snapshot, not an unperformed live probe.
- At the owner's request, Tech Community has five cards above filters: Total Feeds, Categories, Active Today, This Week and Dead Feeds. Count all configured entries and distinct category memberships independently of filtering, sorting, selection and pagination. Active Today uses the current UTC day and This Week starts Monday UTC; count only recorded publication timestamps no later than either the collection time or now. An older snapshot can therefore show zero current activity without implying that the live feeds are silent. Missing collection dates leave activity counters Not recorded. Dead Feeds means explicit last-collection errors (`ok: false`), with that limitation visible on the card; never infer permanent failure from age or missing dates. Loading/failure shows dashes and valid empty data shows zeros. RSS Watcher Activity keeps its existing summary rather than receiving these cards.
- Tech Community's table columns are Name, Category, RSS feed, Last published and Last activity, in that order. Prefix the last recorded article link beneath the feed name with Latest:. Keep RSS opening/copying and OPML selection in the RSS feed column; collection diagnostics remain in Feed details. Last activity reuses the UTC publication-age badge (Today, Yesterday, X days ago, then older units), not a live health status, and missing dates remain Not recorded. Mobile cards expose the same labelled fields. Name, category and last-publication sorting remain available; RSS Watcher Activity retains its separate four-column view.
- Exact feed URL copy, selection-aware OPML exports, accessible sorting and mobile cards are available. Show latest-article links and attempt timestamps only when supported by recorded evidence; the collector records richer metadata on future runs without fabricating it for older snapshots.

### Calculators, generators and games contract

- Subnet results distinguish ordinary IPv4 host ranges from Azure's five reserved addresses, expose network subdivision and CSV export, and associate errors with inputs.
- Percentage modes name their operands/results and explain formulas; decimal commas are accepted and each mode retains its inputs. Unit conversion keeps decimal/binary units distinct, adapts precision, supports target/swap and remembers category input. SLA calculations expose month length (28-31 days), named services and the series assumption.
- GUID generation has an immediate single result, progressive batch settings and TXT/JSON export. The wheel announces a result rather than every animation frame, protects destructive reset/mode changes, supports reduced motion and copies history.
- Mini-games use a compact selector. Keyboard capture applies to the focused game and touch handling to the canvas, not the whole document. Game switching is protected; fullscreen is optional.

### Galleries and curated directories contract

- Icons expose source/category labels, adjustable density and shareable filters. At the owner's request, hide file-path/variant rows from gallery cards and the enlarged preview. The preview keeps the image/title, the same source/collection line as the thumbnail (for example, Ben Coleman · azure-icons) immediately above Source and usage terms, and four directly visible actions in a two-column grid: Download SVG, Download PNG, Copy SVG, Copy PNG. Keep the provenance link conditional, without restoring the longer licensing descriptions or PNG/copy disclosure. Preserve exact asset paths internally for favorites and exports. Show capability explanations only when an action is unavailable, and retain explicit progress/error feedback.
- Source and usage rights remains an always-visible section on the Icons page, not a collapsible disclosure; retain its source-dependent disclaimer and source link. Unknown licensing remains unknown rather than an invented permission, without repeating the disclaimer inside the preview.
- Emoji names and synonyms support discovery. Favorite, emoji-copy and shortcode-copy are separate 44px controls with named feedback.
- IT Images leads with the actual gallery, large mobile images and original previews. At the owner's request, each card shows only its image and title: remove the description and Image text, source & usage disclosure. Retain underlying metadata and existing search and enlarged-preview behavior. `image-descriptions.json` enriches generated `images.json`; it is not a browser dependency.
- Favorite Links retains exact destinations, descriptive search metadata and preference keys. At the owner's request, show the favicon and clickable URL by default, then category, added date and five rating stars on one compact line in both Cards and List, including mobile. Long URLs use at most two lines, with the complete URL and descriptive title in the link tooltip; narrow categories truncate visually but keep their full text and tooltip. Missing dates say Not dated, invalid dates are explicit, and no date is inferred from collection or verification. Keep the favorite button separate. Remove the redundant domain line and the entire Details & report a link section, including descriptions, last-verification text and the broken-link action; link submission remains available. Its saved-item filter reads My favorites (count), including after adding or removing favorites. Topic-derived descriptions and unrecorded verification dates are not endorsements or freshness claims.
- Friends removes placeholder descriptions. At the owner's request, Search, Category and Country remain visible above the directory even for small datasets or a single category/country; populate the dropdowns only from recorded entries. Cards/List and Submit a website also stay above the results rather than moving below them after loading. Keep visible field labels, stacked mobile filters, combined search/category/country behavior, URL restoration and saved view preferences. Disable filters while loading or unavailable, with explicit status feedback; submitting a website remains available.
- Microsoft Portals is an explicitly limited selection with task-based discovery, documented Entra/Defender additions and accurate coverage notes.
- Deploy `favorite-links/link-labels.json` and `microsoft-portals/portal-details.json` alongside their catalogues.

### World Clock, workflow status and recovery contract

- Paris remains the first clock. At the owner's request, always-visible Day of the Year and Week of the Year cards sit alongside it on desktop and below it on mobile. Calculate the day, 365/366-day total, one-decimal percentage and ISO week/week-year from the displayed Paris date, including meeting previews; never freeze example values or count elapsed DST hours as calendar days. Optional selected cities use IANA zones, their local dates and day differences relative to Paris. Preserve the existing view preference and persist selected zones separately.
- Paris and every city expose a GMT offset badge beside the name, calculated for the displayed instant, including daylight saving and fractional offsets. Show 24x18 country flags from FlowHunt, cached in `/flags/`, with country names as accessible alternatives where the country is not already written. `world-clock/timezone-countries.json` maps geographic IANA identifiers and aliases to countries; the generator embeds this data, so visitors make no external flag or metadata requests. Preserve geographic identities when adding explicit IANA locations. UTC and non-geographic zones use a neutral globe rather than an invented country; failed flag images retain an explicit country-code fallback. Refresh the authoring data/assets only with `.github/scripts/clock-flags.mjs`, using the supplied FlowHunt page and public-domain IANA country/location tables.
- Meeting preview uses the selected date's zone offset. Reject DST gaps and ask for an explicit occurrence during repeated local times; never silently shift the requested time. Live and preview are labelled, return-live is local, and ticking seconds are not live-announced.
- Workflows separates execution outcome, last success in the retrieved window and actual dataset collection timestamps. One bounded repository API request reads the latest 100 `main` runs; manual refresh never dispatches a job. Quota/network failures are unavailable states, not pipeline failures.
- `build-workflow-schedules.mjs` derives schedules and writes `data-freshness.json` from recorded `generatedAt` fields. Use the oldest required dataset and the maximum supported schedule gap plus explicit grace. Missing/future dates remain unknown. A successful run may still have old published data.
- Anomalies precede healthy workflows by default. Mobile cards keep status/freshness summaries visible and collapse run IDs, branch, duration and dataset paths. Paris, UTC and the browser zone can be selected for schedules.
- 404 provides Articles, Tools and Home exits, an editable article search using `q`, a safely rendered requested path and a compact ad-free footer.

### Article reading and privacy contract

- All 48 Markdown sources share measured prose by default (72ch, capped at 42rem), local code/table scrolling, unique heading IDs, desktop/mobile TOC and keyboard-accessible image enlargement with original links/captions. At the owner's request, each associated illustration appears below the article title/metadata and before sharing, series navigation, TOC and article body, with eager high-priority loading. Wide covers use a reserved 16:9 image band; service logos use a compact fixed-height band, without stretching or cropping the image. Do not repeat the illustration at the bottom. The native contents disclosure offers Show / Hide table of contents: closing it removes the desktop sidebar column and lets the article body, headings and prose fill the available reading width; reopening restores the sidebar and default measure. Keep the same keyboard-focusable summary available to reopen it, including after a layout change. Libraries without a TOC retain their existing layout. The manual ad follows a complete meaningful content unit.
- At the owner's request, article headers (breadcrumb, categories, title, summary, metadata and tags), Share this article, both series navigation blocks and Continue with span the full main page width, aligned with the reading layout rather than capped at 75ch. Illustrations remain centered with their existing 50rem maximum width. Preserve the reading body's measure and TOC behavior. Privacy uses the same full-width header and reading layout.
- The bottom article navigation retains Back to all articles but no longer displays RSS feed, at the owner's request. RSS Feed remains available beside Cards/List on the article catalogue.
- Code copy is independent of code scrolling and uses the shared honest clipboard fallback. The full code remains available; long reference sections are optionally collapsed, and anchors reveal their target.
- At the owner's request, fenced code blocks (PowerShell, diagram, JSON and every other language) always use the dark editor palette in both site themes: `#0f1b2b` body, `#16273d` header, light code and control text, and visible focus/copied states. Keep long-script disclosure labels readable on that surface. Inline code in prose remains theme-aware, and printing retains dark text on a light background.
- Policy and DNS series expose position, map and previous/next at both ends. Related links are contextual. The Resource Graph query library and Git commands have local search/task filters; Private DNS zones have search/copy; the DNS decision path retains keyboard focus, shared state and result copy.
- Each article has specific context, prerequisites, decision/checkpoint or validation guidance as appropriate. Preview-first administrative examples do not execute destructive/cloud operations during site verification. Missing tested versions, dates, script provenance, pricing evidence and personal migration facts are explicitly unrecorded, never manufactured.
- Article frontmatter supports `summary`, `related`, `leadSections` and `collapsible`; regenerate HTML, metadata, RSS and catalogue static markers with `node articles\build-articles.mjs`. Preserve the catalogue controller and legacy URL parameters.
- Privacy has a concise summary, contents, purpose table and real privacy-choice action. At the owner's request, render it like an article using the shared article body class, header spacing and reading layout; generate its Show / Hide table of contents from the policy headings as a sibling of the reading body, open in the desktop sidebar and collapsed above the text on mobile. Preserve the policy wording, update date, Home links, privacy controls and ad-free behavior, without adding an illustration, sharing bar, series or related articles. It distinguishes browser-local preferences and shared URLs from voluntary GitHub submission. It must not claim zero processing or legal certification, and must not prescribe cookie deletion as the ordinary consent-management path. Regenerate only this page with `node articles\build-articles.mjs --privacy-only` to avoid changing article feeds or their timestamps.

Run the scoped native suites in `.github/scripts/` and the corresponding browser scenarios after changes. Browser test harnesses use local pages with external ad requests blocked; they must not generate live ad impressions/clicks, submit forms, or change real consent choices.

A cool blue-frost field that stays deliberately quiet so that status colour - pass, fail, warn - carries all the signal.

### Primary
- **Azure Signal** (`#0b6fb8`): The single accent. Links, active states, focus rings, the primary button, and every "this is interactive" cue. Dark theme lifts it to `#4fa8ea` for legibility on `#0c1420`.
- **Azure Signal Deep** (`#075b98`): Hover only. The primary button darkens into it; nothing else uses it.
- **Azure Wash** (`rgba(11, 111, 184, 0.09)`): A 9% tint of the accent, used as the background of active toggle segments and category tags. It is a tint, never a solid - it must always be composited over its parent before you judge its contrast.

### Secondary
- **Probe Cyan** (`#0d93b0`): Opens the gradient on the author's name and the homepage statistics. Never used for body text.
- **Index Violet** (`#6a4fd6`): Closes that same gradient and marks employer names on the experience timeline. The rarest colour in the system.

### Neutral
- **Page Frost** (`#f5faff`): Page background. Barely-blue, never pure white, so that white cards read as raised.
- **Surface White** (`#ffffff`): Card and panel fill.
- **Surface Frost** (`#eef7ff`): Recessed fill - terminal title bars, chips, table headers.
- **Hairline** (`#d8e8f5`): Every border on the site. One weight, one colour.
- **Hairline Strong** (`#89afd0`): Borders that must be seen - inputs, secondary buttons, list bullets.
- **Ink Navy** (`#17324d`): Body text. A navy, not a black; it belongs to the same cool family as everything else.
- **Ink Slate** (`#536f88`): Secondary text, metadata, labels.
- **Night Void** (`#0c1420`) / **Night Surface** (`#16233a`): The dark theme's true dark. Not a mid-grey.

### Status
- **Pass Green** (`#157f57`) on **Pass Green Surface** (`#eefaf5`): availability, "yes", success.
- **Fail Red** (`#c93636`) on **Fail Red Surface** (`#fdf2f2`): restricted, "no", failed collection; never infer a dead feed from publication age.
- **Warn Ochre** (`#96610a`) on **Warn Ochre Surface** (`#fdf3e1`): dates, skill headings, advisory metadata.

### Named Rules

**The Status-Only Rule.** Green, red and ochre exist to report machine state, never to decorate. If a colour on this site is not answering a question the visitor asked about their data, it should be a neutral.

**The Two-Palette Rule.** Light and dark are two independently tuned palettes that share token *names*, not token *values*. `--cp-warning` is `#96610a` in light and `#e4a940` in dark because each was set against its own background. Never "resynchronise" them.

**The Composite-Before-You-Judge Rule.** `--cp-accent-soft` is an alpha tint and the banner background is a gradient. Both read as `transparent` from `getComputedStyle().backgroundColor`. Any contrast check that does not composite the full background stack will report spectacular false failures on this site.

## Typography

**Display / Body Font:** `"Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif`
**Label / Mono Font:** `ui-monospace, SFMono-Regular, Menlo, monospace`

**Character:** The OS UI stack, chosen so the site feels native to the Windows/Azure desktop its visitors already live in. There is no webfont anywhere - nothing to load, nothing to flash, nothing to fail. Personality comes from the monospace accents, not the body face.

### Hierarchy
- **Display** (800, `clamp(2rem, 5vw, 4rem)`, 1.05, `-0.02em`): The author's name on the homepage hero. Once per site.
- **Headline** (800, `clamp(1.6rem, 4vw, 2.4rem)`, 1.2): Page `h1` and the contact call to action.
- **Title** (650, 1.05-1.2rem, 1.3): Card titles - roles, certifications, tools, articles.
- **Body** (400, 15px, 1.7): All prose. Constrained to `62ch` in the hero; card text runs to its container.
- **Label** (400, 0.85rem, uppercase with `.04em` on tool pages): Section labels. On the homepage these carry the `PS>` prefix.
- **Mono** (400, 0.8rem): Terminal chrome, shell prompts, exam codes, IP ranges - anything a machine produced.

### Named Rules

**The No-Webfont Rule.** The system font stack is a hard constraint, not a placeholder. A webfont would add a network dependency, a FOUT, and a licence to a site whose entire premise is that it has none.

**The Machine-Voice Rule.** Monospace marks text that came from a machine or addresses one. Prose never uses it, and a value the user must copy always does.

## Layout

A single centred column: `width: min(90rem, calc(100% - 2rem))`, shared by the header inner, `main`, and the footer inner so all three align to the same edge on every page. Vertical rhythm is `2.5rem` between sections, `1rem` between cards in a grid.

Card grids are uniformly `repeat(auto-fit, minmax(<floor>, 1fr))` with a `.85-1rem` gap. **The floor must always be wrapped in `min(<floor>, 100%)`** - a bare `minmax(23rem, 1fr)` cannot shrink below 368px and overflows a 360px viewport.

Three breakpoints do all the work, and they are consistent across the site: **48rem** (768px, where the header collapses to a hamburger and multi-column grids fold), **40rem** (640px, intermediate grid collapse), and **32rem** (512px, where the gutter narrows to `1rem`, filter bars stack, and the footer goes single-column). Two homepage-only outliers (`760px`, `60rem`) predate the convention; new work should use the three canonical steps.

The header is `position: sticky; top: 0` at `4rem` min-height. Anything else that sticks beneath it must offset from the `--header-h` custom property, which a `ResizeObserver` keeps synchronised with the real measured height - never a hard-coded value, because the header is 65px on desktop and 61px on mobile.

**The Reserve-The-List Rule.** Every list on this site is rendered from JSON after load. A container that starts at zero height throws the footer up the page and then shoves it back down, which is the single largest source of layout shift here. Any async-filled container gets a `min-height` (70vh is the house value) so the first paint already occupies the space the data will need.

## Elevation & Depth

The system is **flat by conviction**. Depth comes from a one-pixel hairline border and a barely-tinted background step (`#f5faff` page → `#ffffff` card → `#eef7ff` recess), not from shadows. The `.glass` card - the most-used container on the site - carries `box-shadow: 0 0 2px var(--cp-border), 0 1px 2px var(--cp-border)`, which is a border doing a shadow's job, not a shadow.

Real elevation appears exactly three times: the sticky header and footer veil (`backdrop-filter: blur(12px)` over a 97%-opaque panel), the floating back-to-top button, and the mobile navigation dropdown. All three are things that float *over* content, which is the only thing that earns a shadow here.

### Shadow Vocabulary
- **Hairline lift** (`0 0 2px var(--cp-border), 0 1px 2px var(--cp-border)`): the default card. Reads as a crisper border, not as height.
- **Floating panel** (`--cp-shadow`: `0 18px 48px rgba(36, 92, 136, 0.14)`, dark: `rgba(0, 0, 0, 0.45)`): only for elements that overlay content.

### Named Rules

**The Lift-On-Intent Rule.** Hover feedback belongs to the actionable link or control, not to a static information card. Elevation is feedback, never decoration.

## Shapes

Rectangles with modest, consistent corners. Four steps carry everything: **6px** for controls (buttons, nav items, icon buttons), **8px** (`--radius`) for cards and inputs, **10px** for containers that wrap other rounded things (the section nav, the mobile menu, icon backplates), and **999px** for pills that hold a person or an organisation - client chips, the location badge.

Circles are reserved for two things: the back-to-top button and the terminal chrome dots.

The one non-rectangular element in the system is the experience timeline's vertical rail - a 3px gradient line running green → accent → violet with a CSS-triangle arrowhead at the top. It is the only piece of pure illustration on the site and it earns its place by encoding chronology as direction.

Behind everything sits the **aurora**: three fixed radial gradients on `body::before` drifting over 30s, plus a masked dot-grid on `body::after`. It is atmosphere, never interactive, always `pointer-events: none`, and fully stopped under `prefers-reduced-motion`.

## Components

### Buttons
- **Shape:** 6px radius, `0.625rem 1.25rem` padding, weight 700 at `0.88rem`.
- **Primary:** Azure Signal fill, white text, no border. Hover darkens to Azure Signal Deep and lifts `translateY(-2px)`.
- **Green:** Pass Green fill, white text. Reserved for the mail action.
- **Ghost:** Surface White fill with a Hairline Strong border. Hover switches the border to the accent and the fill to Azure Wash.
- **Focus:** every button and link takes `outline: 3px solid var(--cp-accent); outline-offset: 2px` on `:focus-visible` only.

### Chips
- **Tag** (`.tagpill`): Surface Frost fill, Hairline Strong border, 6px radius, Ink Slate text at `0.8rem`.
- **Pill** (`.client`): 999px radius, favicon plus label, lifts `translateY(-2px)` and borders in accent on hover.

### Cards / Containers
- **Corner:** 8px (`--radius`).
- **Background:** Surface White. **Border:** 1px Hairline. **Shadow:** hairline lift only.
- **Padding:** `20-26px` depending on density.
- **Hover:** `translateY(-4px)` plus accent border, over `0.2s`.

### Inputs / Fields
- **Style:** Surface White fill, 1px Hairline Strong border, 8px radius, `2.9rem` min-height.
- **Filter bars** are flex with `.75rem` gaps, collapsing to a stacked column at 32rem. When you widen inputs at that breakpoint, scope the rule with `:not([type="checkbox"])` - a bare `.filter-bar input` also matches checkboxes and will blow a 1.15rem control up to full width.

### Navigation
- **Header:** shared Home, Articles and Tools links with 16px inline SVG icons, plus LinkedIn and theme controls. Current pages use `aria-current="page"`; a tool/article parent uses `aria-current="location"`. The legacy blog is not a primary destination.
- **Mobile:** below 48rem the links collapse into an absolutely-positioned panel behind a hamburger, closing on Escape, outside click, resize, and link activation.
- **Section nav** (homepage only): a sticky secondary row offset by `--header-h`, with scroll-spy setting `aria-current="location"`. One scrollable row at mobile, never a wrapped block.

### Signature Component: the shared shell
Every page opens with a short static dismissible banner, then the shared header, `main`, a wrapping footer, and back-to-top. A pre-paint inline script sets theme/banner state. History pages intentionally keep only their group date sticky on mobile rather than stacking sticky bars; the 404 footer is compact. These task-specific adaptations retain the same shell controls and tokens.

## Do's and Don'ts

### Do:
- **Do** build a new page by copying the most recently built similar page. The shell is the design system; re-typing it from memory is how drift starts.
- **Do** ship every colour in both themes, tuned independently against its own background, and verify both at WCAG AA.
- **Do** reserve height (`min-height: 70vh`) on any container filled from JSON after load.
- **Do** offset anything sticky from `--header-h`, never from a hard-coded pixel value.
- **Do** wrap grid floors in `min(<floor>, 100%)` so they can collapse on a 360px viewport.
- **Do** keep colour for machine status. A neutral is the correct answer for almost everything else.
- **Do** give focus a visible 3px accent outline on `:focus-visible`.

### Don't:
- **Don't** break light/dark parity. Every new token needs both values, measured - a dark theme that is a washed-out grey inversion of the light one is a regression, not a shortcut.
- **Don't** introduce a runtime framework, webfont or npm dependency. Authoring helpers must keep emitting standalone inline HTML; visitors must not depend on an authoring toolchain. Leaflet on `/azure-regions/` remains the deliberate on-demand exception.
- **Don't** let one page's shell drift from the others. Update the shared inline enhancer, regenerate articles and reapply it to standalone pages; preserve documented task-specific adaptations.
- **Don't** animate layout properties. `width`, `height`, `padding` and `margin` transitions cause reflow; use `transform` and `opacity`.
- **Don't** add a second accent. The site has one interactive colour, and cyan and violet exist only inside a single decorative gradient.
- **Don't** trust a contrast reading without compositing alpha tints and gradient backgrounds first.
