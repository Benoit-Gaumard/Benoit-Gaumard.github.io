# Prompt library

Each `.md` file in this folder is one prompt on https://benoit-gaumard.io/prompts/.

## Add a prompt

1. Create a file named in kebab-case, for example `azure-landing-zone-review.md`. The file name becomes the prompt id and its link: `/prompts/?prompt=azure-landing-zone-review`.
2. Start with a front matter block, then write the prompt:

```markdown
---
title: Azure landing zone review
description: One sentence shown on the card.
category: Azure
tags: [landing-zone, caf, governance]
models: Any LLM, GitHub Copilot
date: 2026-07-01
featured: false
---
You are an Azure architect. Review {{Landing zone design}} against ...
```

3. Commit and push. The deploy workflow rebuilds `prompts/prompts.json` automatically.

## Fields

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | Card and dialog title. |
| `category` | Yes | Becomes a filter chip. Reuse existing categories when possible. |
| `description` | No | Short summary shown on the card. |
| `tags` | No | `[a, b, c]` or `a, b, c`. Searchable. |
| `models` | No | Defaults to `Any LLM`. |
| `date` | No | `YYYY-MM-DD`. Used by the "Newest" sort. |
| `featured` | No | `true` pins the prompt at the top. |

## Blanks

Write blanks as `{{Label}}`. Each distinct label becomes a field on the page, and becomes a `${input:...}` variable when the prompt is downloaded as a GitHub Copilot `.prompt.md` file.

## Preview locally

```powershell
node prompts/build-prompts.mjs
python -m http.server 8765
# then open http://localhost:8765/prompts/
```
