#!/usr/bin/env pwsh
# Refreshes azure-built-in-roles/roles.json from the generated Azure RBAC reference
# published by Microsoft in MicrosoftDocs/azure-docs.
#
# Why the docs and not Get-AzRoleDefinition: the generated reference carries the
# full role definition JSON *and* two things the ARM API does not return - the
# service category each role belongs to, and a plain-English description for
# every individual action. Those descriptions are the point of the page. The
# source is public, so this refresh needs no tenant and no secret.
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $PSCommandPath
. (Join-Path $scriptDir "role-history.ps1")
$outputPath = Join-Path $scriptDir "roles.json"
$changesPath = Join-Path $scriptDir "role-changes.json"
$previous = if (Test-Path $outputPath) { Get-Content -LiteralPath $outputPath -Raw | ConvertFrom-Json } else { $null }
$existingHistory = if (Test-Path $changesPath) { Get-Content -LiteralPath $changesPath -Raw | ConvertFrom-Json } else { $null }

$RepoApi = "https://api.github.com/repos/MicrosoftDocs/azure-docs/contents/articles/role-based-access-control/built-in-roles"
$RawBase = "https://raw.githubusercontent.com/MicrosoftDocs/azure-docs/main/articles/role-based-access-control/built-in-roles"
$DocBase = "https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles"

# Microsoft's own category labels, which do not always survive the slugging.
$CategoryLabels = @{
  "ai-machine-learning"       = "AI + machine learning"
  "analytics"                 = "Analytics"
  "compute"                   = "Compute"
  "containers"                = "Containers"
  "databases"                 = "Databases"
  "devops"                    = "DevOps"
  "general"                   = "General"
  "hybrid-multicloud"         = "Hybrid + multicloud"
  "identity"                  = "Identity"
  "integration"               = "Integration"
  "internet-of-things"        = "Internet of Things"
  "management-and-governance" = "Management + governance"
  "migration"                 = "Migration"
  "monitor"                   = "Monitor"
  "networking"                = "Networking"
  "privileged"                = "Privileged"
  "security"                  = "Security"
  "storage"                   = "Storage"
  "web-and-mobile"            = "Web + mobile"
}

$headers = @{ "User-Agent" = "benoit-gaumard.io-refresh" }
if ($env:GITHUB_TOKEN) { $headers["Authorization"] = "Bearer $($env:GITHUB_TOKEN)" }

function Get-CategoryFile {
  $entries = Invoke-RestMethod -Uri $RepoApi -Headers $headers
  $names = @($entries | Where-Object { $_.type -eq "file" -and $_.name -like "*.md" } | ForEach-Object { $_.name })
  if ($names.Count -eq 0) { throw "No role category files found; refusing an incomplete refresh." }
  return $names
}

function ConvertTo-PlainText([string]$text) {
  if (-not $text) { return "" }
  $out = $text
  $out = [regex]::Replace($out, '\[!INCLUDE[^\]]*\]\([^)]*\)', '')
  $out = [regex]::Replace($out, '\[([^\]]*)\]\([^)]*\)', '$1')   # markdown link -> label
  $out = [regex]::Replace($out, '<br\s*/?>', ' ')
  $out = [regex]::Replace($out, '<[^>]+>', '')
  $out = $out -replace '\*\*', '' -replace '`', ''
  $out = [regex]::Replace($out, '\s+', ' ')
  return $out.Trim()
}

# The generated tables are blockquotes: "> | action | description |". Rows that
# only announce the next bucket (**NotActions**) or say *none* carry no action,
# so they are skipped rather than stored as pseudo-actions.
function Get-ActionDescription([string]$section) {
  $map = @{}
  foreach ($line in ($section -split "`n")) {
    $trimmed = $line.Trim()
    if (-not $trimmed.StartsWith(">")) { continue }
    $row = $trimmed.TrimStart(">").Trim()
    if (-not $row.StartsWith("|")) { continue }
    $cells = @(($row.Trim("|") -split '(?<!\\)\|'))
    if ($cells.Count -lt 2) { continue }
    $action = ConvertTo-PlainText $cells[0]
    if (-not $action) { continue }
    if ($action -match '^-+$') { continue }
    if ($action -in @("Actions", "DataActions", "NotActions", "NotDataActions", "Description")) { continue }
    if ($action -eq "none") { continue }
    $description = ConvertTo-PlainText $cells[1]
    if ($description -and -not $map.ContainsKey($action)) { $map[$action] = $description }
  }
  return $map
}

# [action, description] pairs keep the payload small; the page reads index 0/1.
function ConvertTo-ActionPair($actions, $descriptions) {
  $pairs = [System.Collections.Generic.List[object]]::new()
  foreach ($action in @($actions)) {
    if (-not $action) { continue }
    $description = ""
    if ($descriptions.ContainsKey($action)) { $description = $descriptions[$action] }
    $pairs.Add(@($action, $description))
  }
  # Leading comma: without it PowerShell unrolls the list into the pipeline and
  # a one-action role would serialise as a flat ["action","description"].
  return , $pairs.ToArray()
}

$roleById = [ordered]@{}

