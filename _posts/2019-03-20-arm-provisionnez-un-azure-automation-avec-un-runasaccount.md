---
layout: post
title: ARM - Provisionnez un Azure Automation avec un RunAsAccount
date: 2019-03-20
categories: [ "Azure", "ARM", "Automation" ]
comments_id: 160 
---

Lorsque vous voulez utiliser Azure Automation pour gérer vos ressources Azure, vous devez créer un Service Principal qui vous servira de *RunAsAccount*. Il est possible de faire cela via le portail Azure, et cela vous créera un compte qui ressemble à celui là.

![image]({{ site.url }}/images/2019/03/20/arm-provisionnez-un-azure-automation-avec-un-runasaccount-img0.png "image")

Si vous avez une convention de nommage, le nom de l'application : **reference-aa_5cz2xH6ut6qwABcMDEIfJNCdFX2GZIDGHNrMbVunQAY=** ne vous convient sûrement pas, ça tombe bien moi non plus.

Pour cela, il faut précréer votre Service principal avant de créer votre compte Automation via un template ARM dans mon cas.
Le compte doit respecter les éléments suivants :

* Avoir un joli nom qui répond à vos contraintes de naming : **pretty-app**
* Une HomePage Url correspondant à l'url de votre service sur Azure : **<https://management.azure.com//subscriptions/>##*SUBSCRIPTION_ID*##/resourceGroups/aa/providers/Microsoft.Automation/automationAccounts/sample-aa**
* Un certificat à renseigner en tant que secret de votre application.

Donner des droits à ce compte sur la souscription Azure que vous souhaitez afin de pouvoir valider le bon fonctionnement de votre compte Applicatif.

Maintenant, passons à notre template ARM, qui est le suivant :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {
        "aa-appId": "##_APPLICATION_ID_##",
        "aa-tenantId": "##_TENANT_ID_##",
        "aa-certBase64Value": "##_CERTIFICATE_VALUE_BASE64_##",
        "aa-certThumbprint": "##_CERTIFICATE_THUMBPRINT_##",
        "aa-subId": "##_SUBSCRIPTION_ID_##"
    },
    "resources": [
        {
            "type": "Microsoft.Automation/automationAccounts",
            "apiVersion": "2015-10-31",
            "name": "sample-aa",
            "location": "[resourceGroup().location]",
            "properties": {
                "sku": {
                    "name": "Free"
                }
            },
            "resources": [
                {
                    "name": "AzureRunAsCertificate",
                    "type": "certificates",
                    "apiVersion": "2015-10-31",
                    "dependsOn": [
                        "sample-aa"
                    ],
                    "properties": {
                        "base64Value": "[variables('aa-certBase64Value')]"
                    }
                },
                {
                    "name": "AzureRunAsConnection",
                    "type": "connections",
                    "dependsOn": [
                        "sample-aa",
                        "AzureRunAsCertificate"
                    ],
                    "apiVersion": "2015-10-31",
                    "properties": {
                        "connectionType": {
                            "name": "AzureServicePrincipal"
                        },
                        "fieldDefinitionValues": {
                            "ApplicationId": "[variables('aa-appId')]",
                            "TenantId": "[variables('aa-tenantId')]",
                            "CertificateThumbprint": "[variables('aa-certThumbprint')]",
                            "SubscriptionId": "[variables('aa-subId')]"
                        }
                    }
                }
            ]
        }
    ],
    "outputs": {}
}
```

Si on détaille un peu on retrouve ici notre account automation :

```json
{
    "type": "Microsoft.Automation/automationAccounts",
    "apiVersion": "2015-10-31",
    "name": "sample-aa",
    "location": "[resourceGroup().location]",
    "properties": {
        "sku": {
            "name": "Free"
        }
    }
}
```

Maintenant on ajoute le certificat qui sert à nous identifier avec notre service principal

```json
{
    "name": "AzureRunAsCertificate",
    "type": "certificates",
    "apiVersion": "2015-10-31",
    "dependsOn": [
        "sample-aa"
    ],
    "properties": {
        "base64Value": "[variables('aa-certBase64Value')]"
    }
}
```

Et pour finir, il faut créer le compte dans Azure Automation

```json
{
    "name": "AzureRunAsConnection",
    "type": "connections",
    "dependsOn": [
        "sample-aa",
        "AzureRunAsCertificate"
    ],
    "apiVersion": "2015-10-31",
    "properties": {
        "connectionType": {
            "name": "AzureServicePrincipal"
        },
        "fieldDefinitionValues": {
            "ApplicationId": "[variables('aa-appId')]",
            "TenantId": "[variables('aa-tenantId')]",
            "CertificateThumbprint": "[variables('aa-certThumbprint')]",
            "SubscriptionId": "[variables('aa-subId')]"
        }
    }
}
```

Et voilà, vous pouvez maintenant utiliser un Azure Automation avec un *RunAsAccount* qui respecte votre règle de nommage.
