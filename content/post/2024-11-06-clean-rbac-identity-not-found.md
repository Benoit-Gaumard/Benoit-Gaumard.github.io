+++
author = "Benoit G"
title = "RBAC delete role assignments with 'Identity not found'"
date = "2024-11-06"
description = ""
toc = true
tags = [
    "RBAC"
]
categories = ["Azure"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/Users.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/Users.svg">

If you see the Identiy not found in your RBAC assignments, it means that these identitiy have been deleted from your Entra ID, whether it is a user, a group or a SPN.

However, Azure does not clean up for you, and it’s up to you and it is just ugly in the portal.


You must clean-up any orphaned role assignments on a regular basis.

Here is a Powershell script to clean up:

{{< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-clean-rbac-assignments/refs/heads/main/clean-rbac-identity-not-found.ps1" >}}
