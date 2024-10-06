---
layout: post
title: Azure Policy - Mieux comprendre les policies avec un effet DeployIfNotExists
date: 2019-10-13
categories: [ "Azure", "Policy" ]
comments_id: 171 
---

Il est de plus en plus courant de mettre en place des Azure Policy pour mieux gérer ses souscriptions Azure.
Il existe plusieurs types d'effet pour les policies dont entre autre ***Audit***, ***Deny***, ***DeployIfNotExists***

La dernière déploie entre des templates ARM comme je l'ai montré dans un article récent : [Azure Policy - Mettre en place l'arrêt automatique de vos VMs](https://woivre.fr/blog/2019/09/azure-policy-mettre-en-place-larret-automatique-de-vos-vms)

Maintenant, si on regardait un peu comment ça fonctionne avec cette policy qui sert à ajouter les DiagnosticSettings à un Keyvault :

```json
{
    "mode": "All",
    "policyRule": {
        "if": {
            "field": "type",
            "equals": "Microsoft.KeyVault/vaults"
        },
        "then": {
            "effect": "DeployIfNotExists",
            "details": {
                "type": "Microsoft.Insights/diagnosticSettings",
                "roleDefinitionIds": [
                    "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
                ],
                "existenceCondition": {
                    "allOf": [
                        {
                            "field": "Microsoft.Insights/diagnosticSettings/workspaceId",
                            "equals": "[parameters('logAnalyticsId')]"
                        },
                        {
                            "field": "Microsoft.Insights/diagnosticSettings/storageAccountId",
                            "equals": "[parameters('storageId')]"
                        }
                    ]
                },
                "deployment": {
                    "properties": {
                        "mode": "incremental",
                        "template": {
                            "$schema": "http://schema.management.azure.com/schemas/2014-04-01-preview/deploymentTemplate.json#",
                            "contentVersion": "1.0.0.0",
                            "parameters": {
                                "diagnosticsSettingName": {
                                    "type": "string"
                                },
                                "storageId": {
                                    "type": "string"
                                },
                                "logAnalyticsId": {
                                    "type": "string"
                                },
                                "keyVaultName": {
                                    "type": "string"
                                }
                            },
                            "variables": {},
                            "functions": [],
                            "resources": [
                                {
                                    "type": "Microsoft.KeyVault/vaults/providers/diagnosticSettings",
                                    "name": "[concat(parameters('keyVaultName'),'/Microsoft.Insights/', parameters('diagnosticsSettingName'))]",
                                    "apiVersion": "2017-05-01-preview",
                                    "properties": {
                                        "storageAccountId": "[parameters('storageId')]",
                                        "workspaceId": "[parameters('logAnalyticsId')]",
                                        "logs": [
                                            {
                                                "category": "AuditEvent",
                                                "enabled": true,
                                                "retentionPolicy": {
                                                    "enabled": false,
                                                    "days": 0
                                                }
                                            }
                                        ],
                                        "metrics": [
                                            {
                                                "category": "AllMetrics",
                                                "enabled": true,
                                                "retentionPolicy": {
                                                    "enabled": false,
                                                    "days": 0
                                                }
                                            }
                                        ]
                                    }
                                }
                            ],
                            "outputs": {}
                        },
                        "parameters": {
                            "diagnosticsSettingName": {
                                "value": "[parameters('diagnosticsSettingName')]"
                            },
                            "storageId": {
                                "value": "[parameters('storageId')]"
                            },
                            "logAnalyticsId": {
                                "value": "[parameters('logAnalyticsId')]"
                            },
                            "keyVaultName": {
                                "value": "[field('name')]"
                            }
                        }
                    }
                }
            }
        }
    },
    "parameters": {
        "diagnosticsSettingName": {
            "type": "string"
        },
        "storageId": {
            "type": "string"
        },
        "logAnalyticsId": {
            "type": "string"
        }
    }
}
```

Le premier élément à voir qui est spécifique à ce type de policy est le suivant :

```json
"roleDefinitionIds": [
    "/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c"
]
```

Cet élément sert à assigner une Managed Identity à votre policy avec le ou les rôles définit dans cette propriété.
Ici, il s'agit du rôle Contributor, mais il est possible d'envisager un autre rôle *Built-In* voir même un rôle personnalisé.
Ce rôle est attribué au niveau du scope de l'assignation de la policy, donc attention si vous faîtes référence à des services hors du scope il faudra ajouter le rôle à la main.

**Astuce Debug** : Vérifier bien que le rôle soit positionné sur le bon scope.

Le déploiement n'est pas instantanée, ça peut prendre un bon 15 minutes, donc pas de panique avant 1h.

Maintenant que se passe-t-il si vous supprimez ce diagnotics de votre KeyVault, et bien pas grand chose à part passer votre policy en ***Non Compliant***, cela ne redéployera pas votre DiagnosticsSettings.

Si vous voulez redéployer votre policy, le plus propre est de passer par une tâche de remédiation soit via le portail soit via le script suivant :

```powershell

$states = Get-AzPolicyState -SubscriptionId $subscriptionId -Filter "IsCompliant eq false and PolicyDefinitionAction eq 'deployifnotexists'"

foreach ($state in $states) {
    Start-AzPolicyRemediation -Name "autoremediation" -ResourceGroupName $state.ResourceGroup -PolicyAssignmentId
    $state.PolicyAssignmentId
}
```

La première étape est de récupérer toutes les policies elligibles à savoir celles ***Non-Compliant*** et celles qui ont une action en ***DeployIfNotExists***

La deuxième est de démarrer la remédiation, attention ici il s'agit d'une policy assigné à un groupe de ressource il faut donc renseigner la propriété ResourceGroupName à la méthode.

![image]({{ site.url }}/images/2019/10/13/azure-policy-mieux-comprendre-les-policies-avec-un-effet-deployifnotexists-img0.png "image")

Pour la dernière étape il faut contrer les petits malins qui changent la configuration qui laisserait la policy ***Compliant***, et pour se faire, il faut penser à bien mettre en place des conditions de validation comme ci-dessous :

```json
"existenceCondition": {
    "allOf": [
        {
            "field": "Microsoft.Insights/diagnosticSettings/workspaceId",
            "equals": "[parameters('logAnalyticsId')]"
        },
        {
            "field": "Microsoft.Insights/diagnosticSettings/storageAccountId",
            "equals": "[parameters('storageId')]"
        }
    ]
},
```

Et voilà comment rester en maitrise de son compte Azure.
