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

$scriptDir = Split-Path -Parent $PSCommandPath

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
  if ($metadata) { $category = $metadata.category }

  $policies.Add([ordered]@{
    name              = $definition.Name
    displayName       = Get-PolicyProperty $definition @("DisplayName")
    description       = Get-PolicyProperty $definition @("Description")
    category          = $category
    mode              = Get-PolicyProperty $definition @("Mode")
    policyType        = Get-PolicyProperty $definition @("PolicyType")
    policyDefinitionId = Get-PolicyProperty $definition @("ResourceId", "Id")
  })

  $policyRule = Get-PolicyProperty $definition @("PolicyRule")
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
  param([object[]]$Rows, [string]$Field, [string]$Label)
  if ($Rows.Count -eq 0) { return }
  $populated = @($Rows | Where-Object { $_.$Field }).Count
  if ($populated -eq 0) {
    throw "Every one of the $($Rows.Count) $Label has an empty '$Field'. The Az.Resources object shape has probably changed again; refusing to publish."
  }
  if ($populated -lt $Rows.Count) {
    Write-Warning "$($Rows.Count - $populated) of $($Rows.Count) $Label have an empty '$Field'."
  }
}

Assert-FieldPopulated $sortedPolicies "policyDefinitionId" "policy definitions"

$policiesPayload = [ordered]@{
  generatedAt      = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source           = "Get-AzPolicyDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalPolicies    = $sortedPolicies.Count
  totalCategories  = $policyCategories.Count
  policies         = $sortedPolicies
}

$policiesOutputPath = Join-Path $scriptDir "policydefinitions.json"
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
  if ($metadata) { $category = $metadata.category }

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

$initiativesPayload = [ordered]@{
  generatedAt     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  source          = "Get-AzPolicySetDefinition (Azure PowerShell, live tenant scan via the scan-benoit-gaumard.io app)"
  totalInitiatives = $sortedInitiatives.Count
  totalCategories = $initiativeCategories.Count
  initiatives     = $sortedInitiatives
}

$initiativesOutputPath = Join-Path $scriptDir "policysetdefinitions.json"
($initiativesPayload | ConvertTo-Json -Depth 10) + "`n" | Set-Content -Path $initiativesOutputPath -NoNewline -Encoding utf8
Write-Host "Fetched $($sortedInitiatives.Count) policy initiatives ($($initiativeCategories.Count) categories) into $initiativesOutputPath"

Disconnect-AzAccount -ErrorAction SilentlyContinue | Out-Null
