$ErrorActionPreference = 'Stop'
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$source = Join-Path (Join-Path $root 'azure-policies') 'fetch-updates.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }
foreach ($name in @('Get-InitiativeMemberIndex', 'Get-InitiativeMemberEvidence', 'Get-InitiativeCompositionChanges', 'Get-CatalogChanges')) {
  $definition = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
  if (-not $definition) { throw "Missing function: $name" }
  . ([scriptblock]::Create($definition.Extent.Text))
}

function Assert-Equal($Expected, $Actual, [string]$Label) {
  if ($Expected -cne $Actual) { throw "${Label}: expected '$Expected', got '$Actual'." }
}
function New-Member([string]$Id, [string]$Reference) {
  return [pscustomobject]@{ id = $Id; referenceId = $Reference; groupNames = @($null) }
}
function New-Initiative([object[]]$Members, [string]$Version = '1.0') {
  return [pscustomobject]@{ name = 'fixture-initiative'; displayName = 'Fixture initiative'; category = 'Security'; version = $Version; policyType = 'BuiltIn'; policyCount = $Members.Count; policies = $Members }
}
$fields = @('displayName', 'category', 'version', 'policyType', 'policyCount')
$a = New-Member 'POLICY-A' 'reference-a'
$b = New-Member 'policy-b' 'reference-b'
$c = New-Member 'policy-c' 'reference-c'
$oldNames = @{ 'POLICY-A' = @{ displayName = 'Historical A' }; 'policy-b' = @{ displayName = 'Historical B' } }
$newNames = @{ 'POLICY-A' = @{ displayName = 'Current A' }; 'policy-c' = @{ displayName = 'Current C' } }
$before = New-Initiative @($a, $b)
$after = New-Initiative @($a, $c)
$delta = Get-InitiativeCompositionChanges $before $after $oldNames $newNames
Assert-Equal 'compared' $delta.status 'Comparable lists'
Assert-Equal 1 $delta.added.Count 'Added count'
Assert-Equal 1 $delta.removed.Count 'Removed count'
Assert-Equal 'Current C' $delta.added[0].displayName 'Added observation name'
Assert-Equal 'Historical B' $delta.removed[0].displayName 'Removed historical name'
Assert-Equal 2 $delta.beforeCount 'Before count'
Assert-Equal 2 $delta.afterCount 'After count'
$events = @(Get-CatalogChanges @{ 'fixture-initiative' = $before } @($after) 'initiative' $fields '2026-10-06T12:00:00Z' $oldNames $newNames)
Assert-Equal 1 $events.Count 'Same-count replacement creates event'
Assert-Equal 0 $events[0].fields.Count 'No invented metadata change'
Assert-Equal 'modified' $events[0].change 'Composition event kind'
$roundTrip = @{ entries = $events } | ConvertTo-Json -Depth 10 | ConvertFrom-Json
Assert-Equal $true ($roundTrip.entries[0].composition.added -is [array]) 'One added member stays an array on the wire'
Assert-Equal 0 $roundTrip.entries[0].fields.Count 'Empty metadata differences survive JSON'
Assert-Equal 'Historical B' $roundTrip.entries[0].composition.removed[0].displayName 'Historical name survives JSON'

$reordered = New-Initiative @($b, (New-Member 'policy-a' 'reference-a'))
$events = @(Get-CatalogChanges @{ 'fixture-initiative' = $before } @($reordered) 'initiative' $fields 'time')
Assert-Equal 0 $events.Count 'Order and GUID case do not create membership changes'
$reusedReference = New-Initiative @((New-Member 'policy-c' 'reference-a'), $b)
$delta = Get-InitiativeCompositionChanges $before $reusedReference $oldNames $newNames
Assert-Equal 1 $delta.added.Count 'Reference target replacement added'
Assert-Equal 'POLICY-A' $delta.removed[0].id 'Original ID casing retained'
$renamedReference = New-Initiative @((New-Member 'POLICY-A' 'Reference-A'), $b)
$delta = Get-InitiativeCompositionChanges $before $renamedReference $oldNames $newNames
Assert-Equal 1 $delta.added.Count 'Reference ID casing compared exactly'

