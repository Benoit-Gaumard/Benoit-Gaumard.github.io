+++
author = "Benoit G"
title = "Restrict Web App Access with Entra ID Authentication"
date = "2024-12-17"
description = "How to restrict access to an Azure Web App to specific users or security groups using Microsoft Entra ID, instead of allowing every user in the tenant."
tags = ["Entra ID", "Web App"]
categories = ["Azure"]
featureImage = "/articles/images/entra-id.svg"
related = ["app-service-php-access-to-azure-sql-database-with-managed-identity", "connect-github-and-azure-for-deployment-using-oidc"]
+++

Authentication establishes **who signed in**. Authorisation decides **whether that identity may use the app**. Requiring assignment on an Enterprise Application is an additional sign-in gate, not a replacement for configuring App Service authentication or application-level permissions.

This post will guide you on how to use Microsoft Entra ID to secure your web app by managing authentication and authorization for users or security groups.

## 1. Configure the two objects

In **App Service → Authentication**, configure the Microsoft identity provider for the intended tenant and require authentication for requests. Record its application/client ID. Then open **Microsoft Entra ID → Enterprise applications → All applications**, find the service principal by that same application ID, and open **Properties → Assignment required? → Yes → Save**.

Do not confuse the app registration with this tenant's Enterprise Application. Keep a permitted administrator/test account to avoid accidental lockout.

![Enable "Assignment required" on the enterprise application](/articles/images/restrict-web-app/restrict-web-app-1.png)

## 2. Assign the allowed audience

In that **Enterprise application → Users and groups → Add user/group**, select the intended user or a security group such as `WebApp-Readers`, select the applicable app role, then assign. Group assignment can have licensing and membership limitations; verify the current [assignment documentation](https://learn.microsoft.com/entra/identity/enterprise-apps/assign-user-or-group-access-portal).

![Assign users or groups to the enterprise application](/articles/images/restrict-web-app/restrict-web-app-2.png)

## 3. Test both outcomes

Use separate private browser sessions: an explicitly assigned account should sign in and reach the intended page; an unassigned account in the same tenant should be rejected. Also test an anonymous request to ensure App Service is not bypassing authentication. Previously issued sessions/tokens can affect immediate retests.

![Access denied error for unauthorized users](/articles/images/restrict-web-app/restrict-web-app-3.png)

| Unexpected result | Check |
|---|---|
| Everyone still reaches the page | App Service requires authentication, correct Enterprise Application ID, and fresh sessions |
| Assigned user is denied | Direct/effective assignment, tenant, chosen app role and group-assignment support |
| Sign-in works but an operation fails | Application permissions/roles and backend authorisation; sign-in alone does not grant data access |

Technical execution validation and portal reference version: **not recorded**. Consult [Restrict your app to a set of users](https://learn.microsoft.com/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users) and the [Entra built-in roles reference](/entra-built-in-roles/) when delegating administration.
