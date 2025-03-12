+++
author = "Benoit G"
title = "Git basics"
date = "2025-02-28"
description = ""
toc = true
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

Git is an essential tool for version control and collaboration in software development. This guide covers the fundamental Git commands that every beginner should know. From configuring your user information to managing branches and viewing logs, you'll learn the basics to get started with Git effectively.
<!--more-->

Current Config
---

```Bash
git config --list
```

Configure user and email
---

```Bash
git config --global user.name "Your Name"
git config --global user.email "email@email.com"
```

Clone a repo
---

```Bash
git clone https://github.com/Benoit-Gaumard/ProjectName
```

Get the current branch
---

```Bash
git status
```

Add a folder
---

```Bash
git add .
```

Create a commit (Local)
---

```Bash
git commit -m "feat: bga first commit"
```

Push modifications to the remote branch
---

```Bash
git push
```

Get the last version of the repo from the remote branch
---

```Bash
git pull
```

Change branch
---

```Bash
git checkout mybranch
```

List local branches
---

```Bash
git branch
```

List remote branches
---

```Bash
git branch -r
```

List local and remote branches
---

```Bash
git branch -a
```

Delete a branch (Local)
---

```Bash
git branch -d my-branch-name
git branch -D my-branch-name
```

Configure repo
---

```Bash
git config –global user.name "Your Name"
git config –global user.email you@example.com
```

Display repo config
---

```Bash
git config --global --list
```

Logs
---

```Bash
git log -v
git log -p
```

Create a branch (local)
---

```Bash
git branch my-new-branch
git checkout -b feat-azure-functions
```

Delete branch (Local)
---

```Bash
git branch -d my-branch
```

Delete branch (Remote)
---

```Bash
git push origin -d my-branch
```

List modified files
---

```Bash
git diff -r --no-commit-id --name-only
```

Misc
---

```Bash
gitk --all
```