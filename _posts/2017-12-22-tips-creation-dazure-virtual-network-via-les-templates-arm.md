---
layout: post
title: Tips - Création d’Azure Virtual Network via les templates ARM
date: 2017-12-22
categories: [ "Azure", "ARM" ]
comments_id: 99 
---
  

Il existe de multiples manières de créer des ressources sur la plateforme Azure, je ne dirais pas qu’il y en a de meilleures que d’autres, elles ont chacune leurs avantages et leurs inconvénients. Pour rappel, pour créer des ressources sur Azure, vous avez la possibilité de le faire d’une des manières suivantes :

* Via le portail Azure qui a le mérite d’être simple à utiliser et correspond très bien au besoin si vous souhaitez mettre en place une ressource Azure pour la première fois, ou pour créer une ressource à des vues de tests. Par contre, c’est peu automatisable, et je ne conseille pas de se dire “hey si je faisais ma création de ressources via un test ui automatisé”
* Via la CLI ou du powershell qui ont le mérite de pouvoir être jouer de manière automatisée et qui permettent de créer rapidement des ressources via du code, cependant il va falloir prendre en compte les comportements lorsqu’une ressource existe déjà. Et bien entendu la méthode “je supprime si la ressource existe” puis je recrée a quelques limites.
* Via les REST API Azure sont certes très puissantes, mais il y a du code à écrire, à maintenir, et on retrouve les mêmes désavantages qu’avec une ligne de commande.
* Via des templates ARM qui sont en réalité une surcouche aux REST API Azure vont vous permettre de décrire votre architecture via un “simple” modèle JSON. Par ailleurs, ils gèrent nativement les ressources existantes en apportant les modifications si besoin, donc pas de soucis à se faire là dessus. Cependant ces templates sont plutôt verbeux, ce qui ne facilite pas toujours leur adoption, de plus ils ont quelques limites que nous ne verrons pas dans cet article.

