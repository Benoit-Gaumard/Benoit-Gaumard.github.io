+++
author = "Benoit G"
title = "Display Latest Commits with Git Graph"
date = "2025-02-26"
description = "A stylish one-liner to showcase the latest commits from a repository directly in the terminal."
tags = ["Git", "Productivity"]
categories = ["Git"]
featureImage = "/articles/images/git.svg"
related = ["git-basics", "github-contribution-workflow"]
+++

## Show the latest commits

Run inside an existing Git repository. This reads history; it does not change files or branches.

```bash
git log --graph --oneline --all --decorate --topo-order --pretty=format:'%C(cyan)%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(magenta)<%an>%Creset' --abbrev-commit --date=relative -n 20
```

## Read the output

Illustrative output, not repository evidence:

```text
* a1b2c3d - (HEAD -> main) Fix documentation (2 hours ago) <Example Author>
* e4f5a6b - Add first example (yesterday) <Example Author>
```

Each star is a commit; connecting lines show ancestry, not the order in which changes were deployed. `--all` includes all local refs, `--decorate` labels branch/tag pointers, `--topo-order` keeps topology readable, and `-n 20` limits the count. Colours are decorative; hashes, labels and messages carry the meaning.

## Optional shorter version and alias

```bash
git --no-pager log --graph --oneline --decorate -n 10
```

To save a **repository-local** alias (writes this repository's Git config):

```bash
git config alias.graph "log --graph --oneline --all --decorate -n 20"
git graph
```

Remove it with `git config --unset alias.graph`. Reference: [git-log](https://git-scm.com/docs/git-log).
