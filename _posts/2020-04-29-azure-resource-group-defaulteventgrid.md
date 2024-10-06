---
layout: post
title: Azure - Resource Group DEFAULT-EVENTGRID
date: 2020-04-29
categories: [ "Azure", "Event Grid" ]
comments_id: 111 
---

Si comme moi vous vous êtes connecté sur votre portail Azure ce matin, vous avez peut-être vu un nouveau groupe de ressource qui s'appelle **DEFAULT-EVENTGRID** localisé en West US 2 (en tout cas chez moi).

Comme son nom l'indique, il y a un rapport avec Event Grid....

Regardons un peu son contenu maintenant, à priori il n'y a rien, sauf si vous activé les ressources cachées, vous verrez une ressource de ce type *microsoft.eventgrid/systemtopics*

Le nom de la ressource est une simple concaténation de 2 GUID.

Bon maintenant, si vous avez des contraintes de localisation de vos groupes de resources, ou si vous aimez que tout soit bien rangés à sa place, il est possible de créer votre souscription event grid via un template ARM plutôt que via du clic clic portail.

Voici un template ARM qui créé un topic sur la mise à jour de ressources d'une souscription, et qui envoit les messages dans une storage queue.

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "eventSubName": {
      "type": "string",
      "defaultValue": "subToResources",
      "metadata": {
        "description": "The name of the event subscription to create."
      }
    },
    "eventGridTopicName": {
      "type": "string"
    },
    "storageName": {
      "type": "string"
    }
  },
  "resources": [
    {
      "name": "[parameters('eventGridTopicName')]",
      "type": "Microsoft.EventGrid/systemTopics",
      "location": "global",
      "apiVersion": "2020-04-01-preview",
      "properties": {
        "source": "[subscription().id]",
        "topicType": "microsoft.resources.subscriptions"
      }
    },
    {
      "type": "Microsoft.EventGrid/systemTopics/eventSubscriptions",
      "name": "[concat(parameters('eventGridTopicName'), '/', parameters('eventSubName'))]",
      "apiVersion": "2020-04-01-preview",
      "dependsOn": [
        "[parameters('eventGridTopicName')]"
      ],
      "properties": {
        "destination": {
          "endpointType": "StorageQueue",
          "properties": {
            "queueName": "eventgridqueue",
            "resourceId": "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageName'))]"
          }
        }
      }
    }
  ]
}
```

Et voilà j'ai pu supprimer ce resource group situé en West US 2.
