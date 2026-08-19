+++
author = "Benoit G"
title = "Restrict Web App Access with Entra ID Authentication"
date = "2024-12-17"
description = "How to restrict access to an Azure Web App to specific users or security groups using Microsoft Entra ID, instead of allowing every user in the tenant."
tags = ["Entra ID", "Web App"]
categories = ["Azure"]
featureImage = "/articles/images/entra-id.svg"
+++

Do you want to restrict access to your web app to specific users or groups within your organization? By default, sign-in is enabled for every user in the tenant.

This post will guide you on how to use Microsoft Entra ID to secure your web app by managing authentication and authorization for users or security groups.

You can restrict access completely so the application isn't granted to everyone in Entra ID by checking the **Assignment required** box in your Enterprise Application properties.

![Enable "Assignment required" on the enterprise application](/articles/images/restrict-web-app/restrict-web-app-1.png)

From Entra ID, search **Enterprise Applications** and find your application by name or ID. Switch to **Users and groups** to assign specific users or groups to this app.

![Assign users or groups to the enterprise application](/articles/images/restrict-web-app/restrict-web-app-2.png)

Now only the assigned users or group members are allowed to access the application. Unauthorized users will see the following error message when trying to access the application:

![Access denied error for unauthorized users](/articles/images/restrict-web-app/restrict-web-app-3.png)

Enjoy!
