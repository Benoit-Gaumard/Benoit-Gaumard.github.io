---
layout: post
title: Azure Policy - L'enfer des versions d'API
date: 2023-11-05
categories: [ "Azure", "Policy" ]
comments_id: 184 
---

Azure est un produit qui évolue tous les jours, un peu comme les besoins en sécurité des utilisateurs. Malheureusement ces évolutions sont tellement rapide qu'il est parfois compliqué de toute les partager, mais aussi de les suivre.

L'interaction avec Azure se fait toujours via des REST API qui sont bien visible si vous faîtes de l'ARM ou du bicep, et malheureusement très souvent ignoré si vous utilisez Azure uniquement via AzCli ou Azure Powershell.

Prenons l'exemple d'EventHub avec les versions d'api [2017-04-01](https://learn.microsoft.com/en-us/rest/api/eventhub/namespaces/create-or-update?view=rest-eventhub-2017-04-01&tabs=HTTP#definitions&WT.mc_id=AZ-MVP-4039694) et [2024-01-01](https://learn.microsoft.com/en-us/rest/api/eventhub/namespaces/create-or-update?view=rest-eventhub-2024-01-01&tabs=HTTP#definitions&WT.mc_id=AZ-MVP-4039694), on peut voir qu'un bon nombre de propriété se sont ajouter au fur et à mesure du temps.

|2024-01-01|Disponible en 2017-04-01 |
|---|---|
|id|oui|
|identity.principalId|non|
|identity.tenantId|non|
|identity.type|non|
|identity.userAssignedIdentities|non|
|location|oui|
|name|oui|
|properties.alternateName|non|
|properties.clusterArmId|non|
|properties.createdAt|oui|
|properties.disableLocalAuth|non|
|properties.encryption.keySource|non|
|properties.encryption.keyVaultProperties|non|
|properties.encryption.requireInfrastructureEncryption|non|
|properties.isAutoInflateEnabled|oui|
|properties.kafkaEnabled|oui|
|properties.maximumThroughputUnits|oui|
|properties.metricId|oui|
|properties.minimumTlsVersion|non|
|properties.privateEndpointConnections|non|
|properties.provisioningState|oui|
|properties.publicNetworkAccess|non|
|properties.serviceBusEndpoint|oui|
|properties.status|non|
|properties.updatedAt|oui|
|properties.zoneRedundant|non|
|sku|oui|
|systemData|non|
|tags|oui|
|type|oui|

<p></p>
Je n'ai qu'une chose à dire

![alt text]({{ site.url }}/images/2023/11/05/azure-policy-lenfer-des-versions-dapi-img0.gif)

Si vous avez lu mon précédent article sur [Azure Policy](https://woivre.fr/blog/2023/10/azure-policy-un-outil-puissant-pour-votre-gouvernance-seulement-si-on-lutilise-bien) vous êtes en droit de vous demander comment cela marche-t-il avec la propriété *minimumTLSVersion*. Et si vous ne vous posez pas la question, on va quand même y répondre ici.

On va donc créer 2 resources groups le premier avec deux policy Deny et Append comme suit:

*Deny*

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.EventHub/namespaces"
      },
      {
        "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
        "exists": true
      },
      {
        "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
        "notEquals": "1.2"
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}
```

*Append*:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.EventHub/namespaces"
      },
      {
        "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
        "exists": false
      }
    ]
  },
  "then": {
    "effect": "append",
    "details": [
      {
        "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
        "value": "1.2"
      }
    ]
  }
}
```

On va ensuite déployer notre bicep suivant avec la plus vieille version de l'API

```bicep
resource eventhub 'Microsoft.EventHub/namespaces@2017-04-01' = {
  name: 'wwo${deployment().name}${uniqueString(resourceGroup().id)}'
  location: resourceGroup().location
  sku: {
    name: 'Basic'
    capacity: 1
  }
}
```

Cela nous donne donc cela:

```powershell
New-AzrRsourceGroupDeployment -name test -ResourceGroupName eventhub-denyappendpolicy-rg -TemplateFile .\main.bicep | Out-Null
(Get-AzEventHubNamespace -ResourceGroupName eventhub-denyappendpolicy-rg).minimumTLSVersion

1.0
```

On peut voir ici que malgré nos Azure Policy, notre Event Hub est toujours avec un TLS minimal en 1.0.
Mais bon selon Azure tout s'est bien passé lors du déploiement

![alt text]({{ site.url }}/images/2023/11/05/azure-policy-lenfer-des-versions-dapi-img0.png)

Maintenant on va tenter de faire la même chose avec la policy Modify suivante:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.EventHub/namespaces"
      }
    ]
  },
  "then": {
    "effect": "modify",
    "details": {
      "operations": [
        {
          "operation": "addOrReplace",
          "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
          "value": "1.2"
        }
      ],
      "roleDefinitionIds": [
        "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
      ]
    }
  }
}
```

On lance donc la même commande powershell

```powershell
New-AzResourceGroupDeploymen -name test -ResourceGroupName eventhub-modifypolicy-rg -TemplateFile .\main.bicep | Out-Null (Get-AzEventHubNamespace -ResourceGroupName eventhub-modifypolicy-rg).minimumTLSVersion

New-AzResourceGroupDeployment: 3:26:51 PM - Error: Code=InvalidTemplateDeployment; Message=The template deployment failed because of policy violation. Please see details for more information.
New-AzResourceGroupDeployment: 3:26:51 PM - Error: Code=NonModifiablePolicyAlias; Message=The aliases: 'Microsoft.EventHub/namespaces/minimumTlsVersion' are not modifiable in requests using API version: '2017-04-01'. This can happen in requests using API versions for which the aliases do not support the 'modify' effect, or support the 'modify' effect with a different token type.
New-AzResourceGroupDeployment: 3:26:51 PM - Error: Code=PolicyViolation; Message=Unable to apply 'modify' operation using the alias: 'Microsoft.EventHub/namespaces/minimumTlsVersion'. This alias is not modifiable in requests using API versions: '2021-11-01,2021-06-01-preview,2021-01-01-preview,2018-01-01-preview,2017-04-01,2015-08-01,2014-09-01'. See https://aka.ms/policy-modify-conflicts for details. Policies: '{"policyAssignment":{"name":"eventhub-modify-tls","id":"/subscriptions/9d854bbf-c6b3-4b03-a3de-cc4dc16cad0f/resourceGroups/eventhub-modifypolicy-rg/providers/Microsoft.Authorization/policyAssignments/9a2a2c2a500740c69c10bb47"},"policyDefinition":{"name":"eventhub-modify-tls","id":"/subscriptions/9d854bbf-c6b3-4b03-a3de-cc4dc16cad0f/providers/Microsoft.Authorization/policyDefinitions/9ea2d44b-9311-4896-8c2d-dd0cd7907e8f"}}'
New-AzResourceGroupDeployment: The deployment validation failed
```

Alors certes le déploiement ne fonctionne pas, mais on nous dit clairement que l'alias n'est pas supporté par l'api version que nous utilisons. Il ne nous reste qu'à update notre API Version dans notre template bicep.
