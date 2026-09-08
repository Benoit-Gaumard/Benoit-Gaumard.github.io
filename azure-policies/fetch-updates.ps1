#!/usr/bin/env pwsh
# Refreshes azure-policies/policydefinitions.json and policysetdefinitions.json directly from Azure
# via Get-AzPolicyDefinition/Get-AzPolicySetDefinition, authenticating as the
# "scan-benoit-gaumard.io" Entra ID service principal.
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

# Az.Resources' policy cmdlets expose most fields both flattened (top-level, via ETS aliases) and
# nested under .Properties depending on module version, so read defensively.
function Get-PolicyProperty {
  param($Item, [string[]]$Names)
  foreach ($name in $Names) {
    $value = $Item.$name
    if ($null -eq $value -and $Item.Properties) { $value = $Item.Properties.$name }
    if ($null -ne $value) { return $value }
  }
  return $null
}

# The newer object shape dropped ResourceId in favour of Id, and moved the
# initiative's member list off PolicyDefinitions. Both changes were silent: the
# fields simply came back null and every initiative shipped with 0 policies.
# Candidate names cover both generations; the walk below covers the next rename.
function Get-PolicyDefinitionReference {
  param($SetDefinition)

  $value = Get-PolicyProperty $SetDefinition @("PolicyDefinition", "PolicyDefinitions")
  if ($value) { return @($value) }

  foreach ($container in @($SetDefinition, $SetDefinition.Properties)) {
    if (-not $container) { continue }
    foreach ($property in $container.PSObject.Properties) {
      $items = @($property.Value)
      if ($items.Count -eq 0 -or $null -eq $items[0]) { continue }
      # The REST contract is stable even when the wrapper renames things: every
      # member of the array carries a policyDefinitionId.
      if ($items[0].PSObject.Properties.Name -contains "policyDefinitionId") { return $items }
    }
  }
  return @()
}

# Azure spells the same effect three ways across the built-in set ("audit",
# "Audit", "AuditIfNotExists" vs "auditIfNotExists"), and three spellings of one
# effect turn a filter into three useless entries.
$CanonicalEffects = @(
  "AddToNetworkGroup", "Append", "Audit", "AuditAction", "AuditIfNotExists", "DenyAction",
  "Deny", "DeployIfNotExists", "Disabled", "EnforceOPAConstraint", "EnforceRegoPolicy",
  "EnforceSetting", "Manual", "Modify", "Mutate"
)

# The effect is either a literal in the rule body or a parameter reference. A
# reference resolves to the parameter's default, which is what an assignment
# applies unless it is explicitly overridden, so that is the value to publish.
function Get-PolicyEffect {
  param($Definition, $PolicyRule)

  if (-not $PolicyRule) { return $null }
  $effect = $PolicyRule.then.effect
  if (-not $effect) { return $null }
  $effect = [string]$effect

  if ($effect -match "parameters\(\s*'(?<name>[^']+)'\s*\)") {
    $parameterName = $Matches["name"]
    $parameters = Get-PolicyProperty $Definition @("Parameter", "Parameters")
    if (-not $parameters) { return $null }
    $parameter = if ($parameters -is [System.Collections.IDictionary]) { $parameters[$parameterName] } else { $parameters.$parameterName }
    if (-not $parameter) { return $null }
    $default = $parameter.defaultValue
    if (-not $default) { $default = $parameter.DefaultValue }
    if (-not $default) { return $null }
    $effect = [string]$default
  }

  $canonical = @($CanonicalEffects | Where-Object { $_ -ieq $effect })
  if ($canonical.Count -gt 0) { return $canonical[0] }
  return $effect
}

$scriptDir = Split-Path -Parent $PSCommandPath

# The catalog page shows what Azure publishes today. The change log is what makes
# the refresh legible over time: what appeared, what disappeared, and what Azure
# edited between two runs of this script.
$ChangeLogRetentionDays = 180
$ChangeLogMaxEntries = 3000
$TrackedPolicyFields = @("displayName", "category", "effect", "mode", "version", "policyType")
$TrackedInitiativeFields = @("displayName", "category", "version", "policyType", "policyCount")

