+++
author = "Benoit G"
title = "Embed you GitHub code to Hugo using a shortcode"
date = "2024-10-16"
description = "Test description"
toc = false
tags = [
    "hugo",
    "shortcode"
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

This article explains how to embed your GitHub code in your Hugo website using a shortcode.
<!--more-->

<img src="/images/githubtest.png" width="50%" height="50%">

# Embed you GitHub code to Hugo using a shortcode

## Create the shortcode

Let’s create a new shortcode. In your Hugo site’s layouts/shortcodes directory (if the folder shortcodes does not exist create it manually), create a file called embedgithubcode.html and paste the following:

```Bash
{{ $file := .Get 0 }}
{{ with resources.GetRemote $file }}
  {{ with .Err }}
    {{ errorf "%s" . }}
  {{ else }}
    {{ $lang := path.Ext $file | strings.TrimPrefix "." }}
    {{ highlight .Content $lang }}
  {{ end }}
{{ else }}
  {{ errorf "Unable to get remote resource." }}
{{ end }}
```

## Use the shortcode

In any markdown file, you can now use the shortcode like this (note the space I added between {{ to prevent hugo from rendering the shortcode on this page):

(Note the space I added between {{ to prevent hugo from rendering the shortcode on this page):

```Bash
{ {< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-policy-aliases-outgridview/refs/heads/main/azure-policy-aliases-outgridview.ps1" >}}
```
## Here is the result

The script is displayed from my github repository:

{{< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-policy-aliases-outgridview/refs/heads/main/azure-policy-aliases-outgridview.ps1" >}}

Enjoy!