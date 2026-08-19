+++
author = "Benoit G"
title = "Display Latest Commits with Git Graph"
date = "2025-02-26"
description = "A stylish one-liner to showcase the latest commits from a repository directly in the terminal."
tags = ["Git", "Productivity"]
categories = ["Git"]
featureImage = "/articles/images/git.svg"
+++

A stylish way to showcase the latest commits from a repository:

```bash
git log --graph --oneline --all --decorate --topo-order --pretty=format:'%C(cyan)%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(magenta)<%an>%Creset' --abbrev-commit --date=relative -n 20
```
