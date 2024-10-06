---
layout: post
title: Azure Storage - Simplifiez la rotation de vos clés
date: 2022-04-13
categories: [ "Azure", "Storage", "Policy" ]
comments_id: 125 
---

D'un point de vue sécurité, il est souvent nécessaire d'effectuer une rotation de vos clés d'accès qu'il s'agisse d'un mot de passe utilisateur, ou d'une clé d'un SPN. Mais il ne faut pas oublier vos assets techniques où l'on peut s'identifier avec une clé tel qu'Azure Storage.

Sauf si vous avez géré cela avec brio dans votre application et votre infrastructure, faire tourner les clés de son storage peut être fastidieux, et surtout on risque d'oublier de le faire si on ne le fait pas régulièrement.

Pour vous aider à le faire plus souvent, Microsoft a sorti une nouvelle fonctionnalité qui vous permettra de vous en rappeler plus facilement, il est maintenant possible d'ajouter un alerting lorsque vos clés n'ont pas tourné depuis très longtemps.

Pour cela rien de plus en ARM il suffit d'ajouter la propriété suivante à vos storage:

```json
"keyPolicy": {
                "keyExpirationPeriodInDays": 60
            },
```

Il est bien entendu possible depuis le portail Azure, dans la blade de gestion des clés.

Maintenant c'est bien d'avoir mis une policy en place, mais comment on est alerté, et bien simplement grâce à une Azure Policy built-in que vous pouvez retrouver sous le nom **Storage account keys should not be expired**

Et pour les curieux voici sa définition

```json
{
  "properties": {
    "displayName": "Storage account keys should not be expired",
    "policyType": "BuiltIn",
    "mode": "Indexed",
    "description": "Ensure the user storage account keys are not expired when key expiration policy is set, for improving security of account keys by taking action when the keys are expired.",
    "metadata": {
      "version": "3.0.0",
      "category": "Storage"
    },
    "parameters": {
      "effect": {
        "type": "String",
        "metadata": {
          "displayName": "Effect",
          "description": "Audit allows a non-compliant resource to be created, but flags it as non-compliant. Deny blocks the resource creation and update. Disable turns off the policy."
        },
        "allowedValues": [
          "Audit",
          "Deny",
          "Disabled"
        ],
        "defaultValue": "Audit"
      }
    },
    "policyRule": {
      "if": {
        "allOf": [
          {
            "field": "type",
            "equals": "Microsoft.Storage/storageAccounts"
          },
          {
            "anyOf": [
              {
                "value": "[utcNow()]",
                "greater": "[if(and(not(empty(coalesce(field('Microsoft.Storage/storageAccounts/keyCreationTime.key1'), ''))), not(empty(string(coalesce(field('Microsoft.Storage/storageAccounts/keyPolicy.keyExpirationPeriodInDays'), ''))))), addDays(field('Microsoft.Storage/storageAccounts/keyCreationTime.key1'), field('Microsoft.Storage/storageAccounts/keyPolicy.keyExpirationPeriodInDays')), utcNow())]"
              },
              {
                "value": "[utcNow()]",
                "greater": "[if(and(not(empty(coalesce(field('Microsoft.Storage/storageAccounts/keyCreationTime.key2'), ''))), not(empty(string(coalesce(field('Microsoft.Storage/storageAccounts/keyPolicy.keyExpirationPeriodInDays'), ''))))), addDays(field('Microsoft.Storage/storageAccounts/keyCreationTime.key2'), field('Microsoft.Storage/storageAccounts/keyPolicy.keyExpirationPeriodInDays')), utcNow())]"
              }
            ]
          }
        ]
      },
      "then": {
        "effect": "[parameters('effect')]"
      }
    }
  },
  "id": "/providers/Microsoft.Authorization/policyDefinitions/044985bb-afe1-42cd-8a36-9d5d42424537",
  "type": "Microsoft.Authorization/policyDefinitions",
  "name": "044985bb-afe1-42cd-8a36-9d5d42424537"
}
```

On notera qu'il n'est pas possible de sortir la définition de cette policy par coeur en soirée...

Et voilà n'oubliez pas de faire tourner vos clés, on ne sait jamais que vous soyez obligé de le faire à cause d'un incident de sécurité, c'est mieux d'avoir testé cela avant.
