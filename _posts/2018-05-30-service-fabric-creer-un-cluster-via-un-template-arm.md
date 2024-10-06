---
layout: post
title: Service Fabric - Créer un cluster via un template ARM
date: 2018-05-30
categories: [ "Azure", "Service Fabric", "ARM" ]
comments_id: 103 
---

Le but de cet article est de décrypter la création d’un cluster Service Fabric via des templates ARM, et comment utiliser ceux-ci pour créer des cluster multi nodes. Et par ailleurs nous verrons comment mettre en place via ARM un cluster Service Fabric accessible uniquement par des IPs privées ce qui peut être utile si vous souhaitez héberger votre cluster Service Fabric dans un Virtual Network connecté à un site to site ou à un Express Route via du private peering.

Avant de voir le contenu du template ARM, voici les types de ressources dont nous avons besoin au minima pour créer un cluster Service Fabric

* Virtual Network
* Storage
* Public IP Address (si besoin)
* Load Balancer
* Virtual Machine Scale Set
* Service Fabric Cluster

Dans mon cas je veux créer un cluster qui aurait cette typologie réseau suivante :

 [![service fabric multi subnet]({{ site.url }}/images/2018/05/30/service-fabric-creer-un-cluster-via-un-template-arm-img0.png "service fabric multi subnet")]({{ site.url }}/images/2018/05/30/service-fabric-creer-un-cluster-via-un-template-arm-img0.png)

Ici, nous allons écrire notre template ARM en partant du début. Et comme bien souvent le début, c’est la création des couches réseaux, c’est souvent elle qui est construite en premier, car la conception de celle-ci, notamment en terme d’adressage IP doit être prévue dans le cas par exemple où on connecte ce VNET via un VPN ou via ExpressRoute, voici ci-dessous la déclaration de mon VNET :

Paramètres :

```json
"virtualNetwork": {  
    "type": "object",  
    "defaultValue": {  
        "name": "",  
        "addressPrefix": "",  
        "subnets": [  
            {  
                "name": "",  
                "addressPrefix": ""  
            }  
        ]  
    },  
    "metadata": {  
        "description": "Virtual Network object"  
    }  
},
```

Par convention, je remets la définition de tous mes paramètres dans les variables, ce qui me permet de faire du contrôle dessus si besoin, ici je fais juste une recopie de ceux-là, la définition de ma source sera la suivante :

```json
{  
    "apiVersion": "2017-10-01",  
    "type": "Microsoft.Network/virtualNetworks",  
    "name": "[variables('virtualNetwork').name]",  
    "location": "[resourceGroup().location]",  
    "tags": {  
        "displayName": "Virtual Network"  
    },  
    "properties": {  
        "addressSpace": {  
            "addressPrefixes": [  
                "[variables('virtualNetwork').addressPrefix]"  
            ]  
        },  
        "copy": [  
            {  
                "name": "subnets",  
                "count": "[length(variables('virtualNetwork').subnets)]",  
                "input": {  
                    "name": "[variables('virtualNetwork').subnets[copyIndex('subnets')].name]",  
                    "properties": {  
                        "addressPrefix": "[variables('virtualNetwork').subnets[copyIndex('subnets')].addressPrefix]"  
                    }  
                }  
            }  
        ]  
    }  
},
```

Si vous avez lu mes derniers articles rien de bien nouveau, à part que j’ai mis les propriétés de mon Virtual Network dans un objet.

Alors bien entendu il est toujours possible d’ajouter dans ce template des définitions de NSG, des déclarations de VNet peering ou même des routes tables, mais pour cet article je n’ai pas besoin de tout ceci.

Dans mon cas d’usage je vais prendre ces paramètres pour exécuter mon script :

```json
"virtualNetwork": {  
    "value": {  
        "name": "demo-blog-arm",  
        "addressPrefix": "16.0.0.0/20",  
        "subnets": [  
            {  
                "name": "FrontSubnet",  
                "addressPrefix": "16.0.0.0/24"  
            },  
            {  
                "name": "MiddleSubnet",  
                "addressPrefix": "16.0.1.0/24"  
            },  
            {  
                "name": "BackSubnet",  
                "addressPrefix": "16.0.2.0/24"  
            },  
            {  
                "name": "AdminSubnet",  
                "addressPrefix": "16.0.3.0/24"  
            },  
            {  
                "name": "GatewaySubnet",  
                "addressPrefix": "16.0.15.224/27"  
            }  
        ]  
    }  
},
```

