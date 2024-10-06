---
layout: post
title: Azure - Résoudre les erreurs liées au module Powershell Az
date: 2019-04-19
categories: [ "Azure", "Powershell" ]
comments_id: 164 
---

Ce post peut couvrir une grande partie de vos problèmes en Powershell, et pas uniqument ceux liés aux problèmes avec le module Az.

Vous n'êtes pas sans savoir qu'Azure se base sur des API REST, et que le module Powershell Az se base su celles-ci, comme c'est le cas pour la CLI ou pour les managements librairies.

Maintenant, quand on passe à l'action, il peut arriver qu'on ait des erreurs peu parlantes comme celle-ci :

```powershell
PS F:\> Add-AzKeyVaultManagedStorageAccount -VaultName $keyvaultName -AccountName $storage.Name -AccountReso
urceId $storage.Id -ActiveKeyName key1 -RegenerationPeriod $period

Add-AzKeyVaultManagedStorageAccount : Operation returned an invalid status code 'BadRequest'
At line:1 char:1
+ Add-AzKeyVaultManagedStorageAccount -VaultName $keyvaultName -Acc ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : CloseError: (:) [Add-AzKeyVaultManagedStorageAccount], KeyVaultErrorException
    + FullyQualifiedErrorId : Microsoft.Azure.Commands.KeyVault.AddAzureKeyVaultManagedStorageAccount
```

Alors pas de panique, pour avoir plus d'infos sur l'erreur, vous pouvez mettre l'option -Debug à votre cmdlet comme ci-dessous :

```powershell
Add-AzKeyVaultManagedStorageAccount -VaultName $keyvaultName -AccountName $storage.Name -AccountReso
urceId $storage.Id -ActiveKeyName key1 -RegenerationPeriod $period -Debug
```

Je vous passe le résultat qui peut être assez détaillé, et qui peut contenir des informations sensibles, mais à la fin vous avez le plus souvent un joli message d'erreur clair comme celui-ci

```json
Body:
{
  "error": {
    "code": "Forbidden",
    "message": "Key vault service doesn't have proper permissions to access the storage account
  }
}
```

En règle générale toutes les commandes powershell qui vous renvoient un **Bad Request** font un appel REST au sein de leur implémentation.
