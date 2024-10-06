---
layout: post
title: Logic Apps - Stocker et récupérer l'heure de la dernière exécution
date: 2022-07-11
categories: [ "Azure", "Logic Apps" ]
comments_id: 173 
---

Pour gérer ma veille technologique, j'utilise aussi Azure, et entre autre Azure Function et Azure Logic Apps.
Pour récupérer toutes les publications via un flux RSS, il est possible de le faire via une Logic Apps assez simplement, cependant afin de ne pas récupérer les publications déjà lues, il est convenable d'ajouter un filtre pour récupérer uniquement celles publiées après une certaine date.

Pour des questions de simplicité, il faut donc stocker la date de la dernière exécution de la Logic Apps, et pour cela rien de mieux qu'une Azure Table Storage pour stocker cette information.

Voici donc un template bicep qui contient tout ce qu'il faut pour avoir un exemple à exécuter dans votre environnement Azure.

Celui-ci contient :

- Azure Storage
- User Managed Identity
- Role Assignment de la Managed Identity sur votre Storage avec le droit built-in Storage Table Data Contributor
- Connection à Azure Storage (nécessaire pour Logic Apps)
- Logic Apps avec 2 tâches pour lire l'entrée dans le storage, et la créer à la fin du workflow

Si vous souhaitez plus d'information sur comment construire votre Logic App via un template ARM, j'ai publié un article il y a quelques années [Créez vos Logic Apps via des templates ARM](https://woivre.fr/blog/2018/12/creez-vos-logic-apps-via-des-templates-arm) et mauvaise nouvelle ce n'est toujours pas trivial à faire.

Le code est publié sur Github si vous le souhaitez : [Template bicep](https://github.com/wilfriedwoivre/demo-blog/blob/master/Bicep/logic-apps-with-last-execution-time/main.bicep)

```bicep
var demoName = 'demoblog'
var partitionKey = 'demoblog'
var rowKey = 'lastexecution'

resource storage 'Microsoft.Storage/storageAccounts@2021-09-01' = {
  name: '${demoName}${uniqueString(deployment().name)}'
  location: resourceGroup().location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2021-09-01' = {
  name: 'default'
  parent: storage
}

resource table 'Microsoft.Storage/storageAccounts/tableServices/tables@2021-09-01' = {
  name: 'config'
  parent: tableService
}

resource customIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2022-01-31-preview' = {
  name: '${demoName}${uniqueString(deployment().name)}'
  location: resourceGroup().location
}

resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: '${demoName}${uniqueString(deployment().name)}'
  location: resourceGroup().location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${customIdentity.id}': {}
    }
  }
  properties: {
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      parameters: {
        '$connections': {
          defaultValue: {
          }
          type: 'Object'
        }
      }
      triggers: {
        recurrence: {
          type: 'recurrence'
          recurrence: {
            interval: 1
            frequency: 'Day'
          }
        }
      }
      actions: {
        Get_Last_Time_Execution: {
          inputs: {
            host: {
              connection: {
                name: '@parameters(\'$connections\')[\'azuretables\'][\'connectionId\']'
              }
            }
            method: 'get'
            path: '/v2/storageAccounts/@{encodeURIComponent(encodeURIComponent(\'${storage.name}\'))}/tables/@{encodeURIComponent(\'${table.name}\')}/entities(PartitionKey=\'@{encodeURIComponent(\'${partitionKey}\')}\',RowKey=\'@{encodeURIComponent(\'${rowKey}\')}\')'
          }
          runAfter: {
          }
          type: 'ApiConnection'
        }
        Update_Last_Time_Execution: {
          inputs: {
            host: {
              connection: {
                name: '@parameters(\'$connections\')[\'azuretables\'][\'connectionId\']'
              }
            }
            method: 'put'
            body: {
              Value: '@{utcNow() }'
            }
            path: '/v2/storageAccounts/@{encodeURIComponent(encodeURIComponent(\'${storage.name}\'))}/tables/@{encodeURIComponent(\'${table.name}\')}/entities(PartitionKey=\'@{encodeURIComponent(\'${partitionKey}\')}\',RowKey=\'@{encodeURIComponent(\'${rowKey}\')}\')'
          }
          runAfter: {
            Get_Last_Time_Execution: [
              'Succeeded'
              'Failed'
            ]
          }
          type: 'ApiConnection'
        }
      }
    }
    parameters: {
      '$connections': {
        value: {
          azuretables: {
            connectionId: azuretables.id
            connectionName: 'azuretables'
            connectionProperties: {
              authentication: {
                identity: customIdentity.id
                type: 'ManagedServiceIdentity'
              }
            }
            id: subscriptionResourceId('Microsoft.Web/locations/managedApis',  resourceGroup().location,  'azuretables')
          }
        }
      }
    }
  }
}

resource roleAssignement 'Microsoft.Authorization/roleAssignments@2020-10-01-preview' = {
  scope: storage
  name: guid('${demoName}${uniqueString(deployment().name)}')
  properties: {
    principalId: customIdentity.properties.principalId
    roleDefinitionId: resourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
    principalType: 'ServicePrincipal'
  }
}
resource azuretables 'Microsoft.Web/connections@2016-06-01' = {

  name: 'azuretables'
  location: resourceGroup().location
  properties: {
    displayName: 'storage'
    api: {
      id: subscriptionResourceId('Microsoft.Web/locations/managedApis', resourceGroup().location, 'azuretables')
    }
    customParameterValues: {
    }
    'parameterValueSet': {
      name: 'managedIdentityAuth'
      values: {
      }
    }
  }
}
```

Voilà si cela peut vous sauvez des heures de casse têtes, je suis content pour vous.
