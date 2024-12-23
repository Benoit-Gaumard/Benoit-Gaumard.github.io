+++
author = "Benoit G"
title = "Restrict Web App acess authentication"
date = "2024-12-17"
description = ""
toc = false
draft = false
tags = [
    "Entra Id", "Web App"
]
categories = ["Azure"]
#featureImage = "/images/entra-id.svg" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/entra-id.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/entra-id.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

Do you want to restrict access to your Web App to specific users or groups within your organization? (which is by default enabled for all the users in the tenant).
<!--more-->

<img src="/images/entra-id.svg">

This post will guide you on how to use Microsoft Entra ID to secure your web app by managing authentication and authorization for users or security groups.

You can restrict the user completely to not grant access to the application in Entra Id by checking the "Assignment required" box in your Enterprise application properties.

<img src="/images/restrict-web-app/restrict-web-app-1.png" width="80%" height="80%">

From Entra Id search "Enterprise Applications" ans search your application by name or id.

Switch over to "Users and groups" to assign specific users or groups to this app.

<img src="/images/restrict-web-app/restrict-web-app-2.png" width="80%" height="80%">

Now only the above assigned users or group members are allowed to access the application.

Not authorized users will have the following error message when accessing to the application:

<img src="/images/restrict-web-app/restrict-web-app-3.png" width="80%" height="80%">

Enjoy!