+++
author = "Benoit G"
title = "Search Azure Policy Aliases and Send Output to an Interactive Table"
date = "2024-11-13"
description = "A PowerShell script that lets you interactively search Azure Policy aliases by namespace using Out-GridView."
tags = ["Policies"]
categories = ["Azure"]
featureImage = "/articles/images/Policy.svg"
+++

Use this script to quickly find and search for supported [Azure Policy aliases](https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure#aliases) to use when authoring custom Azure Policy definitions.

Select one or more namespaces from the list, then click OK:

![Select one or more Azure Policy namespaces](/articles/images/policy-alias-search/policy-alias-search-1.png)

You'll then see all available aliases for the selected resources:

![Available aliases for the selected namespaces](/articles/images/policy-alias-search/policy-alias-search-2.png)

Here is the script:

```powershell
# List all namespaces available in Azure Policy
$AllNamespaces = (Get-AzPolicyAlias -ListAvailable).Namespace | Sort-Object | Get-Unique

# Select the namespaces you want to work with
$SelectedNamespaces = @()

$AllNamespaces | Out-GridView -Title "Select one or more namespace. Found: $($AllNamespaces.count)" -OutputMode Multiple |
    ForEach-Object { $SelectedNamespaces += $_ }

# Get all aliases available in the selected namespaces
$AvailableAliases = @()

foreach ($Namespace in $SelectedNamespaces) {
    $AvailableAliases += (Get-AzPolicyAlias -NamespaceMatch $Namespace).Aliases | Select-Object Name, DefaultPath
}

# List all aliases available in the selected namespaces
$AvailableAliases | Out-GridView -Title "Available alias for selected ($($SelectedNamespaces.count)): $($SelectedNamespaces)" -OutputMode Single
```