# Descriptions are deliberately not tracked: Azure rewords them constantly
# without changing what a definition does, and every reworded row would carry a
# few hundred characters of before/after into the file. A real edit bumps
# metadata.version, which is tracked.
function Read-CatalogIndex {
  param([string]$Path, [string]$ListKey)

  $index = @{}
  if (-not (Test-Path $Path)) { return $index }
  try {
    $payload = Get-Content -Path $Path -Raw | ConvertFrom-Json
  } catch {
    Write-Warning "Could not read $Path for the change log: $($_.Exception.Message)"
    return $index
  }
  foreach ($item in $payload.$ListKey) {
    if ($item.name) { $index[$item.name] = $item }
  }
  return $index
}

function Get-CatalogChanges {
  param([hashtable]$Previous, [object[]]$Current, [string]$Kind, [string[]]$Fields, [string]$DetectedAt)

  $entries = [System.Collections.Generic.List[object]]::new()
  # Nothing to compare against on the very first run, and reporting 2,853
  # additions the day the file appears would be noise rather than history.
  if ($Previous.Count -eq 0) { return $entries }

  $seen = @{}
  foreach ($item in $Current) {
    $seen[$item.name] = $true
    $before = $Previous[$item.name]

    if (-not $before) {
      $entries.Add([ordered]@{
        detectedAt  = $DetectedAt
        kind        = $Kind
        change      = "added"
        name        = $item.name
        displayName = $item.displayName
        category    = $item.category
      })
      continue
    }

    $fieldChanges = [System.Collections.Generic.List[object]]::new()
    foreach ($field in $Fields) {
      $old = $before.$field
      # A field this script only started publishing today is a schema change,
      # not an edit Azure made: comparing it would flag the entire catalog once.
      if ($null -eq $old) { continue }
      if ([string]$old -ne [string]$item.$field) {
        $fieldChanges.Add([ordered]@{ field = $field; from = [string]$old; to = [string]$item.$field })
      }
    }

    if ($fieldChanges.Count -gt 0) {
      $entries.Add([ordered]@{
        detectedAt  = $DetectedAt
        kind        = $Kind
        change      = "modified"
        name        = $item.name
        displayName = $item.displayName
        category    = $item.category
        fields      = $fieldChanges.ToArray()
      })
    }
  }

  foreach ($name in $Previous.Keys) {
    if ($seen.ContainsKey($name)) { continue }
    $before = $Previous[$name]
    $entries.Add([ordered]@{
      detectedAt  = $DetectedAt
      kind        = $Kind
      change      = "removed"
      name        = $name
      displayName = $before.displayName
      category    = $before.category
    })
  }

  return $entries
}

$policiesOutputPath = Join-Path $scriptDir "policydefinitions.json"
$initiativesOutputPath = Join-Path $scriptDir "policysetdefinitions.json"
$changesOutputPath = Join-Path $scriptDir "policy-changes.json"

# Both catalogs have to be read before either is overwritten further down.
$previousPolicies = Read-CatalogIndex $policiesOutputPath "policies"
$previousInitiatives = Read-CatalogIndex $initiativesOutputPath "initiatives"
$detectedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

Write-Host "Fetching built-in Azure Policy definitions via Get-AzPolicyDefinition..."
$definitions = Get-AzPolicyDefinition -Builtin

$policies = [System.Collections.Generic.List[object]]::new()
# The rule bodies average ~3.7 KB each, so ~10 MB across the built-in set. They
# live in a companion file the page fetches only when a visitor opens a
# definition, which keeps the browsing index at its current 1.5 MB.
$rules = [ordered]@{}
foreach ($definition in $definitions) {
  $metadata = Get-PolicyProperty $definition @("Metadata")
  $category = $null
  $version = $null
  if ($metadata) {
    $category = $metadata.category
    $version = $metadata.version
  }
  if (-not $version) { $version = Get-PolicyProperty $definition @("Version") }

  $policyRule = Get-PolicyProperty $definition @("PolicyRule")

  $policies.Add([ordered]@{
    name              = $definition.Name
    displayName       = Get-PolicyProperty $definition @("DisplayName")
    description       = Get-PolicyProperty $definition @("Description")
    category          = $category
    effect            = Get-PolicyEffect $definition $policyRule
    mode              = Get-PolicyProperty $definition @("Mode")
    version           = $version
    policyType        = Get-PolicyProperty $definition @("PolicyType")
    policyDefinitionId = Get-PolicyProperty $definition @("ResourceId", "Id")
  })

  if (-not $policyRule) { continue }
  # Shaped like the JSON the portal shows and like what a custom definition
  # expects, so it can be copied straight into a template or an az CLI call.
  $rules[$definition.Name] = [ordered]@{
    displayName = Get-PolicyProperty $definition @("DisplayName")
    policyType  = Get-PolicyProperty $definition @("PolicyType")
    mode        = Get-PolicyProperty $definition @("Mode")
    description = Get-PolicyProperty $definition @("Description")
    metadata    = $metadata
    parameters  = Get-PolicyProperty $definition @("Parameter", "Parameters")
    policyRule  = $policyRule
  }
}

