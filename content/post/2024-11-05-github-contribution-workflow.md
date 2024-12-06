+++
author = "Benoit G"
title = "GitHub contribution workflow"
date = "2024-11-05"
description = "Discover the benefits of integrating Draw.io with VS Code for seamless diagram creation."
toc = true
tags = [
    "GitHub", "productivity", "tools", "diagrams"
]
categories = ["GitHub"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/githubtest.png" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/githubtest.png" width="50%" height="50%">

## Scenarios
---

You can contribute on a GitHub project by making contributions on various topics:

- Report a bug
- Submit a fix
- Propose new features
- Become a maintainer
- ...

## Main principles
---

- The main branch is locked, no direct commit possible.
- Each developer work in their own branch from main
- Developer do a pull request
- Once PR is validated, the code is merged
- A release is created

Here is the main contribution workflow:

<img src="/images/github-workflow.drawio.png" width="50%" height="50%">

## Steps for contribution
---

### 0. Prerequisites

- You must have Git installed on your computer: Git - Downloads (git-scm.com)
- A code editor like Visual Studio Code: Visual Studio Code - Code Editing. Redefined

### 1. Pull the latest changes from upstream into your local repository

To start working on your contribution, you need first to retrieve the project on your local repository.

To do so, use this command  :

```Bash
git clone https://github.com/Benoit-Gaumard/ProjectName
```

{{% notice note "Note " %}}
Replace "ProjectName" by the actual project you want to contribute to.
{{% /notice %}}

Before you start making any changes to your local files, it's a good practice to first synchronize your local repository with the project repository.

Use the following command to "pull" any changes from the "master" branch of the "upstream" into your local repository.

```Bash
git pull upstream master
```

{{% notice note "Note " %}}
If the project repository uses "main" instead of "master" for its default branch, then you would use git pull upstream main instead.
{{% /notice %}}

### 2. Create a new branch

Rather than making changes to the project's "master" branch, it's a good practice to instead create your own branch. This creates an environment for your work that is isolated from the master branch.

Use this command to create a new branch and then immediately switch to it. The name of the branch should briefly describe what you are working on, and should not contain any spaces.

Bashgit checkout -b my_new_feature

For example, I used git checkout -b doc-fixes because I was making some small fixes to the documentation.

To show your local branches, use this command :

Bashgit branch

You should see your new branch as well as "master", and your new branch should have an asterisk next to it to indicate that it's "checked out" (meaning that you're working in it).

### 3. Make changes in your local repository​
4.
Use a text editor or IDE like Microsoft VS Code to make the changes you planned to the files in your local repository. Because you checked out a branch in the previous step, any edits you make will only affect that branch.

Download VS Code here: Visual Studio Code

### 4. Commit your changes​

After you make a set of changes, use the following command to stage your changes.

Bashgit branch

The description of your commit must be clear, explicit and understandable to anyone, example :

Bashgit commit -m "fix: typos in set_config docstring"


{{% notice note "Note " %}}
This commit message might be included in a changelog.

Commit messages must be standardized: Conventional Commits

    - feat: my new feature description
    - release: my new realease description
    - hotfix: my hotfix description
    - fix: my fix description
{{% /notice %}}

If you are making multiple sets of changes, it's a good practice to make a commit after each set.

### 5. Push changes to your branch​
When you are done making all of your changes, upload these changes to your branch using :

Bashgit push origin my_new_feature

This command "pushes" your changes to the "my_new_feature" branch of the "origin" (which is your fork on GitHub).

### 6. Create a pull request​

A GIT pull request occurs when a developer asks for changes committed to a specific branch to be considered for inclusion in an other branch of the repository.

Go to your Github project web page in the Pull request menu and click on New pull request.

Once it's done, click on Create pull request.

If there is no conflicts between your fork and the main branch, your pull request will be created and contributors will be notify.
The contributors will then analyze your fork and choose to merge your code or not.

You should then add some colleagues working on the repository as reviewers and yourself as an assignee, reviewers will be notified by email automatically.

As a best practice, you should let your collegues know your pull request creation (through a Microsoft Teams message, or vocally), as emails from github are very frequently ignored.

### 7. Code Review​

Before merging, the code should be reviewed by peers, code review involves one or more team members checking another teammate's work.

<img src="/images/code-review.png" width="50%" height="50%">


### 8. Merge to the main branch​

Congratulations! Your code has been reviewed and merged into the main branch. It can be reused by someone to make a new contribution.

## Golden rules
---

- 1 - Commit each day
- 2 - Adopt a naming convention for your commits (eg. feat: for a new feature, fix: for a bug fix)
- 3 - Enhance security in your code with the principle of least privilege