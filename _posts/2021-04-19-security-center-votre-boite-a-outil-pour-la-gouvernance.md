---
layout: post
title: Security Center - Votre boite à outil pour la gouvernance
date: 2021-06-08
categories: [ "Azure", "Monitoring", "Microsoft Defender for Cloud" ]
comments_id: 114 
---

Azure offre à la fois des services pour héberger vos applications, mais aussi des outils pour vous aider à mieux les gérer, tel que le Security Center ou le centre de sécurité (en français).

Celui-ci est une boite à outil qui est en constante évolution chez Microsoft, et bonne nouvelle une partie de ces outils sont gratuits, et bien entendu une autre non.

Parmi les outils essentiels que l'on y retrouve il y a :

- Le degré de sécurisation (ou le Secure Score)
- Votre conformité réglementaire
- Azure Defender
- Firewall Manager
- Insights
- Classeurs (ou les Workbooks)
- Automatisation de workflow

Le Security Center est une vraie mine d'or si vous souhaitez vous investir dans le SecOps sur Azure.

Cependant attention les différentes recommandations présentes dans le Security Center ne sont pas toujours applicables dans votre utilisation d'Azure.

Prenons par exemple la règle suivante "**Storage account public access should be disallowed**" : Celle-ci n'est pas applicable dans le cas où par exemple votre compte de stockage est utilisé pour exposer des images via un CDN par exemple.

Donc avant d'appliquer chaque action, il est nécessaire de comprendre si cela correspond à une architecture légitime.

Maintenant comme il est nécessaire de comprendre comment cela fonctionne, ces différentes recommandations proviennent d'une Policy Initiative nommée Azure Security Benchmark (précédemment Enable Monitoring in Azure Security Center). Il s'agit de l'initiative avec la définition suivante : */providers/Microsoft.Authorization/policySetDefinitions/1f3afdf9-d0c9-4c3d-847f-89da613e70a8*

Il est parfois nécessaire de voir les paramètres liées à cette initiative afin de les personnalisés en fonction du contexte de la souscription.

Par exemple dans le Security Center, nous avons cette règle : **Network Watcher should be enabled**.
Si on clique dessus, on peut voir la définition de la policy associée

```json
{
  "properties": {
    "displayName": "Network Watcher should be enabled",
    "policyType": "BuiltIn",
    "mode": "All",
    "description": "Network Watcher is a regional service that enables you to monitor and diagnose conditions at a network scenario level in, to, and from Azure. Scenario level monitoring enables you to diagnose problems at an end to end network level view. Network diagnostic and visualization tools available with Network Watcher help you understand, diagnose, and gain insights to your network in Azure.",
    "metadata": {
      "version": "2.0.0",
      "category": "Network"
    },
    "parameters": {
      "effect": {
        "type": "String",
        "metadata": {
          "displayName": "Effect",
          "description": "Enable or disable the execution of the policy"
        },
        "allowedValues": [
          "AuditIfNotExists",
          "Disabled"
        ],
        "defaultValue": "AuditIfNotExists"
      },
      "listOfLocations": {
        "type": "Array",
        "metadata": {
          "displayName": "Locations",
          "description": "Audit if Network Watcher is not enabled for region(s).",
          "strongType": "location"
        }
      },
      "resourceGroupName": {
        "type": "String",
        "metadata": {
          "displayName": "NetworkWatcher resource group name",
          "description": "Name of the resource group of NetworkWatcher, such as NetworkWatcherRG. This is the resource group where the Network Watchers are located."
        },
        "defaultValue": "NetworkWatcherRG"
      }
    },
    "policyRule": {
      "if": {
        "field": "type",
        "equals": "Microsoft.Resources/subscriptions"
      },
      "then": {
        "effect": "[parameters('effect')]",
        "details": {
          "type": "Microsoft.Network/networkWatchers",
          "resourceGroupName": "[parameters('resourceGroupName')]",
          "existenceCondition": {
            "field": "location",
            "in": "[parameters('listOfLocations')]"
          }
        }
      }
    }
  },
  "id": "/providers/Microsoft.Authorization/policyDefinitions/b6e2945c-0b7b-40f5-9233-7a5323b5cdc6",
  "type": "Microsoft.Authorization/policyDefinitions",
  "name": "b6e2945c-0b7b-40f5-9233-7a5323b5cdc6"
}
```

On voit qu'il y a ici plusieurs paramètres pris en compte, comme le nom du groupe de ressource, et la liste des regions que l'on veut monitorer.

![]({{ site.url }}/images/2021/06/08/security-center-votre-boite-a-outil-pour-la-gouvernance-img0.png)

Sur ma souscription, je déploie le network watcher pour chaque région dans un resource group dédié et que je connais, parce que je n'aime pas les resource group créé par Microsoft sans demande au préalable. Il faut donc penser ici à modifier notre resource group pour le networking par défaut il s'agit de NetworkWatcherRG. (des majuscules, j'adore....)

Bref on peut voir ici quelques exemples sur l'utilité du Security Center à condition de bien l'exploiter, et non pas uniquement le regarder de temps en temps.
Par la suite, je vais tenter de faire d'autres articles autour de ces sujets liés à Security Center afin de creuser plus en détail les différentes fonctionnalités que celui-ci apporte.
