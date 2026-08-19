+++
author = "Benoit G"
title = "RBAC Delete Role Assignments with 'Identity Not Found'"
date = "2024-11-06"
description = "Why Azure keeps RBAC role assignments for deleted users, groups, or service principals, and a PowerShell script to clean them up."
tags = ["RBAC", "PowerShell"]
categories = ["Azure"]
featureImage = "/articles/images/Users.svg"
+++

If you see "Identity not found" in your RBAC assignments, it means that identity has been deleted from your Entra ID — whether it is a user, a group, or a service principal.

However, Azure does not clean these up for you, and it's just ugly to look at in the portal. You must clean up any orphaned role assignments on a regular basis.

Here is a PowerShell script to clean them up:

```powershell
[CmdletBinding()]
param (
    [switch] $CheckOnly,
    [Parameter(Mandatory = $false)]
    [string] $Scope = ""
)

[array]$Assignments = @()

if ("" -eq $Scope) {
    Write-Output "No scope defined, getting all assignments."
    $Assignments = Get-AzRoleAssignment | Where-Object { $_.ObjectType -eq "Unknown" }
} else {
    Write-Output "Scope is: $Scope"
    $Assignments = Get-AzRoleAssignment -Scope $Scope | Where-Object { $_.ObjectType -eq "Unknown" }
}

Write-Output "Total: $($Assignments.Count) Unknown Identity found"

foreach ($Assignment in $Assignments) {
    Write-Output "---------------------------"
    Write-Output "Scope: $($Assignment.Scope)"
    Write-Output "Object Type: $($Assignment.ObjectType)"
    Write-Output "Display Name: $($Assignment.DisplayName)"
    Write-Output "SignIn Name: $($Assignment.SignInName)"
    Write-Output "Role Definition Name: $($Assignment.RoleDefinitionName)"
    Write-Output "Role Definition Id: $($Assignment.RoleDefinitionId)"
    Write-Output "Role Assignment Id: $($Assignment.RoleAssignmentId)"
    Write-Output "---------------------------"
    Write-Output ""

    if (-not $CheckOnly) {
        Write-Output "Removing assignment: $($Assignment.RoleAssignmentId)"
        $Assignment | Remove-AzRoleAssignment -Verbose
    }
}
```

Run it with `-CheckOnly` first to preview what would be removed, and optionally pass `-Scope` to limit the cleanup to a specific management group, subscription, or resource group.
