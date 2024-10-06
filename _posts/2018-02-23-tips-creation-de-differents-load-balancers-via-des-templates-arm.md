---
layout: post
title: Tips - Création de différents Load Balancers via des templates ARM
date: 2018-02-23
categories: [ "Azure", "ARM" ]
comments_id: 101 
---

Voici un nouvel article sur la création de ressources Azure en ARM, ici il va s’agir du Load Balancer, tout ceux qui en ont créé un via le portail Azure, savent qu’il s’agit d’une bonne heure de clic-o-drome.

Cette fois ci, on va corser la chose, je vais vous montrer comment créer :

* Plusieurs load balancers
* Privé ou publique
* Plusieurs ports ouverts

On va donc partir sur ce jeu de paramètres :

```json
"loadBalancers": {  
    "value": [  
    {  
        "name": "front",  
        "accessType": "public",  
        "dns": "wwosfdemo",  
        "port": [ 80, 8080, 443 ]  
    },  
    {  
        "name": "middle",  
        "accessType": "private",  
        "subnetName": "MiddleSubnet",  
        "port": [ 8081 ]  
    },  
    {  
        "name": "back",  
        "accessType": "private",  
        "subnetName": "BackSubnet",  
        "port": [ 8082 ]  
    },  
    {  
        "name": "admin",  
        "accessType": "private",  
        "subnetName": "AdminSubnet",  
        "port": [ 19000, 19080 ]  
    }]  
}
```

Pour ceux qui l’ont reconnu, ça ressemble beaucoup à un use case complexe d’une architecture Service Fabric.

Pour créer ces différentes ressources, j’ai donc besoin de 3 types de ressources qui sont :

* Public IP : pour pouvoir exposer mes External Load Balancer
* Subnet (et donc Virtual Network) : pour pouvoir conserver mes Internal Load Balancers
* Load Balancer : pour créer mes Internal et External Load Balancer

Je sépare les uses case “privés” et “publique” pour des questions de lisibilité, sachant qu’on a déjà des boucles imbriquées dans ce template, on ne va pas complexifier la chose encore une fois.

