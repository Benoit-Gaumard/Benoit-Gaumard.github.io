---
layout: post
title: Azure RBAC - Extraire toutes les permissions d'un rôle
date: 2022-01-28
categories: [ "Azure" ]
comments_id: 121 
---

L'une des choses les plus importantes dans le Cloud (tous les CSPs) ce sont les autorisations IAM, et l'une des meilleures pratiques consiste à définir une politique de moindres privilèges pour vos besoins.

Dans Azure, ce n'est pas une exception, et Microsoft fournit de nombreux rôles nativement pour vous aider à sécuriser votre environnement. Oui, vous l'avez bien lu Owner, Contributor et Reader ne sont pas les seuls rôles intégrés fournis par Microsoft, vous avez actuellement 321 définitions de rôle dans Azure.

Si je prends un rôle, par exemple **Key Vault Contributor**, vous avez cette définition :

```json
{
  "Name": "Key Vault Contributor",
  "Id": "f25e0fa2-a7c8-4377-a976-54943a77a395",
  "IsCustom": false,
  "Description": "Lets you manage key vaults, but not access to them.",
  "Actions": [
    "Microsoft.Authorization/*/read",
    "Microsoft.Insights/alertRules/*",
    "Microsoft.KeyVault/*",
    "Microsoft.Resources/deployments/*",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Support/*"
  ],
  "NotActions": [
    "Microsoft.KeyVault/locations/deletedVaults/purge/action",
    "Microsoft.KeyVault/hsmPools/*",
    "Microsoft.KeyVault/managedHsms/*"
  ],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/"
  ]
}
```

Comme vous le voyez, vous avez des autorisations avec une étoile dans leur nom, c'est bien car lorsque Microsoft ajoute une nouvelle fonctionnalité, ils n'ont pas à mettre à jour le rôle intégré si ce n'est pas nécessaire.

Mais maintenant, pour des raisons de sécurité, vous souhaitez bloquer certaines fonctionnalités pour vos utilisateurs et peut-être certaines fonctionnalités "futures", vous ne pouvez donc pas utiliser le rôle intégré comme celui-ci, et le copier-coller dans un rôle personnalisé ne vous aide pas à fournir le tous les moindres privilèges que vous voulez.

Alors voici un script powershell pour créer un nouveau rôle personnalisé, avec la même permission que votre rôle initial, mais sans aucune étoile dans les permissions :

```powershell
$role = Get-AzRoleDefinition 'Key Vault Contributor'

$role.IsCustom = $true
$role.Name = "Custom $($role.Name)"
$role.Id = ''

$actions = @()
$role.Actions | % { Get-AzProviderOperation $_ | % { $actions += $_.Operation } }
$role.Actions.Clear()
$actions | Select -Unique | % { $role.Actions.Add($_) }


$dataActions = @()
$role.DataActions | % { Get-AzProviderOperation $_ | % { $dataActions += $_.Operation } }
$role.DataActions.Clear()
$dataActions | Select -Unique | % { $role.DataActions.Add($_) }


$notActions = @()
$role.NotActions | % { Get-AzProviderOperation $_ | % { $notActions += $_.Operation } }
$role.NotActions.Clear()
$notActions | Select -Unique | % { $role.NotActions.Add($_) }


$notDataActions = @()
$role.NotDataActions | % { Get-AzProviderOperation $_ | % { $notDataActions += $_.Operation } }
$role.NotDataActions.Clear()
$notDataActions | Select -Unique | % { $role.NotDataActions.Add($_) }

$role | ConvertTo-Json
```

Je remplace toutes les autorisations possibles par le nom complet de l'opération. Grâce à la méthode **Get-AzProviderOperation** !

Et maintenant, mon rôle contient un grand nombre de lignes, mais sans surprises pour l'avenir pour ma gestion de droits

