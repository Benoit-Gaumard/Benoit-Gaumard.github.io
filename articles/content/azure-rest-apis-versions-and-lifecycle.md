+++
author = "Benoit G"
title = "Azure REST APIs, Versions, and Lifecycle"
date = "2024-11-06"
description = "How Azure REST API versions work, how to find them with PowerShell, and why the api-version parameter matters."
tags = ["API"]
categories = ["Azure"]
featureImage = "/articles/images/rest-api.jpeg"
related = ["call-azure-api-with-powershell"]
+++

Find the resource type's available versions, choose one documented for your operation, then check its lifecycle. The Azure Resource Manager request's `api-version` chooses a contract; it does not select your PowerShell module version. The [REST API browser](https://learn.microsoft.com/en-us/rest/api/azure/) describes each operation and its request/response schema.

[[toc]]

## 1. Check prerequisites

Use an authenticated Azure PowerShell session in the intended tenant/subscription. Check `Get-Module Az.Resources -ListAvailable` first; install only if missing and permitted by your workstation policy. Tested module version and execution validation: **not recorded**.

```powershell
Install-Module -Name Az.Resources
```

## 2. Find available API versions for a provider

```powershell
Get-AzResourceProvider -ListAvailable | Select-Object ProviderNamespace -ExpandProperty ResourceTypes | Select-Object ProviderNamespace, RegistrationState, ResourceTypeName, ApiVersions | Format-Table
```

If I take the Compute provider, I can display its resource types with:

```powershell
(Get-AzResourceProvider -ProviderNamespace Microsoft.Compute).ResourceTypes
```

And list the available API versions for `virtualMachines` with:

```powershell
((Get-AzResourceProvider -ProviderNamespace Microsoft.Compute).ResourceTypes | Where-Object ResourceTypeName -eq virtualMachines).ApiVersions
```

Expected output is an array of version strings such as `YYYY-MM-DD` and `YYYY-MM-DD-preview`, not a resource inventory. These are illustrative formats, not a claim that a particular version is currently supported.

## 3. Choose and verify the lifecycle

1. Open the exact operation, for example [Virtual Machines — List All](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/list-all).
2. Prefer a documented non-preview version that supplies the fields you need. Preview features require an explicit acceptance of their limitations.
3. Check the provider's retirement notices and release information; discovery in a provider list is not an unconditional support guarantee.
4. Pin the selected version in your script and validate a read-only request and expected response schema in your own scope.
5. Record the version and your actual test date in your project. No technical review date is recorded for this article.
