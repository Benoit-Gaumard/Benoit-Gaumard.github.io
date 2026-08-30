+++
author = "Benoit G"
title = "GitHub Commit Naming Convention"
date = "2024-02-26"
description = "A practical commit message convention for GitHub projects, based on Conventional Commits: format, common types, and writing clear messages."
tags = ["GitHub", "Productivity"]
categories = ["GitHub"]
featureImage = "/articles/images/github-color.svg"
+++

If you are looking to create your own GitHub project or contribute to an existing one, understanding commit naming conventions is essential.

[[toc]]

## Use a consistent format

Maintaining a consistent commit message format improves readability and collaboration.

Standard format:

```bash
<type>(<scope>): <description>
<type>: <description>
```

Example:

```bash
feat(auth): add JWT authentication
fix(ui): resolve button alignment issue
```

## Common commit types

| Type | Description |
|---|---|
| `feat` | Introduces a new feature |
| `fix` | Fixes a bug |
| `docs` | Updates documentation |
| `style` | Code style changes (whitespace, formatting, missing semicolons) |
| `refactor` | Code restructuring without changing behavior |
| `perf` | Improves performance |
| `test` | Adds or updates tests |
| `chore` | Maintenance tasks (e.g., package updates, build process changes) |
| `ci` | CI/CD-related changes |

## Writing clear commit messages

Use the imperative mood:

```bash
fix(login): handle null password error   # good
fixed issue with null password           # avoid
```

Keep it concise:

- Limit subject lines to 50 characters.
- Use present tense (e.g., "fix" instead of "fixed").
- Wrap the body at 72 characters per line if additional context is needed.
- Keep commits small and focused - avoid committing thousands of lines at once.
- Avoid committing large changes (e.g., 10,000 lines or 100 files), as they are difficult to review.

## Writing meaningful commit messages

Good example:

```bash
feat(api): add rate limiting to prevent abuse
```

> Added an IP-based rate-limiting mechanism using Redis to throttle requests and prevent abuse. This will help improve API reliability under high traffic conditions.

Avoid generic commit messages:

```bash
update
fix bug
refactor stuff
```

Better alternatives:

```bash
fix(auth): correct token expiration logic
chore(deps): update React to v18
```

## Use Conventional Commits

If your project follows Semantic Versioning, [Conventional Commits](https://www.conventionalcommits.org/) helps automate versioning and changelogs:

```bash
feat!: introduce breaking change to API
```

The `!` indicates a breaking change.

## Optional: add emojis for readability

Some teams use emojis to make commit logs visually appealing, for example:

```bash
✨ feat(auth): add OAuth login
🐛 fix(ui): resolve dropdown bug
📚 docs(readme): update installation steps
```

## Summary

By following these commit message conventions, you ensure a clear history, easier collaboration, and better automation (changelog generation, release management). Adopting a structured commit naming convention makes your codebase more maintainable and improves teamwork efficiency.
