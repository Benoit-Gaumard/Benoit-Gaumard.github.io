+++
author = "Benoit G"
title = "Host your Higo website on Github Pages"
date = "2024-11-03"
description = "Test description"
toc = false
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

.github/workflows/hugo.yaml

Copy and paste the YAML below into the file you created. Change the branch name and Hugo version as needed.

Commit the change to your local repository with a commit message of something like “Add workflow”, and push to GitHub.

The deployment starts

You new hugo website is up and runnning

### Customize it
