+++
author = "Benoit G"
title = "How to host your Hugo website on Github Pages?"
date = "2024-11-03"
description = "Test description"
toc = false
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

Free dashboards that provides a visualization of cyber attacks all over the world.
<!--more-->

<img src="/images/githubtest.png" width="50%" height="50%">


## Prerequisites
Before diving in, ensure you have the following:

- Git
- A GitHub account
- Hugo installed on your system and running localy

{{% notice info "Info" %}}
Feeds are updated every day.
{{% /notice %}}

## Setting Up GitHub Pages
GitHub Pages is a free static site hosting service that takes HTML, CSS, and JavaScript files straight from a repository on GitHub, optionally runs the files through a build process, and publishes a website.

Follow these steps to get started:

- Create a new repository named <username>.github.io to publish your user site.
eg. Benoit-Gaumard.github.io

- Clone the repository to your local machine.
-
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
git add --all
git commit -m "feat: my first github pages website"
git push
```

- Enable GitHub Pages in your repository settings. Setting --> Pages
When enabled a new deployment actions pipeline "pages build and deployment" with be automatically created

The deployment will start after the push

- Within a few moments, your website will be live at https://<username>.github.io.
eg. https://Benoit-Gaumard.github.io

## Deploying Your Hugo Website

### Create an empty file in your local repository.

``` Bash
.github/workflows/hugo.yaml
```

Copy and paste the YAML below into the file you created. Change the branch name and Hugo version as needed.

Commit the change to your local repository with a commit message of something like “Add workflow”, and push to GitHub.

The deployment starts

You new hugo website is up and runnning

### Customize it

## Publishing your Blog to GitHub Pages

``` Bash
git add . && git commit -m 'new hugo blog' -a && git push
```

## Publish a new post

Create a new post with

``` Bash
hugo new post/example2.md
hugo new content/path/to/content/new_post.md
Build the site with hugo
```

``` Bash
Add, commit and push the changes to GitHubgit add . && git commit -m 'creating my second post' -a && git push
```

Watch the workflow in GitHub Actions
New posts are published at https://username.github.io


```Bash
Get-ChildItem -Path "C:\REPOS\BLOG\Benoit-Gaumard.github.io" -Exclude ".git", ".github" -Recurse |
    Remove-Item -Recurse -Force

Get-ChildItem -Path "C:\REPOS\BLOG\hugo-website\bga-new-site" -Recurse -Exclude ".git" |
    ForEach-Object {
        $destinationPath = $_.FullName -replace [regex]::Escape("C:\REPOS\BLOG\hugo-website\bga-new-site"), "C:\REPOS\BLOG\Benoit-Gaumard.github.io"
        if (!(Test-Path -Path (Split-Path -Path $destinationPath -Parent))) {
            New-Item -ItemType Directory -Path (Split-Path -Path $destinationPath -Parent) -Force
        }
        Copy-Item -Path $_.FullName -Destination $destinationPath -Recurse -Force
    }

cd C:\REPOS\BLOG\Benoit-Gaumard.github.io
git add . && git commit -m 'update site' -a && git push
```