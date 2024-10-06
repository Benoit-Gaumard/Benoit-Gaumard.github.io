---
layout: post
title: Azure Storage - Contrôler l'utilisation de vos SAS Key
date: 2022-04-15
categories: [ "Azure", "Storage", "Policy" ]
comments_id: 126 
---

L'utilisation des SAS Key dans Azure Storage est un système très pratique lorsqu'on veut fournir un accès limité à un Storage Account, que ce soit en terme de droit, en terme de scope, ou en terme de durée de validité.

Cependant laisser cela à la main des équipes peut s'avérer source de data leakage, en effet, il est rapidement possible de créer une SAS Key avec une durée très longue afin de *gagner* du temps lors de l'utilisation, car c'est toujours la même.

En tant qu'ops ou responsable sécurité, il est donc nécessaire de chercher dans les logs du Storage les différents SAS Key utilisé afin de trouver les erreurs de ce type.

Et bien encore une fois Microsoft va nous simplifier la vie avec cette nouvelle fonctionnalité. On peut désormais ajouter une alerte lorsque la SAS Key a une durée de vie trop longue. Attention cependant il s'agit d'une alerte, pas d'un blocage si l'on génère ou utilise une SAS Key non compliante.

En ARM, il suffit d'ajouter cette propriété à votre storage, ou alors d'aller la mettre dans la configuration de votre Storage dans le portail Azure

```json
"sasPolicy": {
                "sasExpirationPeriod": "1.00:00:00",
                "expirationAction": "Log"
            },
```

Cependant à noter qu'il y a un champ **expirationAction** à Log qui est la seule valeur possible, mais j'espère voir un Deny dans le futur.

Une fois n'est pas coutume, il est possible d'avoir une Azure Policy pour vous indiquer quel storage n'a pas de SAS Key Policy configuré, et elle est built-in vous pouvez la retrouver sous le nom **Storage accounts should have shared access signature (SAS) policies configured** ou encore voici sa définition:

```json
{
  "properties": {
    "displayName": "Storage accounts should have shared access signature (SAS) policies configured",
    "policyType": "BuiltIn",
    "mode": "Indexed",
    "description": "Ensure storage accounts have shared access signature (SAS) expiration policy enabled. Users use a SAS to delegate access to resources in Azure Storage account. And SAS expiration policy recommend upper expiration limit when a user creates a SAS token.",
    "metadata": {
      "version": "1.0.0",
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
            "field": "Microsoft.Storage/storageAccounts/sasPolicy",
            "exists": "false"
          }
        ]
      },
      "then": {
        "effect": "[parameters('effect')]"
      }
    }
  },
  "id": "/providers/Microsoft.Authorization/policyDefinitions/bc1b984e-ddae-40cc-801a-050a030e4fbe",
  "type": "Microsoft.Authorization/policyDefinitions",
  "name": "bc1b984e-ddae-40cc-801a-050a030e4fbe"
}
```

Afin de savoir si vos storages utilisent des SAS Key non valides, il faut aller dans les Logs de votre storage, que vous avez bien entendu configuré et d'effectuer la recherche Kusto suivante :

```sql
StorageBlobLogs 
| where SasExpiryStatus startswith "Policy violated"
| summarize count() by AccountName, SasExpiryStatus
```

Et voilà comment gagner rapidement plus de contrôle sur vos storages.
