+++
author = "Benoit G"
title = "Publish a Versioned GitHub Script Snapshot in an Article"
date = "2024-10-16"
description = "Distinguish a source link from build-time inclusion and browser fetching, and publish a readable static script snapshot with honest provenance."
tags = ["GitHub", "PowerShell"]
categories = ["GitHub"]
featureImage = "/articles/images/githubtest.png"
related = ["how-to-creat-a-new-article", "search-azure-policy-aliases"]
+++

When a script is long, or reused across several articles, it's better to keep a single source of truth in a public GitHub repository rather than pasting (and maintaining) multiple copies of it inline.

## The approach

The current generator uses a **manually maintained Markdown code snapshot**, not a live embed. A repository link opens GitHub; it does not retrieve code. Build-time inclusion would fetch a pinned file during the build, while browser fetching would make readers depend on a live remote request. Neither is implemented here.

1. Keep the script in its own GitHub repository (or a scripts folder in an existing one).
2. Link to the repository from the article so readers can clone it, star it, or open issues/PRs.
3. Paste the current version of the script in the article as a regular fenced code block, so it's readable without leaving the page.

This keeps the article self-contained for reading while the GitHub repository remains the canonical, versioned source you keep updating.

## Minimal source and rendered result

In Markdown, put the code inside a `powershell` fence and a provenance paragraph beside it. The rendered result is a labelled code block with Copy and the same source link, readable without a GitHub request.

For a new snapshot, record the repository, file path and **actual commit permalink** used. The original example's commit/version and execution validation are **not recorded**; the repository link below is not a pinned revision. Do not invent a commit hash or imply automatic synchronisation.

If GitHub is unavailable, the already-built code remains readable here. An unavailable source cannot be used to verify freshness; defer updating the snapshot rather than substituting an unverified file.

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
