# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: Azure and cloud engineers, mid-task.** They arrive from a search result or a shared link, usually straight onto a single tool or article page, needing one specific answer - which Azure regions exist and where, what a policy alias resolves to, which IP ranges to allow, what a naming convention should look like. They are not browsing; they are unblocking themselves.

**Secondary: recruiters and prospective clients** evaluating Benoit Gaumard as an Azure consultant. They enter through the homepage (`index.html` / `index_fr.html`) and want to establish credibility quickly.

Both audiences matter, but the tools reference is the core of the product; the profile is the frame around it.

## Product Purpose

A personal site and Azure tooling hub at `benoit-gaumard.io`. It exists to (a) give cloud practitioners fast, trustworthy Azure reference data and small utilities, and (b) present Benoit Gaumard's professional profile.

It currently ships 28 tool and reference pages, 32 how-to articles, a Hugo blog, and a bilingual homepage. Success looks like a practitioner finding the answer on the page they landed on, without needing the rest of the site.

**The owner uses this site himself, daily, as a working tool.** That is a first-class purpose, not a side effect - it is why the tool pages are dense and utilitarian rather than presentational.

### Settled: the homepage is not a tools showcase

A 2026-08-29 design critique flagged that "the homepage of a tools hub previews zero tools" as its highest-value opportunity. **The owner considered and rejected it.** The homepage is the portfolio; `/tools/` is the hub and is correct as it stands. Do not re-raise this, and do not add tool previews, live widgets or featured-tool cards to the homepage without an explicit new request.

## Positioning

**The Azure data is authoritative and refreshes itself.** `azure-regions`, `azure-policies` and `azure-policy-aliases` query Azure directly through `Get-Az*` cmdlets under a service principal, rather than scraping Microsoft Learn or a third-party doc site. Fourteen GitHub Actions workflows refresh the datasets up to four times a day, and the three Azure-authoritative pipelines also write weekly dated snapshots so catalogs can be diffed over time.

That is the claim a neighbouring "Azure cheat sheet" site cannot truthfully copy: these pages are not hand-maintained lists that quietly rot.

## Operating Context

- Visitors land deep, from search or a shared link, typically on one page and often on mobile mid-incident.
- Deployment is GitHub Pages via `.github/workflows/deploy-hugo.yaml`, which builds the Hugo blog and copies every other top-level `<slug>/index.html` plus its data JSON into `public/`. It is triggered by push to `main` or by `workflow_run` when a data-refresh workflow completes.
- The three Azure-authoritative pipelines authenticate with the **scan-benoit-gaumard.io** Entra app. `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` are GitHub **Environment** secrets on the `github-pages` environment, so any job using them needs `environment: github-pages`.
- Adding a tool page is a fixed pipeline: data script → page → refresh workflow → register the workflow in `deploy-hugo.yaml`'s trigger array and copy steps → card in `tools/index.html` → entry in `workflows/index.html`.

## Capabilities and Constraints

- **No build step for tool pages.** Every `/<slug>/index.html` is a single self-contained file: inline `<style>`, inline `<script>`, vanilla JS, zero npm dependencies. The only exception is Leaflet.js from a CDN on `/azure-regions/`.
- **`/blog/` is Hugo** (theme `hugo-clarity`) and is deliberately excluded from sitewide codemods.
- **`/articles/` is hybrid:** the 32 article pages are generated from `articles/build-articles.mjs`'s `pageShell()` template and must be regenerated after template edits; `articles/index.html` is hand-authored.
- **One shared page shell across 65 pages** (33 hand-authored + 32 generated). Sitewide changes are done as a throwaway codemod over the 33, plus an edit to `pageShell()` and a rebuild.
- **Canonical domain is `benoit-gaumard.io`** (`CNAME`). `tools.benoit-gaumard.io` and `blog.benoit-gaumard.io` are **legacy domains**; all links must target `/tools/` and `/blog/` on the canonical domain. *Open item: the homepage Tools section and several skill-card icon `src`s still point at the legacy host.*
- Repo files are CRLF.
- No `gh` CLI or token in the local dev environment: deploys are verified by polling the production URL with cache-busting, not the Actions API.
- **Bilingual EN/FR is homepage-only today** (`index.html` / `index_fr.html`). Whether French parity should extend to tool pages and articles is **undecided**.

## Brand Commitments

- Name: **Benoit Gaumard**. Role: Azure Infra & DevOps Consultant at Microsoft. Location: Paris and Île-de-France, France.
- The homepage uses a PowerShell / terminal framing (`PS>` prompts, `whoami`, `.\Start-Collaboration.ps1`). Tool pages use a plain, utilitarian voice.
- Existing assets: `favicon.svg`, `linkedin-photo.jpg`.

## Evidence on Hand

- **7 Microsoft certifications** - AZ-900, AI-900, SC-900, AZ-500, AZ-700, AZ-104, AZ-305 - backed by a public Microsoft Learn transcript URL.
- **22 named large-account clients** supported at Microsoft (Thales, CEA, Orano, ENGIE, EDF, Schneider Electric, Orange Business, Sopra Steria, Stellantis, Forvia, Naval Group, Coopérative U, Colas, BNP Paribas, Société Générale, BRED, Groupe BPCE, AXA, CNP, Vinci, Amadeus, HB Antwerp).
- **Career timeline from 2005**: Bouygues Construction/Structis, BNP Paribas Arval, AXA, Crédit Agricole CIB, Microsoft since 2016.
- **Live refreshed datasets** under each tool slug, plus weekly dated snapshots in `<slug>/history/`.
- 28 working tools, 32 articles, a Hugo blog.

**Absences future work must not fill by invention:** the homepage "20+ years" and "80+ projects" figures are self-reported with no public artifact behind the 80+ number. There are **no** testimonials, case studies, named project outcomes, or quantified client results anywhere in the repo - do not fabricate them. There is no `og:image` asset.

## Product Principles

1. **Freshness is the product.** A tool showing stale Azure data is worse than no tool. Automated refresh from an authoritative source is the core promise; anything that weakens it weakens the whole site.
2. **Every page stands alone.** Visitors land deep, not on the homepage. A tool page must be complete, self-explanatory and independently usable, with no assumed prior navigation.
3. **Zero build, zero dependencies.** Portability and a decade-long maintenance horizon outrank authoring convenience. New capability should not introduce a toolchain.
4. **Credibility is shown, not claimed.** Prefer verifiable artifacts - the transcript link, live data, a working tool - over adjectives and round numbers.
5. **The shared shell is a feature.** One consistent header, footer, theme and banner across 65 pages is what makes 28 unrelated utilities read as a single product. Divergence is a defect, not personalisation.

## Accessibility & Inclusion

No formal standard has been declared by the owner. In practice, **WCAG 2.1 AA is the working floor**: the 2026-08-29 audit brought light-mode text contrast up to AA (`--cp-warning`, `--cp-success`, `--cp-cyan`), and dark mode already met AA across every sampled pair. Both themes must continue to meet AA.

Known open accessibility gaps recorded at that audit: heading hierarchy (`h1` → fifteen `h3`, sole `h2` last), unnamed `<section>` landmarks, no `<noscript>` fallback for `.reveal`, no print stylesheet, and interactive targets below 44 px.

## Out of scope

The Hugo blog under `blog/` is an external blog the owner intends to delete. It is **out of scope permanently** (decided 2026-08-29): not audited, not critiqued, not counted in page totals, and not to be raised as a gap. The product is the 65 standalone pages at the repo root.
