+++
author = "Benoit G"
title = "GitHub contribution workflow"
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

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

## Contribution scenarios
---

You can contribute to a GitHub project in several ways:

- Reporting bugs
- Submitting fixes
- Proposing new features
- Becoming a maintainer
- ...

## Main principles
---

- The main branch is protected, preventing direct commits.
- Developers work in their own branches derived from the main branch.
- Developers submit pull requests for their changes.
- Once a pull request is approved, the code is merged.
- A release is then created.
- The new code is deployed via a deployment pipeline.

Here is the main contribution workflow:

<img src="/images/github-workflow.drawio.png" width="50%" height="50%">

## Steps for contribution
---

### 0. Prerequisites

- Ensure Git is installed on your machine: [Git Downloads](https://git-scm.com/downloads)
- Have a code editor (IDE) ready, such as [Visual Studio Code](https://code.visualstudio.com/)

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
# If the default branch is "main"
git pull upstream main
```

{{% notice note "Note " %}}
If the project repository uses "main" instead of "master" for its default branch, then you would use git pull upstream main instead.
{{% /notice %}}

### 2. Create a new branch

**See the Branch Naming convention page here::**

Rather than making changes to the project's "master" branch, it's a good practice to instead create your own branch. This creates an environment for your work that is isolated from the master branch.

Use this command to create a new branch and then immediately switch to it. The name of the branch should briefly describe what you are working on, and should not contain any spaces.

```Bash
git checkout -b my_new_feature
```

For example, I used git checkout -b doc-fixes because I was making some small fixes to the documentation.

To show your local branches, use this command :

```Bash
git branch
```

You should see your new branch as well as "master", and your new branch should have an asterisk next to it to indicate that it's "checked out" (meaning that you're working in it).

### 3. Make changes in your local repository​

Open a text editor or IDE such as Visual Studio Code to implement the changes you have planned in your local repository. Since you checked out a branch in the previous step, any modifications you make will be confined to that branch.

You can download Visual Studio Code here: [Visual Studio Code](https://code.visualstudio.com/)

### 4. Commit your changes​

**See the Commit convention page here::**

After you make a set of changes, use the following command to stage your changes.

```Bash
git branch
```

Add all changes
```Bash
git add .
```


The description of your commit must be clear, explicit and understandable to anyone, example :

```Bash
git commit -m "fix: typos in set_config docstring"
```

{{% notice note "Note " %}}
This commit message might be included in a changelog.

Commit messages must be standardized: [Conventional Commits](https://www.conventionalcommits.org/)

    - feat: my new feature description
    - release: my new realease description
    - hotfix: my hotfix description
    - fix: my fix description
{{% /notice %}}

If you are making multiple sets of changes, it's a good practice to make a commit after each set.

### 5. Push changes to your branch​
When you are done making all of your changes, upload these changes to your branch using :



```Bash
git push origin my_new_feature
```

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

Congratulations! Your code has been successfully reviewed and merged into the main branch. It is now available for others to build upon for future contributions.

## 9. Golden rules
---

✅ Commit each day

✅ Never commit directly to the main branch and always protect it

✅ Adopt a naming convention for your branches (eg. feat: for a new feature, fix: for a bug fix)

✅ Adopt a naming convention for your commits (eg. feat: for a new feature, fix: for a bug fix)

✅ Enhance security in your code with the principle of least privilege

✅ All should be deleted an recreated otherwise it's not IAC
