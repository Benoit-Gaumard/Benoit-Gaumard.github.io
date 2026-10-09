$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$directory = Join-Path $root "azure-built-in-roles"
. (Join-Path $directory "role-history.ps1")

function Assert-Equal($Expected, $Actual, [string]$Label) {
  if ($Expected -cne $Actual) { throw "${Label}: expected '$Expected', got '$Actual'." }
}
function Assert-Throws([scriptblock]$Action, [string]$Label) {
  $failed = $false
  try { & $Action | Out-Null } catch { $failed = $true }
  if (-not $failed) { throw "$Label should fail." }
}
function Clone($Value) { return ConvertFrom-Json -InputObject (ConvertTo-Json -InputObject $Value -Depth 15) }
function Snapshot([object[]]$Roles, [string]$At = "2026-10-08T12:00:00Z") {
  return [pscustomobject]@{ generatedAt = $At; roles = $Roles }
}
$source = Get-Content (Join-Path $directory "roles.json") -Raw | ConvertFrom-Json
$original = ConvertTo-Json -InputObject $source -Depth 15 -Compress
$a = Clone $source.roles[0]
$b = Clone $source.roles[1]
$old = Snapshot @($a) "2026-10-07T12:00:00Z"
$current = Snapshot @($a, $b)
$baseline = New-RoleHistory -Current $old
Assert-Equal 0 $baseline.entries.Count "First snapshot is a baseline, not hundreds of additions"
Assert-Equal $old.generatedAt $baseline.baselineAt "Baseline timestamp uses source observation"
$added = New-RoleHistory -Previous $old -Current $current -Existing (Clone $baseline)
Assert-Equal 1 $added.entries.Count "Addition recorded"
Assert-Equal "added" $added.entries[0].change "Added label"
Assert-Equal $b.id $added.entries[0].name "Exact added GUID"
$removed = New-RoleHistory -Previous $current -Current (Snapshot @($a) "2026-10-09T12:00:00Z") -Existing (Clone $added)
Assert-Equal 2 $removed.entries.Count "Prior events retained"
Assert-Equal "removed" $removed.entries[0].change "Removal recorded"
Assert-Equal $b.roleName $removed.entries[0].displayName "Historical removed name"

$changed = Clone $a
$changed.roleName = "Updated name"
$changed.isPrivileged = -not $a.isPrivileged
$changed.actions = ,@("Microsoft.Example/items/read", "New source description")
$delta = New-RoleHistory -Previous $old -Current (Snapshot @($changed))
Assert-Equal 1 $delta.entries.Count "One role update, not one event per field"
Assert-Equal 3 $delta.entries[0].fields.Count "Name, privilege and same-count permission changes"
$roundTrip = Clone $delta
Assert-Equal $true ($roundTrip.entries -is [array]) "One event remains an array"
Assert-Equal $true ($roundTrip.entries[0].fields -is [array]) "Field evidence remains an array"
$permission = $roundTrip.entries[0].fields | Where-Object field -eq "actions"
Assert-Equal $true ($permission.to -is [array]) "Permission list retained"
Assert-Equal $true ($permission.to[0] -is [array]) "One permission remains a pair"
Assert-Equal "New source description" $permission.to[0][1] "Permission description retained"
$privilege = $roundTrip.entries[0].fields | Where-Object field -eq "isPrivileged"
Assert-Equal $true ($privilege.to -is [bool]) "Privilege stays a boolean"

$reordered = Clone $a
$reordered.id = $reordered.id.ToUpperInvariant()
$reordered.categories = @("First", "Second")
$reordered.actions = @(@("a/read", "A"), @("b/read", "B"))
$reverse = Clone $reordered
$reverse.categories = @("Second", "First")
$reverse.actions = @(@("b/read", "B"), @("a/read", "A"))
$reverse.id = $reverse.id.ToLowerInvariant()
Assert-Equal 0 (New-RoleHistory -Previous (Snapshot @($reordered)) -Current (Snapshot @($reverse))).entries.Count "Order and GUID casing ignored"
$reverse.actions[0][1] = "New description"
Assert-Equal 1 (New-RoleHistory -Previous (Snapshot @($reordered)) -Current (Snapshot @($reverse))).entries.Count "Description-only edits count"
$reverse = Clone $reordered
$reverse.actions[0][0] = "A/read"
Assert-Equal 1 (New-RoleHistory -Previous (Snapshot @($reordered)) -Current (Snapshot @($reverse))).entries.Count "Exact pattern casing changes remain observable"
$reverse = Clone $reordered
$reverse.assignableScopes = @("/subscriptions/example")
Assert-Equal "assignableScopes" (New-RoleHistory -Previous (Snapshot @($reordered)) -Current (Snapshot @($reverse))).entries[0].fields[0].field "Scopes tracked"
Assert-Equal 1 (New-RoleHistory -Previous (Snapshot @()) -Current (Snapshot @($a))).entries.Count "Known empty previous snapshot allows additions"
Assert-Equal "removed" (New-RoleHistory -Previous $old -Current (Snapshot @())).entries[0].change "Known empty current snapshot supports removals"

