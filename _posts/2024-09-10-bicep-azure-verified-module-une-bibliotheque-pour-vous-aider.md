---
layout: post
title: Bicep - Azure Verified Module, une bibliothèque pour vous aider
date: 2024-09-10
categories: [ "Azure", "Bicep" ]
comments_id: 192 
---

Si vous n'avez pas suivi les nouveautés autour de bicep, il est possible de créer des modules, et de mettre ceux ci dans une registry privée via Azure Container Registry, j'en ferais sûrement un article prochainement.

Et maintenant si on veut faire une registry public, et bien aujourd'hui ce n'est pas possible, mais Microsoft héberge pour vous Azure Verified Module qui se base aussi sur Azure Container Registry mais qui contient un ensemble de modules validées par Microsoft basé sur le repository Open Source : [Azure Verified Module](https://github.com/Azure/bicep-registry-modules)

Récemment j'ai mis à jour mon toolkit de sandbox sur Azure Function, et j'ai décidé entre autre de refaire mon infra as code grâce à AVM, donc je propose de vous faire un feedback dessus.

Commençons par créer un storage Azure:

```bicep
module stg 'br/public:avm/res/storage/storage-account:0.11.1' = {
  name: 'sandbox-storage'
  scope: resourceGroup
  params: {
    name: 'stg${uniqueString(resourceGroup.id)}'
    skuName: 'Standard_LRS'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}
```

Alors premièrement c'est très simple d'accès via VSCode vu que la recherche des modules se fait directement avec l'autocomplétion, reste à vous de savoir ce dont vous avez besoin, mais bonne nouvelle la convention de nommage est basé sur les resources providers.

Et bonne nouvelle, il est facilement d'explorer le contenu du module que vous utilisez simplement via un clic dans VSCode, pas besoin de vous référer au Github.

Pour avoir mis en place des modules ce qui est important de définir c'est la gestion de vos paramètres d'entrées et de sortie du module, et bonne nouvelle AVM contient des standards sur ces éléments et propose beaucoup de paramètre avec des valeurs par défaut pour tous (à part le nom bien sûr), et bonne nouvelle ces paramètres sont typés, donc vous allez être bien guidés lors de la création de vos templates, et au build de votre fichier bicep échouera si vous n'avez pas suivi le typage.

Maintenant, tout n'est pas parfait, et il s'agit d'un projet Open Source, donc le niveau des templates n'est pas toujours le même, par exemple si je prends Storage j'ai ces éléments pour la partie NetworksAcls:

```bicep
@description('Optional. Networks ACLs, this value contains IPs to whitelist and/or Subnet information. If in use, bypass needs to be supplied. For security reasons, it is recommended to set the DefaultAction Deny.')
param networkAcls networkAclsType?

type networkAclsType = {
  @description('Optional. Sets the resource access rules. Array entries must consist of "tenantId" and "resourceId" fields only.')
  resourceAccessRules: {
    @description('Required. The ID of the tenant in which the resource resides in.')
    tenantId: string

    @description('Required. The resource ID of the target service. Can also contain a wildcard, if multiple services e.g. in a resource group should be included.')
    resourceId: string
  }[]?

  @description('Optional. Specifies whether traffic is bypassed for Logging/Metrics/AzureServices. Possible values are any combination of Logging,Metrics,AzureServices (For example, "Logging, Metrics"), or None to bypass none of those traffics.')
  bypass: (
    | 'None'
    | 'AzureServices'
    | 'Logging'
    | 'Metrics'
    | 'AzureServices, Logging'
    | 'AzureServices, Metrics'
    | 'AzureServices, Logging, Metrics'
    | 'Logging, Metrics')?

  @description('Optional. Sets the virtual network rules.')
  virtualNetworkRules: array?

  @description('Optional. Sets the IP ACL rules.')
  ipRules: array?

  @description('Optional. Specifies the default action of allow or deny when no other rules match.')
  defaultAction: ('Allow' | 'Deny')?
}
```

Alors que pour KeyVault, c'est beaucoup plus light:

```bicep
@description('Optional. Rules governing the accessibility of the resource from specific network locations.')
param networkAcls object?
```

Après, je rappelle qu'il s'agit d'un projet Open Source, donc je vous encourage fortement à contribuer s'il manque quelque chose, bien sûr si vous avez du temps. Ils en cherchent en plus : [Needs Contributor](https://github.com/Azure/Azure-Verified-Modules/issues?q=is:issue+label:%22Needs:+Module+Contributor+:mega:%22+)

L'utilisation de ce type de module vous permettra d'accélérer la mise en place de vos templates en vous basant sur ces modules, et de ne pas avoir à les refaire de votre côté.
Et en prime, vu qu'il s'agit de module vous pouvez toujours utiliser les vôtres si vous le souhaitez.

Vu qu'une bonne nouvelle n'arrive jamais seul, cette registry contient aussi des tests pour chacune des ressources sur lesquelles vous pouvez vous appuyez pour trouver les paramètres dont vous avez besoin, par exemple pour Storage:

Par exemple la mise en place d'un kind de type `BlockBlobStorage`

```bicep
targetScope = 'subscription'

metadata name = 'Deploying as a Block Blob Storage'
metadata description = 'This instance deploys the module as a Premium Block Blob Storage account.'

// ========== //
// Parameters //
// ========== //

@description('Optional. The name of the resource group to deploy for testing purposes.')
@maxLength(90)
param resourceGroupName string = 'dep-${namePrefix}-storage.storageaccounts-${serviceShort}-rg'

@description('Optional. The location to deploy resources to.')
param resourceLocation string = deployment().location

@description('Optional. A short identifier for the kind of deployment. Should be kept short to not run into resource-name length-constraints.')
param serviceShort string = 'ssablock'

@description('Optional. A token to inject into the name of each resource.')
param namePrefix string = '#_namePrefix_#'

// ============ //
// Dependencies //
// ============ //

// General resources
// =================
resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: resourceLocation
}

// ============== //
// Test Execution //
// ============== //

@batchSize(1)
module testDeployment '../../../main.bicep' = [
  for iteration in ['init', 'idem']: {
    scope: resourceGroup
    name: '${uniqueString(deployment().name, resourceLocation)}-test-${serviceShort}-${iteration}'
    params: {
      location: resourceLocation
      name: '${namePrefix}${serviceShort}001'
      skuName: 'Premium_LRS'
      kind: 'BlockBlobStorage'
    }
  }
]
```

Mais aussi plein d'autres, comme la gestion des clés d'encryption.

AVM ne contient pas que des modules pour les resources Azure, mais aussi pour des patterns d'utilisation, comme la mise en place de Landing Zone de tests (vu la criticité du sujet, je vous conseille d'utiliser un module externe uniquement pour des tests)

Et pour finir, Azure Verified Module ce n'est pas une initiative que pour bicep, mais aussi pour Terraform !

Bon et si j'allais faire des pull request maintenant....
