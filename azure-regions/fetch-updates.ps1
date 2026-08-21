#!/usr/bin/env pwsh
# Refreshes azure-regions/regions.json directly from Azure via Get-AzLocation,
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

# Azure's GeographyGroup metadata (from Get-AzLocation) is finer-grained than the continent
# buckets the site displays, so map the known groups down to the 4 continents used on the page.
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

Write-Host "Fetching Azure locations via Get-AzLocation..."
$locations = Get-AzLocation

# Get-AzLocation doesn't expose zone mappings, so pull that one field from the raw ARM API.
$zoneEnabledLocations = @{}
try {
  $subscriptionId = (Get-AzContext).Subscription.Id
  if ($subscriptionId) {
    $response = Invoke-AzRestMethod -Path "/subscriptions/$subscriptionId/locations?api-version=2022-12-01" -Method GET
    if ($response.StatusCode -eq 200) {
      $body = $response.Content | ConvertFrom-Json
      foreach ($loc in $body.value) {
        if ($loc.metadata.availabilityZoneMappings -and $loc.metadata.availabilityZoneMappings.Count -gt 0) {
          $zoneEnabledLocations[$loc.name] = $true
        }
      }
    }
  } else {
    Write-Warning "No subscription in current context; availabilityZones will default to false for all regions."
  }
} catch {
  Write-Warning "Could not retrieve availability zone mappings: $($_.Exception.Message)"
}

$regions = [System.Collections.Generic.List[object]]::new()
foreach ($location in $locations) {
  # Only keep real, physical Azure regions (skip logical/global entries and edge-zone "Extended" locations).
  if ($location.RegionType -ne "Physical" -or -not $location.PhysicalLocation) { continue }

  $geography = $location.GeographyGroup
  $continent = $continentByGeography[$geography]
  if (-not $continent) { $continent = $geography }

  $pairedRegion = $null
  if ($location.PairedRegion -and $location.PairedRegion.Count -gt 0) {
    $pairedRegion = $location.PairedRegion[0].DisplayName
  }

  $regions.Add([ordered]@{
    name              = $location.DisplayName
    id                = $location.Location
    physicalLocation  = $location.PhysicalLocation
    latitude          = if ($location.Latitude) { [double]$location.Latitude } else { $null }
    longitude         = if ($location.Longitude) { [double]$location.Longitude } else { $null }
    geography         = $geography
    continent         = $continent
    availabilityZones = [bool]$zoneEnabledLocations[$location.Location]
    restricted        = $location.RegionCategory -eq "Other"
    pairedRegion      = $pairedRegion
  })
}

$sortedRegions = @($regions | Sort-Object { $_.name })

$payload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source      = "Get-AzLocation (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  regions     = $sortedRegions
}

$outputPath = Join-Path (Split-Path -Parent $PSCommandPath) "regions.json"
($payload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8

Write-Host "Fetched $($sortedRegions.Count) regions into $outputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
