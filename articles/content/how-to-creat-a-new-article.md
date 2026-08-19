+++
author = "Benoit G"
title = "How to Create a New Article"
date = "2026-08-19"
description = "Everything you can use when writing a new article for /articles: frontmatter fields, headings, lists, callouts, code blocks, tables, images, and links."
tags = ["Guide", "Meta"]
categories = ["Documentation"]
featureImage = "/articles/images/how-to-create-a-new-article.svg"
featured = false
+++

Every article lives as a single Markdown file in `articles/content/` and is compiled into a static HTML page by `articles/build-articles.mjs` when the site is built. This page is itself a working example of every supported component.

[[toc]]

## 1. Start with frontmatter

Every article file starts with a `+++`-fenced TOML frontmatter block:

```toml
+++
author = "Benoit G"
title = "Set Up your first Terraform environment on Windows"
date = "2024-09-11"
description = "Learn how to optimize and reduce costs in Azure with practical tips and strategies."
tags = ["Terraform"]
categories = ["Azure", "Tools"]
featureImage = "/images/azure-cost-optimization.png"
featured = true
+++
```

| Field | Required | Notes |
|---|---|---|
| `author` | No | Defaults to "Benoit Gaumard" |
| `title` | Yes | Shown as the page `<h1>` and in the article list |
| `date` | Yes | `YYYY-MM-DD`, used for sorting and the RSS `pubDate` |
| `description` | Yes | Used in the article list, meta description, and RSS |
| `tags` | No | Free-form list, shown as pills at the top of the article |
| `categories` | Yes | Powers the **Categories** sidebar and its counts on `/articles/` |
| `featureImage` | No | Shown above the article and as the card thumbnail |
| `featured` | No | `true` adds the article to the **Featured Posts** sidebar |
| `draft` | No | `true` excludes the article entirely from the build |

## 2. Headings and the table of contents

Use `##`, `###`, and `#### ` for section headings — don't use a single `#`, since the page title already renders as the `<h1>`. Put `[[toc]]` anywhere in the body (it's used at the top of this very page) and it's replaced with a table of contents built from every `##`/`###`/`####` heading.

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

| Component | Markdown syntax |
|---|---|
| Heading | `## Heading` |
| Table of contents | `[[toc]]` |
| Callout | `:::note` ... `:::` |
| Code block | ` ```lang ` ... ` ``` ` |
| Image | `![alt](src)` |
| Link | `[text](url)` |

## 8. Images

A local image, served from this same `/articles/images/` folder:

![How to create a new article illustration](/articles/images/how-to-create-a-new-article.svg)

A remote image also works — the build script doesn't care where it's hosted:

![Azure logo](https://learn.microsoft.com/favicon.ico "Loaded from a remote URL")

## 9. Links

Internal link to another article: [What Is an Azure Landing Zone?](/articles/what-is-an-azure-landing-zone/)

External link, which automatically opens in a new tab: [Hugo documentation](https://gohugo.io/documentation/)

---

That's the whole system — copy this file, replace the frontmatter and the body, and drop it into `articles/content/` as your next post.
