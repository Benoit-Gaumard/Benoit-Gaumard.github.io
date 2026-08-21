#!/usr/bin/env pwsh
# Refreshes azure-policies/policydefinitions.json and policysetdefinitions.json directly from Azure
# via Get-AzPolicyDefinition/Get-AzPolicySetDefinition, authenticating as the
# "scan-benoit-gaumard.io" Entra ID service principal.
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

# Az.Resources' policy cmdlets expose most fields both flattened (top-level, via ETS aliases) and
# nested under .Properties depending on module version, so read defensively.
function Get-PolicyProperty {
  param($Item, [string]$Name)
  $value = $Item.$Name
  if ($null -eq $value -and $Item.Properties) { $value = $Item.Properties.$Name }
  return $value
}

$scriptDir = Split-Path -Parent $PSCommandPath

Write-Host "Fetching built-in Azure Policy definitions via Get-AzPolicyDefinition..."
$definitions = Get-AzPolicyDefinition -Builtin

$policies = [System.Collections.Generic.List[object]]::new()
foreach ($definition in $definitions) {
  $metadata = Get-PolicyProperty $definition "Metadata"
  $category = $null
  if ($metadata) { $category = $metadata.category }

  $policies.Add([ordered]@{
    name              = $definition.Name
    displayName       = Get-PolicyProperty $definition "DisplayName"
    description       = Get-PolicyProperty $definition "Description"
    category          = $category
    mode              = Get-PolicyProperty $definition "Mode"
    policyType        = Get-PolicyProperty $definition "PolicyType"
    policyDefinitionId = $definition.ResourceId
  })
}

$sortedPolicies = @($policies | Sort-Object { $_.displayName })
$policyCategories = @($sortedPolicies | ForEach-Object { $_.category } | Where-Object { $_ } | Sort-Object -Unique)

$policiesPayload = [ordered]@{
  generatedAt      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source           = "Get-AzPolicyDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalPolicies    = $sortedPolicies.Count
  totalCategories  = $policyCategories.Count
  policies         = $sortedPolicies
}

$policiesOutputPath = Join-Path $scriptDir "policydefinitions.json"
($policiesPayload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $policiesOutputPath -NoNewline -Encoding utf8
Write-Host "Fetched $($sortedPolicies.Count) policy definitions ($($policyCategories.Count) categories) into $policiesOutputPath"

Write-Host "Fetching built-in Azure Policy initiatives via Get-AzPolicySetDefinition..."
$setDefinitions = Get-AzPolicySetDefinition -Builtin

$initiatives = [System.Collections.Generic.List[object]]::new()
foreach ($setDefinition in $setDefinitions) {
  $metadata = Get-PolicyProperty $setDefinition "Metadata"
  $category = $null
  if ($metadata) { $category = $metadata.category }

  $policyDefinitions = Get-PolicyProperty $setDefinition "PolicyDefinitions"
  $policyCount = 0
  if ($policyDefinitions) { $policyCount = @($policyDefinitions).Count }

  $initiatives.Add([ordered]@{
    name               = $setDefinition.Name
    displayName        = Get-PolicyProperty $setDefinition "DisplayName"
    description        = Get-PolicyProperty $setDefinition "Description"
    category           = $category
    policyType         = Get-PolicyProperty $setDefinition "PolicyType"
    policyCount        = $policyCount
    policyDefinitionId = $setDefinition.ResourceId
  })
}

$sortedInitiatives = @($initiatives | Sort-Object { $_.displayName })
$initiativeCategories = @($sortedInitiatives | ForEach-Object { $_.category } | Where-Object { $_ } | Sort-Object -Unique)

$initiativesPayload = [ordered]@{
  generatedAt     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source          = "Get-AzPolicySetDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalInitiatives = $sortedInitiatives.Count
  totalCategories = $initiativeCategories.Count
  initiatives     = $sortedInitiatives
}

$initiativesOutputPath = Join-Path $scriptDir "policysetdefinitions.json"
($initiativesPayload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $initiativesOutputPath -NoNewline -Encoding utf8
Write-Host "Fetched $($sortedInitiatives.Count) policy initiatives ($($initiativeCategories.Count) categories) into $initiativesOutputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
