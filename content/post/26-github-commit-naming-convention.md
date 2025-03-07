+++
author = "Benoit G"
title = "GitHub commit naming convention"
date = "2025-02-26"
description = ""
toc = true
tags = ["GitHub", "Productivity"]
categories = ["GitHub"]
featureImage = "/images/github-color.svg" # Sets featured image on blog post.
#featureImageAlt = "" # Alternative text for featured image.
#featureImageCap = "" # Caption (optional).
thumbnail = "/images/github-color.svg" # Sets thumbnail image appearing inside card on homepage.
shareImage = "" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you are looking to create your own GitHub project or contribute to an existing one, understanding commit naming conventions is essential.
<!--more-->

# Commit naming convention
---

## 1. Use a Consistent Format

Maintaining a consistent commit message format improves readability and collaboration.

Standard Format:

```Bash
<type>(<scope>): <description>
<type>: <description>
```

✅ Example:

```Bash
feat(auth): add JWT authentication
fix(ui): resolve button alignment issue
```

## 2. Common Commit Types

| Type     | Description                                               |
|----------|-----------------------------------------------------------|
| feat     | Introduces a new feature                                  |
| fix      | Fixes a bug                                               |
| docs     | Updates documentation                                     |
| style    | Code style changes (whitespace, formatting, missing semicolons) |
| refactor | Code restructuring without changing behavior              |
| perf     | Improves performance                                      |
| test     | Adds or updates tests                                     |
| chore    | Maintenance tasks (e.g., package updates, build process changes) |
| ci       | CI/CD-related changes                                     |

## 3. Writing Clear Commit Messages

Use the imperative mood:

```Bash
✅ "fix(login): handle null password error"
❌ "fixed issue with null password"
```

Keep It Concise:

✅ Limit subject lines to 50 characters.

✅ Use present tense (e.g., "fix" instead of "fixed").

✅ Wrap the body at 72 characters per line if additional context is needed.

✅ Keep commits small and focused—avoid committing thousands of lines at once.

✅ Avoid committing large changes (e.g., 10,000 lines or 100 files) as they are difficult to review.

## 4. Writing Meaningful Commit Messages

✅ Good example:

```Bash
feat(api): add rate limiting to prevent abuse
```

Added an IP-based rate-limiting mechanism using Redis to
throttle requests and prevent abuse. This will help improve
API reliability under high traffic conditions.

Avoid Generic Commit Messages

❌ Bad Examples:

```Bash
update
fix bug
refactor stuff
```

✅ Better Alternatives:

```Bash
fix(auth): correct token expiration logic
chore(deps): update React to v18
```

## 5. Use Conventional Commits

If your project follows Semantic Versioning, use the [Conventional Commits](https://www.conventionalcommits.org/) helps automate versioning and changelogs.

```Bash
feat!: introduce breaking change to API
```

**The "!" indicates a breaking change.**

## 6. Optional: Add Emojis for Readability

Some teams use emojis to make commit logs visually appealing.

Example:

```Bash
✨ feat(auth): add OAuth login
🐛 fix(ui): resolve dropdown bug
📚 docs(readme): update installation steps
```

## 8. Summary

By following these commit message conventions, you ensure:

✅ Clear history

✅ Easier collaboration

✅ Better automation (e.g., changelog generation, release management)

Adopting a structured commit naming convention will make your codebase more maintainable and improve teamwork efficiency.