Pour la création des Virtual Network je vous renvoie à mon précédent article qui parle de ce sujet là : [http://blog.woivre.fr/blog/2017/12/tips-creation-dazure-virtual-network-via-les-templates-arm](http://blog.woivre.fr/blog/2017/12/tips-creation-dazure-virtual-network-via-les-templates-arm "http://blog.woivre.fr/blog/2017/12/tips-creation-dazure-virtual-network-via-les-templates-arm") #autopromo

Pour la création des adresses IP publiques, on va utiliser cette partie de template :

```json
{  
    "apiVersion": "2017-10-01",  
    "type": "Microsoft.Network/publicIPAddresses",  
    "condition": "[equals(variables('loadBalancers')[copyIndex('publicIpLoop')].accessType, 'public')]", 
    "name": "[concat(variables('loadBalancers')[copyIndex('publicIpLoop')].name, variables('suffix').publicIPAddress)]",  
    "location": "[resourceGroup().location]",  
    "tags": {  
        "displayName": "Public IP"  
    },  
    "properties": {  
        "dnsSettings": {  
            "domainNameLabel": "[variables('loadBalancers')[copyIndex('publicIpLoop')].dns]"  
        },  
        "publicIPAllocationMethod": "Dynamic"  
    },  
    "copy": {  
        "name": "publicIpLoop",  
        "count": "[length(variables('loadBalancers'))]"  
    }  
}
```

On fait donc ici un mixte entre une boucle et une condition pour créer une adresse IP publique pour chacun de nos Load balancer qui en a besoin. Par ailleurs je vous conseille de nommer vos différentes boucles dans un template ARM pour des questions de lisibilité encore une fois.

Pour les Load Balancers, rappelons rapidement la structure d’un Load Balancer qui est au minima la suivante :

```json
{  
    "apiVersion": "2017-10-01",  
    "type": "Microsoft.Network/loadBalancers",  
    "name": "LoadBalancer",  
    "location": "[resourceGroup().location]",  
    "properties": {  
        "frontendIPConfigurations": [],  
        "backendAddressPools": [],  
        "inboundNatPools": [],  
        "probes": [],  
        "loadBalancingRules": []  
    }  
}
```

Commençons donc par les Load Balancers publiques :

```json
{  
    "apiVersion": "2017-10-01",  
    "type": "Microsoft.Network/loadBalancers",  
    "condition": "[equals(variables('loadBalancers')[copyIndex('loadBalancersLoop')].accessType, 'public')]",  
    "name": "[concat(variables('loadBalancers')[copyIndex('loadBalancersLoop')].name, variables('suffix').publicLoadBalancers)]",  
    "location": "[resourceGroup().location]",  
    "tags": {  
        "displayName": "External Load Balancer"  
    },  
    "dependsOn": [  
        "publicIpLoop"  
    ],  
    "properties": {  
        "frontendIPConfigurations": [{  
            "name": "FrontEndPublicIPConfiguration",  
            "properties": {  
                "publicIPAddress": {  
                    "id": "[resourceId('Microsoft.Network/publicIPAddresses', concat(variables('loadBalancers')[copyIndex('loadBalancersLoop')].name, variables('suffix').publicIPAddress))]"  
                }  
            }  
        }],  
        "backendAddressPools": [{  
            "name": "BackEndAddressPool"  
        }],  
        "inboundNatPools": [{  
            "name": "BackEndNatPool",  
            "properties": {  
                "backendPort": 3389,  
                    "frontendIPConfiguration": {  
                        "id": "[concat(resourceId('Microsoft.Network/loadBalancers', concat(variables('loadBalancers')[copyIndex('loadBalancersLoop')].name, variables('suffix').publicLoadBalancers)), '/frontendIPConfigurations/FrontEndPublicIPConfiguration')]"  
                    },  
                "frontendPortRangeEnd": 4500,  
                "frontendPortRangeStart": 3389,  
                "protocol": "Tcp"  
            }  
        }],  
        "copy": [{  
            "name": "probes",  
            "count": "[length(variables('loadBalancers')[copyIndex('loadBalancersLoop')].port)]",  
            "input": {  
                "name": "[concat('probe-', variables('loadBalancers')[copyIndex('loadBalancersLoop')].port[copyIndex('probes')])]",  
                "properties": {  
                    "intervalInSeconds": 5,  
                    "numberOfProbes": 2,  
                    "port": "[variables('loadBalancers')[copyIndex('loadBalancersLoop')].port[copyIndex('probes')]]",  
                    "protocol": "Tcp"  
                }  
            }  
        },  
        {  
            "name": "loadBalancingRules",  
            "count": "[length(variables('loadBalancers')[copyIndex('loadBalancersLoop')].port)]",  
            "input": {  
                "name": "[concat('rule-', variables('loadBalancers')[copyIndex('loadBalancersLoop')].port[copyIndex('loadBalancingRules')])]",  
                "properties": {  
                    "backendAddressPool": {  
                        "id": "[concat(resourceId('Microsoft.Network/loadBalancers', concat(variables('loadBalancers')[copyIndex('loadBalancersLoop')].name, variables('suffix').publicLoadBalancers)), '/backendAddressPools/BackEndAddressPool')]"  
                    },  
                    "backendPort": "[variables('loadBalancers')[copyIndex('loadBalancersLoop')].port[copyIndex('loadBalancingRules')]]",  
                    "enableFloatingIP": false,  
                    "frontendIPConfiguration": {  
                        "id": "[concat(resourceId('Microsoft.Network/loadBalancers', concat(variables('loadBalancers')[copyIndex('loadBalancersLoop')].name, variables('suffix').publicLoadBalancers)), '/frontendIPConfigurations/FrontEndPublicIPConfiguration')]"  
                    },  
                    "frontendPort": "[variables('loadBalancers')[copyIndex('loadBalancersLoop')].port[copyIndex('loadBalancingRules')]]",  
                    "idleTimeoutInMinutes": 5,  
                    "probe": {  
                        "id": "[concat(resourceId('Microsoft.Network/loadBalancers', concat(variables('loadBalancers')[copyIndex('loadBalancersLoop')].name, variables('suffix').publicLoadBalancers)), '/probes/', concat('probe-', variables('loadBalancers')[copyIndex('loadBalancersLoop')].port[copyIndex('loadBalancingRules')]))]"  
                    },  
                    "protocol": "Tcp"  
                }  
            }  
        }  
    ]},  
    "copy": {  
        "name": "loadBalancersLoop",  
        "count": "[length(variables('loadBalancers'))]"  
    }  
}
```

On peut voir que c’est un peu verbeux puisque j’ai une boucle sur les Load Balancer, ainsi qu’une boucle sur les différents ports de chacun. Par ailleurs étant donné le fait que la partie “rules” contient uniquement des id de ressource, c’est juste un jeu de construction de template. Le tout se construit plutôt bien si vous êtes assez concentrés lors de l’écriture de celui-ci.

Pour les Load balancers privés, on repart sur le même template sauf pour les conditions, et la gestion de la FrontEndIpConfiguration qui indique un sous réseau, plutôt qu’une adresse IP Publique, comme on peut le voir ci-dessous :

```json
"frontendIPConfigurations": [{  
    "name": "FrontEndPrivateIPConfiguration",  
    "properties": {  
        "subnet": {  
            "id": "[concat(resourceId('Microsoft.Network/virtualNetworks', variables('virtualNetwork').name), '/subnets/', variables('loadBalancers')[copyIndex('loadBalancersLoop')].subnetName)]"  
        }  
    }  
}
```

Le template est présent dans cet article, je ne le mets pas de suite sur Github, je vous le mettrai avec un article prochain sur la création d’un cluster Service Fabric complexe via un template ARM.
