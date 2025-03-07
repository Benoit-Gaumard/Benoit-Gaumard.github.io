+++
author = "Benoit G"
title = "Call Azure API with Powershell"
date = "2024-11-06"
description = ""
toc = true
tags = [
    "API", "Powershell"
]
categories = ["Azure"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/rest-api.jpeg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
#codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/rest-api.jpeg" width="50%" height="50%">

Using PowerShell or the command line to call an Azure REST API is a quick method to retrieve or update information about a specific resource in Azure. Although Postman can also be used for this purpose, here is an example of how to make these requests using PowerShell.

First, log in to your Azure account with the following command:
```Powershell
Connect-AzAccount
```

Set the subscription context if you have multiple subscriptions:
```Powershell
Set-AzContext -Subscription "<SubscriptionId>"
```

Get the current token:
```Powershell
# Get the current token
$Token = (Get-AzAccessToken).Token
```

Make the authorization header:
```Powershell
# Set the authorization header
$Headers = @{
    Authorization = "Bearer $Token"
}
```

Define wich resource you want to query. In this example, I want to get properties of my storage account, in a resource group in my subscription.

To get the API url and properties, I am using the REST API reference documentation: Azure REST API reference documentation | Microsoft Learn.

To construct the API URL I will substitute subscriptionId, resource group, and storage account with proper values.

```Powershell
$Uri = "https://management.azure.com/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Storage/storageAccounts/{accountName}?api-version=2023-01-01"
```

Finally, use Invoke-WebRequest command for the API call:

```Powershell
Invoke-WebRequest -Method GET -UseBasicParsing -Uri $Uri -Headers $Headers
```

JSON content of the request for the storage account properties can be accessed with:
```Powershell
(Invoke-WebRequest -Method GET -Uri $Uri -Headers $Headers).Content
```

Here is a full code:

```Powershell
Connect-AzAccount

Set-AzContext -Subscription "<SubscriptionId>"

# Get the current token
$Token = (Get-AzAccessToken).Token

# Set the authorization header
$Headers = @{
    Authorization = "Bearer $Token"
}

$Uri = "https://management.azure.com/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Storage/storageAccounts/{accountName}?api-version=2023-01-01"

$Result = (Invoke-WebRequest -Method GET -Uri $Uri -Headers $Headers)

If ($Result.StatusCode -eq "200"){
  $Result.Content
}
```