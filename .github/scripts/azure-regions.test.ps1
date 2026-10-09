$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\..\azure-regions\region-data.ps1')
$parseTokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot '..\..\azure-regions\fetch-updates.ps1'), [ref]$parseTokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }

function Assert-Equal($Actual, $Expected, [string]$Message) {
  if ($Actual -cne $Expected) { throw "$Message (actual: '$Actual', expected: '$Expected')" }
}
function Assert-Throws([scriptblock]$Action, [string]$Message) {
  $threw = $false
  try { & $Action | Out-Null } catch { $threw = $true }
  if (-not $threw) { throw $Message }
}

$fixture = @'
<table><tr><th>Unrelated table</th></tr></table>
<table><thead><tr><th>Region</th><th>Availability zones</th><th>Paired region</th><th>Physical location</th><th>Geography</th><th>Programmatic name</th></tr></thead>
<tbody>
<tr><td>France Central</td><td>3</td><td><img src="media/icon-region-restricted.svg">France South</td><td>Paris</td><td>France</td><td>francecentral</td></tr>
<tr><td><img src="media/icon-region-restricted.svg">France South</td><td>N/A</td><td>France Central</td><td>Marseille</td><td>France</td><td>francesouth</td></tr>
<tr><td>Preview</td><td>3 <img src="media/icon-region-coming-soon.svg" alt="Preview"></td><td>N/A</td><td>Somewhere</td><td>US</td><td>previewregion</td></tr>
<tr><td>Unknown</td><td>Coming soon</td><td>N/A</td><td>Somewhere</td><td>US</td><td>unknownregion</td></tr>
</tbody></table>
'@
$reference = ConvertFrom-RegionReferenceHtml -Html $fixture
Assert-Equal $reference.Count 4 'The parser must select the region table only'
Assert-Equal $reference.francecentral.availabilityZones $true 'Numeric zone counts confirm support'
Assert-Equal $reference.francesouth.availabilityZones $false 'Explicit N/A is different from a missing value'
Assert-Equal $reference.francecentral.restricted $false 'A restricted paired region must not restrict its partner'
Assert-Equal $reference.francesouth.restricted $true 'Region-column restriction icon is recognized'
Assert-Equal $reference.previewregion.preview $true 'Preview annotation is preserved'
Assert-Equal $reference.unknownregion.availabilityZones $null 'Unrecognized zone text stays unknown'

$rootMappings = [pscustomobject]@{
  availabilityZoneMappings = @([pscustomobject]@{ logicalZone = '1'; physicalZone = 'region-az1' })
  metadata = [pscustomobject]@{ regionCategory = 'Other' }
}
$evidence = Get-RegionEvidence -Id 'francesouth' -Location $rootMappings -Reference $reference
Assert-Equal $evidence.availabilityZones $true 'ARM root-level mappings take precedence'
Assert-Equal $evidence.availabilityZonesSource 'arm' 'Positive ARM evidence has its own source'
$wrongPath = [pscustomobject]@{ metadata = [pscustomobject]@{ availabilityZoneMappings = $rootMappings.availabilityZoneMappings; regionCategory = 'Other' } }
$evidence = Get-RegionEvidence -Id 'unlisted' -Location $wrongPath -Reference $reference
Assert-Equal $evidence.availabilityZones $null 'Metadata is not a zone-mapping source'
Assert-Equal $evidence.restricted $null 'ARM category Other does not prove restricted access'
foreach ($location in @($null, [pscustomobject]@{ availabilityZoneMappings = @() }, [pscustomobject]@{ availabilityZoneMappings = @($null) })) {
  $evidence = Get-RegionEvidence -Id 'unlisted' -Location $location -Reference $null
  Assert-Equal $evidence.availabilityZones $null 'Absent or empty mappings remain unknown'
  Assert-Equal $evidence.availabilityZonesSource $null 'Unknown values have no claimed evidence'
}
$evidence = Get-RegionEvidence -Id 'francesouth' -Location $null -Reference $reference
Assert-Equal $evidence.availabilityZones $false 'Explicit negative reference survives enrichment'
Assert-Equal $evidence.availabilityZonesSource 'microsoft-learn' 'Documented negative has a source'
Assert-Equal (Get-RegionContinent 'US') 'Americas' 'ARM US group is normalized'
Assert-Equal (Get-RegionContinent 'UK') 'Europe' 'ARM UK group is normalized'
Assert-Equal (Get-RegionContinent 'South America') 'Americas' 'ARM South America group is normalized'
Assert-Equal (Get-RegionContinent $null) 'Not classified' 'Unknown groups are explicit'
Assert-Equal (New-RegionSources -MetadataCheckedAt '2026-09-08T10:00:00Z' -ReferenceCheckedAt $null).reference.status 'unavailable' 'A failed reference refresh has no success-shaped source'
Assert-Throws { ConvertFrom-RegionReferenceHtml '<html>No data</html>' } 'Missing table must fail visibly'
Assert-Throws { ConvertFrom-RegionReferenceHtml ($fixture.Replace('<td>francesouth</td>', '<td>francecentral</td>')) } 'Duplicate identifiers must fail'
Write-Host 'Azure Regions evidence tests passed.'
