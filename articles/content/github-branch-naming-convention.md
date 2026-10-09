+++
author = "Benoit G"
title = "GitHub Branch Naming Convention"
date = "2024-02-26"
description = "A suggested team convention, not a GitHub requirement: readable branch names with a purpose, ticket identifier and short description."
tags = ["GitHub", "Productivity"]
categories = ["GitHub"]
featureImage = "/articles/images/github-color.svg"
related = ["github-commit-naming-convention", "github-contribution-workflow"]
+++

This is a **suggested team convention**, not a rule imposed by GitHub. Follow the repository's contribution guide first. A complete example is `feat/123-add-login`: `feat` states the purpose, `123` links the work item, and `add-login` describes the change.

[[toc]]

## Standard branch naming format

A commonly used branch naming convention follows this structure:

```text
<category>/<issue-number>-<short-description>
```

Example:

```bash
feat/123-add-login
fix/456-bug-navbar
hotfix/789-fix-crash
```

## Common branch prefixes

Start with `feat/`, `fix/` and `docs/`; use the remaining prefixes only if they help your team's review process. For example, `docs/321-update-setup` is as traceable as a feature branch.

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

These are long-lived/release workflow roles, not additional mandatory prefixes. Many teams use trunk-based development without `develop`; the repository's actual release model determines which branches exist.

| Branch name | Purpose |
|---|---|
| `main` | The stable, production-ready branch |
| `develop` | The main development branch |
| `release/x.y.z` | Used to prepare for releases |
| `hotfix/x.y.z` | Urgent fixes for production issues |

One possible Git Flow-style workflow (not a universal recommendation):

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
- If the team agrees to enforcement, document exceptions and implement repository checks

For actual Git syntax constraints, use `git check-ref-format --branch feat/123-add-login`. This validates the name, not your team's naming policy. Reference: [git-check-ref-format](https://git-scm.com/docs/git-check-ref-format).
