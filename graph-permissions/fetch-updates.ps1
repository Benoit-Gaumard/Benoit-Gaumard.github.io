#!/usr/bin/env pwsh
# Refreshes graph-permissions/permissions.json from the Microsoft Graph
# permissions reference published in microsoftgraph/microsoft-graph-docs-contrib.
#
# The same data is available from Graph itself, on the Microsoft Graph service
# principal, but only to a signed-in caller holding Application.Read.All. The
# published reference is the identical catalog, is public, and additionally
# carries the resource-specific consent permissions, so this refresh needs no
# tenant and no secret.
$ErrorActionPreference = "Stop"

$SourceUrl = "https://raw.githubusercontent.com/microsoftgraph/microsoft-graph-docs-contrib/main/concepts/permissions-reference.md"
$DocUrl = "https://learn.microsoft.com/en-us/graph/permissions-reference"

$headers = @{ "User-Agent" = "benoit-gaumard.io-refresh" }
if ($env:GITHUB_TOKEN) { $headers["Authorization"] = "Bearer $($env:GITHUB_TOKEN)" }

function ConvertTo-PlainText([string]$text) {
  if (-not $text) { return "" }
  $out = $text
  $out = [regex]::Replace($out, '!\[[^\]]*\]\[[^\]]*\]', '')      # badge image reference
  $out = [regex]::Replace($out, '!\[[^\]]*\]\([^)]*\)', '')
  $out = [regex]::Replace($out, '\[!INCLUDE[^\]]*\]\([^)]*\)', '')
  $out = [regex]::Replace($out, '\[([^\]]*)\]\([^)]*\)', '$1')
  $out = [regex]::Replace($out, '<br\s*/?>', ' ')
  $out = [regex]::Replace($out, '<[^>]+>', '')
  $out = $out -replace '\*\*', '' -replace '`', ''
  $out = [regex]::Replace($out, '\s+', ' ')
  return $out.Trim()
}

# Learn strips the dots when it builds a heading anchor, so User.Read.All
# becomes #userreadall.
function Get-Anchor([string]$name) {
  return ($name.ToLowerInvariant() -replace '[^a-z0-9 -]', '' -replace ' ', '-')
}

function Get-Resource([string]$name) {
  $dot = $name.IndexOf(".")
  if ($dot -gt 0) { return $name.Substring(0, $dot) }
  return $name
}

# "-" is how the reference marks a permission that does not exist for that
# category, so it must not become an empty-but-present entry.
function ConvertTo-Cell([string]$value) {
  $clean = ConvertTo-PlainText $value
  if (-not $clean -or $clean -eq "-") { return $null }
  return $clean
}

Write-Host "Reading the Microsoft Graph permissions reference..."
$markdown = Invoke-RestMethod -Uri $SourceUrl -Headers $headers
if ($markdown -isnot [string]) { $markdown = [string]$markdown }
$markdown = $markdown -replace "`r`n", "`n"

$allStart = $markdown.IndexOf("`n## All permissions")
$rscStart = $markdown.IndexOf("`n## Resource-specific consent")
if ($allStart -lt 0) { throw "The 'All permissions' section was not found - the reference layout changed." }

$allSection = if ($rscStart -gt $allStart) { $markdown.Substring($allStart, $rscStart - $allStart) } else { $markdown.Substring($allStart) }

