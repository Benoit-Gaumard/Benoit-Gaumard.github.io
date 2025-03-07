+++
author = "Benoit G"
title = "GitHub branch naming convention"
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

If you're looking to create your own GitHub project or contribute to an existing one, understanding branch naming conventions is crucial. This guide will help you navigate and implement effective branch naming practices.
<!--more-->

# Branch Naming Convention
---

## 1. Standard Branch Naming Format
A commonly used branch naming convention follows this structure:

```bash
<category>/<issue-number>-<short-description>
```

✅ Example:

```bash
feat/123-add-login
fix/456-bug-navbar
hotfix/789-fix-crash
```

## 2. Common Branch Prefixes

| Prefix   | Purpose                                      |
|----------|----------------------------------------------|
| feat/    | New feature development                      |
| fix/     | Bug fixes                                    |
| hotfix/  | Critical production fixes                    |
| chore/   | Maintenance tasks (e.g., updating dependencies) |
| refactor/| Code improvements without changing functionality |
| test/    | Adding or updating tests                     |
| docs/    | Documentation updates                        |
| release/ | Preparing for a new release                  |
| ci/      | Changes related to CI/CD pipelines           |

✅ Example:

```bash
feat/432-add-dark-mode
fix/567-login-error
docs/update-readme
release/1.2.0
```

## 3. Best Practices for Naming Branches

✅ Use lowercase letters and hyphens (-) for better readability.

✅ Include an issue/ticket number if using a tracker (e.g., JIRA, GitHub Issues).

✅ Keep branch names short yet descriptive.

✅ Use verbs in active voice (e.g., add-login, fix-navbar).

❌ Avoid Generic Names:

```bash
bugfix
feature1
new-update
```

✅ Better Alternatives:

```bash
fix/404-button-click
feat/user-dashboard
```

## 4. Special Branches

| Branch Name  | Purpose                           |
|--------------|-----------------------------------|
| main         | The stable production-ready branch|
| develop      | The main development branch       |
| release/x.y.z| Used to prepare for releases      |
| hotfix/x.y.z | Urgent fixes for production issues|

✅ Recommended Workflow:

```bash
main → develop → feature branches → release → main
```

✅ Example Workflow in Action:

```bash
git checkout -b feat/101-user-authentication
git checkout -b fix/302-broken-signup-button
git checkout -b hotfix/1.2.3-security-patch
```

## 5. Summary

✅ Use prefixes (feat/, fix/, hotfix/, etc.)

✅ Follow a clear pattern (<type>/<issue-number>-<short-description>)

✅ Avoid generic names (feature1, update, fixbug)

✅ Use Git hooks to enforce naming conventions