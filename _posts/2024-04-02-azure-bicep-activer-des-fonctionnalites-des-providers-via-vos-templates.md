---
layout: post
title: Azure Bicep - Activer des fonctionnalités des providers via vos templates
date: 2024-04-02
categories: [ "Azure", "Bicep" ]
comments_id: 189 
---

Lorsque vous avez un certain nombre de souscription Azure, il peut être nécessaire d'activer des providers en masse.

Il est toujours possible de le faire en REST API / Az CLI / Az Powershell, comme l'indique la documentation, mais il est aussi possible de le faire en bicep via le template suivant:

```bicep
targetScope='subscription'

param providerName string = 'Microsoft.ContainerService'
param featureName string = 'AKS-PrometheusAddonPreview'

resource feature 'Microsoft.Features/featureProviders/subscriptionFeatureRegistrations@2021-07-01' = {
  name: '${providerName}/${featureName}'
}
```

Et voici l'ARM pour ceux qui le lisent encore:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "providerName": {
      "type": "string",
      "defaultValue": "Microsoft.ContainerService"
    },
    "featureName": {
      "type": "string",
      "defaultValue": "AKS-PrometheusAddonPreview"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Features/featureProviders/subscriptionFeatureRegistrations",
      "apiVersion": "2021-07-01",
      "name": "[format('{0}/{1}', parameters('providerName'), parameters('featureName'))]"
    }
  ]
}
```

Et le bicep, ou l'arm qui est derrière peut être utilisé dans Blueprint (ARM), ou dans Template Specs et Deployment Stack en fonction des besoins de vos utilisateurs.