Si je prends comme exemple la création d’un Virtual Network, si je veux le créer via un template ARM, soit j’exporte un template ARM depuis un VNET existant sur Azure, soit je pars d’une feuille blanche, soit je vais voir ce magnifique repo GIT de Microsoft : [https://github.com/Azure/azure-quickstart-templates](https://github.com/Azure/azure-quickstart-templates "https://github.com/Azure/azure-quickstart-templates"). Il a pour avantage de contenir toute sorte de template pour à peu près toutes les ressources Azure disponible.

Après avoir trouvé le template que je souhaite, je peux le prendre et m’en inspirer pour faire un template avec mes paramètres souhaités et divers autres changements, je vais donc avoir quelque chose de ce type :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "vnetName": {
            "type":"string",
            "defaultValue": "demo-vnet",
            "metadata": {
                "description" : "Virtual network name"
            }
        }, 
        "vnetAddressPrefix": {
            "type": "string",
            "defaultValue": "16.0.0.0/16",
            "metadata": {
                "description": "Address prefix"
            }
        }, 
        "subnet1Name": {
            "type": "string",
            "defaultValue": "Front",
            "metadata": {
                "description": "Subnet name"                
            }
        },
        "subnet1Prefix": {
            "type": "string", 
            "defaultValue": "16.0.1.0/24",
            "metadata": {
                "description": "subnet 1 prefix"
            }
        },
        "subnet2Name": {
            "type": "string",
            "defaultValue": "Back",
            "metadata": {
                "description": "Subnet name"                
            }
        },
        "subnet2Prefix": {
            "type": "string", 
            "defaultValue": "16.0.3.0/24",
            "metadata": {
                "description": "subnet 2 prefix"
            }
        }
    },
    "variables": {
        "vnetName":"[parameters('vnetName')]", 
        "vnetAddressPrefix": "[parameters('vnetAddressPrefix')]", 
        "subnet1Name": "[parameters('subnet1Name')]",
        "subnet1Prefix": "[parameters('subnet1Prefix')]",
        "subnet2Name": "[parameters('subnet2Name')]",
        "subnet2Prefix": "[parameters('subnet2Prefix')]"
    },
    "resources": [
        {
            "apiVersion": "2015-06-15",
            "type": "Microsoft.Network/virtualNetworks",
            "name": "[variables('vnetName')]",
            "location": "[resourceGroup().location]",
            "properties": {
              "addressSpace": {
                "addressPrefixes": [
                  "[variables('vnetAddressPrefix')]"
                ]
              },
              "subnets":[
                  {
                      "name": "[variables('subnet1Name')]", 
                      "properties":{
                          "addressPrefix": "[variables('subnet1Prefix')]"
                      }
                  },
                  {
                    "name": "[variables('subnet2Name')]", 
                    "properties":{
                        "addressPrefix": "[variables('subnet2Prefix')]"
                    }
                }
              ]
            }
        }
    ],
    "outputs": {
        
    }
}
```

Bon, comme on peut le voir, c'est plutôt verbeux... Mais pour moi là n’est pas le problème, c’est que pour rajouter un subnet à notre VNET, il faut soit passer par un autre template ARM qui ajoute des subnets, ce qui est plutôt compliqué pour les rejouer si on a ajouté 3/4 subnets entre le temps de création du VNET et la nouvelle exécution de ce template sur une autre souscription. Pour parer cela, il est possible d’utiliser des objets complexes, et des fonctions intégrées aux templates ARM, tel que la copy. Cela nous donnerait donc ce script si je l’applique sur le même principe :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "vnetName": {
            "type":"string",
            "defaultValue": "demo-vnet",
            "metadata": {
                "description" : "Virtual network name"
            }
        }, 
        "vnetAddressPrefix": {
            "type": "string",
            "defaultValue": "16.0.0.0/16",
            "metadata": {
                "description": "Address prefix"
            }
        }, 
        "subnets":{
            "type": "array",
            "defaultValue": [
                {
                    "Name": "Front",
                    "Prefix": "16.0.1.0/24"
                },
                {
                    "Name": "Middle",
                    "Prefix": "16.0.2.0/24"
                },
                {
                    "Name": "Back",
                    "Prefix": "16.0.3.0/24"
                }
            ],
            "metadata": {
                "description" : "List of subnets to create"
            }
        }
    },
    "variables": {
        "vnetName":"[parameters('vnetName')]", 
        "vnetAddressPrefix": "[parameters('vnetAddressPrefix')]", 
        "subnets": "[parameters('subnets')]"
    },
    "resources": [
        {
            "apiVersion": "2015-06-15",
            "type": "Microsoft.Network/virtualNetworks",
            "name": "[variables('vnetName')]",
            "location": "[resourceGroup().location]",
            "properties": {
              "addressSpace": {
                "addressPrefixes": [
                  "[variables('vnetAddressPrefix')]"
                ]
              },
              "copy": [
                  {
                      "name": "subnets",
                      "count": "[length(variables('subnets'))]",
                      "input": {
                          "name": "[variables('subnets')[copyIndex('subnets')].Name]",
                          "properties": {
                              "addressPrefix": "[variables('subnets')[copyIndex('subnets')].Prefix]"
                          }
                      }
                  }
              ]
            }
        }
    ],
    "outputs": {
        
    }
}
```

Alors, effectivement en terme de verbosité on ne gagne pas tant de ligne que cela, mais on a l’avantage de garder toujours le même template pour modifier notre VNET et y ajouter différents subnets.

Et sans oublier le lien des templates ARM, si vous le voulez pas copier coller  : [https://github.com/wilfriedwoivre/demo-blog/tree/master/ARM/Tips%20VNET%20creation](https://github.com/wilfriedwoivre/demo-blog/tree/master/ARM/Tips%20VNET%20creation "https://github.com/wilfriedwoivre/demo-blog/tree/master/ARM/Tips%20VNET%20creation")
