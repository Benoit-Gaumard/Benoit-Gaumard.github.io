+++
author = "Benoit G"
title = "Review Expired Azure Resources by TTL Tags Before Cleanup"
date = "2024-11-13"
description = "Build a scoped, read-only TTL inventory before approving resource deletion, and separately investigate creator attribution without treating the last writer as the creator."
tags = ["Tags"]
categories = ["Azure"]
featureImage = "/articles/images/Tags.svg"
related = ["optimize-and-reduce-costs-in-azure", "clean-rbac-identity-not-found"]
+++

:::warning
Resource deletion can destroy data and dependent workloads. A tag is metadata, not authorisation to delete. Start with an explicit non-production resource group, an inventory, owner approval, dependency checks and a tested recovery plan. The first script below performs no deletion or tag write.
:::

Two separate tasks follow: [review expiry candidates](#1-preview-expiry-candidates) and [investigate attribution](#3-investigate-createdby-separately). Neither requires the other. The earlier approach was inspired by [Using Azure tags to improve resources organization](https://medium.com/@aminecharot); the examples here deliberately favour review over automatic mutation.

## Before either task

- Confirm `Get-AzContext` shows the correct tenant and subscription.
- Use Az.Resources for inventory; use Az.Monitor for Activity Log queries.
- Select one resource group, exclude production/shared resources, and inspect dependencies and locks.
- Agree on the exact tag convention: `CreationDate` is `yyyy-MM-dd` in UTC and `TTL` is a non-negative whole number of days. The example treats the creation date as midnight UTC; use a timestamp convention instead if sub-day precision matters.
- Missing, malformed or future dates are **skipped**, not treated as expired.
- Versions and technical execution validation: **not recorded**. Review [Azure tag guidance](https://learn.microsoft.com/azure/azure-resource-manager/management/tag-resources).

## 1. Preview expiry candidates

Replace both placeholders and review the context. This inventories resources only, not resource groups.

```powershell
$SubscriptionId = "<subscription-id>"
$ResourceGroupName = "<non-production-resource-group>"
Set-AzContext -Subscription $SubscriptionId
Get-AzContext
$Now = [DateTime]::UtcNow
$Report = foreach ($Resource in Get-AzResource -ResourceGroupName $ResourceGroupName) {
    $Tags = $Resource.Tags
    if (-not $Tags -or -not $Tags.ContainsKey("TTL") -or -not $Tags.ContainsKey("CreationDate")) { continue }
    if ($Tags["Environment"] -match "^(prod|production)$" -or $Tags["DoNotDelete"] -eq "true") { continue }
    $Created = [DateTime]::MinValue
    $Days = 0
    $ValidDate = [DateTime]::TryParseExact($Tags["CreationDate"], "yyyy-MM-dd",
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal,
        [ref]$Created)
    if (-not $ValidDate -or -not [int]::TryParse($Tags["TTL"], [ref]$Days) -or $Days -lt 0 -or $Created -gt $Now) {
        Write-Warning "Skipped invalid expiry tags: $($Resource.ResourceId)"
        continue
    }
    try { $Expires = $Created.AddDays($Days) } catch { continue }
    if ($Expires -le $Now) {
        [pscustomobject]@{
            ResourceId = $Resource.ResourceId
            Name = $Resource.Name
            ExpiresUtc = $Expires.ToString("o")
            Owner = $Tags["Owner"]
            Status = "Candidate - approval required"
        }
    }
}
$Report | Format-Table -AutoSize
$Report | Export-Csv ".\ttl-review.csv" -NoTypeInformation
```

Expected report columns: `ResourceId`, `Name`, `ExpiresUtc`, `Owner`, `Status`. An empty report means no returned resources passed these filters. It does not prove there are no unused resources.

## 2. Review a deletion, separately

For every candidate, record owner approval, backup/restore evidence, dependent resources, retention requirements, locks and exclusions. Scope and tag checks are a starting point, not a guarantee of safety.

Only after review, supply one exact resource ID from the report. This command is still a **preview**:

```powershell
$ApprovedResourceId = "<one-reviewed-resource-id>"
Remove-AzResource -ResourceId $ApprovedResourceId -WhatIf
```

An authorised operator must deliberately remove `-WhatIf` to perform deletion under their change procedure. Do not append `-Force` or pipe the entire inventory into deletion. Re-run the inventory after an approved change and retain the reviewed report.

## 3. Investigate CreatedBy separately

Activity Log callers describe operations during the available retention window. The last writer, most frequent writer or a deployment identity is **not necessarily the creator**. An older resource may have no creation event in the available logs. Do not infer ownership from an empty or ambiguous result.

This read-only example inspects one resource and does not set tags:

```powershell
$ResourceId = "<resource-id-to-investigate>"
$End = Get-Date
$Start = $End.AddDays(-7)
Get-AzActivityLog -ResourceId $ResourceId -StartTime $Start -EndTime $End |
    Where-Object { $_.Authorization.Action -like "*/write" } |
    Select-Object EventTimestamp, Caller, OperationName, Status |
    Sort-Object EventTimestamp
```

Expected output is a time-ordered operation list, not a verified creator. Correlate it with deployment records and the owning team. Only then agree on a `CreatedBy`/`Owner` value and apply it through your normal reviewed tagging process. Logs may contain personal identifiers; store reports appropriately.

Check support in [Azure Taggable Resources](/azure-taggable-resources/) and consult [Get-AzActivityLog](https://learn.microsoft.com/powershell/module/az.monitor/get-azactivitylog).
