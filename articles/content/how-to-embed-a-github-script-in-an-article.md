+++
author = "Benoit G"
title = "How to Embed a GitHub Script in an Article"
date = "2024-10-16"
description = "How I keep long PowerShell scripts in a dedicated GitHub repository and embed them directly as code blocks instead of duplicating the code across posts."
tags = ["GitHub", "PowerShell"]
categories = ["GitHub"]
featureImage = "/articles/images/githubtest.png"
+++

When a script is long, or reused across several articles, it's better to keep a single source of truth in a public GitHub repository rather than pasting (and maintaining) multiple copies of it inline.

## The approach

1. Keep the script in its own GitHub repository (or a scripts folder in an existing one).
2. Link to the repository from the article so readers can clone it, star it, or open issues/PRs.
3. Paste the current version of the script in the article as a regular fenced code block, so it's readable without leaving the page.

This keeps the article self-contained for reading while the GitHub repository remains the canonical, versioned source you keep updating.

## Example

Here is the script from my [azure-policy-aliases-outgridview](https://github.com/Benoit-Gaumard/azure-policy-aliases-outgridview) repository, which lets you search Azure Policy aliases interactively using `Out-GridView`:

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
    $AvailableAliases += (Get-AzPolicyAlias -NamespaceMatch $Namespace).Aliases | Select-Object Name
}

# List all aliases available in the selected namespaces
$AvailableAliases | Out-GridView -Title "Available aliases for selected namespaces ($($SelectedNamespaces.count)): $($SelectedNamespaces)" -OutputMode Single
```

The script is maintained on GitHub at [github.com/Benoit-Gaumard/azure-policy-aliases-outgridview](https://github.com/Benoit-Gaumard/azure-policy-aliases-outgridview).

Enjoy!