Assert-Throws { New-RoleHistory -Current (Snapshot @($a, $a)) } "Duplicate GUID"
$invalid = Clone $a
$invalid.actions = $null
Assert-Throws { New-RoleHistory -Previous (Snapshot @($invalid)) -Current $current } "Incomplete previous bucket"
Assert-Throws { New-RoleHistory -Current (Snapshot @($invalid)) } "Incomplete current bucket"
Assert-Throws { New-RoleHistory -Current (Snapshot @($a) "not a timestamp") } "Unknown observation timestamp"
Assert-Throws { New-RoleHistory -Previous $current -Current $old } "Backward observation"
Assert-Throws { New-RoleHistory -Previous $old -Current $current -Existing ([pscustomobject]@{ entries = @() }) } "Corrupted existing history"
Assert-Throws { New-RoleHistory -Current $current -Existing (Clone $baseline) } "Missing previous snapshot with existing history"
$inconsistent = Clone $baseline
$inconsistent.generatedAt = "2026-10-06T12:00:00Z"
Assert-Throws { New-RoleHistory -Previous $old -Current $current -Existing $inconsistent } "Mismatched observations"
$expired = Clone $added
$expired.entries[0].detectedAt = "2025-01-01T00:00:00Z"
Assert-Equal 0 (New-RoleHistory -Previous $current -Current $current -Existing $expired).entries.Count "Retention cutoff"
Assert-Equal 1 (New-RoleHistory -Previous $old -Current $current -Existing (Clone $added)).entries.Count "Replay does not duplicate an event"
$many = Clone $baseline
$many.entries = @(1..3001 | ForEach-Object {
  [pscustomobject]@{
    detectedAt = $old.generatedAt; kind = "role"; change = "added"
    name = [guid]::NewGuid().ToString(); displayName = "Test $_"; category = "Test"
  }
})
Assert-Equal 3000 (New-RoleHistory -Previous $old -Current (Snapshot @($a)) -Existing $many).entries.Count "Retention count limit"
Assert-Equal 0 (New-RoleHistory -Previous $source -Current $source).entries.Count "Stored full catalogue self-comparison"
Assert-Equal $original (ConvertTo-Json -InputObject $source -Depth 15 -Compress) "Input remains unchanged"

$collector = Join-Path $directory "fetch-updates.ps1"
$parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($collector, [ref]$null, [ref]$parseErrors)
Assert-Equal 0 $parseErrors.Count "Collector parses"
$scratch = Join-Path ([IO.Path]::GetTempPath()) ("roles-history-test-" + [guid]::NewGuid())
[void](New-Item -ItemType Directory -Path $scratch)
try {
  Copy-Item -LiteralPath $collector, (Join-Path $directory "role-history.ps1"), (Join-Path $directory "roles.json") -Destination $scratch
  $snapshotPath = Join-Path $scratch "roles.json"
  $beforeHash = (Get-FileHash -LiteralPath $snapshotPath).Hash
  function Invoke-RestMethod {
    param($Uri, $Headers)
    if ($Uri -like "https://api.github.com/*") { return @([pscustomobject]@{ type = "file"; name = "general.md" }) }
    throw "Simulated category outage"
  }
  Assert-Throws { & (Join-Path $scratch "fetch-updates.ps1") } "Missing category aborts the refresh"
  Assert-Equal $beforeHash (Get-FileHash -LiteralPath $snapshotPath).Hash "Failed refresh keeps snapshot"
  Assert-Equal $false (Test-Path (Join-Path $scratch "role-changes.json")) "No bogus deletion events on failure"

  $previousFixture = Snapshot @($a) $source.generatedAt
  $previousFixture | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $snapshotPath -Encoding utf8
  $baselinePath = Join-Path $scratch "role-changes.json"
  New-RoleHistory -Current $previousFixture | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $baselinePath -Encoding utf8
  $markdown = @($a, $b) | ForEach-Object {
    $role = $_
    $permission = [ordered]@{}
    foreach ($field in @("actions", "notActions", "dataActions", "notDataActions")) {
      $permission[$field] = @($role.$field | ForEach-Object { $_[0] })
    }
    $definition = [ordered]@{ name = $role.id; description = $role.description; assignableScopes = $role.assignableScopes; permissions = @($permission) }
    "## $($role.roleName)`n" + '```json' + "`n" + ($definition | ConvertTo-Json -Depth 10) + "`n" + '```'
  }
  $fixtureMarkdown = $markdown -join "`n`n"
  function Invoke-RestMethod {
    param($Uri, $Headers)
    if ($Uri -like "https://api.github.com/*") { return @([pscustomobject]@{ type = "file"; name = "general.md" }) }
    return $fixtureMarkdown
  }
  & (Join-Path $scratch "fetch-updates.ps1")
  $written = Get-Content -LiteralPath $snapshotPath -Raw | ConvertFrom-Json
  $writtenHistory = Get-Content -LiteralPath $baselinePath -Raw | ConvertFrom-Json
  Assert-Equal 2 $written.roles.Count "Successful collector writes complete snapshot"
  Assert-Equal $written.generatedAt $writtenHistory.generatedAt "Snapshot and history share an observation"
  Assert-Equal $b.id @($writtenHistory.entries | Where-Object change -eq "added")[0].name "New parsed role creates a real event"
  Assert-Equal 2 (Get-RoleHistoryIndex $written).Count "Collector output remains valid"
} finally {
  Remove-Item Function:\Invoke-RestMethod -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $scratch -Recurse -Force
}
Write-Host "Role history checks passed. No network or Azure connection was made."