Rien de bien étonnant dans ce cas-ci, mais on notera tout de même que d’avoir mis un exemple json vide dans la defaultValue de mes objets virtualNetwork et subnets me permet facilement de compléter ce fichier quand je souhaite déployer par exemple depuis Visual Studio. Bien entendu cela peut poser des soucis si on n’est pas assez consciencieux lorsqu’on déploie nos ressources, il serait dommage de laisser une defaultValue contenant notre pseudo schéma, mais bon il s’agit là d’un palliatif au manque de ressource de type jsonObject avec un schéma..

Continuons à déclarer nos ressources, pour cela créons nos comptes de stockage. Pour Service Fabric, je vous conseille de créer au moins 2 comptes de stockage qui ont pour rôle les suivants :

* Compte de stockage des logs Service Fabric, utile en cas de contact avec le support Microsoft
* Compte de stockage pour les données issues d’Azure Diagnostics

Rien ne vous en empêche d’en créer plus si cela vous le dit, donc en terme de paramètres nous avons cela :

```json
"storageAccounts": {  
    "type": "array",  
    "defaultValue": [  
        {  
            "name": ""  
        }  
    ],  
    "metadata": {  
        "description": "Storage Account list"  
    }  
},  
"globalStorageAccountSku": {  
    "type": "string",  
    "allowedValues": [  
        "Standard_LRS",  
        "Standard_GRS"  
    ],  
    "metadata": {  
        "description": "Sku for all storage accounts"  
    }  
}
```

Rien de bien spécifique dans notre cas, passons maintenant à la déclaration des ressources :

```json
{  
    "apiVersion": "2017-10-01",  
    "type": "Microsoft.Storage/storageAccounts",  
    "name": "[variables('storageAccount')[copyIndex('storageLoop')].name]",  
    "location": "[resourceGroup().location]",  
    "properties": {  
        "encryption": {  
            "keySource": "Microsoft.Storage",  
            "services": {  
                "blob": {  
                    "enabled": true  
                }  
            }  
        },  
        "supportsHttpsTrafficOnly": true  
    },  
    "kind": "StorageV2",  
    "sku": {  
        "name": "[variables('globalStorageAccountSku')]"  
    },  
    "copy": {  
        "name": "storageLoop",  
        "count": "[length(variables('storageAccount'))]"  
    }  
}
```

Comme vous pouvez le voir, par défaut j’active l’encryption rest, et bien entendu j’autorise que les appels via https. Je pourrais bien entendu rajouter des ACL pour n’autoriser que mon Virtual Network déjà créé, mais dans mon cas il faudrait que je rajoute les ips depuis lesquelles je me connecte pour pouvoir accéder à ce Storage.

Pour mon exemple, je vais uniquement créer 2 storage account, le premier pour les Azure Diagnostics, et le deuxième pour les logs Service Fabric, très utile en cas de debug bien avancé sur l’état de santé d’un cluster Service Fabric.

