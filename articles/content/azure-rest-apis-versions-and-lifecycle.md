+++
author = "Benoit G"
title = "Azure REST APIs, Versions, and Lifecycle"
date = "2024-11-06"
description = "How Azure REST API versions work, how to find them with PowerShell, and why the api-version parameter matters."
tags = ["API"]
categories = ["Azure"]
featureImage = "/articles/images/rest-api.jpeg"
+++

Microsoft provides a list of all REST APIs available for Azure in the [REST API browser](https://learn.microsoft.com/en-us/rest/api/azure/). For example, the API dedicated to Compute lets you select [Virtual Machines](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines) and gives you access to all the actions you can perform on that object — for example, to [list all VMs](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/list-all) in an Azure subscription.

The major advantage of this site is that it allows live testing of the selected API (by clicking **Try It**) from a web browser, without needing to install a third-party tool such as Postman.

All Azure APIs return results in JSON format, making them easily exploitable. Each Azure API requires passing a mandatory `api-version` parameter, to specify the version of the API to use and benefit from backward compatibility in case of version changes.

[[toc]]

## Install the module

```powershell
Install-Module -Name Az.Resources
```

## List available API versions for a provider

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

## Lifecycle

All the versions listed are supported. The retention period is quite long, allowing application developers enough time to make necessary modifications without being caught off guard before an API is deprecated. Each API has its own lifecycle, and there is no official fixed timeline regarding the retention period of older versions.
