+++
author = "Benoit G"
title = "GitHub Branch Naming Convention"
date = "2024-02-26"
description = "A practical branch naming convention for GitHub projects: standard format, common prefixes, best practices, and special branches."
tags = ["GitHub", "Productivity"]
categories = ["GitHub"]
featureImage = "/articles/images/github-color.svg"
+++

If you're looking to create your own GitHub project or contribute to an existing one, understanding branch naming conventions is crucial. This guide will help you navigate and implement effective branch naming practices.

[[toc]]

## Standard branch naming format

A commonly used branch naming convention follows this structure:

```bash
<category>/<issue-number>-<short-description>
```

Example:

```bash
feat/123-add-login
fix/456-bug-navbar
hotfix/789-fix-crash
```

## Common branch prefixes

| Prefix | Purpose |
|---|---|
| `feat/` | New feature development |
| `fix/` | Bug fixes |
| `hotfix/` | Critical production fixes |
| `chore/` | Maintenance tasks (e.g., updating dependencies) |
| `refactor/` | Code improvements without changing functionality |
| `test/` | Adding or updating tests |
| `docs/` | Documentation updates |
| `release/` | Preparing for a new release |
| `ci/` | Changes related to CI/CD pipelines |

Example:

```bash
feat/432-add-dark-mode
fix/567-login-error
docs/update-readme
release/1.2.0
```

## Best practices for naming branches

- Use lowercase letters and hyphens (`-`) for better readability.
- Include an issue/ticket number if using a tracker (e.g., Jira, GitHub Issues).
- Keep branch names short yet descriptive.
- Use verbs in active voice (e.g., `add-login`, `fix-navbar`).

Avoid generic names:

```bash
bugfix
feature1
new-update
```

Better alternatives:

```bash
fix/404-button-click
feat/user-dashboard
```

## Special branches

| Branch name | Purpose |
|---|---|
| `main` | The stable, production-ready branch |
| `develop` | The main development branch |
| `release/x.y.z` | Used to prepare for releases |
| `hotfix/x.y.z` | Urgent fixes for production issues |

Recommended workflow:

```bash
main → develop → feature branches → release → main
```

Example workflow in action:

```bash
git checkout -b feat/101-user-authentication
git checkout -b fix/302-broken-signup-button
git checkout -b hotfix/1.2.3-security-patch
```

## Summary

- Use prefixes (`feat/`, `fix/`, `hotfix/`, etc.)
- Follow a clear pattern: `<type>/<issue-number>-<short-description>`
- Avoid generic names (`feature1`, `update`, `fixbug`)
- Use Git hooks to enforce naming conventions
