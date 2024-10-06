---
layout: post
title: ARM - Nommez comme vous le souhaitez votre plan à la consommation pour Azure Function
date: 2019-06-03
categories: [ "Azure", "Function" ]
comments_id: 165 
---

Si vous avez une convention de nommage pour votre compte Azure, je suppose que comme moi ce qui vous agace le plus ce sont les ressources qui se nomment comme elles le souhaitent.

Avec la popularité d'Azure Function, vous avez dû voir apparaitre des Services Plans nommés "WestEuropePlan" ou tout autre. Et bien sachez qu'il est très simple de le nommer comme vous le voulez grâce à l'ARM suivant :

```json
{
    "type": "Microsoft.Web/serverfarms",
    "apiVersion": "2016-09-01",
    "name": "CustomConsoPlan",
    "location": "[resourceGroup().location]",
    "sku": {
        "name": "Y1"
    }
}
```

Et pour l'utiliser rien de plus simple, il suffit de rajouter la configuration **serverFarmId**, comme le démontre le template d'Azure Functions suivant

```json
{
    "apiVersion": "2016-08-01",
    "type": "Microsoft.Web/sites",
    "name": "[parameters('functionAppName')]",
    "location": "[resourceGroup().location]",
    "kind": "functionapp",
    "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms',  parameters('planName'))]",
        "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageName'))]"
    ],
    "properties": {
        "clientAffinityEnabled": false,
        "siteConfig": {
            "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('planName'))]",
            "appSettings": [
                {
                    "name": "AzureWebJobsStorage",
                    "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageName')), '2015-05-01-preview').key1)]"
                },
                {
                    "name": "WEBSITE_CONTENTAZUREFILECONNECTIONSTRING",
                    "value": "[concat('DefaultEndpointsProtocol=https;AccountName=',parameters('storageName'),';AccountKey=',listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('storageName')), '2015-05-01-preview').key1)]"
                },
                {
                    "name": "WEBSITE_CONTENTSHARE",
                    "value": "[variables('contentShareName')]"
                },
                {
                    "name": "FUNCTIONS_EXTENSION_VERSION",
                    "value": "~2"
                },
                {
                    "name": "FUNCTIONS_WORKER_RUNTIME",
                    "value": "dotnet"
                }
            ]
        }
    }
}
```

Et voilà, simple et efficace !