$permissions = [System.Collections.Generic.List[object]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new()

# Each "### <permission>" block holds one Category/Application/Delegated table.
foreach ($block in ([regex]::Split($allSection, "(?m)^### ") | Select-Object -Skip 1)) {
  $newline = $block.IndexOf("`n")
  if ($newline -lt 0) { continue }
  $name = $block.Substring(0, $newline).Trim()
  if (-not $name -or -not $seen.Add($name)) { continue }

  $rows = @{}
  foreach ($line in ($block -split "`n")) {
    $trimmed = $line.Trim()
    if (-not $trimmed.StartsWith("|")) { continue }
    $cells = @(($trimmed.Trim("|") -split '(?<!\\)\|') | ForEach-Object { $_.Trim() })
    if ($cells.Count -lt 3) { continue }
    $label = ConvertTo-PlainText $cells[0]
    if (-not $label -or $label -match '^-+$' -or $label -eq "Category") { continue }
    $rows[$label] = @($cells[1], $cells[2])
  }
  if ($rows.Count -eq 0) { continue }

  $entry = [ordered]@{
    name             = $name
    resource         = Get-Resource $name
    docUrl           = "$DocUrl#$(Get-Anchor $name)"
    # A badge in the block is how the reference flags consumer-account support.
    personalAccounts = [bool]($block -match 'personal Microsoft accounts')
    types            = @()
  }

  # index 0 is the Application column, index 1 the Delegated column
  foreach ($pair in @(@("application", 0), @("delegated", 1))) {
    $kind = $pair[0]
    $index = $pair[1]
    $id = if ($rows.ContainsKey("Identifier")) { ConvertTo-Cell $rows["Identifier"][$index] } else { $null }
    if (-not $id) { continue }
    $consent = if ($rows.ContainsKey("AdminConsentRequired")) { ConvertTo-Cell $rows["AdminConsentRequired"][$index] } else { $null }
    $entry[$kind] = [ordered]@{
      id           = $id
      displayText  = if ($rows.ContainsKey("DisplayText")) { ConvertTo-Cell $rows["DisplayText"][$index] } else { $null }
      description  = if ($rows.ContainsKey("Description")) { ConvertTo-Cell $rows["Description"][$index] } else { $null }
      adminConsent = ($consent -eq "Yes")
    }
    $entry.types = @($entry.types) + $kind
  }

  if (@($entry.types).Count -eq 0) { continue }
  $permissions.Add($entry)
}

Write-Host "Parsed $($permissions.Count) delegated/application permissions."

# Resource-specific consent permissions live in one flat table with a different
# shape: Name | ID | Display text | Description.
$rscCount = 0
if ($rscStart -ge 0) {
  $rscSection = $markdown.Substring($rscStart)
  foreach ($line in ($rscSection -split "`n")) {
    $trimmed = $line.Trim()
    if (-not $trimmed.StartsWith("|")) { continue }
    $cells = @(($trimmed.Trim("|") -split '(?<!\\)\|') | ForEach-Object { $_.Trim() })
    if ($cells.Count -lt 4) { continue }
    $name = ConvertTo-PlainText $cells[0]
    $id = ConvertTo-Cell $cells[1]
    if (-not $name -or $name -eq "Name" -or $name -match '^-+$') { continue }
    if (-not $id -or $id -notmatch '^[0-9a-fA-F-]{36}$') { continue }
    if (-not $seen.Add($name)) { continue }

    $permissions.Add([ordered]@{
        name             = $name
        resource         = Get-Resource $name
        docUrl           = "$DocUrl#resource-specific-consent-rsc-permissions"
        personalAccounts = $false
        types            = @("rsc")
        rsc              = [ordered]@{
          id          = $id
          displayText = ConvertTo-Cell $cells[2]
          description = ConvertTo-Cell $cells[3]
        }
      })
    $rscCount++
  }
}

Write-Host "Parsed $rscCount resource-specific consent permissions."

if ($permissions.Count -lt 500) { throw "Only $($permissions.Count) permissions parsed - refusing to overwrite permissions.json with a truncated payload." }

$sorted = @($permissions | Sort-Object { $_.name })
$resources = @($sorted | ForEach-Object { $_.resource } | Sort-Object -Unique)

$delegatedCount = @($sorted | Where-Object { @($_.types) -contains "delegated" }).Count
$applicationCount = @($sorted | Where-Object { @($_.types) -contains "application" }).Count
$adminConsentCount = @($sorted | Where-Object {
    ($_.Contains("delegated") -and $_.delegated.adminConsent) -or ($_.Contains("application") -and $_.application.adminConsent)
  }).Count

$payload = [ordered]@{
  generatedAt       = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source            = "Microsoft Graph permissions reference (microsoftgraph/microsoft-graph-docs-contrib)"
  sourceUrl         = $DocUrl
  totalPermissions  = $sorted.Count
  totalResources    = $resources.Count
  delegatedCount    = $delegatedCount
  applicationCount  = $applicationCount
  rscCount          = $rscCount
  adminConsentCount = $adminConsentCount
  resources         = $resources
  permissions       = $sorted
}

$outputPath = Join-Path (Split-Path -Parent $PSCommandPath) "permissions.json"
($payload | ConvertTo-Json -Depth 10 -Compress) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8

Write-Host "Fetched $($sorted.Count) Graph permissions ($delegatedCount delegated, $applicationCount application, $rscCount RSC, $($resources.Count) resources) into $outputPath"