```json
{
  "Name": "Custom Key Vault Contributor",
  "Id": "",
  "IsCustom": true,
  "Description": "Lets you manage key vaults, but not access to them.",
  "Actions": [
    "Microsoft.Authorization/classicAdministrators/read",
    "Microsoft.Authorization/roleAssignments/read",
    "Microsoft.Authorization/permissions/read",
    "Microsoft.Authorization/locks/read",
    "Microsoft.Authorization/roleDefinitions/read",
    "Microsoft.Authorization/providerOperations/read",
    "Microsoft.Authorization/policySetDefinitions/read",
    "Microsoft.Authorization/policyDefinitions/read",
    "Microsoft.Authorization/policyAssignments/read",
    "Microsoft.Authorization/operations/read",
    "Microsoft.Authorization/classicAdministrators/operationstatuses/read",
    "Microsoft.Authorization/denyAssignments/read",
    "Microsoft.Authorization/policyAssignments/resourceManagementPrivateLinks/read",
    "Microsoft.Authorization/policyAssignments/resourceManagementPrivateLinks/privateEndpointConnectionProxies/read",
    "Microsoft.Authorization/policyAssignments/resourceManagementPrivateLinks/privateEndpointConnections/read",
    "Microsoft.Authorization/policyAssignments/privateLinkAssociations/read",
    "Microsoft.Authorization/policyExemptions/read",
    "Microsoft.Authorization/roleAssignmentScheduleRequests/read",
    "Microsoft.Authorization/roleEligibilityScheduleRequests/read",
    "Microsoft.Authorization/roleAssignmentSchedules/read",
    "Microsoft.Authorization/roleEligibilitySchedules/read",
    "Microsoft.Authorization/roleAssignmentScheduleInstances/read",
    "Microsoft.Authorization/roleEligibilityScheduleInstances/read",
    "Microsoft.Authorization/roleManagementPolicies/read",
    "Microsoft.Authorization/roleManagementPolicyAssignments/read",
    "Microsoft.Authorization/diagnosticSettings/read",
    "Microsoft.Authorization/diagnosticSettingsCategories/read",
    "Microsoft.Insights/AlertRules/Write",
    "Microsoft.Insights/AlertRules/Delete",
    "Microsoft.Insights/AlertRules/Read",
    "Microsoft.Insights/AlertRules/Activated/Action",
    "Microsoft.Insights/AlertRules/Resolved/Action",
    "Microsoft.Insights/AlertRules/Throttled/Action",
    "Microsoft.Insights/AlertRules/Incidents/Read",
    "Microsoft.KeyVault/register/action",
    "Microsoft.KeyVault/unregister/action",
    "Microsoft.KeyVault/vaults/read",
    "Microsoft.KeyVault/vaults/write",
    "Microsoft.KeyVault/vaults/delete",
    "Microsoft.KeyVault/vaults/deploy/action",
    "Microsoft.KeyVault/vaults/secrets/read",
    "Microsoft.KeyVault/vaults/secrets/write",
    "Microsoft.KeyVault/vaults/secrets/delete",
    "Microsoft.KeyVault/vaults/secrets/backup/action",
    "Microsoft.KeyVault/vaults/secrets/purge/action",
    "Microsoft.KeyVault/vaults/secrets/update/action",
    "Microsoft.KeyVault/vaults/secrets/recover/action",
    "Microsoft.KeyVault/vaults/secrets/restore/action",
    "Microsoft.KeyVault/vaults/secrets/readMetadata/action",
    "Microsoft.KeyVault/vaults/secrets/getSecret/action",
    "Microsoft.KeyVault/vaults/secrets/setSecret/action",
    "Microsoft.KeyVault/vaults/accessPolicies/write",
    "Microsoft.KeyVault/operations/read",
    "Microsoft.KeyVault/checkNameAvailability/read",
    "Microsoft.KeyVault/deletedVaults/read",
    "Microsoft.KeyVault/locations/deletedVaults/read",
    "Microsoft.KeyVault/locations/deletedVaults/purge/action",
    "Microsoft.KeyVault/locations/operationResults/read",
    "Microsoft.KeyVault/locations/deleteVirtualNetworkOrSubnets/action",
    "Microsoft.KeyVault/hsmPools/read",
    "Microsoft.KeyVault/hsmPools/write",
    "Microsoft.KeyVault/hsmPools/delete",
    "Microsoft.KeyVault/hsmPools/joinVault/action",
    "Microsoft.KeyVault/vaults/eventGridFilters/read",
    "Microsoft.KeyVault/vaults/eventGridFilters/write",
    "Microsoft.KeyVault/vaults/eventGridFilters/delete",
    "Microsoft.KeyVault/vaults/certificatecas/delete",
    "Microsoft.KeyVault/vaults/certificatecas/read",
    "Microsoft.KeyVault/vaults/certificatecas/write",
    "Microsoft.KeyVault/vaults/certificatecontacts/write",
    "Microsoft.KeyVault/vaults/certificates/delete",
    "Microsoft.KeyVault/vaults/certificates/read",
    "Microsoft.KeyVault/vaults/certificates/backup/action",
    "Microsoft.KeyVault/vaults/certificates/purge/action",
    "Microsoft.KeyVault/vaults/certificates/update/action",
    "Microsoft.KeyVault/vaults/certificates/create/action",
    "Microsoft.KeyVault/vaults/certificates/import/action",
    "Microsoft.KeyVault/vaults/certificates/recover/action",
    "Microsoft.KeyVault/vaults/certificates/restore/action",
    "Microsoft.KeyVault/vaults/keys/read",
    "Microsoft.KeyVault/vaults/keys/write",
    "Microsoft.KeyVault/vaults/keys/update/action",
    "Microsoft.KeyVault/vaults/keys/create/action",
    "Microsoft.KeyVault/vaults/keys/import/action",
    "Microsoft.KeyVault/vaults/keys/recover/action",
    "Microsoft.KeyVault/vaults/keys/restore/action",
    "Microsoft.KeyVault/vaults/keys/delete",
    "Microsoft.KeyVault/vaults/keys/backup/action",
    "Microsoft.KeyVault/vaults/keys/purge/action",
    "Microsoft.KeyVault/vaults/keys/encrypt/action",
    "Microsoft.KeyVault/vaults/keys/decrypt/action",
    "Microsoft.KeyVault/vaults/keys/wrap/action",
    "Microsoft.KeyVault/vaults/keys/unwrap/action",
    "Microsoft.KeyVault/vaults/keys/sign/action",
    "Microsoft.KeyVault/vaults/keys/verify/action",
    "Microsoft.KeyVault/vaults/keys/release/action",
    "Microsoft.KeyVault/vaults/keys/rotate/action",
    "Microsoft.KeyVault/vaults/storageaccounts/read",
    "Microsoft.KeyVault/vaults/storageaccounts/set/action",
    "Microsoft.KeyVault/vaults/storageaccounts/delete",
    "Microsoft.KeyVault/vaults/storageaccounts/backup/action",
    "Microsoft.KeyVault/vaults/storageaccounts/purge/action",
    "Microsoft.KeyVault/vaults/storageaccounts/regeneratekey/action",
    "Microsoft.KeyVault/vaults/storageaccounts/recover/action",
    "Microsoft.KeyVault/vaults/storageaccounts/restore/action",
    "Microsoft.KeyVault/vaults/storageaccounts/sas/set/action",
    "Microsoft.KeyVault/vaults/storageaccounts/sas/delete",
    "Microsoft.KeyVault/vaults/keys/versions/read",
    "Microsoft.KeyVault/vaults/keyrotationpolicies/read",
    "Microsoft.KeyVault/vaults/keyrotationpolicies/write",
    "Microsoft.KeyVault/managedHSMs/read",
    "Microsoft.KeyVault/managedHSMs/write",
    "Microsoft.KeyVault/managedHSMs/delete",
    "Microsoft.Resources/deployments/read",
    "Microsoft.Resources/deployments/write",
    "Microsoft.Resources/deployments/delete",
    "Microsoft.Resources/deployments/cancel/action",
    "Microsoft.Resources/deployments/validate/action",
    "Microsoft.Resources/deployments/whatIf/action",
    "Microsoft.Resources/deployments/exportTemplate/action",
    "Microsoft.Resources/deployments/operations/read",
    "Microsoft.Resources/deployments/operationstatuses/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Support/register/action",
    "Microsoft.Support/lookUpResourceId/action",
    "Microsoft.Support/checkNameAvailability/action",
    "Microsoft.Support/supportTickets/read",
    "Microsoft.Support/supportTickets/write",
    "Microsoft.Support/services/read",
    "Microsoft.Support/services/problemClassifications/read",
    "Microsoft.Support/operationresults/read",
    "Microsoft.Support/operationsstatus/read",
    "Microsoft.Support/operations/read"
  ],
  "NotActions": [
    "Microsoft.KeyVault/locations/deletedVaults/purge/action",
    "Microsoft.KeyVault/hsmPools/read",
    "Microsoft.KeyVault/hsmPools/write",
    "Microsoft.KeyVault/hsmPools/delete",
    "Microsoft.KeyVault/hsmPools/joinVault/action",
    "Microsoft.KeyVault/managedHSMs/read",
    "Microsoft.KeyVault/managedHSMs/write",
    "Microsoft.KeyVault/managedHSMs/delete"
  ],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/"
  ]
}
```