$repeatedPolicy = New-Initiative @($a, (New-Member 'POLICY-A' 'another-reference'))
$delta = Get-InitiativeCompositionChanges (New-Initiative @($a)) $repeatedPolicy $oldNames $newNames
Assert-Equal 1 $delta.added.Count 'Multiple references to same policy remain distinct'
Assert-Equal 2 $delta.afterCount 'Reference count is not unique-policy count'
$delta = Get-InitiativeCompositionChanges (New-Initiative @()) (New-Initiative @($a)) $oldNames $newNames
Assert-Equal 'compared' $delta.status 'Known empty list is comparable'
Assert-Equal 1 $delta.added.Count 'Empty to non-empty'
$delta = Get-InitiativeCompositionChanges $before (New-Initiative @()) $oldNames $newNames
Assert-Equal 2 $delta.removed.Count 'All references removed'

$legacy = [pscustomobject]@{ name = 'fixture-initiative'; displayName = 'Fixture initiative'; category = 'Security'; version = '0.9'; policyCount = 2 }
$delta = Get-InitiativeCompositionChanges $legacy $after $oldNames $newNames
Assert-Equal 'unavailable' $delta.status 'Legacy count-only snapshot stays unknown'
$events = @(Get-CatalogChanges @{ 'fixture-initiative' = $legacy } @($after) 'initiative' $fields 'time' $oldNames $newNames)
Assert-Equal 'unavailable' $events[0].composition.status 'Legacy metadata event carries limitation'
Assert-Equal 'version' $events[0].fields[0].field 'Metadata comparison survives unavailable membership'
$duplicate = New-Initiative @($a, $a)
Assert-Equal 'unavailable' (Get-InitiativeCompositionChanges $before $duplicate @{} @{}).status 'Duplicate reference rejected'
$mismatch = New-Initiative @($a)
$mismatch.policyCount = 2
Assert-Equal 'unavailable' (Get-InitiativeCompositionChanges $before $mismatch @{} @{}).status 'Count mismatch not treated as removals'
$missingRef = New-Initiative @((New-Member 'policy-a' ''))
Assert-Equal 'unavailable' (Get-InitiativeCompositionChanges $before $missingRef @{} @{}).status 'Missing reference identity'
$delta = Get-InitiativeCompositionChanges (New-Initiative @()) (New-Initiative @($c)) @{} @{}
Assert-Equal $null $delta.added[0].displayName 'Unknown names remain absent'
$reservedNames = New-Initiative @((New-Member 'policy-a' 'Count'), (New-Member 'policy-b' 'Keys'))
$delta = Get-InitiativeCompositionChanges (New-Initiative @()) $reservedNames @{} @{}
Assert-Equal 2 $delta.added.Count 'Reference names cannot shadow index properties'

$versionOnly = New-Initiative @($a, $b) '1.1'
$events = @(Get-CatalogChanges @{ 'fixture-initiative' = $before } @($versionOnly) 'initiative' $fields 'time' $oldNames $newNames)
Assert-Equal 0 $events[0].composition.added.Count 'Version-only membership unchanged'
Assert-Equal 'version' $events[0].fields[0].field 'Version-only metadata preserved'
$events = @(Get-CatalogChanges @{} @($after) 'initiative' $fields 'time')
Assert-Equal 0 $events.Count 'First run establishes baseline'
$events = @(Get-CatalogChanges @{ 'fixture-initiative' = $before } @() 'initiative' $fields 'time')
Assert-Equal 'removed' $events[0].change 'Removed initiative retained'
$events = @(Get-CatalogChanges @{ other = @{ name = 'other'; displayName = 'Other' } } @($after) 'initiative' $fields 'time')
Assert-Equal 2 $events.Count 'Added and removed initiatives retained'
$events = @(Get-CatalogChanges @{ 'fixture-initiative' = $before } @($versionOnly) 'policy' $fields 'time')
Assert-Equal $false $events[0].Contains('composition') 'Policy event schema remains unchanged'

$catalogue = Get-Content (Join-Path (Join-Path $root 'azure-policies') 'policysetdefinitions.json') -Raw | ConvertFrom-Json
foreach ($initiative in $catalogue.initiatives) {
  $delta = Get-InitiativeCompositionChanges $initiative $initiative @{} @{}
  Assert-Equal 'compared' $delta.status "Stored initiative $($initiative.name)"
  Assert-Equal 0 $delta.added.Count 'Self comparison additions'
  Assert-Equal 0 $delta.removed.Count 'Self comparison removals'
}
Write-Host "Initiative composition checks passed; $($catalogue.initiatives.Count) stored member lists are comparable. No Azure connection was made."
