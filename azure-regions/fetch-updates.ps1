#!/usr/bin/env pwsh
# Refreshes azure-regions/regions.json directly from Azure via the ARM locations API,
# authenticating as the "scan-benoit-gaumard.io" Entra ID service principal.
#
# ARM supplies region metadata and subscription-specific zone mappings. The public
# Microsoft Learn reference supplies explicit no-zone and restricted-access evidence.
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot 'region-data.ps1')

Import-Module Az.Accounts -ErrorAction Stop

$clientId = $env:AZURE_CLIENT_ID
$clientSecret = $env:AZURE_CLIENT_SECRET
$tenantId = $env:AZURE_TENANT_ID
if (-not $clientId -or -not $clientSecret -or -not $tenantId) {
  throw "AZURE_CLIENT_ID, AZURE_CLIENT_SECRET and AZURE_TENANT_ID environment variables are required."
}

$secureSecret = ConvertTo-SecureString -String $clientSecret -AsPlainText -Force
$credential = [System.Management.Automation.PSCredential]::new($clientId, $secureSecret)
Connect-AzAccount -ServicePrincipal -Credential $credential -Tenant $tenantId | Out-Null

$subscriptionId = (Get-AzContext).Subscription.Id
if (-not $subscriptionId) { throw "No subscription in the current Azure context; cannot query the locations API." }

Write-Host "Fetching Azure locations from the ARM locations API..."
$response = Invoke-AzRestMethod -Path "/subscriptions/$subscriptionId/locations?api-version=2022-12-01" -Method GET
if ($response.StatusCode -ne 200) {
  throw "ARM locations API returned HTTP $($response.StatusCode): $($response.Content)"
}

# Edge zones share the "Physical" region type but are not Azure regions, so keep only type=Region.
$locations = @(($response.Content | ConvertFrom-Json).value | Where-Object { $_.type -eq "Region" })
if (-not $locations.Count) { throw "ARM locations API returned no regions." }
$metadataCheckedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
$reference = $null
$referenceCheckedAt = $null
try {
  $document = Invoke-WebRequest -Uri 'https://learn.microsoft.com/en-us/azure/reliability/regions-list' -TimeoutSec 45
  $reference = ConvertFrom-RegionReferenceHtml -Html $document.Content
  $referenceCheckedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
} catch {
  Write-Warning "Microsoft Learn region evidence is unavailable: $($_.Exception.Message). Missing ARM mappings will remain unknown, never false."
}

$displayNameById = @{}
foreach ($location in $locations) { $displayNameById[$location.name] = $location.displayName }

$regions = [System.Collections.Generic.List[object]]::new()
$logicalRegions = [System.Collections.Generic.List[object]]::new()

foreach ($location in $locations) {
  $metadata = $location.metadata

  # Logical regions (global, asiapacific, unitedstates, ...) are aggregate ARM names with no
  # datacenter behind them. They are kept aside so they feed the charts without polluting the
  # directory, the map or the filters, which are all about real datacenters.
  if ($metadata.regionType -eq "Logical") {
    $logicalRegions.Add([ordered]@{
      name        = $location.displayName
      id          = $location.name
      regionType  = $metadata.regionType
      geography   = $metadata.geographyGroup
      regionCategory = $metadata.regionCategory
    })
    continue
  }

  if ($metadata.regionType -ne "Physical") {
    Write-Warning "Skipping location $($location.name) with unrecognized region type."
    continue
  }

  $geography = $metadata.geographyGroup
  $continent = Get-RegionContinent -Geography $geography

  $pairedRegion = $null
  if ($metadata.pairedRegion -and @($metadata.pairedRegion).Count -gt 0) {
    $pairedName = @($metadata.pairedRegion)[0].name
    $pairedRegion = if ($displayNameById.ContainsKey($pairedName)) { $displayNameById[$pairedName] } else { $pairedName }
  }

  $evidence = Get-RegionEvidence -Id $location.name -Location $location -Reference $reference

  $region = [ordered]@{
    name              = $location.displayName
    id                = $location.name
    physicalLocation  = $metadata.physicalLocation
    latitude          = if ($null -ne $metadata.latitude -and "$($metadata.latitude)" -ne '') { [double]::Parse("$($metadata.latitude)", [cultureinfo]::InvariantCulture) } else { $null }
    longitude         = if ($null -ne $metadata.longitude -and "$($metadata.longitude)" -ne '') { [double]::Parse("$($metadata.longitude)", [cultureinfo]::InvariantCulture) } else { $null }
    geography         = $geography
    continent         = $continent
    regionType        = $metadata.regionType
    regionCategory    = $metadata.regionCategory
    pairedRegion      = $pairedRegion
  }
  foreach ($key in $evidence.Keys) { $region[$key] = $evidence[$key] }
  $regions.Add($region)
}

$sortedRegions = @($regions | Sort-Object { $_.name })
$sortedLogicalRegions = @($logicalRegions | Sort-Object { $_.name })

$zoneEnabled = @($sortedRegions | Where-Object { $_.availabilityZones -eq $true }).Count
$zoneDisabled = @($sortedRegions | Where-Object { $_.availabilityZones -eq $false }).Count
$zoneUnknown = @($sortedRegions | Where-Object { $null -eq $_.availabilityZones }).Count
Write-Host "Availability zones: $zoneEnabled supported, $zoneDisabled not listed as supported, $zoneUnknown unknown."
if ($zoneUnknown) { Write-Warning "$zoneUnknown physical regions have no confirmed availability-zone evidence." }

$payload = [ordered]@{
  schemaVersion  = 2
  generatedAt    = $metadataCheckedAt
  source         = "Azure Resource Manager locations API, with Microsoft Learn public-region evidence"
  sources        = New-RegionSources -MetadataCheckedAt $metadataCheckedAt -ReferenceCheckedAt $referenceCheckedAt
  regions        = $sortedRegions
  logicalRegions = $sortedLogicalRegions
}

$outputPath = Join-Path (Split-Path -Parent $PSCommandPath) "regions.json"
($payload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8

Write-Host "Fetched $($sortedRegions.Count) physical regions and $($sortedLogicalRegions.Count) logical regions into $outputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
