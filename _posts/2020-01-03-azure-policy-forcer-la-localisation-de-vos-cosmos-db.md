---
layout: post
title: Azure Policy - Forcer la localisation de vos Cosmos DB
date: 2020-01-03
categories: [ "Azure", "Policy", "Cosmos DB" ]
comments_id: 107 
---

Il est très simple sur Azure de limiter les régions autorisées par vos services via une simple Policy Azure disponible par défault.

Pour rappel, la policy pour limiter la localisation des ressources est la suivante :

```json
"if": {
    "allOf": [
        {
            "field": "location",
            "notIn": "[parameters('listOfAllowedLocations')]"
        },
        {
            "field": "location",
            "notEquals": "global"
        }
    ]
},
"then": {
    "effect": "deny"
}  
```

Plus qu'à ajouter les noms des régions que vous voulez accepter. Ne pas oubliez de mettre la localisation **global** sinon vous ne pourrez pas crééer de ressources mondiales comme les zones DNS.

Maintenant prenons le cas d'un Cosmos DB par exemple, si vous avez mis en place la Policy précédente avec par exemple uniquement les régions *West Europe* et *North Europe*, vous ne pourrez créér votre Cosmos DB uniquement dans ces deux régions là.

Cependant, Cosmos DB offre la possibilité de créer des réplicas sur différentes régions, et bien que notre policy soit présente, vous verrez qu'il est tout à fait possible de créer un réplicas sur *East US* par exemple.

Pour bloquer cela, il faut mettre une nouvelle policy en place qui correspond à la définition suivante:

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.DocumentDB/databaseAccounts"
        },
        {
          "not": {
            "field": "Microsoft.DocumentDB/databaseAccounts/Locations[*].locationName",
            "in": "[parameters('allowedLocations')]"
          }
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  },
  "parameters": {
    "allowedLocations": {
      "type": "Array",
      "metadata": {
        "displayName": "Allowed locations",
        "description": "The list of allowed locations for resources."
      }
    }
  }
}
```

Pour les valeurs, on ne peut pas mettre le type fort pour les régions, on est donc obligé d'utiliser une liste, et de faire de la sorte : *westeurope;northeurope;West Europe;North Europe*
