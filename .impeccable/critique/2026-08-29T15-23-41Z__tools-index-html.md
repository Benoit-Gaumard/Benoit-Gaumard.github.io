---
target: the whole site (tools experience)
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-29T15-23-41Z
slug: tools-index-html
---
Method: dual-agent (A: site-critique-a · B: site-critique-b)

Target: the whole site, judged with the tools experience at its centre (PRODUCT.md establishes the tools reference as the core of the product). Blog out of scope.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | `/workflows/` fires 11 requests to `api.github.com` that all return **403** and renders "Unavailable / Could not load the latest run" on every card. Only `/icons/` has any `aria-live`, so every other filterable page updates its results in total silence. Four pages still shift on load (CLS 0.18-0.69). |
| 2 | Match System / Real World | 3 | "Programmatic name", "CIDR prefix" match the practitioner's vocabulary. "My Favorite Links" as a public page title reads as a personal dump rather than a curated resource. |
| 3 | User Control and Freedom | 2 | No filter state in the URL on any page. Narrow 2,853 policies down to 12, hit Back, lose everything - and you cannot send that view to a colleague. No one-click filter reset where 3-4 controls exist. |
| 4 | Consistency and Standards | 2 | **Four incompatible long-list strategies**, measured: 522 rendered at once (`favorite-links`), 50/page with a Previous/Next across 99 pages (`icons`), a hard 500 cap with a "refine your search" line (`azure-policies`, 2,853 matches), 501 rendered unpaginated (`azure-policy-aliases`, `azure-taggable-resources`). Plus `.stats-grid` vs `.stat-cards` for one widget, breadcrumbs on articles but not tools, and two different monospace stacks. |
| 5 | Error Prevention | 2 | The subnet calculator accepts malformed input silently - no validation ring, no message. Filter fields give no "searching…" feedback on 2,853-row datasets. |
| 6 | Recognition Rather Than Recall | 2 | The hub is 26 undifferentiated cards in one grid: no categories, no tags, no record counts, no freshness. Nothing distinguishes an Azure-authoritative data tool from Random Wheel. |
| 7 | Flexibility and Efficiency of Use | 2 | No keyboard shortcut to the search box, no URL parameters, no copy-to-clipboard on any computed or reference value. The power user gets no accelerator anywhere. |
| 8 | Aesthetic and Minimalist Design | 3 | The palette is disciplined and the shell is calm. But `/icons/` stacks search + source + category + per-page + disclaimer + favourites before one icon appears. |
| 9 | Error Recovery | 1 | The 403s on `/workflows/` come with no explanation and no path forward. Most pages have no error branch at all - only a load path. |
| 10 | Help and Documentation | 2 | No tooltip on any filter control, no "what is this" on `/azure-policy-aliases/`. Empty states exist and are decent; that is the whole of the help system. |
| **Total** | | **21/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment.** The identity is real at the shell and evaporates at the surface. The aurora, the cool blue-frost palette, the status-only colour discipline and the blurred sticky header are recognisable and consistent across 63 pages - genuinely hard to achieve with no build step. But enter any tool and the authored character stops: every data page is a white-card grid with a search box and a Cards/List toggle, a pattern any "Awesome Azure" generator ships. The North Star claims a *console*; the surfaces behave like *catalogues*.

The sharpest specificity failure is that **the product's stated differentiator is invisible on the product**. PRODUCT.md says the positioning is authoritative, self-refreshing Azure data pulled straight from `Get-Az*` on a 4x/day cadence. Not one hub card shows a refresh timestamp, a record count, or a data source. The one page that exists to prove the claim - `/workflows/` - currently renders as twelve dead cards.

**Deterministic scan.** 225 findings, of which 217 are the three `design-system-*` advisory rules that only became active when `DESIGN.md` was written this session. Those measure drift between the documented palette/ramp/scale and the literals in the code, and most are values already described in DESIGN.md prose as deliberately hard-coded (terminal dots, aurora gradients, print styles). The 8 non-advisory findings matter more: **`design-system-font` ×4** flags a `"Cascadia Code", "Consolas"` stack on `/subnet-calculator/` and `/azure-policies/` that DESIGN.md does not document - a real gap in the design system record, and one against my own DESIGN.md. `em-dash-overuse` ×1 and `broken-image` ×1 are minor; both `side-tab` hits are false positives (a blockquote accent and a callout, not navigation).

**Corrections made during synthesis.** Independent verification overturned three agent claims: the favicon fallback on `/favorite-links/` **does** work (with Google blocked, zero broken images render and avatars fall back to initials), the `/favorite-links/` empty state **does** show "No links match your filters.", and the hub's 26 drag handles **do** carry `aria-label="Drag to reorder"`. Reported as corrections rather than repeated.

## Overall Impression

The engineering floor is now genuinely high: token graph closed at 28/28, WCAG AA in both themes, 24px targets everywhere, zero overflow at any width, reflow to 320px passing, focus rings correct, reduced-motion honoured. The recent audits did their job.

