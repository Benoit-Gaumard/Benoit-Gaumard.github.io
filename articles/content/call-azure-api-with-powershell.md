+++
author = "Benoit G"
title = "Call Azure API with PowerShell"
date = "2024-11-06"
description = "How to call an Azure REST API directly from PowerShell: get an access token, build the request headers, and invoke the endpoint."
tags = ["API", "PowerShell"]
categories = ["Azure"]
featureImage = "/articles/images/rest-api.jpeg"
+++

Using PowerShell or the command line to call an Azure REST API is a quick method to retrieve or update information about a specific resource in Azure. Although Postman can also be used for this purpose, here is an example of how to make these requests using PowerShell.

[[toc]]

## Sign in

First, log in to your Azure account:

```powershell
Connect-AzAccount
```

Set the subscription context if you have multiple subscriptions:

```powershell
Set-AzContext -Subscription "<SubscriptionId>"
```

## Get a token and build the headers

```powershell
# Get the current token
$Token = (Get-AzAccessToken).Token
```

```powershell
# Set the authorization header
$Headers = @{
    Authorization = "Bearer $Token"
}
```

## Build the request URL

Define which resource you want to query. In this example, I want to get the properties of a storage account in a resource group in my subscription.

To get the API URL and properties, use the [REST API reference documentation](https://learn.microsoft.com/en-us/rest/api/azure/).

Construct the API URL by substituting the subscription ID, resource group, and storage account name with proper values:

```powershell
$Uri = "https://management.azure.com/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Storage/storageAccounts/{accountName}?api-version=2023-01-01"
```

## Call the API

Use `Invoke-WebRequest` to make the call:

```powershell
Invoke-WebRequest -Method GET -UseBasicParsing -Uri $Uri -Headers $Headers
```

The JSON content of the response can be accessed with:

```powershell
(Invoke-WebRequest -Method GET -Uri $Uri -Headers $Headers).Content
```

## Full script

```powershell
Connect-AzAccount

Set-AzContext -Subscription "<SubscriptionId>"

# Get the current token
$Token = (Get-AzAccessToken).Token

# Set the authorization header
$Headers = @{
    Authorization = "Bearer $Token"
}

$Uri = "https://management.azure.com/subscriptions/{SubscriptionId}/resourceGroups/{ResourceGroupName}/providers/Microsoft.Storage/storageAccounts/{accountName}?api-version=2023-01-01"

$Result = Invoke-WebRequest -Method GET -Uri $Uri -Headers $Headers

if ($Result.StatusCode -eq "200") {
    $Result.Content
}
```
