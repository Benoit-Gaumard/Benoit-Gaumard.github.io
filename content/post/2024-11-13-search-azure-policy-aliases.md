+++
author = "Benoit G"
title = "Search Azure policy aliases and sends output to an interactive table"
date = "2024-11-13"
description = "Search Azure policy aliases and sends output to an interactive table"
toc = false
tags = [
    "policies"
]
categories = ["Azure"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/githubtest.png" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/githubtest.png" width="50%" height="50%">


Use this script to quickly find and search for supported Azure Policy Aliases https://docs.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure#aliases to use when authoring custom Azure Policy definitions.

Select one or more namespaces from the list –> Click OK

<img src="/images/policy-alias-search/policy-alias-search-1.png" width="50%" height="50%">

And then you will have all available aliases for the selected resources:

<img src="/images/policy-alias-search/policy-alias-search-2.png" width="50%" height="50%">

Here is the script:

```Powershell
# List all namespaces available in Azure Policy
$AllNamespaces = (Get-AzPolicyAlias -ListAvailable).Namespace | Sort-Object | Get-Unique

# Select the namespaces you want to work with
$SelectedNamespaces = $null
$SelectedNamespaces = @()

$AllNamespaces | Out-GridView -Title "Select one or more namespace. Found: $($AllNamespaces.count)" -OutputMode Multiple `
| Foreach-object { $SelectedNamespaces += $_ }

# Get all aliases available in the selected namespaces
$AvailableAliases = $null
$AvailableAliases = @()

Foreach ($Namespace in $SelectedNamespaces)
{
   $AvailableAliases += (Get-AzPolicyAlias -NamespaceMatch $Namespace).Aliases | Select-Object
   Name, DefaultPath
}

# List all aliases available in the selected namespaces
$AvailableAliases | Out-GridView -Title "Available alias for selected ($($SelectedNamespaces.count)): $($SelectedNamespaces)" -OutputMode Single
```