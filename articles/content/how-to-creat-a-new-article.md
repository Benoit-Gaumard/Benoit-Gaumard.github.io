+++
author = "Benoit G"
title = "Contributing an Article to This Site"
date = "2026-08-19"
description = "Everything you can use when writing a new article for /articles: frontmatter fields, headings, lists, callouts, code blocks, tables, images, and links."
tags = ["Guide", "Meta"]
categories = ["Documentation"]
featureImage = "/articles/images/how-to-create-a-new-article.svg"
featured = false
related = ["how-to-embed-a-github-script-in-an-article", "github-contribution-workflow"]
+++

Every article lives as a single Markdown file in `articles/content/` and is compiled into a static HTML page by `articles/build-articles.mjs` when the site is built. This page is itself a working example of every supported component.

This is contributor documentation for **this site's custom generator**, not a generic Hugo tutorial. [View this article's Markdown source](https://github.com/Benoit-Gaumard/Benoit-Gaumard.github.io/blob/main/articles/content/how-to-creat-a-new-article.md).

[[toc]]

## 1. Start with frontmatter

Every article file starts with a `+++`-fenced TOML frontmatter block:

```toml
+++
author = "Benoit G"
title = "Your article title"
date = "2026-10-07"
description = "The specific problem this article helps the reader solve."
tags = ["Guide"]
categories = ["Documentation"]
draft = true
+++
```

Replace the sample date with the real publication date and remove `draft = true` only when ready. Add the Markdown body after the closing `+++`; images are optional.

| Field | Required | Notes |
|---|---|---|
| `author` | No | Defaults to "Benoit Gaumard" |
| `title` | Yes | Shown as the page `<h1>` and in the article list |
| `date` | Yes | `YYYY-MM-DD`, used for sorting and the RSS `pubDate` |
| `description` | Yes | Used in the article list, meta description, and RSS |
| `summary` | No | A shorter reader-facing benefit in the article header; description remains in metadata/catalogue |
| `tags` | No | Free-form list, shown as pills at the top of the article |
| `categories` | Yes | Powers category filters on `/articles/` |
| `featureImage` | No | Catalogue thumbnail and secondary illustration after the article |
| `featured` | No | Makes the article eligible for the limited featured selection |
| `draft` | No | `true` excludes the article entirely from the build |
| `related` | No | Array of article slugs for specific follow-up reading |
| `leadSections` | No | Array of exact second-level heading titles to move to the decision entrypoint, without duplicating IDs |
| `collapsible` | No | Array of exact heading titles to show as expandable reference sections; links still reveal them |

## 2. Headings and the table of contents

Use `##`, `###`, and `#### ` for section headings - don't use a single `#`, since the page title already renders as the `<h1>`. The generator builds a desktop sidebar/mobile expandable table of contents automatically. Existing `[[toc]]` markers remain supported but do not duplicate it inside the prose.

**Markdown source:**

```markdown
## A useful heading
A short paragraph describing the result.
```

**Rendered result:** a linked second-level heading followed by a paragraph. Source examples and their explanations stack vertically on mobile.

## 3. Lists

Bullet list:

- Local development happens with `node articles/build-articles.mjs`
- Every `.md` file becomes `articles/<slug>/index.html`
- `draft = true` skips a file entirely

Numbered list:

1. Write the Markdown file in `articles/content/`
2. Run the build script
3. Commit the generated output alongside the source

## 4. A horizontal rule

Use three dashes on their own line:

---

## 5. Callouts

:::note
Use a **note** for a helpful aside that isn't critical to follow along.
:::

:::info
Use **info** for background context or links to further reading.
:::

:::warning
Use **warning** for anything that could break a deployment or leak a credential if ignored.
:::

## 6. Code blocks

Fenced code blocks render with a language label and a copy button:

```powershell
node articles/build-articles.mjs
Get-ChildItem articles/*/index.html
```

```bash
node articles/build-articles.mjs
```

## 7. Tables

Tables can use the available width on desktop. On a phone, each row becomes a labelled group of fields. Keep column labels meaningful; put multi-line commands in fenced code blocks, not table cells.

| Component | Markdown syntax |
|---|---|
| Heading | `## Heading` |
| Table of contents | `[[toc]]` |
| Callout | `:::note` ... `:::` |
| Code block | ` ```lang ` ... ` ``` ` |
| Image | `![alt](src)` |
| Link | `[text](url)` |

## 8. Images

Use descriptive alt text and an optional caption: `![Flow description](path "Caption and source")`. Generated images have an original-file link and keyboard-accessible enlargement. A diagram still needs a text explanation of its important flow; zoom is not a substitute for that explanation.

A local image, served from this same `/articles/images/` folder:

![How to create a new article illustration](/articles/images/how-to-create-a-new-article.svg)

A remote image also works - the build script doesn't care where it's hosted:

![Azure logo](https://learn.microsoft.com/favicon.ico "Loaded from a remote URL")

## 9. Links

Internal link to another article: [What Is an Azure Landing Zone?](/articles/what-is-an-azure-landing-zone/)

External link, which automatically opens in a new tab: [Hugo documentation](https://gohugo.io/documentation/)

---

## Before publication

- State the intended reader, outcome, prerequisites and execution context before commands.
- Put destructive-operation warnings before copy controls; include a preview and expected result.
- Use meaningful internal/external link text, not "click here"; check all local assets.
- Keep titles unique within an article; check the generated table of contents and narrow-screen layout.
- Label recorded technical validation separately from publication date; say **not recorded** when no test evidence exists.
- Run `node articles/build-articles.mjs` and the article tests; review generated files alongside Markdown.
- Inspect clipboard denial, image keyboard close and any embedded interaction without requesting live ads.