$sortedPolicies = @($policies | Sort-Object { $_.displayName })
$policyCategories = @($sortedPolicies | ForEach-Object { $_.category } | Where-Object { $_ } | Sort-Object -Unique)

# This pipeline shipped 2,853 policies and 188 initiatives with a null
# policyDefinitionId and a zero policy count for months, because a renamed
# property fails by returning $null rather than by throwing. A field that is
# empty for every single row is a broken read, not a dataset - fail the run.
function Assert-FieldPopulated {
  param([object[]]$Rows, [string]$Field, [string]$Label, [switch]$Warn)
  if ($Rows.Count -eq 0) { return }
  $populated = @($Rows | Where-Object { $_.$Field }).Count
  if ($populated -eq 0) {
    $message = "Every one of the $($Rows.Count) $Label has an empty '$Field'. The Az.Resources object shape has probably changed again"
    # Effect and version enrich the catalog; the catalog itself is still worth
    # publishing without them, so those two only warn.
    if ($Warn) { Write-Warning "$message." ; return }
    throw "$message; refusing to publish."
  }
  if ($populated -lt $Rows.Count) {
    Write-Warning "$($Rows.Count - $populated) of $($Rows.Count) $Label have an empty '$Field'."
  }
}

Assert-FieldPopulated $sortedPolicies "policyDefinitionId" "policy definitions"
Assert-FieldPopulated $sortedPolicies "effect" "policy definitions" -Warn
Assert-FieldPopulated $sortedPolicies "version" "policy definitions" -Warn

$policiesPayload = [ordered]@{
  generatedAt      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source           = "Get-AzPolicyDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalPolicies    = $sortedPolicies.Count
  totalCategories  = $policyCategories.Count
  policies         = $sortedPolicies
}

