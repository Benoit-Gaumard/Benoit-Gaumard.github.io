#!/usr/bin/env pwsh
# Read-only capability probe for the scan-benoit-gaumard.io service principal.
#
# Three tool pages are still built from Microsoft's published documentation
# rather than from Azure itself. Moving them onto the live APIs depends on what
# this app is actually allowed to read, and a permission it lacks fails at call
# time, not at design time. This script answers that question and writes nothing.
#
# Usage: AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_TENANT_ID in the env.
$ErrorActionPreference = "Stop"

Import-Module Az.Accounts -ErrorAction Stop
Import-Module Az.Resources -ErrorAction Stop

$clientId = $env:AZURE_CLIENT_ID
$clientSecret = $env:AZURE_CLIENT_SECRET
$tenantId = $env:AZURE_TENANT_ID
if (-not $clientId -or -not $clientSecret -or -not $tenantId) {
  throw "AZURE_CLIENT_ID, AZURE_CLIENT_SECRET and AZURE_TENANT_ID environment variables are required."
}

$secureSecret = ConvertTo-SecureString -String $clientSecret -AsPlainText -Force
$credential = [System.Management.Automation.PSCredential]::new($clientId, $secureSecret)
Connect-AzAccount -ServicePrincipal -Credential $credential -Tenant $tenantId | Out-Null

$results = [System.Collections.Generic.List[object]]::new()
function Probe {
  param([string]$Capability, [string]$Detail, [scriptblock]$Test)
  try {
    $outcome = & $Test
    $results.Add([pscustomobject]@{ Capability = $Capability; Status = "OK"; Detail = $outcome })
  } catch {
    $message = $_.Exception.Message
    if ($message.Length -gt 150) { $message = $message.Substring(0, 150) + "..." }
    $results.Add([pscustomobject]@{ Capability = $Capability; Status = "DENIED"; Detail = $message })
  }
}

Write-Host "=== ARM (Azure Resource Manager) ==="

Probe "Get-AzRoleDefinition" "Azure RBAC built-in roles" {
  $roles = @(Get-AzRoleDefinition | Where-Object { -not $_.IsCustom })
  if ($roles.Count -eq 0) { throw "returned 0 built-in role definitions" }
  $sample = $roles[0]
  $fields = @($sample.PSObject.Properties.Name) -join ","
  "$($roles.Count) built-in roles; sample fields: $fields"
}

Probe "Role action detail" "Actions/DataActions present" {
  $reader = Get-AzRoleDefinition -Name "Reader"
  if (-not $reader) { throw "Reader role not returned" }
  "Reader: Actions=$(@($reader.Actions).Count) NotActions=$(@($reader.NotActions).Count) DataActions=$(@($reader.DataActions).Count) Id=$($reader.Id)"
}

Write-Host "=== Microsoft Graph ==="

$graphToken = $null
Probe "Graph token" "client-credentials token for graph.microsoft.com" {
  $token = Get-AzAccessToken -ResourceUrl "https://graph.microsoft.com" -AsSecureString -ErrorAction Stop
  $plain = [System.Net.NetworkCredential]::new("", $token.Token).Password
  $script:graphToken = $plain
  # Never print the token itself, only that one was issued.
  "token acquired (expires $($token.ExpiresOn.UtcDateTime.ToString('u')))"
}

function Invoke-Graph {
  param([string]$Uri)
  if (-not $script:graphToken) { throw "no Graph token" }
  return Invoke-RestMethod -Uri $Uri -Headers @{ Authorization = "Bearer $($script:graphToken)" } -Method Get
}

Probe "RoleManagement.Read.Directory" "Entra ID built-in directory roles" {
  $response = Invoke-Graph "https://graph.microsoft.com/v1.0/roleManagement/directory/roleDefinitions?`$top=999"
  $roles = @($response.value)
  $builtIn = @($roles | Where-Object { $_.isBuiltIn })
  $withPerms = @($roles | Where-Object { @($_.rolePermissions).Count -gt 0 })
  $fields = @($roles[0].PSObject.Properties.Name) -join ","
  "$($roles.Count) roles ($($builtIn.Count) built-in, $($withPerms.Count) with rolePermissions); fields: $fields"
}

Probe "Application.Read.All" "Microsoft Graph service principal (permission catalog)" {
  $uri = "https://graph.microsoft.com/v1.0/servicePrincipals(appId='00000003-0000-0000-c000-000000000000')?`$select=appRoles,oauth2PermissionScopes"
  $sp = Invoke-Graph $uri
  "appRoles=$(@($sp.appRoles).Count) oauth2PermissionScopes=$(@($sp.oauth2PermissionScopes).Count)"
}

Probe "Own granted permissions" "what this app has been consented" {
  $sp = Invoke-Graph "https://graph.microsoft.com/v1.0/servicePrincipals?`$filter=appId eq '$clientId'&`$select=id,displayName"
  $spId = @($sp.value)[0].id
  if (-not $spId) { throw "service principal not found for this appId" }
  $grants = Invoke-Graph "https://graph.microsoft.com/v1.0/servicePrincipals/$spId/appRoleAssignments"
  $names = @($grants.value | ForEach-Object { $_.appRoleId }) -join ", "
  "$(@($grants.value).Count) app role assignment(s): $names"
}

Write-Host ""
Write-Host "=== CAPABILITY REPORT ==="
$results | ForEach-Object { "{0,-32} {1,-7} {2}" -f $_.Capability, $_.Status, $_.Detail }

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null

$denied = @($results | Where-Object { $_.Status -eq "DENIED" })
Write-Host ""
Write-Host "$($results.Count - $denied.Count) of $($results.Count) capabilities available."
