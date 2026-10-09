function ConvertFrom-RegionReferenceHtml {
  param([Parameter(Mandatory)][string]$Html)

  function Get-CellText([string]$Cell) {
    return [System.Net.WebUtility]::HtmlDecode(($Cell -replace '<[^>]+>', ' ')) -replace '\s+', ' '
  }

  foreach ($table in [regex]::Matches($Html, '(?is)<table\b[^>]*>(.*?)</table>')) {
    $headers = @([regex]::Matches($table.Value, '(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { (Get-CellText $_.Groups[1].Value).Trim() })
    if (($headers -join '|') -ne 'Region|Availability zones|Paired region|Physical location|Geography|Programmatic name') { continue }
    $reference = @{}
    foreach ($row in [regex]::Matches($table.Value, '(?is)<tr\b[^>]*>(.*?)</tr>')) {
      $cells = @([regex]::Matches($row.Value, '(?is)<td\b[^>]*>(.*?)</td>') | ForEach-Object { $_.Groups[1].Value })
      if ($cells.Count -eq 0) { continue }
      if ($cells.Count -ne 6) { throw 'Unexpected Microsoft Learn region row structure.' }
      $id = (Get-CellText $cells[5]).Trim()
      if ($id -notmatch '^[a-z0-9]+$' -or $reference.ContainsKey($id)) { throw "Invalid or duplicate region identifier: $id" }
      $zoneText = (Get-CellText $cells[1]).Trim()
      $support = $null
      if ($zoneText -match '^[1-9][0-9]*$') { $support = $true }
      elseif ($zoneText -eq 'N/A') { $support = $false }
      $reference[$id] = [pscustomobject]@{
        availabilityZones = $support
        preview = $cells[1] -match 'icon-region-coming-soon\.svg'
        restricted = $cells[0] -match 'icon-region-restricted\.svg'
      }
    }
    if ($reference.Count -eq 0) { throw 'Microsoft Learn returned an empty region table.' }
    return $reference
  }
  throw 'The Microsoft Learn public-region table could not be identified.'
}

function Get-RegionEvidence {
  param(
    [Parameter(Mandatory)][string]$Id,
    [AllowNull()][object]$Location,
    [AllowNull()][hashtable]$Reference
  )
  $entry = if ($Reference -and $Reference.ContainsKey($Id)) { $Reference[$Id] } else { $null }
  # Mappings are a Location property, not Location.metadata. An empty or missing
  # mapping does not prove that the public region lacks availability zones.
  $mappings = @($Location.availabilityZoneMappings | Where-Object { $_.logicalZone -and $_.physicalZone })
  $support = $null
  $zoneSource = $null
  if ($mappings.Count -gt 0) {
    $support = $true
    $zoneSource = 'arm'
  } elseif ($null -ne $entry -and $entry.availabilityZones -is [bool]) {
    $support = $entry.availabilityZones
    $zoneSource = 'microsoft-learn'
  }
  return [ordered]@{
    availabilityZones = $support
    availabilityZonesSource = $zoneSource
    availabilityZonesPreview = if ($null -ne $entry -and $support -eq $true) { [bool]$entry.preview } else { $false }
    restricted = if ($null -ne $entry) { [bool]$entry.restricted } else { $null }
    restrictedSource = if ($null -ne $entry) { 'microsoft-learn' } else { $null }
  }
}

function Get-RegionContinent {
  param([AllowNull()][string]$Geography)
  $groups = @{
    'Africa' = 'Africa'; 'South Africa' = 'Africa'
    'Americas' = 'Americas'; 'South America' = 'Americas'; 'Brazil' = 'Americas'
    'Canada' = 'Americas'; 'Chile' = 'Americas'; 'Mexico' = 'Americas'
    'US' = 'Americas'; 'United States' = 'Americas'
    'Asia Pacific' = 'Asia Pacific'; 'Australia' = 'Asia Pacific'; 'India' = 'Asia Pacific'
    'Indonesia' = 'Asia Pacific'; 'Japan' = 'Asia Pacific'; 'Korea' = 'Asia Pacific'
    'Malaysia' = 'Asia Pacific'; 'New Zealand' = 'Asia Pacific'
    'Europe' = 'Europe'; 'Austria' = 'Europe'; 'Belgium' = 'Europe'; 'Denmark' = 'Europe'
    'France' = 'Europe'; 'Germany' = 'Europe'; 'Italy' = 'Europe'; 'Norway' = 'Europe'
    'Poland' = 'Europe'; 'Spain' = 'Europe'; 'Sweden' = 'Europe'; 'Switzerland' = 'Europe'
    'UK' = 'Europe'; 'United Kingdom' = 'Europe'
    'Middle East' = 'Middle East'; 'Israel' = 'Middle East'; 'Qatar' = 'Middle East'; 'UAE' = 'Middle East'
  }
  if ($Geography -and $groups.ContainsKey($Geography)) { return $groups[$Geography] }
  return 'Not classified'
}

function New-RegionSources {
  param([string]$MetadataCheckedAt, [AllowNull()][string]$ReferenceCheckedAt)
  return [ordered]@{
    metadata = [ordered]@{
      name = 'Azure Resource Manager locations API'
      url = 'https://learn.microsoft.com/en-us/rest/api/resources/subscriptions/list-locations?view=rest-resources-2022-12-01'
      checkedAt = $MetadataCheckedAt
      scope = 'Locations returned for the scanning subscription; coordinates are regional, not datacenter addresses.'
    }
    reference = [ordered]@{
      name = 'Microsoft Learn public-region reference'
      url = 'https://learn.microsoft.com/en-us/azure/reliability/regions-list'
      checkedAt = if ($ReferenceCheckedAt) { $ReferenceCheckedAt } else { $null }
      status = if ($ReferenceCheckedAt) { 'available' } else { 'unavailable' }
    }
  }
}