foreach ($file in (Get-CategoryFile)) {
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($file)
  $category = if ($CategoryLabels.ContainsKey($slug)) { $CategoryLabels[$slug] } else { (Get-Culture).TextInfo.ToTitleCase($slug -replace '-', ' ') }
  Write-Host "Reading $file ($category)..."

  # A skipped category would look like removed roles in the history.
  $markdown = Invoke-RestMethod -Uri "$RawBase/$file" -Headers $headers
  if ($markdown -isnot [string]) { $markdown = [string]$markdown }
  $markdown = $markdown -replace "`r`n", "`n"

  # Each "## <role name>" block owns one fenced role definition JSON.
  $sections = [regex]::Split($markdown, "(?m)^## ")
  $parsedRoles = 0
  foreach ($section in ($sections | Select-Object -Skip 1)) {
    $newline = $section.IndexOf("`n")
    if ($newline -lt 0) { continue }
    $heading = $section.Substring(0, $newline).Trim()
    if ($heading -in @("Next steps", "Related content", "See also")) { continue }

    $jsonMatch = [regex]::Match($section, '```json\s*(?<body>\{[\s\S]*?\})\s*```')
    if (-not $jsonMatch.Success) { continue }

    try {
      $definition = $jsonMatch.Groups["body"].Value | ConvertFrom-Json
    } catch {
      throw "Unparsable role definition under '$heading' in ${file}: $($_.Exception.Message)"
    }

    $roleId = $definition.name
    if (-not $roleId) { throw "Missing role ID under '$heading' in $file." }
    $parsedRoles++

    if ($roleById.Contains($roleId)) {
      # A role can be documented in several categories (Owner is both General
      # and Privileged); record every one instead of letting the last win.
      $existing = $roleById[$roleId]
      if ($existing.categories -notcontains $category) { $existing.categories = @($existing.categories) + $category }
      continue
    }
    if ($parsedRoles -eq 0) { throw "No roles parsed from $file; refusing an incomplete refresh." }

    $descriptions = Get-ActionDescription $section

    $actions = [System.Collections.Generic.List[string]]::new()
    $notActions = [System.Collections.Generic.List[string]]::new()
    $dataActions = [System.Collections.Generic.List[string]]::new()
    $notDataActions = [System.Collections.Generic.List[string]]::new()
    foreach ($permission in @($definition.permissions)) {
      foreach ($a in @($permission.actions)) { if ($a) { $actions.Add($a) } }
      foreach ($a in @($permission.notActions)) { if ($a) { $notActions.Add($a) } }
      foreach ($a in @($permission.dataActions)) { if ($a) { $dataActions.Add($a) } }
      foreach ($a in @($permission.notDataActions)) { if ($a) { $notDataActions.Add($a) } }
    }

    $anchor = ($heading.ToLowerInvariant() -replace '[^a-z0-9 -]', '' -replace ' ', '-')

    $roleById[$roleId] = [ordered]@{
      roleName         = $heading
      id               = $roleId
      description      = ConvertTo-PlainText $definition.description
      categories       = @($category)
      docUrl           = "$DocBase/$slug#$anchor"
      assignableScopes = @($definition.assignableScopes)
      actions          = ConvertTo-ActionPair $actions $descriptions
      notActions       = ConvertTo-ActionPair $notActions $descriptions
      dataActions      = ConvertTo-ActionPair $dataActions $descriptions
      notDataActions   = ConvertTo-ActionPair $notDataActions $descriptions
    }
  }
}

if ($roleById.Count -eq 0) { throw "No built-in roles were parsed - refusing to overwrite roles.json with an empty payload." }

$roles = @($roleById.Values | Sort-Object { $_.roleName })

foreach ($role in $roles) {
  $namespaces = [System.Collections.Generic.List[string]]::new()
  foreach ($bucket in @("actions", "dataActions")) {
    $pairs = $role[$bucket]
    for ($i = 0; $i -lt $pairs.Count; $i++) {
      $action = [string]$pairs[$i][0]
      $slash = $action.IndexOf("/")
      $ns = if ($slash -gt 0) { $action.Substring(0, $slash) } else { $action }
      if ($ns -and $ns -ne "*" -and -not $namespaces.Contains($ns)) { $namespaces.Add($ns) }
    }
  }
  $role.providers = @($namespaces | Sort-Object)
  $role.category = @($role.categories)[0]
  # "Privileged" is Microsoft's own classification, not a heuristic of ours.
  $role.isPrivileged = [bool](@($role.categories) -contains "Privileged")
  $role.actionCount = $role.actions.Count + $role.notActions.Count + $role.dataActions.Count + $role.notDataActions.Count
}

$categories = @($roles | ForEach-Object { $_.categories } | Sort-Object -Unique)
$providers = @($roles | ForEach-Object { $_.providers } | Sort-Object -Unique)
$totalActions = ($roles | ForEach-Object { $_.actionCount } | Measure-Object -Sum).Sum

$payload = [ordered]@{
  generatedAt     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source          = "Azure RBAC built-in roles generated reference (MicrosoftDocs/azure-docs)"
  sourceUrl       = "https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles"
  totalRoles      = $roles.Count
  totalCategories = $categories.Count
  totalProviders  = $providers.Count
  totalActions    = $totalActions
  privilegedCount = @($roles | Where-Object { $_.isPrivileged }).Count
  categories      = $categories
  roles           = $roles
}

$history = New-RoleHistory -Previous $previous -Current ([pscustomobject]$payload) -Existing $existingHistory
($payload | ConvertTo-Json -Depth 10 -Compress) + "`n" | Set-Content -Path $outputPath -NoNewline -Encoding utf8
($history | ConvertTo-Json -Depth 15) + "`n" | Set-Content -Path $changesPath -NoNewline -Encoding utf8

Write-Host "Fetched $($roles.Count) built-in roles ($($categories.Count) categories, $totalActions actions) into $outputPath"
Write-Host "Recorded $($history.lastRunEntries) role changes; $($history.totalEntries) retained."
