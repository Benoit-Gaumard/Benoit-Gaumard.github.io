---
name: benoit-gaumard.io
description: A practitioner's Azure console that doubles as a portfolio - 63 hand-built pages sharing one shell, zero dependencies.
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
  night-void: "#0c1420"
  night-surface: "#16233a"
  night-surface-soft: "#1c2c42"
  night-hairline: "#253b52"
  night-hairline-strong: "#3f6280"
  night-ink: "#e8f1fa"
  night-ink-muted: "#9db3c7"
  night-azure-signal: "#4fa8ea"
  night-panel-veil: "rgba(16, 26, 41, 0.97)"
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

The frame around that instrument is a light PowerShell metaphor: a terminal chrome bar on the homepage hero, `PS>` prefixes on section labels, `.\Start-Collaboration.ps1` as a contact heading. It is a costume, worn lightly and only where the site talks about its author. It never enters a tool page, where the data is the point.

The system's real signature is the **shared shell**: an identical sticky header, aurora backdrop, dismissible banner, footer, theme toggle, and back-to-top across 63 pages built by hand with no build step and no dependencies. Twenty-six unrelated utilities read as one product because that shell never varies. That consistency is not decoration - it is the load-bearing structure of the whole design.

**Key Characteristics:**
- Cool blue-frost neutrals; colour reserved almost entirely for status
- Dense, scannable, built for a visitor who arrived from search and needs one answer
- Full light/dark parity, both themes measured at WCAG AA
- Flat surfaces with hairline borders; elevation is rare and functional
- OS-native type stack, monospace only where the terminal metaphor speaks
- Zero dependencies, zero build, one shell across every page

## Colors

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
- **Fail Red** (`#c93636`) on **Fail Red Surface** (`#fdf2f2`): restricted, "no", dead feed.
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

**The Lift-On-Intent Rule.** Cards do not sit raised; they rise `translateY(-4px)` and switch their border to the accent on hover. Elevation is feedback, never decoration.

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
- **Header:** sticky, blurred, exactly four links (Home, Blog, Articles, Tools) with 16px inline SVG icons at `0.7` opacity, plus a LinkedIn link and theme toggle glued together in `.header-actions`. Current page carries `aria-current="page"` and goes full-weight Ink Navy.
- **Mobile:** below 48rem the links collapse into an absolutely-positioned panel behind a hamburger, closing on Escape, outside click, resize, and link activation.
- **Section nav** (homepage only): a sticky secondary row offset by `--header-h`, with scroll-spy setting `aria-current="location"`. One scrollable row at mobile, never a wrapped block.

### Signature Component: the shared shell
Every page opens with a dismissible marquee banner (versioned in `localStorage`, hover-paused, fully disabled under reduced motion), then the sticky header, then `main`, then a four-column footer, plus a floating back-to-top. A pre-paint inline script sets `data-theme` and the banner state before first paint so neither ever flashes. **This shell is the product's identity.** Changing it on one page is a defect, not a variation.

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
- **Don't** introduce a build step, a framework, a webfont, or an npm dependency. Each page is one self-contained HTML file with inline `<style>` and `<script>`, and that portability is the point. (Leaflet on `/azure-regions/` is the single deliberate exception.)
- **Don't** let one page's shell diverge from the other 62. A change to the header, footer, banner or theme toggle is a sitewide codemod plus a `pageShell()` edit plus a rebuild - or it is not done.
- **Don't** animate layout properties. `width`, `height`, `padding` and `margin` transitions cause reflow; use `transform` and `opacity`.
- **Don't** add a second accent. The site has one interactive colour, and cyan and violet exist only inside a single decorative gradient.
- **Don't** trust a contrast reading without compositing alpha tints and gradient backgrounds first.
