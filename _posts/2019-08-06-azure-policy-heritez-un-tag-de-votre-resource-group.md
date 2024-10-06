---
layout: post
title: Azure Policy - Héritez un tag de votre resource group
date: 2019-08-06
categories: [ "Azure", "Policy" ]
comments_id: 167 
---

La mise en place des tags dans Azure est très utilisé notamment pour les besoins des FinOps. Il est donc courant d'avoir des tags liés au contexte projet présents sur nos ressources, même si ceux-ci n'ont aucune utilité fonctionnelle comme un tag pour l'autoshutdown de vos VMs.

Microsoft propose une policy qui permet de reporter un tag d'un groupe de ressource à tous les éléments qu'il contient, il s'agit de la policy suivante **Append tag and its value from the resource group**, voici sa définition :

```json
{
  "properties": {
    "displayName": "Append tag and its value from the resource group",
    "policyType": "BuiltIn",
    "mode": "Indexed",
    "description": "Appends the specified tag with its value from the resource group when any resource which is missing this tag is created or updated. Does not modify the tags of resources created before this policy was applied until those resources are changed.",
    "metadata": {
      "category": "General"
    },
    "parameters": {
      "tagName": {
        "type": "String",
        "metadata": {
          "displayName": "Tag Name",
          "description": "Name of the tag, such as 'environment'"
        }
      }
    },
    "policyRule": {
      "if": {
        "allOf": [
          {
            "field": "[concat('tags[', parameters('tagName'), ']')]",
            "exists": "false"
          },
          {
            "value": "[resourceGroup().tags[parameters('tagName')]]",
            "exists": "true"
          },
          {
            "value": "[resourceGroup().tags[parameters('tagName')]]",
            "notEquals": ""
          }
        ]
      },
      "then": {
        "effect": "append",
        "details": [
          {
            "field": "[concat('tags[', parameters('tagName'), ']')]",
            "value": "[resourceGroup().tags[parameters('tagName')]]"
          }
        ]
      }
    }
  },
  "id": "/providers/Microsoft.Authorization/policyDefinitions/9ea02ca2-71db-412d-8b00-7c7ca9fcd32d",
  "type": "Microsoft.Authorization/policyDefinitions",
  "name": "9ea02ca2-71db-412d-8b00-7c7ca9fcd32d"
}
```

Cette policy est très pratique car elle taggue automatiquement toutes vos ressources.

Maintenant imaginons que nous devions changer la valeur du tag au niveau du resource group pour une raison ou une autre. La policy builtin ne change pas les tags existants, mais surtout elle n'alerte pas que le tag assigné à votre ressource n'est pas le bon comme on peut le voir ci-dessous

Dans mon cas de test je créé un groupe de ressource avec le tag **tag-demo** à la valeur *Demo-blog* avec la policy built-in correctement associé, puis je crée un storage account. Ce premier a bien le bon tag qui est appliqué.
Dès que la policy est évalué, elle indique que mon groupe de ressource est bien ***Compliant***.

Maintenant, je change la valeur de mon tag, et je recréé un storage account, qui cette fois-ci récupère bien la nouvelle valeur de mon tag.

J'ai donc le résultat suivant :

![image]({{ site.url }}/images/2019/08/06/azure-policy-heritez-un-tag-de-votre-resource-group-img0.png "image")

Cependant, quand je regarde ma compliance j'ai l'état suivant :

![image]({{ site.url }}/images/2019/08/06/azure-policy-heritez-un-tag-de-votre-resource-group-img1.png "image")

Personnellement, ceci ne m'arrange pas, car je ne peux pas détecter qu'il y a une erreur sur ce tag-ci.

J'ai donc décidé de créer ma propre policy pour détecter si le tag est compliant ou non, tout en conservant la fonctionalité d'héritage des tag du groupe de ressource.

Cela aboutit donc à cette policy, comme vous pouvez le voir j'ai fortement repris celle de Microsoft :

```json
{
    "mode": "Indexed",
    "policyRule": {
        "if": {
            "anyOf": [
                {
                    "allOf": [
                        {
                            "field": "[concat('tags[', parameters('tagName'), ']')]",
                            "exists": "false"
                        },
                        {
                            "value": "[resourceGroup().tags[parameters('tagName')]]",
                            "exists": "true"
                        },
                        {
                            "value": "[resourceGroup().tags[parameters('tagName')]]",
                            "notEquals": ""
                        }
                    ]
                },
                {
                    "allOf": [
                        {
                            "field": "[concat('tags[', parameters('tagName'), ']')]",
                            "exists": "true"
                        },
                        {
                            "value": "[resourceGroup().tags[parameters('tagName')]]",
                            "exists": "true"
                        },
                        {
                            "field": "[concat('tags[', parameters('tagName'), ']')]",
                            "notEquals": "[resourceGroup().tags[parameters('tagName')]]"
                        }
                    ]
                }
            ]
        },
        "then": {
            "effect": "append",
            "details": [
                {
                    "field": "[concat('tags[', parameters('tagName'), ']')]",
                    "value": "[resourceGroup().tags[parameters('tagName')]]"
                }
            ]
        }
    },
    "parameters": {
        "tagName": {
            "type": "String",
            "metadata": {
                "displayName": "Tag Name",
                "description": "Name of the tag, such as 'environment'"
            }
        }
    }
}
```

Si je rejoue le même test que précédemment j'ai désormais le résultat suivant :

Mes différents Storage Account:

![image]({{ site.url }}/images/2019/08/06/azure-policy-heritez-un-tag-de-votre-resource-group-img2.png "image")

Ma compliance est maintenant à 50% :

![image]({{ site.url }}/images/2019/08/06/azure-policy-heritez-un-tag-de-votre-resource-group-img3.png "image")
![image]({{ site.url }}/images/2019/08/06/azure-policy-heritez-un-tag-de-votre-resource-group-img4.png "image")

J'ai fait le choix de ne pas avoir un statut à ***Non Compliant*** et d'utiliser qu'une seule policy. Par contre si vous souhaitez avoir un statut à ***Non Compliant*** le plus simple est d'utiliser la policy Built-In et de vous créez une custom qui vérifie si la valeur des tags est toujours aligné.
