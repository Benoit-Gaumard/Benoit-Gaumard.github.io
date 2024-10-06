---
layout: post
title: Azure - Ménage de printemps pour votre RBAC
date: 2023-12-04
categories: [ "Azure" ]
comments_id: 182 
---

Je suppose que dans votre compte Azure, vous êtes déjà tombé sur le fameux **Identiy not found** dans vos role Assignments RBAC

![alt text]({{ site.url }}/images/2023/12/04/azure-menage-de-printemps-pour-votre-rbac-img0.png)

Toutes ces identités ont été supprimés de votre entra id, qu'il s'agisse d'un user, d'un groupe ou d'un SPN. Cependant Azure ne fait pas la ménage pour vous, et c'est à vous de le faire. Mais bonne nouvelle cela ne compte pas dans les role assignments effectifs et donc dans les limites c'est juste esthétique dans le portail.

Donc voici un petit script pour faire le ménage:

```powershell
[CmdletBinding()]
param (
    [switch] $DryRun,
    [PSDefaultValue(Help='Current subscription')]
    [Parameter(Mandatory = $false, HelpMessage="Use a valid azure scope")]
    [string] $scope = ""        
)

Connect-MgGraph -Scopes "Directory.Read.All" -NoWelcome

[array]$assignments = @()

if ("" -eq $scope) {
    $assignments = Get-AzRoleAssignment
} else {
    $assignments = Get-AzRoleAssignment -Scope $scope
}

Write-Output "Found $($assignments.Count) assignments"

foreach ($assignment in $assignments) {
    Write-Verbose "Processing $($assignment.RoleAssignmentId)"
    if ($null -eq (Get-MgDirectoryObject -DirectoryObjectId $assignment.ObjectId -ErrorAction SilentlyContinue)) {
        Write-Output "Removing $($assignment.RoleAssignmentId)"
        if (-not $DryRun) {
            $assignment | Remove-AzRoleAssignment
        }
    }
}

```
