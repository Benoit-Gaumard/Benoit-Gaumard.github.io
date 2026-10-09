function Get-RoleHistoryIndex {
  param($Snapshot)

  if ($null -eq $Snapshot -or $Snapshot.roles -isnot [array]) { throw "Missing role snapshot." }
  $stamp = [datetimeoffset]::MinValue
  if (-not [datetimeoffset]::TryParse([string]$Snapshot.generatedAt, [ref]$stamp)) { throw "Invalid role snapshot timestamp." }
  $index = [hashtable]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($role in $Snapshot.roles) {
    $guid = [guid]::Empty
    if (-not $role -or -not [guid]::TryParse([string]$role.id, [ref]$guid) -or $index.ContainsKey($role.id) -or
        $role.roleName -isnot [string] -or [string]::IsNullOrWhiteSpace($role.roleName) -or
        $role.description -isnot [string] -or $role.category -isnot [string] -or $role.isPrivileged -isnot [bool]) {
      throw "Invalid or duplicate role in the history snapshot."
    }
    foreach ($field in @("categories", "providers", "assignableScopes")) {
      if ($role.$field -isnot [array] -or @($role.$field | Where-Object { $_ -isnot [string] -or [string]::IsNullOrWhiteSpace($_) }).Count) {
        throw "Invalid $field for role $($role.id)."
      }
    }
    foreach ($field in @("actions", "notActions", "dataActions", "notDataActions")) {
      if ($role.$field -isnot [array]) { throw "Missing $field for role $($role.id)." }
      foreach ($pair in $role.$field) {
        if ($pair -isnot [array] -or $pair.Count -ne 2 -or $pair[0] -isnot [string] -or
            [string]::IsNullOrWhiteSpace($pair[0]) -or $pair[1] -isnot [string]) {
          throw "Invalid $field entry for role $($role.id)."
        }
      }
    }
    $index[$role.id] = $role
  }
  return $index
}

function Get-RoleHistoryComparisonValue {
  param($Value)

  if ($Value -is [array]) {
    # Array order is not a permission change. Keep exact strings and duplicate entries.
    $items = [System.Collections.Generic.List[string]]::new()
    foreach ($item in $Value) { $items.Add((ConvertTo-Json -InputObject $item -Depth 10 -Compress)) }
    $items.Sort([System.StringComparer]::Ordinal)
    return ConvertTo-Json -InputObject $items.ToArray() -Depth 10 -Compress
  }
  return ConvertTo-Json -InputObject $Value -Depth 10 -Compress
}

