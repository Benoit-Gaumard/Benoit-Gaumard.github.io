---
layout: post
title: Azure Policy - Mettre en place l'arrêt automatique de vos VMs
date: 2019-09-03
categories: [ "Azure",  "Policy", "Virtual Machines" ]
comments_id: 168 
---

Lorsqu'on parle de Cloud, on parle très souvent des coûts que cela implique. Il est nécessaire d'optimiser son budget pour qu'à la fin du mois la facture ne soit pas trop salée. Il existe plusieurs solutions pour que les finances restent au vert à la fin du mois comme les suivantes :

- Supprimer les ressources inutilisées.... Mais qui a laissé trainer cet Azure Firewall
- Eteindre vos VMs le soir sur vos environnements hors production
- Mettre en place de l'autoscaling sur les environnements de production
- Créer des environnements temporaires pour vos tests. N'oubliez pas que je vous ai fournis tous les outils pour réaliser votre propre [Sandbox](https://woivre.fr/blog/2018/11/sandbox-azure-pour-tout-le-monde)

Revenons sur le point d'éteindre vos machines le soir, à part s'il s'agit de votre carte bleue personnelle, vous l'oubliez généralement un soir sur deux, si ce n'est plus.
Mais il est possible d'automatiser cela de plusieurs manières :

- ***Auto-shutdown***: Disponible de manière built in dans Azure, via la blade de votre VM, il y a l'interface pour l'AutoShutdown. On retrouvera ici à configurer une heure d'arrête sur une timezone spécifique, et la possibilité d'avoir une notification avant l'extinction de la VM. Il est bien entendu possible d'activer ou désactiver cette fonctionnalité par VM.
  - **Avantages**: Possibilité de configurer de manière granulaire chacune de vos VMS, et de définir pour chacune un horaire spécifique

  - **Inconvénients** : Fastidieux à mettre en place pour 300 VMS. Pas possible de redémarrer vos VMS le matin.

