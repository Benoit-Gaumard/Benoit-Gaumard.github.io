---
layout: post
title: Service Fabric Mesh
date: 2018-07-17
categories: [ "Azure", "Service Fabric" ]
comments_id: 140 
---

Le mois de juillet a apporté pleins de bonnes nouvelles, la France a gagné une deuxième étoile, mais cela est anecdotique par rapport à l'annonce de Microsoft autour du produit Service Fabric. La public preview de **Service Fabric Mesh** est enfin disponible !

Pour ceux qui ne l'ont pas vu, voici le lien : [https://azure.microsoft.com/en-us/blog/azure-service-fabric-mesh-is-now-in-public-preview/](https://azure.microsoft.com/en-us/blog/azure-service-fabric-mesh-is-now-in-public-preview/)

Ceux qui ont déjà mis en place des clusters Service Fabric en production savent que le côté "Service managé" a quelques limites qui peuvent vous faire perdre quelques cheveux, d'ailleurs j'en ai écrit un retour d'expérience sur ce blog : [http://blog.woivre.fr/blog/2018/01/bonne-resolution-prendre-soin-de-son-cluster-service-fabric](http://blog.woivre.fr/blog/2018/01/bonne-resolution-prendre-soin-de-son-cluster-service-fabric)

En résumé ce qui vous pose des problèmes avec Service Fabric c'est bien souvent l'infrastructure sur laquelle repose votre cluster. Service Fabric Mesh vous permet de ne plus vous soucier de cette infra sous-jacente.

Par contre à ce jour, cela a un coût, il faut dire adieu aux Reliables Services et au SDK fourni par Service Fabric, et mettre un focus sur les Containers.
Pour le coût financier, pour le moment c'est gratuit en preview et bien entendu sans SLA.

Dans cet article, je vous propose de regarder comment déployer nos premiers services sous Service Fabric Mesh.

Commençons par installer le module pour la CLI Azure, pour info il n'y a pas encore de module pour Powershell

```bash
# Lister les extensions présentes
az extension list
# Supprimer l'installation précédente
az extension remove --name mesh
# Installer la nouvelle version 
az extension add --source https://sfmeshcli.blob.core.windows.net/cli/mesh-0.8.1-py2.py3-none-any.whl
```

Déployons l'application de démo fournie par Microsoft :

```sh
az mesh deployment create --resource-group myResourceGroup --template-uri https://sfmeshsamples.blob.core.windows.net/templates/helloworld/mesh_rp.linux.json --parameters "{'location': {'value': 'westeurope'}}"
```

On remarquera que Service Fabric Mesh est dispo sur le datacenter West europe, la liste exhaustive n'est pas disponible sur la documentation Azure, mais je pense qu'il s'agit de la même que Service Fabric, c'est-à-dire toutes les régions Azure.

Dans le portail Azure, on peut voir notre application Mesh comme ci-dessous :

![]({{ site.url }}/images/2018/07/17/service-fabric-mesh-img0.png)

Il s'agit là d'une preview, donc on ne va pas avoir beaucoup plus de détails dans le portail Azure.

Maintenant si on regarde un peu plus le template ARM qu'on a déployé précédemment,on voit qu'il s'agit de celui ci :

```json
{
  "$schema": "http://schema.management.azure.com/schemas/2014-04-01-preview/deploymentTemplate.json",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "type": "string",
      "metadata": {
        "description": "Location of the resources."
      }
    }
  },
  "resources": [
    {
      "apiVersion": "2018-07-01-preview",
      "name": "helloWorldNetwork",
      "type": "Microsoft.ServiceFabricMesh/networks",
      "location": "[parameters('location')]",
      "dependsOn": [],
      "properties": {
        "addressPrefix": "10.0.0.4/22",
        "ingressConfig": {
          "layer4": [
            {
              "name": "helloWorldIngress",
              "publicPort": "80",
              "applicationName": "helloWorldApp",
              "serviceName": "helloWorldService",
              "endpointName": "helloWorldListener"
            }
          ]
        }
      }
    },
    {
      "apiVersion": "2018-07-01-preview",
      "name": "helloWorldApp",
      "type": "Microsoft.ServiceFabricMesh/applications",
      "location": "[parameters('location')]",
      "dependsOn": [
        "Microsoft.ServiceFabricMesh/networks/helloWorldNetwork"
      ],
      "properties": {
        "description": "Service Fabric Mesh HelloWorld Application!",
        "services": [
          {
            "type": "Microsoft.ServiceFabricMesh/services",
            "location": "[parameters('location')]",
            "name": "helloWorldService",
            "properties": {
              "description": "Service Fabric Mesh Hello World Service.",
              "osType": "linux",
              "codePackages": [
                {
                  "name": "helloWorldCode",
                  "image": "seabreeze/azure-mesh-helloworld:1.1-alpine",
                  "endpoints": [
                    {
                      "name": "helloWorldListener",
                      "port": "80"
                    }
                  ],
                  "resources": {
                    "requests": {
                      "cpu": "1",
                      "memoryInGB": "1"
                    }
                  }
                },
                {
                  "name": "helloWorldSideCar",
                  "image": "seabreeze/azure-mesh-helloworld-sidecar:1.0-alpine",
                  "resources": {
                    "requests": {
                      "cpu": "1",
                      "memoryInGB": "1"
                    }
                  }
                }
              ],
              "replicaCount": "1",
              "networkRefs": [
                {
                  "name": "[resourceId('Microsoft.ServiceFabricMesh/networks', 'helloWorldNetwork')]"
                }
              ]
            }
          }
        ]
      }
    }
  ]
}
```