($policiesPayload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $policiesOutputPath -NoNewline -Encoding utf8
Write-Host "Fetched $($sortedPolicies.Count) policy definitions ($($policyCategories.Count) categories) into $policiesOutputPath"

if ($rules.Count -eq 0) {
  throw "No policy rule was read from any of the $($sortedPolicies.Count) definitions; refusing to publish an empty rule set."
}
if ($rules.Count -lt $sortedPolicies.Count) {
  Write-Warning "$($sortedPolicies.Count - $rules.Count) of $($sortedPolicies.Count) definitions returned no policyRule."
}

$rulesPayload = [ordered]@{
  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source      = "Get-AzPolicyDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalRules  = $rules.Count
  rules       = $rules
}

# Depth 30: policyRule bodies nest allOf/anyOf/count blocks several levels deep,
# and ConvertTo-Json silently truncates past its limit into "System.Object[]".
$rulesOutputPath = Join-Path $scriptDir "policyrules.json"
($rulesPayload | ConvertTo-Json -Depth 30 -Compress) + "`n" | Set-Content -Path $rulesOutputPath -NoNewline -Encoding utf8
Write-Host "Wrote $($rules.Count) policy rules into $rulesOutputPath"

Write-Host "Fetching built-in Azure Policy initiatives via Get-AzPolicySetDefinition..."
$setDefinitions = Get-AzPolicySetDefinition -Builtin

$initiatives = [System.Collections.Generic.List[object]]::new()
foreach ($setDefinition in $setDefinitions) {
  $metadata = Get-PolicyProperty $setDefinition @("Metadata")
  $category = $null
  $version = $null
  if ($metadata) {
    $category = $metadata.category
    $version = $metadata.version
  }
  if (-not $version) { $version = Get-PolicyProperty $setDefinition @("Version") }

  # Keep the member list, not just its length: the page uses it to show what an
  # initiative actually contains, resolving each id against policydefinitions.json.
  $references = Get-PolicyDefinitionReference $setDefinition
  $members = [System.Collections.Generic.List[object]]::new()
  foreach ($reference in $references) {
    $definitionId = $reference.policyDefinitionId
    if (-not $definitionId) { continue }
    $members.Add([ordered]@{
      # The trailing GUID is how policies are keyed in policydefinitions.json.
      id          = ($definitionId -split "/")[-1]
      referenceId = $reference.policyDefinitionReferenceId
      groupNames  = @($reference.groupNames)
    })
  }

  $initiatives.Add([ordered]@{
    name               = $setDefinition.Name
    displayName        = Get-PolicyProperty $setDefinition @("DisplayName")
    description        = Get-PolicyProperty $setDefinition @("Description")
    category           = $category
    version            = $version
    policyType         = Get-PolicyProperty $setDefinition @("PolicyType")
    policyCount        = $members.Count
    policies           = $members.ToArray()
    policyDefinitionId = Get-PolicyProperty $setDefinition @("ResourceId", "Id")
  })
}

$sortedInitiatives = @($initiatives | Sort-Object { $_.displayName })
$initiativeCategories = @($sortedInitiatives | ForEach-Object { $_.category } | Where-Object { $_ } | Sort-Object -Unique)

Assert-FieldPopulated $sortedInitiatives "policyDefinitionId" "initiatives"
Assert-FieldPopulated $sortedInitiatives "policyCount" "initiatives"
Assert-FieldPopulated $sortedInitiatives "version" "initiatives" -Warn

$initiativesPayload = [ordered]@{
  generatedAt     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source          = "Get-AzPolicySetDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalInitiatives = $sortedInitiatives.Count
  totalCategories = $initiativeCategories.Count
  initiatives     = $sortedInitiatives
}

($initiativesPayload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $initiativesOutputPath -NoNewline -Encoding utf8
Write-Host "Fetched $($sortedInitiatives.Count) policy initiatives ($($initiativeCategories.Count) categories) into $initiativesOutputPath"

# Both catalogs are published, so the two snapshots read at the top of the run
# can now be turned into the change log the history page reads.
$newEntries = [System.Collections.Generic.List[object]]::new()
foreach ($entry in (Get-CatalogChanges $previousPolicies $sortedPolicies "policy" $TrackedPolicyFields $detectedAt)) { $newEntries.Add($entry) }
foreach ($entry in (Get-CatalogChanges $previousInitiatives $sortedInitiatives "initiative" $TrackedInitiativeFields $detectedAt)) { $newEntries.Add($entry) }

$existingEntries = @()
if (Test-Path $changesOutputPath) {
  try {
    $existingPayload = Get-Content -Path $changesOutputPath -Raw | ConvertFrom-Json
    if ($existingPayload.entries) { $existingEntries = @($existingPayload.entries) }
  } catch {
    Write-Warning "Could not read the existing change log at $changesOutputPath, starting a new one: $($_.Exception.Message)"
  }
}

# Newest first, so the page reads the file in the order it displays it and an
# append shows up as a diff at the top rather than a rewrite of the whole file.
$allEntries = [System.Collections.Generic.List[object]]::new()
foreach ($entry in $newEntries) { $allEntries.Add($entry) }
$cutoff = (Get-Date).ToUniversalTime().AddDays(-$ChangeLogRetentionDays)
foreach ($entry in $existingEntries) {
  $stamp = $null
  # An entry whose timestamp cannot be read is kept: dropping history on a
  # parsing detail is the one outcome this file cannot recover from.
  if ($entry.detectedAt) {
    try { $stamp = ([datetime]$entry.detectedAt).ToUniversalTime() } catch { $stamp = $null }
  }
  if ($stamp -and $stamp -lt $cutoff) { continue }
  $allEntries.Add($entry)
}
while ($allEntries.Count -gt $ChangeLogMaxEntries) { $allEntries.RemoveAt($allEntries.Count - 1) }

$changesPayload = [ordered]@{
  generatedAt    = $detectedAt
  source         = "Diff between two consecutive runs of azure-policies/fetch-updates.ps1"
  retentionDays  = $ChangeLogRetentionDays
  lastRunEntries = $newEntries.Count
  totalEntries   = $allEntries.Count
  entries        = @($allEntries.ToArray())
}

($changesPayload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $changesOutputPath -NoNewline -Encoding utf8
Write-Host "Recorded $($newEntries.Count) change(s) this run, $($allEntries.Count) kept in $changesOutputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
