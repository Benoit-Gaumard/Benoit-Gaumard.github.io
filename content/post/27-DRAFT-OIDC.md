+++
author = "Benoit G"
title = "OIDC Authentication"
date = "2025-02-26"
description = ""
toc = false
draft = true
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

The objective is to set up a GitHub Actions workflow from scratch in a newly created GitHub repository, enabling authentication to Azure via OpenID Connect, eliminating the need for secret credentials.
<!--more-->

OpenID Connect (OIDC) extends the OAuth 2.0 authorization protocol for use as another authentication protocol. You can use OIDC to enable single sign-on (SSO) between your OAuth-enabled applications by using a security token called an ID token.

More informations here:

OpenID Connect (OIDC) on the Microsoft identity platform - Microsoft identity platform | Microsoft Learn
Configuring OpenID Connect in Azure - GitHub Docs

Authenticating via a User Assigned Managed Identity using OpenID Connect for Terraform / Bicep to provision or deploy Azure resources within a GitHub Actions workflows.