What is left is not defect work - it is that **the site is a very well-built reference catalogue that has not yet become an instrument**. The gap between those two things is small and concrete: state in the URL, a copy button next to values people came to copy, freshness on the hub cards, and one list strategy instead of four.

## What's Working

1. **The shared shell across 63 hand-built pages.** Moving from `/azure-regions/` to `/subnet-calculator/` feels like switching tabs in one app. With no build step and no includes, that consistency is a real achievement and it is what makes 26 unrelated utilities read as one product.
2. **The subnet calculator's instant-compute pattern.** Defaults pre-filled, results visible with zero clicks, machine values in monospace. It is the only surface that fully delivers the Practitioner's Console idea - the answer is already on screen when you land.
3. **The two-palette dark theme.** Independently tuned values rather than an inversion, both meeting AA, with pre-paint FOUC prevention. Power users work in dark mode during incidents; this earns trust.

## Priority Issues

### [P0] `/workflows/` is the proof page and it renders as twelve dead cards
- **What**: 11 requests to `api.github.com/repos/.../actions/workflows/*/runs` all return **403** (the endpoint needs auth a public visitor does not have). Every card shows "Unavailable - Could not load the latest run (HTTP 403)". Confirmed independently by both assessments.
- **Why it matters**: this is the single page that could turn a sceptic into a believer about the site's core claim - twelve pipelines refreshing four times a day. Instead a visitor concludes the site is abandoned. It actively argues against the positioning.
- **Fix**: stop calling an endpoint that cannot succeed. Inject the last successful run timestamp at build time (the deploy workflow already runs after each data refresh), lead with the `badge.svg` images that *do* load and say "passing", and delete the "Unavailable" chip.

### [P1] No filter or search state in the URL, anywhere
- **What**: no page reads or writes `URLSearchParams`. Narrowing `/azure-policies/` from 2,853 to a handful, or `/azure-regions/` to "European regions with availability zones", is unshareable and destroyed by the Back button.
- **Why it matters**: the primary persona is mid-task and works with colleagues. "European regions with AZ support" should be a link, not a verbal instruction. It also makes browser history useless on the site's densest pages.
- **Fix**: reflect every filter into the query string on change and hydrate from it on load. Roughly 20 lines of vanilla JS per page, and it is the single highest-leverage change available.

### [P1] Four incompatible long-list strategies, now measured
- **What**: 522 items rendered at once with no control; 50-per-page with Previous/Next across 99 pages; a silent 500-row cap on a 2,853-row dataset with only a "refine your search" line; 501 rows rendered unpaginated with no counter at all.
- **Why it matters**: users generalise. Someone who learns pagination on `/icons/` will scroll `/favorite-links/` hunting for page controls that do not exist, and will assume `/azure-policy-aliases/` shows everything when it silently stops at 500. That last one is not an inconsistency, it is misleading state.
- **Fix**: one strategy sitewide - "showing N of M" plus a Load More - with pagination retained on `/icons/` where the per-page control is already muscle memory. Every capped list must state that it is capped.

### [P1] Eleven primary form controls have no accessible name
- **What**: `#toolSearch`, `#searchInput` on three pages, `#continentFilter`, `#categoryFilter`, `#sortSelect`, and all four controls on `/azure-policies/` carry only a `placeholder`. A placeholder is not an accessible name. Compounding it, **only `/icons/` has any `aria-live`**: everywhere else, filtering updates the results with no announcement at all.
- **Why it matters**: on an Operate surface the search box *is* the product. A screen-reader user reaches an unnamed control, types, and receives no confirmation that anything happened or how many results came back.
- **Fix**: a visually-hidden `<label for>` on every control, and `aria-live="polite"` on each result-count element (the pattern already exists on `/icons/` - copy it).

### [P2] Cumulative layout shift still fails on four pages
- **What**: measured `/azure-regions/` **0.69**, `/azure-policies/` **0.64**, `/rss-watcher/` **0.36**, `/emoji-sheet/` **0.18** on desktop. Same root cause fixed elsewhere this session: a JSON-filled `<section>` grows from ~130px to ~500px and shoves the footer down.
- **Why it matters**: these four were simply not in the earlier fix set. The remedy is already proven on this codebase.
- **Fix**: `min-height: 70vh` on the async-filled container, exactly as applied to `/articles/`, `/favorite-links/`, `/icons/` and `/workflows/`.

### [P2] Nothing on the site can be copied in one click
- **What**: the subnet calculator computes a network address; `/azure-regions/` shows programmatic names like `australiacentral`; `/azure-ip-ranges/` lists CIDRs. None has a copy button.
- **Why it matters**: the entire reason these pages exist is to take a value somewhere else. Select, right-click, copy is three steps and error-prone on mobile mid-incident. This is precisely the line between a reference page and a daily-driver tool.
- **Fix**: a clipboard affordance on every monospace value, with a brief "Copied" confirmation.

## Persona Red Flags

