+++
author = "Benoit G"
title = "Display latest commits with Git Graph"
date = "2025-02-26"
description = ""
toc = false
draft = false
tags = ["Git", "Productivity"]
categories = ["Git"]
featureImage = "/images/git.svg" # Sets featured image on blog post.
#featureImageAlt = "" # Alternative text for featured image.
#featureImageCap = "" # Caption (optional).
thumbnail = "/images/git.svg" # Sets thumbnail image appearing inside card on homepage.
shareImage = "" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

A stylish way to showcase the latest commits from a repository.
<!--more-->

## Display latest commits with git graph
---

```Bash
git log --graph --oneline --all --decorate --topo-order --pretty=format:'%C(cyan)%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(magenta)<%an>%Creset' --abbrev-commit --date=relative -n 20
```