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

The standalone site contains 89 pages: 30 primary tool/reference pages, 48 how-to articles, the bilingual homepage, catalogues, histories and service pages. The legacy Hugo blog is excluded from this scope. Success looks like a practitioner finding the answer on the page they landed on, without needing the rest of the site.

**The owner uses this site himself, daily, as a working tool.** That is a first-class purpose, not a side effect - it is why the tool pages are dense and utilitarian rather than presentational.

### Settled: the homepage is not a tools showcase

A 2026-08-29 design critique flagged that "the homepage of a tools hub previews zero tools" as its highest-value opportunity. **The owner considered and rejected it.** The homepage is the portfolio; `/tools/` is the hub and is correct as it stands. Do not re-raise this, and do not add tool previews, live widgets or featured-tool cards to the homepage without an explicit new request.

## Positioning

**The Azure data has traceable sources and scheduled collection.** `azure-regions`, `azure-policies` and `azure-policy-aliases` query Azure directly under a service principal. Regions use raw ARM locations metadata and root-level availability-zone mappings, supplemented by the official Microsoft Learn public-region reference for explicit zone support and access restrictions. Missing evidence stays unknown. Metadata collection and reference checks have separate dates. The workflow catalogue derives its 15 daily/weekly schedules from YAML; run success and published dataset freshness are separate indicators. The three Azure-authoritative pipelines also write weekly dated snapshots so catalogues can be diffed over time.

That is the claim a neighbouring "Azure cheat sheet" site cannot truthfully copy: these pages are not hand-maintained lists that quietly rot.

## Operating Context

- Visitors land deep, from search or a shared link, typically on one page and often on mobile mid-incident.
- Deployment is GitHub Pages via `.github/workflows/deploy-hugo.yaml`, which builds the Hugo blog and copies every other top-level `<slug>/index.html` plus its data JSON into `public/`. It is triggered by push to `main` or by `workflow_run` when a data-refresh workflow completes.
- The three Azure-authoritative pipelines authenticate with the **scan-benoit-gaumard.io** Entra app. `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` / `AZURE_TENANT_ID` are GitHub **Environment** secrets on the `github-pages` environment, so any job using them needs `environment: github-pages`.
- Adding a tool page is a fixed pipeline: data script → page → refresh workflow → register the workflow in `deploy-hugo.yaml`'s trigger array and copy steps → card in `tools/index.html` → entry in `workflows/index.html`.

## Capabilities and Constraints

- **No runtime bundler or framework for tool pages.** Every `/<slug>/index.html` is a standalone checked-in file: inline styles/scripts, vanilla JS and zero npm dependencies. Optional authoring modules embed shared helpers rather than introducing a browser dependency. Leaflet and map tiles load on demand on `/azure-regions/`.
- **`/blog/` is Hugo** (theme `hugo-clarity`) and is deliberately excluded from sitewide codemods.
- **`/articles/` is hybrid:** the 48 article pages and privacy page are generated from `articles/build-articles.mjs` and must be regenerated after source/template edits; the article catalogue retains its hand-authored controller and generated static-link markers.
- **One shared page shell across 89 pages.** `site-ui.mjs` embeds the common CSS/JS inline and is idempotent. The article generator and `build-seo.mjs` use it; `node site-ui.mjs` updates existing standalone pages. Preserve external script loaders, page-specific handlers, local preferences and CRLF; never apply it to the legacy blog.
- **Canonical domain is `benoit-gaumard.io`** (`CNAME`). Legacy subdomains must not replace canonical links in the standalone navigation.
- Repo files are CRLF.
- Local browser checks block third-party advertising and use mocked workflow APIs. Passing them is not evidence of a deployment, cloud configuration change or live consent-manager availability.
- **Bilingual EN/FR is homepage-only today** (`index.html` / `index_fr.html`). Whether French parity should extend to tool pages and articles is **undecided**.

## Brand Commitments

- Name: **Benoit Gaumard**. Role: Azure Infrastructure and DevOps Consultant at Microsoft. Location: Paris and Île-de-France, France.
- The homepage uses a PowerShell / terminal framing (`PS>` prompts, `whoami`, `.\Start-Collaboration.ps1`). Tool pages use a plain, utilitarian voice.
- Existing assets: `favicon.svg`, `linkedin-photo.jpg`.

## Evidence on Hand

- **8 Microsoft certifications** - AZ-900, AI-900, SC-900, AZ-500, AZ-700, AZ-104, AZ-305, AB-731 - backed by a public Microsoft Learn transcript URL.
- **22 named large-account clients** supported at Microsoft (Thales, CEA, Orano, ENGIE, EDF, Schneider Electric, Orange Business, Sopra Steria, Stellantis, Forvia, Naval Group, Coopérative U, Colas, BNP Paribas, Société Générale, BRED, Groupe BPCE, AXA, CNP, Vinci, Amadeus, HB Antwerp).
- **Career timeline from 2005**: Bouygues Construction/Structis, BNP Paribas Arval, AXA, Crédit Agricole CIB, Microsoft since 2016.
- **Live refreshed datasets** under each tool slug, plus weekly dated snapshots in `<slug>/history/`.
- 30 working tools and 48 articles, plus histories, catalogues and service pages.

**Owner-approved homepage figures:** the owner explicitly requested `8x` Microsoft certifications, `20+` years of experience and `80+` projects, replacing the 2005 career-start summary card. Keep those static figures, including the `+` on experience and projects, without a counting animation. The detailed career timeline retains its dates.

**Absences future work must not fill by invention:** there are **no** testimonials, case studies, named project outcomes, or quantified client results beyond the owner-provided aggregate project count - do not fabricate them. New case studies require publishable facts from the owner.

## Product Principles

1. **Freshness is the product.** A tool showing stale Azure data is worse than no tool. Automated refresh from an authoritative source is the core promise; anything that weakens it weakens the whole site.
2. **Every page stands alone.** Visitors land deep, not on the homepage. A tool page must be complete, self-explanatory and independently usable, with no assumed prior navigation.
3. **Standalone delivery, zero runtime framework dependencies.** Portability and a decade-long maintenance horizon outrank authoring convenience. Reusable authoring helpers must produce complete inline HTML, not introduce a required toolchain for visitors.
4. **Credibility is shown, not claimed.** Prefer verifiable artifacts - the transcript link, live data, a working tool - over adjectives and round numbers.
5. **The shared shell is a feature.** One consistent header, footer, theme and banner across 89 pages makes the unrelated utilities read as a single product. Divergence is a defect, not personalisation.

## Accessibility & Inclusion

No formal standard has been declared by the owner. In practice, **WCAG 2.1 AA is the working floor**: the 2026-08-29 audit brought light-mode text contrast up to AA (`--cp-warning`, `--cp-success`, `--cp-cyan`), and dark mode already met AA across every sampled pair. Both themes must continue to meet AA.

The remediation uses native controls/disclosures, associated field errors, explicit loading/error states, meaningful status announcements, 44px primary touch targets, progressive technical details and local rather than document-wide overflow. The completed checks are regression evidence, not a formal accessibility certification.

## Out of scope

The Hugo blog under `blog/` is an external blog the owner intends to delete. It is **out of scope permanently** (decided 2026-08-29): not audited, not critiqued, not counted in page totals, and not to be raised as a gap. The product scope is the 89 standalone pages.
