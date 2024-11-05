+++
author = "Benoit G"
title = "Create your first Hugo website on Windows"
date = "2024-10-16"
description = "Test description"
toc = false
featured = true
tags = [
    "hugo"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Description of image' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/firstpost.png" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

This article explains how to create your first web site on Windows using Hugo.
<!--more-->

<img src="/images/firstpost.png" width="50%" height="50%">

## Prequisites
- Install Chocolatey (Chocolatey is a free and open-source package manager for Windows)
- Install Git https://git-scm.com/book/en/v2/Getting-Started-Installing-Git

## Install Hugo

From a terminal type:

```Bash
choco install hugo-extended
```

# Create a new hugo web site

```Bash
hugo new site "mysite"
```

Go to the previously created web site

```Bash
cd mysite
```

```Bash
git init
```

## Install a theme (eg. Hugo Clarity Theme)

```Bash
git submodule add https://github.com/chipzoller/hugo-clarity themes/hugo-clarity
```

# For hugo clarity copy current config and pages

```Bash
Copy-Item -Path "themes/hugo-clarity/exampleSite/*" -Destination "." -Recurse -Force
Remove-Item -Path "hugo.toml" -Force
```

## Display you website locally

```Bash
hugo server
```

You have a demo a local demo of your web site from: http://localhost:1313/

## Create your first post

```Bash
hugo new content content/post/my-first-post.md
```

## Add markdown content

```Bash
+++
title = 'My First Post'
date = 2024-01-14T07:07:07+01:00
draft = true
+++

## Introduction

This is **bold** text, and this is *emphasized* text.

Visit the [Hugo](https://gohugo.io) website!

```
Enjoy!