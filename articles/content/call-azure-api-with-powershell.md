+++
author = "Benoit G"
title = "Call Azure API with PowerShell"
date = "2024-11-06"
description = "Make a read-only Azure Resource Manager GET for a storage account using Azure PowerShell, with explicit context, replaceable parameters and response checks."
tags = ["API", "PowerShell"]
categories = ["Azure"]
featureImage = "/articles/images/rest-api.jpeg"
related = ["azure-rest-apis-versions-and-lifecycle", "azure-subscription-switcher"]
+++

This example reads a storage account's properties; it does not deploy or modify it. Use PowerShell with `Az.Accounts` installed and read permission on that resource. [Follow the steps](#sign-in) or [go to the full script](#full-script). Tested PowerShell/module versions and Azure execution validation: **not recorded**.

## Sign in

Login and context selection are separate. Confirm the tenant and subscription before sending the request.

```powershell
Connect-AzAccount
Set-AzContext -Subscription "<subscription-id>"
Get-AzContext
```

## Let the module handle the token and headers

Use `Invoke-AzRestMethod` from Az.Accounts to authenticate with the selected context. It avoids printing or manually converting access tokens, whose representation varies between module versions. Do not put a token in console history or debug output.

## Build the request URL

Replace the resource identifiers below. Choose `api-version` using [Azure REST APIs, Versions, and Lifecycle](/articles/azure-rest-apis-versions-and-lifecycle/); the version shown is an example contract, not a current-support guarantee.

```powershell
$SubscriptionId = "<subscription-id>"
$ResourceGroup = "<resource-group-name>"
$AccountName = "<storage-account-name>"
$ApiVersion = "2023-01-01"
$Path = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Storage/storageAccounts/${AccountName}?api-version=$ApiVersion"
```

## Call the API

```powershell
$Result = Invoke-AzRestMethod -Method GET -Path $Path
$Result.StatusCode
$Result.Content | ConvertFrom-Json | Select-Object id, name, location
```

Expected shape: HTTP `200`, with the requested `id`, `name` and `location`. This is an expected schema, not a captured test result.

| Symptom | Check |
|---|---|
| 401 or 403 | Login, tenant and resource read permissions; do not grant subscription-wide Owner to bypass the error |
| 404 | Subscription, resource group, account name and the exact operation's API version |

## Full script

```powershell
Connect-AzAccount
$SubscriptionId = "<subscription-id>"
$ResourceGroup = "<resource-group-name>"
$AccountName = "<storage-account-name>"
$ApiVersion = "2023-01-01"
Set-AzContext -Subscription $SubscriptionId
Get-AzContext
$Path = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Storage/storageAccounts/${AccountName}?api-version=$ApiVersion"
$Result = Invoke-AzRestMethod -Method GET -Path $Path
if ($Result.StatusCode -eq 200) {
    $Result.Content | ConvertFrom-Json | Select-Object id, name, location
} else {
    throw "Unexpected HTTP status: $($Result.StatusCode)"
}
```

References: [Invoke-AzRestMethod](https://learn.microsoft.com/powershell/module/az.accounts/invoke-azrestmethod) and the [Azure REST API browser](https://learn.microsoft.com/rest/api/azure/).