- ***Azure Automation***: Azure Automation offre une solution built-in pour cela. Vous pouvez retrouver toutes les informations dans la [docs Microsoft](https://docs.microsoft.com/en-us/azure/automation/automation-solution-vm-management)
  - **Avantages** : Toutes vos VMS sont configuréees pour s'éteindre et redémmarrer. Sauf celles que vous avez exclues
  
  - **Inconvénients** : Même horaire pour toutes vos VMs d'une souscription, ou alors il faut faire plusieurs automations.

- ***Azure Automation & Tags***: Il est possible de créer un runbook qui allume ou éteint vos serveurs en fonction de tags. Il est possible d'en trouver dans la galerie
  - **Avantages** : Possibilité de gérer chacune de vos VMS de manière indépendante via des tags. La gestion du script est centralisé sur un seul Azure Automation.

  - **Inconvénients** : Runbook à gérer et à monitorer en cas d'erreur.

Dans mon cas, j'ai le besoin d'éteindre mes VMs à une heure précise (par VM) et un démarrage manuel, puisque mon planning change tous les jours. Il faut donc que je mette en place l'autoshutdown par VM.

Maintenant pour éviter le côté fastidieux, il est possible de créer un template ARM pour déployer notre ressource :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "vmName": {
            "type": "string"
        },
        "location": {
            "type": "string"
        },
        "status": {
            "type": "string",
            "allowedValues": [
                "Enabled",
                "Disabled"
            ]
        },
        "shutdownHour": {
            "type": "string"
        },
        "timeZone": {
            "type": "string"
        }
    },
    "variables": {
        "shutdownHour": "[replace(parameters('shutdownHour'), ':', '')]"
    },
    "resources": [
        {
            "type": "Microsoft.DevTestLab/schedules",
            "apiVersion": "2016-05-15",
            "name": "[concat('shutdown-computevm-', parameters('vmName'))]",
            "location": "[parameters('location')]",
            "properties": {
                "status": "[parameters('status')]",
                "taskType": "ComputeVmShutdownTask",
                "dailyRecurrence": {
                    "time": "[variables('shutdownHour')]"
                },
                "timeZoneId": "[parameters('timeZone')]",
                "notificationSettings": {
                    "status": "Disabled",
                    "timeInMinutes": 30
                },
                "targetResourceId": "[resourceId('Microsoft.Compute/virtualMachines', parameters('vmName'))]"
            }
        }
    ],
    "outputs": {
        "policy": {
            "type": "string",
            "value": "[concat('Autoshutdown configured for VM', parameters('vmName'))]"
        }
    }
}
```

Il est maintenant possible de créer cet objet pour chaque VM via une Azure Policy avec un effet **deployIfNotExists**

Pour le passage de mes paramètres à mon template ARM, je décide de mettre des tags sur mes VMs, et de les utiliser en paramètre comme le montre la policy ci-dessous :

```json
{
  "mode": "Indexed",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Compute/virtualMachines"
        },
        {
          "field": "[concat('tags[', parameters('tagAutoShutdownEnabled'), ']')]",
          "exists": "true"
        },
        {
          "field": "[concat('tags[', parameters('tagAutoShutdownHour'), ']')]",
          "exists": "true"
        },
        {
          "field": "[concat('tags[', parameters('tagAutoShutdownTimeZone'), ']')]",
          "exists": "true"
        }
      ]
    },
    "then": {
      "effect": "deployIfNotExists",
      "details": {
        "type": "Microsoft.DevTestLab/schedules",
        "name": "[concat('shutdown-computevm-', field('name'))]",
        "existenceCondition": {
          "allOf": [
            {
              "field": "tags.AutoShutdown-Enabled",
              "equals": "[field('tags.AutoShutdown-Enabled')]"
            },
            {
              "field": "tags.AutoShutdown-Hour",
              "equals": "[field('tags.AutoShutdown-Hour')]"
            },
            {
              "field": "tags.AutoShutdown-TimeZone",
              "equals": "[field('tags.AutoShutdown-TimeZone')]"
            }
          ]
        },
        "roleDefinitionIds": [
          "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
        ],
        "deployment": {
          "properties": {
            "mode": "incremental",
            "template": {
              "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
              "contentVersion": "1.0.0.0",
              "parameters": {
                "vmName": {
                  "type": "string"
                },
                "location": {
                  "type": "string"
                },
                "status": {
                  "type": "string",
                  "allowedValues": [
                    "Enabled",
                    "Disabled"
                  ]
                },
                "shutdownHour": {
                  "type": "string"
                },
                "timeZone": {
                  "type": "string"
                }
              },
              "variables": {
                "shutdownHour": "[replace(parameters('shutdownHour'), ':', '')]"
              },
              "resources": [
                {
                  "type": "Microsoft.DevTestLab/schedules",
                  "apiVersion": "2016-05-15",
                  "name": "[concat('shutdown-computevm-', parameters('vmName'))]",
                  "location": "[parameters('location')]",
                  "tags": {
                    "AutoShutdown-Enabled": "[parameters('status')]",
                    "AutoShutdown-TimeZone": "[parameters('timeZone')]",
                    "AutoShutdown-Hour": "[parameters('shutdownHour')]"
                  },
                  "properties": {
                    "status": "[parameters('status')]",
                    "taskType": "ComputeVmShutdownTask",
                    "dailyRecurrence": {
                      "time": "[variables('shutdownHour')]"
                    },
                    "timeZoneId": "[parameters('timeZone')]",
                    "notificationSettings": {
                      "status": "Disabled",
                      "timeInMinutes": 30
                    },
                    "targetResourceId": "[resourceId('Microsoft.Compute/virtualMachines', parameters('vmName'))]"
                  }
                }
              ],
              "outputs": {
                "policy": {
                  "type": "string",
                  "value": "[concat('Autoshutdown configured for VM', parameters('vmName'))]"
                }
              }
            },
            "parameters": {
              "vmName": {
                "value": "[field('name')]"
              },
              "location": {
                "value": "[field('location')]"
              },
              "status": {
                "value": "[field('tags.AutoShutdown-Enabled')]"
              },
              "shutdownHour": {
                "value": "[field('tags.AutoShutdown-Hour')]"
              },
              "timeZone": {
                "value": "[field('tags.AutoShutdown-TimeZone')]"
              }
            }
          }
        }
      }
    }
  },
  "parameters": {
    "tagAutoShutdownEnabled": {
      "type": "String",
      "metadata": {
        "displayName": "Tag Name",
        "description": null
      },
      "defaultValue": "AutoShutdown-Enabled"
    },
    "tagAutoShutdownTimeZone": {
      "type": "String",
      "metadata": {
        "displayName": "Tag Name",
        "description": null
      },
      "defaultValue": "AutoShutdown-TimeZone"
    },
    "tagAutoShutdownHour": {
      "type": "String",
      "metadata": {
        "displayName": "Tag Name",
        "description": null
      },
      "defaultValue": "AutoShutdown-Hour"
    }
  }
}
```

Je vous ai fait un Gist pour que ce soit plus simple pour les copier coller [Azure Policy Auto Shutdown](https://gist.github.com/wilfriedwoivre/8fc8040bbc655bd247de68e12e99f0e2)

Pour ceux qui ont déjà mis en place des policy avec **deployIfNotExists**, vous n'êtes pas sans savoir qu'elle ne se réapplique pas si elle considère qu'elle n'a pas besoin de le faire.

Pour cela, Azure se base d'abord sur les propriétés **type** et **name**

```json
"effect": "deployIfNotExists",
"details": {
    "type": "Microsoft.DevTestLab/schedules",
    "name": "[concat('shutdown-computevm-', field('name'))]",
```

Puis après sur la propriété **existenceCondition** qui reprend les mêmes contraintes que les règles dans les policies. Je ne peux donc pas lire les propriétés de mon objet DevTestLab, j'ai donc utilisé des tags sur ma ressource autoshutdown, que je lis et compare à ceux de la VM

```json
"existenceCondition": {
    "allOf": [
    {
        "field": "tags.AutoShutdown-Enabled",
        "equals": "[field('tags.AutoShutdown-Enabled')]"
    },
    {
        "field": "tags.AutoShutdown-Hour",
        "equals": "[field('tags.AutoShutdown-Hour')]"
    },
    {
        "field": "tags.AutoShutdown-TimeZone",
        "equals": "[field('tags.AutoShutdown-TimeZone')]"
    }
    ]
},
```

Et voilà le tour est joué, j'ai une policy globale sur ma souscription, qui éteint mes VMs selon mes propres critères. Et je peux changer ses valeurs quand je le souhaite !
