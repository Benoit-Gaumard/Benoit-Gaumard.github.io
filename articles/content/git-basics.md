+++
author = "Benoit G"
title = "Git Basics"
date = "2024-02-28"
description = "The fundamental Git commands every beginner should know: configuration, cloning, branching, committing, and logs."
tags = ["Git", "Productivity"]
categories = ["Git"]
featureImage = "/articles/images/git.svg"
featured = true
+++

Git is an essential tool for version control and collaboration in software development. This guide covers the fundamental Git commands that every beginner should know. From configuring your user information to managing branches and viewing logs, you'll learn the basics to get started with Git effectively.

[[toc]]

## Current config

```bash
git config --list
```

## Configure user and email

```bash
git config --global user.name "Your Name"
git config --global user.email "email@email.com"
```

## Clone a repo

```bash
git clone https://github.com/Benoit-Gaumard/ProjectName
```

## Get the current branch status

```bash
git status
```

## Stage a folder

```bash
git add .
```

## Create a commit (local)

```bash
git commit -m "feat: bga first commit"
```

## Push modifications to the remote branch

```bash
git push
```

## Get the last version of the repo from the remote branch

```bash
git pull
```

## Change branch

```bash
git checkout mybranch
```

## List local branches

```bash
git branch
```

## List remote branches

```bash
git branch -r
```

## List local and remote branches

```bash
git branch -a
```

## Delete a branch (local)

```bash
git branch -d my-branch-name
git branch -D my-branch-name
```

## Display repo config

```bash
git config --global --list
```

## Logs

```bash
git log -v
git log -p
```

## Create a branch (local)

```bash
git branch my-new-branch
git checkout -b feat-azure-functions
```

## Delete branch (remote)

```bash
git push origin -d my-branch
```

## List modified files

```bash
git diff -r --no-commit-id --name-only
```

## Misc

```bash
gitk --all
```
