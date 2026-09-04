#!/usr/bin/env pwsh
# Refreshes entra-built-in-roles/roles.json from the generated Microsoft Entra
# built-in roles reference published in MicrosoftDocs/entra-docs.
#
# Why the docs and not Microsoft Graph: the generated reference gives the role
# template ID, the privileged classification and a plain-English description for
# every allowed resource action - the last two are not on the Graph
# roleDefinitions resource. The source is public, so this refresh needs no
# tenant, no app registration and no secret.
$ErrorActionPreference = "Stop"

$RawBase = "https://raw.githubusercontent.com/MicrosoftDocs/entra-docs/main/docs/identity/role-based-access-control"
$DocUrl = "https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference"

$headers = @{ "User-Agent" = "benoit-gaumard.io-refresh" }
if ($env:GITHUB_TOKEN) { $headers["Authorization"] = "Bearer $($env:GITHUB_TOKEN)" }

function ConvertTo-PlainText([string]$text) {
  if (-not $text) { return "" }
  $out = $text
  $out = [regex]::Replace($out, '\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)', '')  # linked badge image
  $out = [regex]::Replace($out, '!\[[^\]]*\]\([^)]*\)', '')               # bare image
  $out = [regex]::Replace($out, '\[!INCLUDE[^\]]*\]\([^)]*\)', '')
  $out = [regex]::Replace($out, '\[([^\]]*)\]\([^)]*\)', '$1')            # markdown link -> label
  $out = [regex]::Replace($out, '<br\s*/?>', ' ')
  $out = [regex]::Replace($out, '<[^>]+>', '')
  $out = $out -replace '\*\*', '' -replace '`', ''
  $out = [regex]::Replace($out, '\s+', ' ')
  return $out.Trim()
}

function Get-Markdown([string]$path) {
  $content = Invoke-RestMethod -Uri "$RawBase/$path" -Headers $headers
  if ($content -isnot [string]) { $content = [string]$content }
  return ($content -replace "`r`n", "`n")
}

# Rows look like: > | [Role](#anchor) | Description | template-guid |
function Get-TableRow([string]$markdown) {
  $rows = [System.Collections.Generic.List[object]]::new()
  foreach ($line in ($markdown -split "`n")) {
    $trimmed = $line.Trim()
    if (-not $trimmed.StartsWith(">")) { continue }
    $row = $trimmed.TrimStart(">").Trim()
    if (-not $row.StartsWith("|")) { continue }
    $cells = @(($row.Trim("|") -split '(?<!\\)\|') | ForEach-Object { $_.Trim() })
    if ($cells.Count -lt 2) { continue }
    if ($cells[0] -match '^-+$') { continue }
    $rows.Add($cells)
  }
  return , $rows.ToArray()
}

Write-Host "Reading the Microsoft Entra built-in roles reference..."
$reference = Get-Markdown "permissions-reference.md"

# Which include file holds each role's action table, from "## Role" headings.
$includeByRole = @{}
foreach ($match in [regex]::Matches($reference, '(?m)^## (?<name>.+?)\r?\n(?:\s*\r?\n)*\[!INCLUDE \[[^\]]*\]\((?<path>includes/[^)]+)\)\]')) {
  $includeByRole[$match.Groups["name"].Value.Trim()] = $match.Groups["path"].Value.Trim()
}

$roles = [System.Collections.Generic.List[object]]::new()
$seen = [System.Collections.Generic.HashSet[string]]::new()

foreach ($cells in (Get-TableRow $reference)) {
  if ($cells.Count -lt 3) { continue }
  $templateId = $cells[2].Trim()
  if ($templateId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') { continue }

  $displayName = ConvertTo-PlainText $cells[0]
  if (-not $displayName -or -not $seen.Add($templateId)) { continue }

  $anchorMatch = [regex]::Match($cells[0], '\]\(#(?<anchor>[^)]+)\)')
  $anchor = if ($anchorMatch.Success) { $anchorMatch.Groups["anchor"].Value } else { $displayName.ToLowerInvariant() -replace '[^a-z0-9 -]', '' -replace ' ', '-' }

  $roles.Add([ordered]@{
      displayName  = $displayName
      templateId   = $templateId
      description  = ConvertTo-PlainText $cells[1]
      # Microsoft flags privileged roles with a badge image in the description cell.
      isPrivileged = [bool]($cells[1] -match 'privileged-label')
      docUrl       = "$DocUrl#$anchor"
      permissions  = @()
      services     = @()
    })
}

if ($roles.Count -eq 0) { throw "No Entra ID built-in roles were parsed - refusing to overwrite roles.json with an empty payload." }

Write-Host "Found $($roles.Count) roles; reading their permission tables..."

$index = 0
foreach ($role in $roles) {
  $index++
  if ($index % 25 -eq 0) { Write-Host "  $index / $($roles.Count)..." }

  $include = $includeByRole[$role.displayName]
  if (-not $include) { continue }

  try {
    $markdown = Get-Markdown $include
  } catch {
    Write-Warning "Skipping permissions for '$($role.displayName)': $($_.Exception.Message)"
    continue
  }

  $pairs = [System.Collections.Generic.List[object]]::new()
  $namespaces = [System.Collections.Generic.List[string]]::new()
  foreach ($cells in (Get-TableRow $markdown)) {
    $action = ConvertTo-PlainText $cells[0]
    if (-not $action -or $action -eq "Actions" -or $action -eq "Description") { continue }
    if ($action -notmatch '/') { continue }
    $pairs.Add(@($action, (ConvertTo-PlainText $cells[1])))
    $ns = $action.Substring(0, $action.IndexOf("/"))
    if ($ns -and -not $namespaces.Contains($ns)) { $namespaces.Add($ns) }
  }

  $role.permissions = $pairs.ToArray()
  $role.services = @($namespaces | Sort-Object)
}

foreach ($role in $roles) { $role.permissionCount = $role.permissions.Count }

$sorted = @($roles | Sort-Object { $_.displayName })
$services = @($sorted | ForEach-Object { $_.services } | Sort-Object -Unique)
$totalPermissions = ($sorted | ForEach-Object { $_.permissionCount } | Measure-Object -Sum).Sum

$payload = [ordered]@{
  generatedAt      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source           = "Microsoft Entra built-in roles generated reference (MicrosoftDocs/entra-docs)"
  sourceUrl        = $DocUrl
  totalRoles       = $sorted.Count
  totalServices    = $services.Count
  totalPermissions = $totalPermissions
  privilegedCount  = @($sorted | Where-Object { $_.isPrivileged }).Count
  services         = $services
  roles            = $sorted
}

$outputPath = Join-Path (Split-Path -Parent $PSCommandPath) "roles.json"
($payload | ConvertTo-Json -Depth 10 -Compress) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8

Write-Host "Fetched $($sorted.Count) Entra ID built-in roles ($($services.Count) services, $totalPermissions permissions) into $outputPath"