**Casey (distracted mobile, mid-incident).** On `/azure-regions/` the 2×2 stats block plus search plus continent dropdown consume the entire first screen - the first region card is below the fold, so the page reads as not-loaded. On `/favorite-links/` the filter controls occupy roughly three screen-heights before a single link appears. And on every tool page there is no breadcrumb, so returning to the hub costs three taps through the hamburger - a problem the article pages already solved with "← All articles".

**Alex (impatient power user).** Types a tool name on the hub, presses Enter, nothing happens - Enter does not open the single remaining card. Cannot bookmark `/subnet-calculator/?ip=10.0.0.0&cidr=16`, so recomputes from scratch every time. No `/` shortcut to focus search on any of the 26 tools.

**Sam (screen reader + keyboard).** No skip link on any page, so every visit starts with nine header stops before reaching content. Reaches the search box and hears no name. Filters, and hears nothing about the result. On `/azure-regions/` the Map view is a Leaflet canvas with no text alternative for any region marker. Focus rings, tab order and the drag handles' labels are all correct - the gaps are naming and announcement, not focus.

## Minor Observations

- Two monospace stacks coexist: `ui-monospace, SFMono-Regular, Menlo` in the shell versus `"Cascadia Code", "Consolas"` on `/subnet-calculator/` and `/azure-policies/`. DESIGN.md documents only the first - fix the drift or document the second.
- `/icons/` renders an `All > All` breadcrumb - two identical labels from a root category.
- The hub subtitle "Click a card to open it" is unnecessary for this audience.
- `/workflows/` places a "Refresh" action inside the Cards/List view-toggle group; an action is not a view mode.
- Hub tool icons load from external CDNs with no fallback; a CDN failure leaves iconless cards.
- The welcome banner's 👋 is the first thing every visitor sees and sets a casual tone against an "authoritative data" positioning.
- `.drag-handle` still animates under `prefers-reduced-motion` (a 0.15s transition escapes the media block), as do some SVG icon transitions.

## Questions to Consider

1. If freshness is the product, why does every hub card lead with a description instead of "Updated 2h ago"? A stock ticker leads with the price.
2. The Cards/List toggle ships on 15+ pages. If fewer than 5% of visitors ever touch it, it is a tax paid by 100% of them - and that real estate could hold a category filter the hub badly needs.
3. There are 26 tools, 32 articles and a blog, and no search spanning all three. Someone who remembers "that Azure policy aliases thing" cannot know which of the three it lives in.
4. Density without hierarchy is clutter. Would a quick-reference sidebar plus detail pane serve "get one answer fast" better than 61 equally weighted region cards?
5. Zero-build protects portability - but the four list strategies, the class-name drift and the missing breadcrumbs are all consequences of 26 files evolving with no shared include. Has that trade been priced honestly?

## Technical Audit (`/impeccable audit`)

| # | Dimension | Score | Key Finding |
|---|---|---|---|
| 1 | Accessibility | 2 | 11 primary controls with no accessible name; `aria-live` on exactly one page, so filtering is silent everywhere else; no skip link. Offset by AA contrast in both themes, 24px targets, correct headings, landmarks, focus rings, alt text and reduced-motion. |
| 2 | Performance | 2 | 11,249 DOM nodes on `/favorite-links/` and 10,588 on `/azure-policies/` (1.7 MB payload); 522 cards rendered in one pass; CLS 0.18-0.69 on four pages. Offset by zero dependencies and lazy images. |
| 3 | Responsive Design | 4 | Zero horizontal overflow at 1440 or 375 on any page; reflow at 320px-equivalent (WCAG 1.4.10) passes everywhere; every target ≥24px. |
| 4 | Theming | 4 | Token graph closed at 28 declared / 28 used; two independently tuned palettes both at AA; pre-paint FOUC prevention. Only blemish is the undocumented second monospace stack. |
| 5 | Implementation Integrity | 2 | Four list strategies, `.stats-grid`/`.stat-cards` drift, two mono stacks, a shipped API call that can only 403, and no URL state anywhere. |
| **Total** | | **14/20** | **Good - address the weak dimensions** |

**Implementation Integrity verdict: FAIL.** The shell is coherent and the tokens are now airtight, but the 26 tool pages have drifted independently in exactly the ways a shared include would have prevented, and one page ships a network call that cannot succeed.

**Severity counts: P0 ×1, P1 ×3, P2 ×2**, plus ~7 minor observations.

### Positive findings worth preserving
- Token graph closed 28/28; zero unresolved custom properties.
- WCAG AA contrast verified in both themes; 24×24 targets sitewide; 320px reflow passes.
- Zero console errors on 10 of 14 pages; the 4 exceptions are third-party favicon 404s (handled gracefully) and the `/workflows/` 403s.
- Favicon failure degrades correctly to initials - verified with Google fully blocked.
- Empty states exist and read well on `/tools/`, `/azure-regions/`, `/icons/`, `/microsoft-portals/`, `/favorite-links/`.
- `prefers-reduced-motion` stops the marquee, the aurora, smooth scroll and card transitions.
