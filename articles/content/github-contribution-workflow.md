+++
author = "Benoit G"
title = "GitHub Contribution Workflow"
date = "2025-02-26"
description = "The end-to-end workflow for contributing to a GitHub project: fork, branch, commit, push, pull request, code review, and merge."
tags = ["GitHub", "Productivity"]
categories = ["GitHub"]
featureImage = "/articles/images/github-color.svg"
featured = true
+++

If you want to create your own or contribute to an existing GitHub project, you are on the right page.

[[toc]]

## Contribution scenarios

You can contribute to a GitHub project in several ways: reporting bugs, submitting fixes, proposing new features, or becoming a maintainer.

## Main principles

- The main branch is protected, preventing direct commits.
- Developers work in their own branches derived from the main branch.
- Developers submit pull requests for their changes.
- Once a pull request is approved, the code is merged.
- A release is then created.
- The new code is deployed via a deployment pipeline.

Here is the main contribution workflow:

![GitHub contribution workflow diagram](/articles/images/github-workflow.drawio.png)

## Steps for contribution

### 0. Prerequisites

- Ensure Git is installed on your machine: [Git downloads](https://git-scm.com/downloads)
- Have a code editor (IDE) ready, such as [Visual Studio Code](https://code.visualstudio.com/)

### 1. Pull the latest changes from upstream into your local repository

To start working on your contribution, you first need to retrieve the project in your local repository:

```bash
git clone https://github.com/Benoit-Gaumard/ProjectName
```

:::note
Replace "ProjectName" with the actual project you want to contribute to.
:::

Before you start making any changes to your local files, it's a good practice to first synchronize your local repository with the project repository:

```bash
# If the default branch is "main"
git pull upstream main
```

:::note
If the project repository uses a different default branch name than "main", substitute it accordingly.
:::

### 2. Create a new branch

Rather than making changes directly on the "main" branch, it's a good practice to create your own branch. This creates an environment for your work that is isolated from the main branch.

Use this command to create a new branch and immediately switch to it. The branch name should briefly describe what you are working on, and should not contain any spaces:

```bash
git checkout -b my_new_feature
```

For example, I used `git checkout -b doc-fixes` because I was making some small fixes to the documentation.

To show your local branches, use:

```bash
git branch
```

You should see your new branch as well as "main", with an asterisk next to the branch that's currently checked out.

### 3. Make changes in your local repository

Open a text editor or IDE such as Visual Studio Code to implement the changes you have planned. Since you checked out a branch in the previous step, any modifications you make will be confined to that branch.

### 4. Commit your changes

After you make a set of changes, stage them:

```bash
git add .
```

The description of your commit must be clear, explicit, and understandable to anyone, for example:

```bash
git commit -m "fix: typos in set_config docstring"
```

:::note
This commit message might be included in a changelog. Commit messages should follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat:`, `release:`, `hotfix:`, `fix:`.
:::

If you are making multiple sets of changes, it's a good practice to make a commit after each set.

### 5. Push changes to your branch

When you are done making all of your changes, upload them to your branch:

```bash
git push origin my_new_feature
```

This command pushes your changes to the `my_new_feature` branch of your fork on GitHub.

### 6. Create a pull request

A pull request is created when a developer asks for changes committed to a specific branch to be considered for inclusion in another branch of the repository.

Go to your GitHub project's web page, open the **Pull requests** menu, and click **New pull request**, then **Create pull request**.

If there are no conflicts between your fork and the main branch, your pull request will be created and contributors will be notified. They will then review your changes and choose to merge your code or not.

Add colleagues working on the repository as reviewers and yourself as an assignee — reviewers will be notified by email automatically. As a best practice, let your colleagues know about your pull request through a direct message, as GitHub emails are frequently ignored.

### 7. Code review

Before merging, the code should be reviewed by peers — code review involves one or more team members checking another teammate's work.

![Code review process](/articles/images/code-review.png)

### 8. Merge to the main branch

Congratulations! Your code has been successfully reviewed and merged into the main branch. It is now available for others to build upon.

## Golden rules

- Commit each day.
- Never commit directly to the main branch — always protect it.
- Adopt a naming convention for your branches (e.g., `feat/` for a new feature, `fix/` for a bug fix).
- Adopt a naming convention for your commits.
- Enhance security in your code with the principle of least privilege.
- Prefer recreating resources over patching them in place when using IaC.
