#!/usr/bin/env pwsh
# Refreshes azure-regions/regions.json directly from Azure via the ARM locations API,
# authenticating as the "scan-benoit-gaumard.io" Entra ID service principal.
#
# The raw ARM payload is used rather than Get-AzLocation because the cmdlet drops the
# fields this page needs: availabilityZoneMappings is absent entirely, and PairedRegion
# only carries the programmatic name, never the display name.
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

# Azure's GeographyGroup metadata is finer-grained than the continent buckets the site
# displays, so map the known groups down to the continents used on the page.
$continentByGeography = @{
  "Asia Pacific"   = "Asia Pacific"
  "Australia"      = "Asia Pacific"
  "Austria"        = "Europe"
  "Belgium"        = "Europe"
  "Brazil"         = "Americas"
  "Canada"         = "Americas"
  "Chile"          = "Americas"
  "Denmark"        = "Europe"
  "Europe"         = "Europe"
  "France"         = "Europe"
  "Germany"        = "Europe"
  "India"          = "Asia Pacific"
  "Indonesia"      = "Asia Pacific"
  "Israel"         = "Middle East"
  "Italy"          = "Europe"
  "Japan"          = "Asia Pacific"
  "Korea"          = "Asia Pacific"
  "Malaysia"       = "Asia Pacific"
  "Mexico"         = "Americas"
  "New Zealand"    = "Asia Pacific"
  "Norway"         = "Europe"
  "Poland"         = "Europe"
  "Qatar"          = "Middle East"
  "South Africa"   = "Africa"
  "Spain"          = "Europe"
  "Sweden"         = "Europe"
  "Switzerland"    = "Europe"
  "UAE"            = "Middle East"
  "United Kingdom" = "Europe"
  "United States"  = "Americas"
}

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

$displayNameById = @{}
foreach ($location in $locations) { $displayNameById[$location.name] = $location.displayName }

$regions = [System.Collections.Generic.List[object]]::new()
$logicalRegions = [System.Collections.Generic.List[object]]::new()

foreach ($location in $locations) {
  $metadata = $location.metadata

  # Logical regions (global, asiapacific, unitedstates, ...) are aggregate ARM names with no
  # datacenter behind them. They are kept aside so they feed the charts without polluting the
  # directory, the map or the filters, which are all about real datacenters.
  if ($metadata.regionType -ne "Physical") {
    $logicalRegions.Add([ordered]@{
      name        = $location.displayName
      id          = $location.name
      regionType  = $metadata.regionType
      geography   = $metadata.geographyGroup
      restricted  = $metadata.regionCategory -eq "Other"
    })
    continue
  }

  if (-not $metadata.physicalLocation) { continue }

  $geography = $metadata.geographyGroup
  $continent = $continentByGeography[$geography]
  if (-not $continent) { $continent = $geography }

  $pairedRegion = $null
  if ($metadata.pairedRegion -and @($metadata.pairedRegion).Count -gt 0) {
    $pairedName = @($metadata.pairedRegion)[0].name
    $pairedRegion = if ($displayNameById.ContainsKey($pairedName)) { $displayNameById[$pairedName] } else { $pairedName }
  }

  $hasZones = $metadata.availabilityZoneMappings -and @($metadata.availabilityZoneMappings).Count -gt 0

  $regions.Add([ordered]@{
    name              = $location.displayName
    id                = $location.name
    physicalLocation  = $metadata.physicalLocation
    latitude          = if ($metadata.latitude) { [double]$metadata.latitude } else { $null }
    longitude         = if ($metadata.longitude) { [double]$metadata.longitude } else { $null }
    geography         = $geography
    continent         = $continent
    regionType        = $metadata.regionType
    availabilityZones = [bool]$hasZones
    restricted        = $metadata.regionCategory -eq "Other"
    pairedRegion      = $pairedRegion
  })
}

$sortedRegions = @($regions | Sort-Object { $_.name })
$sortedLogicalRegions = @($logicalRegions | Sort-Object { $_.name })

# Surfaced in the workflow log: an all-zero count means the scanning subscription
# is not being shown availabilityZoneMappings, not that Azure has no zones.
$zoneEnabled = @($sortedRegions | Where-Object { $_.availabilityZones }).Count
Write-Host "Regions reporting availability zone mappings: $zoneEnabled / $($sortedRegions.Count)"
if ($zoneEnabled -eq 0) {
  Write-Warning "No region reported availabilityZoneMappings; the scanning subscription may not expose them."
}

$payload = [ordered]@{
  generatedAt    = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source         = "Azure Resource Manager locations API (live tenant scan via the scan-benoit-gaumard.io app)"
  regions        = $sortedRegions
  logicalRegions = $sortedLogicalRegions
}

$outputPath = Join-Path (Split-Path -Parent $PSCommandPath) "regions.json"
($payload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8

Write-Host "Fetched $($sortedRegions.Count) physical regions and $($sortedLogicalRegions.Count) logical regions into $outputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
