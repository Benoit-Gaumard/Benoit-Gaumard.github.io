---
layout: post
title: ARM - Rejoindre un domaine Active Directory avec prestaging
date: 2019-02-06
categories: [ "Azure", "ARM", "Virtual Machines" ]
comments_id: 159 
---

Créer des machines virtuelles sur Azure est plutôt simple. Cela se corse lorsque vous voulez les créer avec diverses règles de sécurité *"built-in"*.

Par exemple, dans mon cas, je souhaite associer ma VM fraichement créée à un active directory on premise (connecté via un Express Route) dans une OU spécifique avec l'obligation de faire du préstaging de machine dans mon OU.

Pour cela j'ai utiisé l'extension **JsonADDomainExtension** fournie par Microsoft qui est présente dans les QuickStart ARM [https://github.com/Azure/azure-quickstart-templates/tree/master/201-vm-domain-join-existing](https://github.com/Azure/azure-quickstart-templates/tree/master/201-vm-domain-join-existing).

Cet exemple est parfait pour créer une nouvelle VM dans mon OU.
Le prestaging demande un peu plus d'exploration, en effet tout se base sur la variable **domainJoinOptions** qui est fixée à 3. Si vous faîtes une recherche sur votre moteur préférée vous allez trouver des notions de *magic number 3* ce qui ne va pas vous aider.

En allant plus loin vous allez tomber sur cette documentation qui vous liste les différentes options : [https://docs.microsoft.com/en-us/windows/desktop/api/lmjoin/nf-lmjoin-netjoindomain](https://docs.microsoft.com/en-us/windows/desktop/api/lmjoin/nf-lmjoin-netjoindomain)

Celle qui nous intéresse dans ce cas précis est l'option 20 :

- **NETSETUP_DOMAIN_JOIN_IF_JOINED**
- **0x00000020**
- Allows a join to a new domain even if the computer is already joined to a domain.

Du coup cela me donne en ARM le code suivant :

```json
{
    "name": "[concat(parameters('vmName'),'/', 'JoinADDomain')]",
    "apiVersion": "2015-06-15",
    "type": "Microsoft.Compute/virtualMachines/extensions",
    "location": "[variables('location')]",
    "tags": "[variables('consolidateTags')]",
    "condition": "[parameters('joinActiveDirectory')]",
    "dependsOn": [
        "[concat('Microsoft.Compute/virtualMachines/', parameters('vmName'), '/extensions/AzureDiskEncryption')]"
    ],
    "properties": {
        "publisher": "Microsoft.Compute",
        "type": "JsonADDomainExtension",
        "typeHandlerVersion": "1.3",
        "autoUpgradeMinorVersion": true,
        "settings": {
            "Name": "[parameters('domainActiveDirectory')]",
            "User": "[parameters('domainOperator')]",
            "Restart": "true",
            "Options": "20",
            "OUPath": "[parameters('domainOUPath')]"
        },
        "protectedSettings": {
            "Password": "[parameters('domainOperatorPassword')]"
        }
    }
}
```
