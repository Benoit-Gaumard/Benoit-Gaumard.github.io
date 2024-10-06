---
layout: post
title: Verrouillez vos ressources via ARM
date: 2019-01-15
categories: [ "Azure", "ARM" ]
comments_id: 158 
---

Verrouiller ses ressources sur Azure est un moyen simple de s'affranchir d'erreurs d'inattention.
Il existe plusieurs types de verrous que l'on peut poser sur Azure qui sont les suivants :

- ReadOnly
- CanNotDelete

Il est possible de les mettre soit sur chacune de vos ressources, sur les groupes de ressources ou alors sur votre souscription.

Maintenant voyons comment faire cela en ARM.

## Verrouiller une ressource

```json
{
    "type": "Microsoft.Network/virtualNetworks/providers/locks",
    "apiVersion": "2016-09-01",
    "name": "[concat('VirtualNetwork1', '/Microsoft.Authorization/vnetLock')]",
    "dependsOn": [
        "[resourceId('Microsoft.Network/virtualNetworks', 'VirtualNetwork1')]"
    ],
    "properties": {
        "level": "CanNotDelete",
        "notes": "VNET can not delete"
    }
}
```

Cette partie de template ARM contient les éléments suivants :

- Type : Type de la ressource suivi de  **/providers/locks**
- Name : Nom de la ressource suivi de **/Microsoft.Authorization/** puis le nom du Lock

## Verrouiller un groupe de resource

```json
{
    "type": "Microsoft.Authorization/locks",
    "apiVersion": "2016-09-01",
    "name": "rgLock",
    "dependsOn": [
        "[resourceId('Microsoft.Network/virtualNetworks', 'VirtualNetwork1')]"
    ],
    "properties": {
        "level": "CanNotDelete",
        "notes": "RG can not delete"
    }
}
```

Cette partie de template est utilisable via la commande **New-AzureRmResourceGroupDeployment**.
Bien entendu faites bien attention aux dépendances, surtout si vous mettez un level à ReadOnly

## Verrouiller une souscription

```json
{
    "type": "Microsoft.Authorization/locks",
    "apiVersion": "2016-09-01",
    "name": "subLock",
    "properties": {
        "level": "CanNotDelete",
        "notes": "sub can not delete"
    }
}
```

Cette partie de template est utilisable via la commande **New-AzureRmDeployment** uniquement.
