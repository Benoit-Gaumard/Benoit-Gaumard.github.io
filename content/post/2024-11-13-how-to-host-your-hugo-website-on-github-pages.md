+++
author = "Benoit G"
title = "How to host your Hugo website on Github Pages?"
date = "2024-11-03"
description = "Test description"
toc = true
draft = false
tags = [
  "hugo",
  "github"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Description of image' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/githubtest.png" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

Here is the step by step guide to host your Hugo website on Github Pages.
<!--more-->

<img src="/images/githubtest.png" width="50%" height="50%">


## Prerequisites
---

Before diving in, ensure you have the following:

- Git
- A GitHub account
- Hugo installed on your system and running localy

{{% notice note "Note " %}}
In this article we will copy a local Hugo web site to Git Hub Pages. First ensure your web site is working well locally.
For more information on creating your first Hugo website locally, check out [this guide](../2024-09-11-create-your-first-hugo-website-locally).
{{% /notice %}}

## Setting Up GitHub Pages
---
GitHub Pages is a free static site hosting service that takes HTML, CSS, and JavaScript files straight from a repository on GitHub, optionally runs the files through a build process, and publishes a website.

Follow these steps to get started:

- Create a new repository named username.github.io to publish your user site.
eg. Benoit-Gaumard.github.io

- Enable GitHub Pages in your repository settings from Setting --> Pages
When enabled a new deployment actions pipeline "pages build and deployment" with be automatically created.

- Clone the repository to your local machine.

``` Bash
git clone https://github.com/Benoit-Gaumard/Benoit-Gaumard.github.io.git
```

- Add an index.html file to your repository.

``` Html
<h1> Demo site on Git Hub pages</h1>
```

- Commit and push your changes

``` Bash
cd Benoit-Gaumard.github.io
git add . && git commit -m 'publish first github pages website' -a && git push
```

The deployment will start after the push

Within a few moments, your web page be live at https://username.github.io.
eg. https://Benoit-Gaumard.github.io

## Create the deployment pipeline
---

- Create an empty yaml file in your local repository.

``` Bash
.github/workflows/hugo.yaml
```

Copy and paste the YAML below into the file you created. Change the branch name and Hugo version as needed.

``` Bash
code
```

## Copy your local web site to GitHub Pages
---

```Powershell
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

# Get all items in the source path, excluding .git and .gity
Get-ChildItem -Path $SourcePath -Recurse -Exclude ".git", ".github" |
    ForEach-Object {
        # Adjust the destination path for each item
        $targetPath = $_.FullName -replace [regex]::Escape($SourcePath), $DestinationPath

        # Ensure that the destination directory exists
        if ($_.PSIsContainer) {
            # Create directory if it's a folder
            if (!(Test-Path -Path $targetPath)) {
                New-Item -ItemType Directory -Path $targetPath -Force
            }
        } else {
            # Copy files
            Copy-Item -Path $_.FullName -Destination $targetPath -Force
        }
    }

# Commit and deploy
cd C:\REPOS\BLOG\Benoit-Gaumard.github.io
git add . && git commit -m 'publish new content' -a && git push
```

The deployment starts

You new hugo website is up and runnning at https://username.github.io.
eg. https://Benoit-Gaumard.github.io
