#!/usr/bin/env pwsh
# Refreshes azure-policy-aliases/policy-aliases.json directly from Azure via Get-AzPolicyAlias,
# authenticating as the "scan-benoit-gaumard.io" Entra ID service principal.
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

Write-Host "Fetching Azure Policy aliases via Get-AzPolicyAlias..."
$providerAliases = Get-AzPolicyAlias

$resources = [System.Collections.Generic.List[object]]::new()
foreach ($provider in $providerAliases) {
  if (-not $provider.Aliases -or $provider.Aliases.Count -eq 0) { continue }

  # Two-element [defaultPath, alias] pairs, matching the shape the website expects.
  $aliasPairs = [System.Collections.Generic.List[object]]::new()
  foreach ($alias in $provider.Aliases) {
    $aliasPairs.Add(@($alias.DefaultPath, $alias.Name))
  }

  $resourceType = "$($provider.Namespace)/$($provider.ResourceType)"
  $resources.Add([ordered]@{
    provider     = $provider.Namespace
    resourceType = $resourceType
    docUrl       = "https://learn.microsoft.com/en-us/azure/templates/$($resourceType.ToLowerInvariant())"
    aliases      = $aliasPairs
  })
}

$sortedResources = @($resources | Sort-Object { $_.resourceType })
$providers = @($sortedResources | ForEach-Object { $_.provider } | Sort-Object -Unique)
$totalAliases = ($sortedResources | ForEach-Object { $_.aliases.Count } | Measure-Object -Sum).Sum

$payload = [ordered]@{
  generatedAt        = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source             = "Get-AzPolicyAlias (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalResourceTypes = $sortedResources.Count
  totalProviders     = $providers.Count
  totalAliases       = $totalAliases
  resources          = $sortedResources
}

$outputPath = Join-Path (Split-Path -Parent $PSCommandPath) "policy-aliases.json"
($payload | ConvertTo-Json -Depth 10 -Compress) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8

Write-Host "Fetched $($sortedResources.Count) resource types ($($providers.Count) providers, $totalAliases aliases) into $outputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
