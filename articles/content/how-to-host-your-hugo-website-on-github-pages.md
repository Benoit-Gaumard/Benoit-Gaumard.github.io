+++
author = "Benoit G"
title = "How to Host Your Hugo Website on GitHub Pages"
date = "2024-11-03"
description = "Step-by-step guide to publishing a local Hugo website to GitHub Pages, including the deployment pipeline and how to sync content updates."
tags = ["Hugo", "GitHub"]
categories = ["Hugo"]
featureImage = "/articles/images/hugo.svg"
+++

Here is the step-by-step guide to hosting your Hugo website on GitHub Pages.

[[toc]]

## Prerequisites

Before diving in, ensure you have the following:

- Git
- A GitHub account
- Hugo installed on your system and running locally

:::note
In this article we copy a local Hugo website to GitHub Pages. First ensure your website is working well locally.
:::

## Setting up GitHub Pages

GitHub Pages is a free static site hosting service that takes HTML, CSS, and JavaScript files straight from a repository on GitHub, optionally runs the files through a build process, and publishes a website.

Follow these steps to get started:

1. Create a new repository named `username.github.io` to publish your user site (e.g., `Benoit-Gaumard.github.io`).
2. Enable GitHub Pages in your repository settings, under **Settings → Pages**. When enabled, a new deployment pipeline ("pages build and deployment") is automatically created.
3. Clone the repository to your local machine:

```bash
git clone https://github.com/Benoit-Gaumard/Benoit-Gaumard.github.io.git
```

4. Add an `index.html` file to your repository:

```html
<h1>Demo site on GitHub Pages</h1>
```

5. Commit and push your changes:

```bash
cd Benoit-Gaumard.github.io
git add . && git commit -m 'publish first github pages website' && git push
```

The deployment will start after the push. Within a few moments, your web page will be live at `https://username.github.io` (e.g., `https://Benoit-Gaumard.github.io`).

## Create the deployment pipeline

Create an empty YAML file in your local repository at `.github/workflows/hugo.yaml`, then add a workflow that checks out the repository, installs Hugo, builds the site, and deploys the `public/` output to GitHub Pages. Adjust the branch name and Hugo version as needed.

## Copy your local website to GitHub Pages

```powershell
$SourcePath = "C:\REPOS\BLOG\hugo-website\bga-new-site"
$DestinationPath = "C:\REPOS\BLOG\Benoit-Gaumard.github.io"

# Delete existing folder content
Get-ChildItem -Path $DestinationPath -Exclude ".git", ".github" |
    ForEach-Object {
        if ($_.PSIsContainer) {
            Remove-Item -Path $_.FullName -Recurse -Force
        } else {
            Remove-Item -Path $_.FullName -Force
        }
    }

# Get all items in the source path, excluding .git and .github
Get-ChildItem -Path $SourcePath -Recurse -Exclude ".git", ".github" |
    ForEach-Object {
        # Adjust the destination path for each item
        $targetPath = $_.FullName -replace [regex]::Escape($SourcePath), $DestinationPath

        if ($_.PSIsContainer) {
            if (!(Test-Path -Path $targetPath)) {
                New-Item -ItemType Directory -Path $targetPath -Force
            }
        } else {
            Copy-Item -Path $_.FullName -Destination $targetPath -Force
        }
    }

# Commit and deploy
cd C:\REPOS\BLOG\Benoit-Gaumard.github.io
git add . && git commit -m 'publish new content' && git push
```

The deployment starts, and your Hugo website is up and running at `https://username.github.io` (e.g., `https://Benoit-Gaumard.github.io`).
