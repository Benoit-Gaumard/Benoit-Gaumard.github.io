+++
author = "Benoit G"
title = "Azure Subscription Switcher"
date = "2024-11-05"
description = "A PowerShell script to quickly switch between Azure subscriptions by index, with an optional Out-GridView interface."
tags = ["Productivity", "Tools", "PowerShell"]
categories = ["Azure"]
featureImage = "/articles/images/githubtest.png"
+++

Managing subscriptions can be a challenge in any cloud journey. Here's a script to save you some time - quickly switch between your Azure subscriptions by entering a listed index.

Forked and updated from [matthiasguentert/azure-subscription-switcher](https://github.com/matthiasguentert/azure-subscription-switcher).

## Index-based version

```powershell
function Switch-AzContext {
    if (-not (Get-Module -ListAvailable -Name Az.Accounts)) {
        Write-Host -ForegroundColor Red 'Az.Accounts PowerShell module not installed!'
        return
    }

    Import-Module Az.Accounts -ErrorAction Stop

    try {
        # Select only enabled subscriptions and avoid duplicates if the user has multiple tenants enrolled with Lighthouse
        $SubscriptionList = Get-AzSubscription |
            Where-Object { $_.State -eq "Enabled" -and ($_.HomeTenantId -eq $_.TenantId) } |
            ConvertTo-Json | ConvertFrom-Json
    } catch {
        Write-Host -ForegroundColor Red "You have no context, please login first!"
        return
    }

    try {
        $SubscriptionActive = Get-AzContext | ConvertTo-Json | ConvertFrom-Json
    } catch {
        Write-Host -ForegroundColor Red "You have no subscription, please login first!"
        return
    }

    $available = @()
    $index = 1
    $SubscriptionList | ForEach-Object {
        $available += [PSCustomObject]@{
            Active         = if ($_.Id -eq $SubscriptionActive.Subscription.Id) { "===>" } else { $null }
            Index          = $index++
            Subscription   = $_.Name
            SubscriptionId = $_.Id
            State          = $_.State
            HomeTenantId   = $_.HomeTenantId
            Account        = if ($_.Id -eq $SubscriptionActive.Subscription.Id) { $SubscriptionActive.Account.Id } else { $null }
        }
    }

    $available | Format-Table -AutoSize

    try {
        [int]$userInput = Read-Host "Index (0 to quit)"

        if ($userInput -eq 0) {
            Write-Host -ForegroundColor Red 'Won''t switch Azure PowerShell context!'
            return
        } elseif ($userInput -lt 1 -or $userInput -gt $index - 1) {
            Write-Host -ForegroundColor Red "Input out of range"
            return
        }

        $selection = $available | Where-Object { $_.Index -eq $userInput }
        Write-Host -ForegroundColor Cyan 'Switching to:', $selection.Subscription
        Set-AzContext -SubscriptionId $selection.SubscriptionId | Out-Null
        Get-AzContext
    } catch {
        Write-Host -ForegroundColor Red "Invalid input, please enter a valid index!"
    }
}

Clear-Host
Switch-AzContext
```

Here is the script output:

![Subscription switcher script output](/articles/images/subscription-switcher/susbcription-switcher-1.png)

## Version with a user interface (Out-GridView)

```powershell
function Switch-AzContext {
    if (-not (Get-Module -ListAvailable -Name Az.Accounts)) {
        Write-Host -ForegroundColor Red 'Az.Accounts PowerShell module not installed!'
        return
    }

    Import-Module Az.Accounts -ErrorAction Stop

    try {
        $SubscriptionList = Get-AzSubscription |
            Where-Object { $_.State -eq "Enabled" -and ($_.HomeTenantId -eq $_.TenantId) } |
            ConvertTo-Json | ConvertFrom-Json
    } catch {
        Write-Host -ForegroundColor Red "You have no context, please login first!"
        return
    }

    try {
        $SubscriptionActive = Get-AzContext | ConvertTo-Json | ConvertFrom-Json
    } catch {
        Write-Host -ForegroundColor Red "You have no subscription, please login first!"
        return
    }

    $available = @()
    $index = 1
    $SubscriptionList | ForEach-Object {
        $available += [PSCustomObject]@{
            Active         = if ($_.Id -eq $SubscriptionActive.Subscription.Id) { "===>" } else { $null }
            Index          = $index++
            Subscription   = $_.Name
            SubscriptionId = $_.Id
            State          = $_.State
            HomeTenantId   = $_.HomeTenantId
            Account        = if ($_.Id -eq $SubscriptionActive.Subscription.Id) { $SubscriptionActive.Account.Id } else { $null }
        }
    }

    $selection = $available | Out-GridView -Title "Select a subscription. Found: $($SubscriptionList.count)" -OutputMode Single

    try {
        if (-not $selection) {
            Write-Host -ForegroundColor Red "No subscription selected. Operation cancelled."
            return
        }

        Write-Host -ForegroundColor Cyan 'Switching to:', $selection.Subscription
        Set-AzContext -SubscriptionId $selection.SubscriptionId | Out-Null
        Get-AzContext
    } catch {
        Write-Host -ForegroundColor Red "Invalid input, please enter a valid index!"
    }
}

Clear-Host
Switch-AzContext
```

Here is the script output:

![Subscription switcher Out-GridView output](/articles/images/subscription-switcher/susbcription-switcher-2.png)

Both scripts are maintained on GitHub at [Benoit-Gaumard/azure-subscription-switcher](https://github.com/Benoit-Gaumard/azure-subscription-switcher).

Enjoy!
