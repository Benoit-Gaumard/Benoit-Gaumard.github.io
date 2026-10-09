+++
author = "Benoit G"
title = "Review RBAC Assignments with 'Identity Not Found'"
date = "2024-11-06"
description = "Inventory unresolved Azure RBAC principals at an explicit scope, verify deletion independently, and preview removal before approving a change."
tags = ["RBAC", "PowerShell"]
categories = ["Azure"]
featureImage = "/articles/images/Users.svg"
related = ["azure-lighthouse-cross-tenant-management"]
+++

:::warning
An unresolved principal is a candidate for investigation, not proof it was deleted. Directory visibility, tenant context and replication can affect resolution. Removing a valid role assignment revokes access. Verify the principal with an authorised directory administrator and preserve the assignment details before any removal.
:::

## 1. Understand and scope

Use Az.Accounts and Az.Resources with permission to read role assignments at the intended scope. Removal additionally requires the appropriate role-assignment delete permission. Check `Get-AzContext`, record the tenant/subscription, and choose one resource group or resource first. Technical execution validation and module versions: **not recorded**.

## 2. Preview only

This script contains **no delete operation**. Supply an explicit scope; only assignments at that exact scope are included, not inherited or descendant assignments.

```powershell
$Scope = "/subscriptions/<subscription-id>/resourceGroups/<resource-group>"
Get-AzContext
$Candidates = @(Get-AzRoleAssignment -Scope $Scope |
    Where-Object { $_.Scope -eq $Scope -and $_.ObjectType -eq "Unknown" })
$Candidates | Select-Object RoleAssignmentId, Scope, ObjectId, RoleDefinitionId |
    Format-Table -AutoSize
$Candidates | Select-Object RoleAssignmentId, Scope, ObjectId, RoleDefinitionId |
    Export-Csv -Path ".\rbac-review.csv" -NoTypeInformation
```

Expected inventory columns are assignment ID, exact scope, principal object ID and role definition ID. Zero rows means no unresolved assignments were returned at this scope, not a tenant-wide guarantee.

## 3. Approve one removal

Confirm the principal is actually deleted, not just invisible to your account. Save the role/scope/principal mapping and obtain change approval. The inventory file may reveal infrastructure details; keep it in an approved location.

For **one reviewed assignment**, run the preview below. `-WhatIf` makes no removal. Only an operator who has reviewed the output should remove `-WhatIf` and explicitly confirm.

```powershell
$ReviewedAssignmentId = "<exact-role-assignment-resource-id>"
$Reviewed = @($Candidates | Where-Object RoleAssignmentId -eq $ReviewedAssignmentId)
if ($Reviewed.Count -ne 1) { throw "Exactly one inventoried assignment must match." }
$Reviewed[0] | Remove-AzRoleAssignment -WhatIf -Confirm
```

## 4. Verify and retain evidence

Re-run the scoped inventory and compare it with the approved report. Confirm intended users still have access and retain the change record. Recreating an assignment requires a valid principal; deletion of the identity itself cannot be undone by recreating its role assignment.

Review [Azure Built-in Roles](/azure-built-in-roles/) and [Remove-AzRoleAssignment](https://learn.microsoft.com/powershell/module/az.resources/remove-azroleassignment).
