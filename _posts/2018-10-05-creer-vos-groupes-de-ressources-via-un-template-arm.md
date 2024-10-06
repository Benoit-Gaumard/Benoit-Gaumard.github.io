---
layout: post
title: Créer vos groupes de ressources via un template ARM
date: 2018-10-05
categories: [ "Azure", "ARM" ]
comments_id: 149 
---

La création des groupes de ressources se fait généralement par le portail Azure, ou via votre terminal préféré (CLI ou PowerShell). Il est posssible dorénavant de créer vos groupes de ressources via un template ARM.

Prenons un exemple de template ARM pour créer notre resource group :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {
        "location": "West Europe",
        "name": "rg-test"
    },
    "resources": [
        {
            "type": "Microsoft.Resources/resourceGroups",
            "apiVersion": "2018-05-01",
            "location": "[variables('location')]",
            "name": "[variables('name')]",
            "properties": {}
        }
    ],
    "outputs": {}
}
```

Maintenant pour déployer ce template ARM, il est possible d'utiliser la commande suivante :

```powershell
New-AzureRmResourceGroupDeployment -Name deploy-rg -TemplateFile .\azuredeploy.json -ResourceGroupName existing-rg
```

Le problème c'est qu'il faut déjà avoir un resource group dans notre souscription, ce qui n'est pas top pour initier une souscription.
Mais depuis peu, il est possible d'utiliser la commande suivante :

```powershell
New-AzureRmDeployment -Name deploy-rg -TemplateFile .\azuredeploy.json
```

Il est bien entendu possible de retrouver les déploiements passés via la commande

```powershell
Get-AzureRmDeployment
```

Ou alors vous pouvez retrouver vos déploiements dans la blade Souscription dans le portail Azure.

Happy deploy !