On voit dans ce template ARM, 2 objets. Le premier est un composant réseau de type **'Microsoft.ServiceFabricMesh/networks'**

```json
    {
      "apiVersion": "2018-07-01-preview",
      "name": "helloWorldNetwork",
      "type": "Microsoft.ServiceFabricMesh/networks",
      "location": "[parameters('location')]",
      "dependsOn": [],
      "properties": {
        "addressPrefix": "10.0.0.4/22",
        "ingressConfig": {
          "layer4": [
            {
              "name": "helloWorldIngress",
              "publicPort": "80",
              "applicationName": "helloWorldApp",
              "serviceName": "helloWorldService",
              "endpointName": "helloWorldListener"
            }
          ]
        }
      }
    }
```

Il s'agit là d'un composant réseau où l'on peut mettre nos applications, attention il ne s'agit pas d'un Virtual Network sur Azure.

Les informations essentielles sont donc les suivantes :

* La plage d'adresse IPs disponibles, ici : **10.0.0.4/22**
* Les points d'entrées réseaux contenant
  * Le nom de votre endpont : **helloWorldIngress**
  * Le port : **80**
  * Le nom de votre application qui sera exposé : **helloWorldApp**
  * Le nom de votre service qui sera exposé : **helloWorldService**
  * Le nom de votre endpoint : **helloWorldListener**

Le deuxième élément correspond à notre service applicatif:

```json
              "osType": "linux",
              "codePackages": [
                {
                  "name": "helloWorldCode",
                  "image": "seabreeze/azure-mesh-helloworld:1.1-alpine",
                  "endpoints": [
                    {
                      "name": "helloWorldListener",
                      "port": "80"
                    }
                  ],
                  "resources": {
                    "requests": {
                      "cpu": "1",
                      "memoryInGB": "1"
                    }
                  }
                }
```

Il contient par ailleurs le type de l'OS, puisque ici on embarque la définition de notre cluster. Ici, il s'agit d'un OS de type linux, car après tout c'est généralement des images Docker pour linux que l'on crées.

On définit ensuite nos différents containers en renseignant le type de l'image. Ici il s'agit d'images situées sur Docker Hub

* azure-mesh-helloworld : [https://hub.docker.com/r/seabreeze/azure-mesh-helloworld/](https://hub.docker.com/r/seabreeze/azure-mesh-helloworld/)
* azure-mesh-helloworld-sidecar : [https://hub.docker.com/r/seabreeze/azure-mesh-helloworld-sidecar/](https://hub.docker.com/r/seabreeze/azure-mesh-helloworld-sidecar/)

Par ailleurs si vous souhaitez déployer depuis une registry privée comme Azure Container Registry, vous pouvez mettre ces informations dans le template ARM :

```json
"image": "azure-mesh-helloworld:1.1-alpine",
"imageRegistryCredential": {
    "server": "[parameters('registry-server')]",
    "username": "[parameters('registry-username')]",
    "password": "[parameters('registry-password')]"
},
```

Vous pouvez retrouver différents exemples de template ARM pour Service Fabric sur ce github : [https://github.com/Azure/azure-rest-api-specs/tree/master/specification/servicefabricmesh/resource-manager/Microsoft.ServiceFabricMesh/preview/2018-07-01-preview](https://github.com/Azure/azure-rest-api-specs/tree/master/specification/servicefabricmesh/resource-manager/Microsoft.ServiceFabricMesh/preview/2018-07-01-preview)

Il existe différents exemples de code fournis par Microsoft, notamment la classique voting-app, mais il y a aussi containo une application de démo créée par la [Tom Kerkhove](https://blog.tomkerkhove.be/) qui montre comment utiliser Service Fabric Mesh : [https://github.com/tomkerkhove/containo/blob/master/deploy/service-fabric-mesh/service-fabric-mesh-orders-declaration.json](https://github.com/tomkerkhove/containo/blob/master/deploy/service-fabric-mesh/service-fabric-mesh-orders-declaration.json)
