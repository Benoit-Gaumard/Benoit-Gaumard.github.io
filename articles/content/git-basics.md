+++
author = "Benoit G"
title = "Git Basics: A Task-Based Command Cheat Sheet"
date = "2024-02-28"
description = "Find Git commands by task: setup, cloning, the daily change cycle, synchronisation, branches and diagnosis. Each example explains its effect."
tags = ["Git", "Productivity"]
categories = ["Git"]
featureImage = "/articles/images/git.svg"
featured = true
related = ["github-contribution-workflow", "display-latest-commits-with-git-graph"]
+++

Use this as a reference, not a script to run from top to bottom. Replace example names and paths. Commands operate in the current repository unless `--global` is shown. Review `git status` before commands that change files.

## Configure

### Inspect effective configuration

Shows values and where they came from. Avoid sharing output that includes private URLs or credentials.

```bash
git config --list --show-origin
```

### Set author identity

These global settings affect future commits in all repositories unless overridden locally. Use your intended public or GitHub no-reply email.

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Retrieve a repository

### Clone and enter

Creates a new local directory and an `origin` remote; replace the URL with your project.

```bash
git clone https://github.com/OWNER/REPOSITORY.git
cd REPOSITORY
git remote -v
```

## Daily change cycle

### 1. Inspect the working tree

Shows the current branch, staged files and unstaged changes. It changes nothing.

```bash
git status --short --branch
git diff
```

### 2. Stage only intended files

Review the staged diff before committing. Avoid `git add .` when unrelated changes or secrets may be present.

```bash
git add README.md
git diff --cached
```

### 3. Commit locally

Creates a commit from the index, not every modified file. This does not publish anything.

```bash
git commit -m "docs: clarify setup instructions"
```

### 4. Publish your branch

Uploads local commits and sets the tracking branch. Confirm `origin` is your intended writable repository.

```bash
git push -u origin my-feature
```

## Synchronise

### Inspect before integrating

Fetch updates remote-tracking references without merging into your working branch.

```bash
git fetch origin
git log --oneline HEAD..origin/main
```

### Fast-forward your local branch

Use on the intended branch with a clean working tree. This refuses divergent history rather than creating an unexpected merge. Replace `main` if the project uses another base.

```bash
git switch main
git pull --ff-only origin main
```

## Branches

### List branches

The asterisk identifies the current branch; `-a` includes remote-tracking references.

```bash
git branch
git branch -r
git branch -a
```

### Create and switch

Starts from the current commit. `git switch -c` requires a Git version supporting `switch`; older Git can use `git checkout -b`.

```bash
git switch -c my-feature
```

### Switch to an existing branch

Save or commit intended work first; Git may refuse a switch that would overwrite changes.

```bash
git switch my-feature
```

### Delete a merged local branch

Run from a different branch after confirming the work is merged. `-d` refuses some unmerged deletions; do not replace it with `-D` merely to silence that safeguard.

```bash
git branch -d my-feature
```

### Preview remote branch deletion

Remote deletion affects collaborators. This is a dry run; agree on deletion and verify the remote before deliberately removing `--dry-run`.

```bash
git push --dry-run origin --delete my-feature
```

## Diagnose

### Read history and patches

Both commands are read-only. The first gives a graph, the second the latest commit's patch.

```bash
git --no-pager log --graph --oneline --decorate -n 20
git --no-pager log -p -n 1
```

### List changed files

The first lists unstaged changes; the second lists staged changes.

```bash
git diff --name-only
git diff --cached --name-only
```

### Open the graphical history viewer

Optional desktop tool; it requires a working `gitk` installation and GUI session.

```bash
gitk --all
```
