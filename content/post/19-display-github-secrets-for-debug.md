+++
author = "Benoit G"
title = "Display GitHub secrets for debug"
date = "2024-12-02"
description = ""
toc = false
tags = [
    "github"
]
categories = ["GitHub"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/github-actions.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

Here is a simple method to display GitHub secrets for debugging purposes.
<!--more-->

<img src="/images/github-actions.svg">

Using this command line:

```Yaml
run: echo ${{ secrets.MYSECRET}} | sed 's/./& /g'
```

Here is an example workflow below:

```Yaml
name: Print GitHub Secrets

on:
  push:

jobs:
  print_secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Debug secret in variable
        run: echo ${{ secrets.MYSECRET}} | sed 's/./& /g'
```

{{% notice warning "Danger" %}}
This method is intended solely for debugging purposes. Avoid using it in production environments and never expose secrets in your pipelines!
{{% /notice %}}
