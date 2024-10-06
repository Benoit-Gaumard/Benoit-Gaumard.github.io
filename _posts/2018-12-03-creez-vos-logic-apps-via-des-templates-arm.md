---
layout: post
title: Créez vos Logic Apps via des templates ARM
date: 2018-12-03
categories: [ "ARM", "Logic Apps", "Event Grid" ]
comments_id: 154 
---

Si vous avez déjà créé des workflows Logic Apps depuis le portail Azure, vous avez pu voir qu'il est possible de faire énormément de choses avec.
Pour ma part, je l'utilise souvent lié à EventGrid afin d'envoyer des mails pour faire ce que j'appelle du Reactive Monitoring.
Bien qu'il soit très simple de configurer notre Logic Apps depuis le portail Azure, la mise en place de ces workflows en ARM n'est pas chose aisée.

Si je prends mon cas d'usage, mes workflows Logic Apps utilisent entre autre les étapes suivantes :

- Trigger Event Grid
- Parsing JSON
- Conditions
- Appel Azure Function
- Appel Azure Automation
- Appel Azure AD
- Envoi de mail

Voyons maintenant comment construire notre template ARM. Nous allons commencer par le début, en définissant la structure de notre template ARM :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {},
    "resources": [
        {
            "type": "Microsoft.Logic/workflows",
            "apiVersion": "2016-06-01",
            "name": "mylogic",
            "location": "[resourceGroup().location]",
            "tags": {
               "displayName": "LogicApp"
            },
            "properties": {
               "state": "Disabled",
               "definition": {
                  "$schema": "https://schema.management.azure.com/schemas/2016-06-01/Microsoft.Logic.json",
                  "contentVersion": "1.0.0.0",
                  "parameters": {},
                  "triggers": {},
                  "actions": {},
                  "outputs": {}
               },
               "parameters": {}
            }
         }
    ],
    "outputs": {}
}
```

On peut voir que les propriétés de notre Logic Apps sont en fait représentées par un JSON qui s'imbrique dans notre template ARM.

Une fois la structure définie, il faut commencer par notre trigger Event Grid. Pour cela il faut créer un objet de type **Microsoft.Web/connections**

```json
{
    "name": "[variables('eventGridConnexion')]",
    "type": "Microsoft.Web/connections",
    "apiVersion": "2016-06-01",
    "location": "[resourceGroup().location]",
    "properties": {
        "displayName": "[variables('eventGridConnexion')]",
        "api": {
            "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/', resourceGroup().location, '/managedApis/azureeventgrid')]"
        }
    }
}
```

Cet objet connexion ne contient pas les informations nécessaires pour initier la connexion dans Logic Apps, elles seront à renseigner plus tard via le portail Azure, ou via ce script Powershell : [https://github.com/logicappsio/LogicAppConnectionAuth](https://github.com/logicappsio/LogicAppConnectionAuth)

Pour les autres *managedApis* que j'utilise, j'utilise les id suivants :

- Azure Event Grid : **azureeventgrid**
- Office 365 : **office365**
- Azure Active Directory : **azuread**

On rajoute par la suite cette connexion en dépendance requise pour notre Logic Apps.

```json
"dependsOn": [
    "[resourceId('Microsoft.Web/connections', variables('eventGridConnexion'))]",
    "[resourceId('Microsoft.Web/connections', variables('AADConnexion'))]",
    "[resourceId('Microsoft.Web/connections', variables('O365Connexion'))]"
]
```

Ensuite, on passe en paramètre de notre Logic Apps les informations nécessaires pour notre connexion, ici je passe par un objet **$connexions**, le même qui est généré par l'export ARM depuis le portail Azure.

```json
"$connections": {
    "value": {
        "azureeventgrid": {
            "connectionId": "[resourceId('Microsoft.Web/connections', variables('eventGridConnexion'))]",
            "connectionName": "[variables('eventGridConnexion')]",
            "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/', variables('location'), '/managedApis/azureeventgrid')]"
        },
        "azuread": {
            "connectionId": "[resourceId('Microsoft.Web/connections', variables('AADConnexion'))]",
            "connectionName": "[variables('AADConnexion')]",
            "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/', variables('location'), '/managedApis/azuread')]"
        },
        "office365": {
            "connectionId": "[resourceId('Microsoft.Web/connections', variables('O365Connexion'))]",
            "connectionName": "[variables('O365Connexion')]",
            "id": "[concat('/subscriptions/', subscription().subscriptionId, '/providers/Microsoft.Web/locations/', variables('location'), '/managedApis/office365')]"
        }
}
```

Et je peux ainsi définir mon trigger de la sorte :

```json
"triggers": {
    "Event_Grid_Trigger": {
        "inputs": {
            "body": {
                "properties": {
                    "destination": {
                        "endpointType": "webhook",
                        "properties": {
                            "endpointUrl": "@{listCallbackUrl()}"
                        }
                    },
                    "filter": {
                        "includedEventTypes": [
                            "Microsoft.Resources.ResourceWriteSuccess"
                        ]
                    },
                    "topic": "[subscription().id]"
                }
            },
            "host": {
                "connection": {
                    "name": "@parameters('$connections')['azureeventgrid']['connectionId']"
                }
            },
            "path": "[concat('/subscriptions/', uriComponent(subscription().subscriptionId), '/providers/', uriComponent('Microsoft.Resources.Subscriptions'), '/resource/eventSubscriptions')]",
            "queries": {
                "subscriptionName": "[variables('eventGridConnexion')]",
                "x-ms-api-version": "2017-06-15-preview"
            }
        },
        "splitOn": "@triggerBody()",
        "type": "ApiConnectionWebhook"
    }
}
```

Il est possible de nommer votre trigger comme vous le souhaitez, par défaut les underscores sont remplacés par des espaces dans le designer Logic Apps.

Ensuite, il faut lire le contenu de notre trigger en ajoutant une action qui nous permettra de lire notre JSON et de valider le schéma d'entrée. Pour cela, on va utiliser cette action :

```json
"Parse_EventGrid_JSON": {
    "runAfter": {},
    "type": "ParseJson",
    "inputs": {
        "content": "@triggerBody()?['data']",
        "schema": {
            /* Schéma JSON */
        }
    }
}
```

Pour cette première étape, il n'est pas nécessaire d'indiquer qu'elle s'exécute après notre trigger, cependant pour les autres il s'agit d'un prérequis, le service de management Azure ne prendra pas en compte l'ordre des élément dans votre template.

Afin de ne pas faire 50 pages de templates ARM ici même, voici quelques astuces pour construire votre template Logic Apps

- Faire un brouillon de celui-ci sur Azure, afin de visualiser le json via l'onglet code view
- Utiliser Visual Studio Code, et l'extension de Microsoft [https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-logicapps](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-logicapps)
- Tester votre template étape par étape
