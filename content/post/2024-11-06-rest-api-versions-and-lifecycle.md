+++
author = "Benoit G"
title = "Azure REST API’s, versions, and lifecycle"
date = "2024-11-06"
description = ""
toc = true
tags = [
    "API"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/rest-api.jpeg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/rest-api.jpeg" width="50%" height="50%">

Microsoft provides a list of all REST APIs (REST API Browser) available for Azure by clicking on the following link: https://docs.microsoft.com/en-us/rest/api/?view=Azure

For example, if I take the API dedicated to Compute and select Virtual Machines: https://docs.microsoft.com/en-us/rest/api/compute/virtualmachines

I will have access to all the actions I can perform on the Virtual Machines object.

For example, to list all VMs in an Azure subscription: https://docs.microsoft.com/en-us/rest/api/compute/virtualmachines/listall

The major advantage of this site is that it allows live testing of the selected API (by clicking on Try It) from a web browser, without needing to install a third-party tool (such as Postman or others).

All Azure APIs return results in JSON format, making them easily exploitable.

Each Azure API requires passing a mandatory parameter, api-version, to specify the version of the API to use and thus benefit from backward compatibility in case of version changes.

First, install the Az.Resources module:

```Powershell
Install-Module -Name Az.Resources
```

In PowerShell, if I want to know the version of the APIs available for a given provider, I need to execute the following command:

```Powershell
PowerShellGet-AzResourceProvider -ListAvailable | Select-Object ProviderNamespace -ExpandProperty ResourceTypes | select-object ProviderNamespace, RegistrationState, ResourceTypeName,ApiVersions | ft
```

If I take the Compute provider, I can display the resources with the following command:

```Powershell
PowerShell(Get-AzResourceProvider -ProviderNamespace Microsoft.Compute).ResourceTypes
```

And with this command, I can list the available API versions:

```Powershell
PowerShell((Get-AzResourceProvider -ProviderNamespace Microsoft.Compute).ResourceTypes | Where-Object ResourceTypeName -eq virtualMachines).ApiVersions
```

So, all those listed are supported. The retention period is quite long, allowing application developers enough time to make necessary modifications without being caught off guard before the API is deprecated.

Each API has its own lifecycle, and there is no official timeline regarding the retention period of older versions.