+++
author = "Benoit G"
title = "GitHub Commit Naming Convention"
date = "2024-02-26"
description = "A practical commit message convention for GitHub projects, based on Conventional Commits: format, common types, and writing clear messages."
tags = ["GitHub", "Productivity"]
categories = ["GitHub"]
featureImage = "/articles/images/github-color.svg"
related = ["github-contribution-workflow", "github-branch-naming-convention"]
+++

Use the repository's contribution rules first. A useful Conventional Commits example is `fix(auth): reject expired tokens`: `fix` is the change type, optional `(auth)` is the scope, and the text describes the behaviour changed. These are commit messages, not shell commands.

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

## Write a clear and meaningful message

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

Add the reason in a body when the subject cannot explain it. For example:

```bash
feat(api): add rate limiting to prevent abuse
```

The body can explain the behaviour and trade-off, rather than repeat a list of modified files.

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

Release tools can use [Conventional Commits](https://www.conventionalcommits.org/) to derive changelog sections and version changes when the project configures that automation. Messages alone do not publish a release. For a breaking API change, describe the migration:

```bash
feat(api)!: require an explicit region

BREAKING CHANGE: requests must include region; implicit default selection was removed.
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

Copy this message template and fill only the parts your change needs:

```text
type(scope): describe the behaviour changed

Explain why the change is needed and any important trade-off.

Refs: #123
```

The next step is the [contribution and review workflow](/articles/github-contribution-workflow/).
