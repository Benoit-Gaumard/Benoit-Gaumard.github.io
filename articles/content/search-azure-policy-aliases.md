+++
author = "Benoit G"
title = "Search Azure Policy Aliases and Send Output to an Interactive Table"
date = "2024-11-13"
description = "A PowerShell script that lets you interactively search Azure Policy aliases by namespace using Out-GridView."
tags = ["Policies"]
categories = ["Azure"]
featureImage = "/articles/images/Policy.svg"
related = ["azure-policy-part-1-what-is-a-policy", "how-to-embed-a-github-script-in-an-article"]
+++

## Choose the web tool or PowerShell

[Search Azure Policy Aliases online](/azure-policy-aliases/) for a quick search, mobile use and copying an alias. Use [the PowerShell script](#powershell-prerequisites) if you need a local desktop workflow against provider metadata.

The script queries [Azure Policy aliases](https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure#aliases); an alias name belongs in a policy's `field`, while `DefaultPath` describes the underlying resource property.

## PowerShell prerequisites

Use an authenticated Azure PowerShell session with **Az.Resources**, and a Windows desktop supporting **Out-GridView**. Check `Get-Command Get-AzPolicyAlias, Out-GridView` first. Headless hosts and smartphones should use the web tool or ordinary PowerShell output instead. Module versions and execution validation: **not recorded**.

Select one or more namespaces (use Ctrl/Shift for multi-selection), then click **OK**. Cancel should be treated as no selection, not an error.

![Select one or more Azure Policy namespaces](/articles/images/policy-alias-search/policy-alias-search-1.png)

You'll then see all available aliases for the selected resources:

![Available aliases for the selected namespaces](/articles/images/policy-alias-search/policy-alias-search-2.png)

## Read and use the result

The final grid shows `Name` and `DefaultPath`. Selecting a row returns that object to the PowerShell pipeline; it does **not** automatically copy it. Copy the `Name` value for your policy and verify the property/type against a sample resource.

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