Pour la partie Load Balancer, je vous propose de lire un autre de mes articles qui en parle : [http://blog.woivre.fr/blog/2018/2/tips-creation-de-differents-load-balancers-via-des-templates-arm](http://blog.woivre.fr/blog/2018/2/tips-creation-de-differents-load-balancers-via-des-templates-arm "http://blog.woivre.fr/blog/2018/2/tips-creation-de-differents-load-balancers-via-des-templates-arm")

Maintenant que les éléments liés au réseau sont créés, on va pouvoir s’attaquer à la définition de notre cluster Service Fabric. Dans mon cas, je ne vais pas créer un template ARM qui peut répondre à toutes les possibilités qu’offre Service Fabric, je vais donc partir sur les éléments suivants :

* Cluster Windows
* Sécurité : Utilisation de certificat et de connexion via Azure Active Directory, ce qui suppose que celui-ci soit déjà présent dans le keyvault et que les applications soient déclarées dans l’Active Directory
* Différents types de noeuds, chaque type de noeud a son sous réseau associé

Commençons par la définition des paramètres :

```json
    "sfCluster": {
      "type": "object",
      "defaultValue": {
        "name": "",
        "security": {
          "osAdminUserName": "",
          "level": "EncryptAndSign",
          "thumbprint": "",
          "store": "",
          "vaultUrl": "",
          "vaultResourceId": "",
          "aad": {
            "tenantId": "",
            "clusterAppId": "",
            "clientAppId": ""
          }
        },
        "managementEndpoint": {
          "Port": "19080",
          "type": "public|private",
          "public": {
            "name": ""
          },
          "private": {
            "ipAddress": ""
          }
        },
        "nodes": [
          {
            "name": "",
            "os": {
              "publisher": "",
              "offer": "",
              "sku": "",
              "version": ""
            },
            "instance": {
              "size": "",
              "count": "",
              "tier": ""
            },
            "applicationPorts": {
              "startPort": "",
              "endPort": ""
            },
            "ephemeralPorts": {
              "startPort": "",
              "endPort": ""
            },
            "fabric": {
              "tcpGatewayPort": "",
              "httpGatewayPort": ""
            },
            "isPrimary": false,
            "instanceCount": "",
            "subnetName": "",
            "loadBalancerName": ""
          }
        ],
        "diagnosticsStoreName": "",
        "supportStoreName": ""
      },
      "metadata": {
        "description": "Service Fabric definition"
      }
    },
    "osAdminPassword": {
      "type": "securestring",
      "metadata": {
        "description": "Admin password for VMSS"
      }
    }
```

On notera par ailleurs que j’ai mis la mot de passe dans un champs à part afin de bénéficier de la sécurité mise en place par les paramètres de type securestring.

Le template ARM quant à lui correspond à celui-ci :

```json
    {
      "apiVersion": "2017-07-01-preview",
      "type": "Microsoft.ServiceFabric/clusters",
      "name": "[variables('sfCluster').name]",
      "location": "[resourceGroup().location]",
      "tags": {
        "displayName": "Cluster Service Fabric"
      },
      "dependsOn": [
        "storageLoop"
      ],
      "properties": {
        "addOnFeatures": [
          "DnsService",
          "RepairManager"
        ],
        "certificate": {
          "thumbprint": "[variables('sfCluster').security.thumbprint]",
          "x509StoreName": "[variables('sfCluster').security.store]"
        },
        "azureActiveDirectory": {
          "tenantId": "[variables('sfCluster').security.aad.tenantId]",
          "clusterApplication": "[variables('sfCluster').security.aad.clusterAppId]",
          "clientApplication": "[variables('sfCluster').security.aad.clientAppId]"
        },
        "diagnosticsStorageAccountConfig": {
          "storageAccountName": "[variables('sfCluster').diagnosticsStoreName]",
          "protectedAccountKeyName": "StorageAccountKey1",
          "blobEndpoint": "[reference(concat('Microsoft.Storage/storageAccounts/', variables('sfCluster').diagnosticsStoreName), '2017-10-01').primaryEndpoints.blob]",
          "queueEndpoint": "[reference(concat('Microsoft.Storage/storageAccounts/', variables('sfCluster').diagnosticsStoreName), '2017-10-01').primaryEndpoints.queue]",
          "tableEndpoint": "[reference(concat('Microsoft.Storage/storageAccounts/', variables('sfCluster').diagnosticsStoreName), '2017-10-01').primaryEndpoints.table]"
        },
        "fabricSettings": [
          {
            "parameters": [
              {
                "name": "ClusterProtectionLevel",
                "value": "[variables('sfCluster').security.level]"
              }
            ],
            "name": "Security"
          }
        ],
        "managementEndpoint": "[concat('https://', if(equals(variables('sfCluster').managementEndpoint.type, 'public'), reference(concat('Microsoft.Network/publicIPAddresses/', variables('sfCluster').managementEndpoint.public.name, variables('suffix').publicIPAddress), '2017-10-01').dnsSettings.fqdn, variables('sfCluster').managementEndpoint.private.ipAddress), ':', variables('sfCluster').managementEndpoint.port)]",
        "copy": [
          {
            "name": "nodeTypes",
            "count": "[length(variables('sfCluster').nodes)]",
            "input": {
              "name": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].name]",
              "applicationPorts": {
                "endPort": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].applicationPorts.endPort]",
                "startPort": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].applicationPorts.startPort]"
              },
              "clientConnectionEndpointPort": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].fabric.tcpGatewayPort]",
              "durabilityLevel": "Bronze",
              "ephemeralPorts": {
                "endPort": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].ephemeralPorts.endPort]",
                "startPort": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].ephemeralPorts.startPort]"
              },
              "httpGatewayEndpointPort": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].fabric.httpGatewayPort]",
              "isPrimary": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].isPrimary]",
              "vmInstanceCount": "[variables('sfCluster').nodes[copyIndex('nodeTypes')].instance.count]"
            }
          }
        ],
        "reliabilityLevel": "Bronze",
        "upgradeMode": "Automatic",
        "vmImage": "Windows"
      }
    },
```

On peut voir que j’utilise le nom de la boucle sur mes comptes de stockage au sein de mes dépendances.

Ici dans mon cas, j’ai choisi de passer les paramètres suivants :

```json
"sfCluster": {  
    "value": {  
        "name": "democluster",  
        "security": {  
            "osAdminUserName": "admin",  
            "level": "EncryptAndSign",  
            "thumbprint": "### Thumbprint de mon certificat ###",  
            "store": "My",  
            "vaultUrl": "### URL de mon certificat dans le Keyvault ###",  
            "vaultResourceId": "### Resource ID du Vault utilisé ###",  
            "aad": {  
                "tenantId": "### Mon tenant Id ###",  
                "clusterAppId": "### Application Id de l’application native ###",  
                "clientAppId": "### Application Id de l’application Web API ###"  
            }  
        },  
        "managementEndpoint": {  
            "Port": 19080,  
            "type": "private",  
            "private": {  
                "ipAddress": "16.3.0.4"  
            }  
        },  
        "nodes": [  
        {  
            "name": "AdminNode",  
            "os": {  
                "publisher": "MicrosoftWindowsServer",  
                "offer": "WindowsServer",  
                "sku": "2012-R2-Datacenter",  
                "version": "latest"  
            },  
            "instance": {  
                "size": "Standard_D2_V2",  
                "count": 3,  
                "tier": "Standard"  
            },  
            "applicationPorts": {  
                "startPort": 20000,  
                "endPort": 30000  
            },  
            "ephemeralPorts": {  
                "startPort": 49152,  
                "endPort": 65534  
            },  
            "fabric": {  
                "tcpGatewayPort": 19000,  
                "httpGatewayPort": 19080  
            },  
            "isPrimary": true,  
            "subnetName": "AdminSubnet",  
            "loadBalancerName": "admin-private-lb"  
            },              
            {  
                "name": "BackNode",  
                "os": {  
                    "publisher": "MicrosoftWindowsServer",  
                    "offer": "WindowsServer",  
                    "sku": "2012-R2-Datacenter",  
                    "version": "latest"  
                },  
                "instance": {  
                    "size": "Standard_D2_V2",  
                    "count": 3,  
                    "tier": "Standard"  
                },  
                "applicationPorts": {  
                    "startPort": 20000,  
                    "endPort": 30000  
                },  
                "ephemeralPorts": {  
                    "startPort": 49152,  
                    "endPort": 65534  
                },  
                "fabric": {  
                    "tcpGatewayPort": 19000,  
                    "httpGatewayPort": 19080  
                },  
                "isPrimary": false,  
                "subnetName": "BackSubnet",  
                "loadBalancerName": "back-private-lb"  
            },
            {  
                "name": "MidNode",  
                "os": {  
                    "publisher": "MicrosoftWindowsServer",  
                    "offer": "WindowsServer",  
                    "sku": "2012-R2-Datacenter",  
                    "version": "latest"  
                },  
                "instance": {  
                    "size": "Standard_D2_V2",  
                    "count": 3,  
                    "tier": "Standard"  
                },  
                "applicationPorts": {  
                    "startPort": 20000,  
                    "endPort": 30000  
                },  
                "ephemeralPorts": {  
                    "startPort": 49152,  
                    "endPort": 65534  
                },  
                "fabric": {  
                    "tcpGatewayPort": 19000,  
                    "httpGatewayPort": 19080  
                },  
                "isPrimary": false,  
                "subnetName": "MiddleSubnet",  
                "loadBalancerName": "middle-private-lb"  
            }, 
            {  
                "name": "FrontNode",  
                "os": {  
                    "publisher": "MicrosoftWindowsServer",  
                    "offer": "WindowsServer",  
                    "sku": "2012-R2-Datacenter",  
                    "version": "latest"  
                },  
                "instance": {  
                    "size": "Standard_D2_V2",  
                    "count": 3,  
                    "tier": "Standard"  
                },  
                "applicationPorts": {  
                    "startPort": 20000,  
                    "endPort": 30000  
                },  
                "ephemeralPorts": {  
                    "startPort": 49152,  
                    "endPort": 65534  
                },  
                "fabric": {  
                    "tcpGatewayPort": 19000,  
                    "httpGatewayPort": 19080  
                },  
                "isPrimary": false,  
                "subnetName": "FrontSubnet",  
                "loadBalancerName": "front-public-lb"  
            }, 
        ],  
        "diagnosticsStoreName": "diagsfdemoblog",  
        "supportStoreName": "logssfdemoblog"  
        }  
    }
```
  
Pour le reste, je vous renvoie vers mon Github qui contient ce template ARM, ainsi qu’un exemple de paramètres si vous souhaitez le réutiliser : [https://github.com/wilfriedwoivre/demo-blog/tree/master/ARM/servicefabric-complexcluster](https://github.com/wilfriedwoivre/demo-blog/tree/master/ARM/servicefabric-complexcluster)
