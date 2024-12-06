+++
author = "Benoit G"
title = "Azure subscription switcher"
date = "2024-11-05"
description = "Discover the benefits of integrating Draw.io with VS Code for seamless diagram creation."
toc = true
tags = [
    "productivity", "tools", "powershell"
]
categories = ["Azure"
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

This article presents a PowerShell script that can be used to quickly switch between subscriptions.

Managing subscriptions can be a challenge in any cloud journey. Here's a script to save you some time. 

Now can quickly switch between your Azure subscriptions by entering the listed index.

Forked and updated from: matthiasguentert/azure-subscription-switcher (github.com)

{{< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-subscription-switcher/refs/heads/main/subscription-switcher.ps1" >}}

Here is the script output:

<img src="/images/subscription-switcher/susbcription-switcher-1.png" width="50%" height="50%">

Here is also a version with a user interface (Out-GridView):

{{< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-subscription-switcher/refs/heads/main/subscription-switcher-with-outgridview.ps1" >}}


Here is the script output:

<img src="/images/subscription-switcher/susbcription-switcher-2.png" width="50%" height="50%">

Enjoy!