function New-RoleHistory {
  param($Previous, $Current, $Existing)

  $currentIndex = Get-RoleHistoryIndex $Current
  $previousIndex = if ($null -ne $Previous) { Get-RoleHistoryIndex $Previous } else { $null }
  $detectedAt = ([datetimeoffset]$Current.generatedAt).ToUniversalTime()
  if ($Previous -and $detectedAt -lt [datetimeoffset]$Previous.generatedAt) { throw "Role snapshots are out of chronological order." }
  $baselineAt = if ($Previous) { $Previous.generatedAt } else { $Current.generatedAt }
  $retained = @()
  if ($null -ne $Existing) {
    if ($null -eq $Previous) { throw "The previous role snapshot is required to continue existing history." }
    $stamp = [datetimeoffset]::MinValue
    if ($Existing.entries -isnot [array] -or $Existing.schemaVersion -ne 1 -or
        -not [datetimeoffset]::TryParse([string]$Existing.baselineAt, [ref]$stamp) -or
        -not [datetimeoffset]::TryParse([string]$Existing.generatedAt, [ref]$stamp)) {
      throw "Invalid existing role history; refusing to replace it."
    }
    $existingAt = [datetimeoffset]$Existing.generatedAt
    if ([datetimeoffset]$Existing.baselineAt -gt $existingAt -or $existingAt -gt $detectedAt) {
      throw "Existing role history is newer than the snapshot or has an invalid baseline."
    }
    if ($existingAt -ne [datetimeoffset]$Previous.generatedAt -and $existingAt -ne $detectedAt) {
      throw "The previous role snapshot and history do not describe the same observation."
    }
    foreach ($entry in $Existing.entries) {
      $id = [guid]::Empty
      if (-not $entry -or $entry.kind -ne "role" -or $entry.change -notin @("added", "modified", "removed") -or
          -not [guid]::TryParse([string]$entry.name, [ref]$id) -or
          $entry.displayName -isnot [string] -or $entry.category -isnot [string] -or
          -not [datetimeoffset]::TryParse([string]$entry.detectedAt, [ref]$stamp) -or [datetimeoffset]$entry.detectedAt -gt $detectedAt) {
        throw "Invalid existing role event; refusing to discard history."
      }
      if ($entry.change -eq "modified") {
        if ($entry.fields -isnot [array] -or $entry.fields.Count -eq 0) { throw "Missing role change evidence." }
        foreach ($field in $entry.fields) {
          if ($field.field -isnot [string] -or -not $field.field -or
              $field.PSObject.Properties.Name -notcontains "from" -or $field.PSObject.Properties.Name -notcontains "to") {
            throw "Invalid role change evidence."
          }
        }
      }
    }
    $baselineAt = $Existing.baselineAt
    $retained = @($Existing.entries)
  }

  $tracked = @("roleName", "description", "categories", "isPrivileged", "assignableScopes", "actions", "notActions", "dataActions", "notDataActions")
  $events = [System.Collections.Generic.List[object]]::new()
  if ($null -ne $previousIndex) {
    foreach ($role in $Current.roles) {
      $before = $previousIndex[$role.id]
      $fields = [System.Collections.Generic.List[object]]::new()
      if ($before) {
        foreach ($field in $tracked) {
          if ((Get-RoleHistoryComparisonValue $before.$field) -cne (Get-RoleHistoryComparisonValue $role.$field)) {
            $fields.Add([ordered]@{ field = $field; from = $before.$field; to = $role.$field })
          }
        }
        if ($fields.Count -eq 0) { continue }
      }
      $entry = [ordered]@{
        detectedAt = $Current.generatedAt
        kind = "role"
        change = if ($before) { "modified" } else { "added" }
        name = $role.id
        displayName = $role.roleName
        category = $role.category
      }
      if ($before) { $entry.fields = $fields.ToArray() }
      $events.Add($entry)
    }
    foreach ($role in $Previous.roles) {
      if ($currentIndex.ContainsKey($role.id)) { continue }
      $events.Add([ordered]@{
        detectedAt = $Current.generatedAt
        kind = "role"
        change = "removed"
        name = $role.id
        displayName = $role.roleName
        category = $role.category
      })
    }
  }
  $newCount = $events.Count
  $cutoff = $detectedAt.AddDays(-180)
  $keys = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($entry in $events) {
    [void]$keys.Add("$(([datetimeoffset]$entry.detectedAt).ToUniversalTime().ToString('o'))|$($entry.name)|$($entry.change)")
  }
  foreach ($entry in $retained) {
    $key = "$(([datetimeoffset]$entry.detectedAt).ToUniversalTime().ToString('o'))|$($entry.name)|$($entry.change)"
    if ([datetimeoffset]$entry.detectedAt -ge $cutoff -and $keys.Add($key)) { $events.Add($entry) }
  }
  $entries = @($events | Sort-Object { [datetimeoffset]$_.detectedAt } -Descending | Select-Object -First 3000)
  return [ordered]@{
    schemaVersion = 1
    generatedAt = $Current.generatedAt
    baselineAt = $baselineAt
    source = "Consecutive complete Azure RBAC reference snapshots collected from MicrosoftDocs/azure-docs"
    retentionDays = 180
    maxEntries = 3000
    lastRunEntries = $newCount
    totalEntries = $entries.Count
    entries = $entries
  }
}
