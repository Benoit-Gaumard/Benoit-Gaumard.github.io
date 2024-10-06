---
layout: post
title: Azure Policy - Un outil puissant pour votre gouvernance seulement si on l'utilise bien
date: 2023-10-20
categories: [ "Azure", "Policy" ]
comments_id: 183 
---

Azure policy est un outil très puissant, surtout quand il s'agit de gouvernance.

Après un échange avec un de mes collègues sur la gestion des policies, je pense qu'il est nécessaire d'expliquer certaines choses sur les différents types d'action, et surtout sur leur ordre d'execution.

Prenons par exemple le cas suivant: _En tant que responsable de la sécurité, je souhaite **interdire** l'usage de TLS autre que 1.2 sur mes EventHubs_

La première approche est donc de prendre textuellement la demande et l'appliquer sur une Azure policy qui ressemblera à ça :

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

Après déploiement, un premier test est fait depuis le portail Azure, et bonne nouvelle, la policy fonctionne bien.
Maintenant il faut rappeler que toute la gestion avec les providers Azure n'est qu'API, qu'est ce qu'il se passe si on ne met pas de _minimalTLSVersion_ dans notre payload, ou alors dans notre bicep

```bicep
resource eventhub 'Microsoft.EventHub/namespaces@2023-01-01-preview' = {
  name: 'wwo${deployment().name}${uniqueString(resourceGroup().id)}'
#disable-next-line no-loc-expr-outside-params
  location: resourceGroup().location
  sku: {
    name: 'Basic'
    capacity: 1
  }
}
```

Et bien mauvaise nouvelle pour le coup, notre event hub est bien créé, et en terme de sécurité il n'est donc pas compliant.

Pour forcer cela, il y a 3 solutions basés sur les policies.

- Mettre à jour notre policy pour forcer la présence du minimalTLSVersion
- Ajouter une policy Append pour ajouter le champs avec la bonne valeur
- Remplacer tout cela par une policy de type Modify

## Mettre à jour notre policy pour forcer la présence de minimalTLSversion

Notre première approche consiste à modifier la policy dans ce sens:

```json
{
  "if": {
    "allOf": [
      {
        "field": "type",
        "equals": "Microsoft.EventHub/namespaces"
      },
      {
        "anyOf": [
          {
            "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
            "exists": false
          },
          {
            "field": "Microsoft.EventHub/namespaces/minimumTlsVersion",
            "notEquals": "1.2"
          }
        ]
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}
```

De ce fait on force la présence du champ minimalTLSVersion même sur l'API, et de ce fait notre template doit faire mention de la propriété _minimalTLSVersion_ avec la bonne valeur pour être valide.

Dans les pros, cela sensibilise plus les devops à la mise en place du tls.
Dans les contres, cela peut casser des chaînes de CI/CD existantes. Cela casse l'expérience développeur pour un champ qu'il n'avait pas juger important de mettre dans un contexte sécurisé par Azure Policy.

## Ajouter une policy Append pour ajouter le champs avec la bonne valeur

Si l'on reste sur notre première version de notre policy, il est possible de rajouter une policy **Append** qui va s'exécuter avant notre Deny

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

Dans les pros, on résout tous les contres de l'implémentation précédente.
Dans les contres, a-t-on vraiment besoin de 2 policies pour un simple problème de TLS ? Cet argument est bien entendu un pour si vous êtes payé à la policy.

## Remplacer tout cela par une policy de type Modify

On va donc supprimer notre _Deny_ policy pour la remplacer par celle ci:

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

Dans les pros, on modifie la propriété de manière transparente par l'utilisateur, et on n'a qu'une policy à modifier lors d'un passage à TLS 1.3 par exemple. De plus elle a un avantage supplémentaire que nous détaillerons dans un prochain article.
Dans les contres, une identité est créé pour vous et assigner à Azure, il faut donc gérer les droits qu'elle a (ici c'est du **Contributor** par facilité)

Pour moi il n'y a pas de meilleure propostion, c'est à vous de choisir en fonction de vos cas d'usages.
Dans ce cas précis, si le TLS n'est pas un sujet, vous pouvez utiliser la dernière proposition pour simplifier votre infra as code. Et ainsi vous affranchir de toutes les modifications de vos différentes stacks d'infra as code.
Et si c'est un sujet chez vous car il vous reste des applications utilisant du TLS 1.0 ou 1.1 le mieux est de mettre la première version avec des exeptions dans l'assignement de votre policy.

