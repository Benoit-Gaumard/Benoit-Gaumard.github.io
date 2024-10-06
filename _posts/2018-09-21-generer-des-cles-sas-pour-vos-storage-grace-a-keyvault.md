---
layout: post
title: Générer des clés SAS pour vos storage grâce à KeyVault
date: 2018-09-21
categories: [ "Azure", "KeyVault", "Storage" ]
comments_id: 147 
---

En entreprise, la sécurité c'est le nerf de la guerre. Il n'est pas envisagable de concevoir une application sans aucune notion de sécurité, que cette application soit hébergée on-premise ou dans le Cloud (Azure de préférence).

Quand vous utilisez des comptes de stockage Azure pour du Blob, des Tables ou des Queues, il est possible que vous souhaitiez ne pas avoir vos clés de stockage dans votre solution ou dans la configuration disponible sur vos serveurs pour des questions de Leakage.

Il est possible de mettre en place plusieurs solutions pour ne pas avoir de clés dans vos configurations :

* Utiliser un SPN qui aura pour rôle de se connecter à Azure pour récupérer la clé de votre stockage et si besoin générer une SAS Key
* Mettre en place un SPN qui aura des accès via l'AD sur votre compte de stockage (cela sera traité dans un prochain article)
* Utiliser un SPN qui aura accès à un KeyVault contenant vos clés de storage
* Utiliser le KeyVault pour générer des SAS Key.

Cette dernière solution est en preview dans Azure, nous allons voir comment la mettre en place.

La première étape coniste à avoir les droits nécessaires sur le KeyVault pour effectuer l'opération d'ajout, et à attribuer les bons droits aux personnes ou au SPN qui l'utiliseront. A ce jour, il n'est pas possible de faire cette opération via le portail, donc voici un exemple en Powershell :

```powershell
Set-AzureRmKeyVaultAccessPolicy -VaultName $keyVaultName -ObjectId $userPrincipalId -PermissionsToStorage get,list,delete,set,update,regeneratekey,getsas,listsas,deletesas,setsas,recover,backup,restore,purge
```

La deuxième étape consiste à associer votre KeyVault à un compte de stockage. Il est possible de faire cela en PowerShell via la commande suivante :

```powershell
$storage = Get-AzureRMStorageAccount -StorageAccountName $storageAccountName -ResourceGroupName $storageAccountResourgeGroup

Add-AzureKeyVaultManagedStorageAccount -VaultName $keyvaultName -AccountName $storageAccountName -AccountResourceId $storage.Id -ActiveKeyName key2 -DisableAutoRegenerateKey
```

A noter que sur cette dernière étape il est possible d'activer la régénération des clés de manière automatique sur vos storages.

La dernière étape consiste à construire une SAS Key qui vous servira de template pour la génération des suivantes. Ce template sera par la suite utilisé pour récupérer une nouvelle clé. Voici comment faire cela en powershell :

```powershell
$sasTokenName = "fullaccess"
$storageKey = (Get-AzureRmStorageAccountKey -ResourceGroupName $storageAccountResourgeGroup -Name $storageAccountName).Value[0]

$context = New-AzureStorageContext -StorageAccountName $storageAccountName -StorageAccountKey $storageKey -Protocol Https
$start = [System.DateTime]::Now.AddMinutes(-15)
$end = [System.DateTime]::Now.AddMinutes(15)
$token = New-AzureStorageAccountSASToken -Service Blob,File,Table,Queue -ResourceType Service,Container,Object -Permission "racwdlup" -Protocol HttpsOnly -StartTime $start -ExpiryTime $end -Context $context

$validityPeriod = [System.Timespan]::FromMinutes(30)
Set-AzureKeyVaultManagedStorageSasDefinition -VaultName $keyVaultName -AccountName $storageAccountName -Name $sasTokenName -ValidityPeriod $validityPeriod -SasType 'account' -TemplateUri $token
```

Il est important d'utiliser un "sasTokenName" explicite et unique pour chacune de vos SAS Key, car c'est celui-là qui sera utilisé par la suite.

Maintenant pour récupérer ma clé SAS, il me suffit d'appeler le KeyVault avec le secret suivant : **StorageAccountName-sasTokenName**, comme on peut le voir ci-dessous en Powershell :

```powershell
$sasKey = (Get-AzureKeyVaultSecret -VaultName $keyvaultName -Name ("wwodemospn-fullaccess")).SecretValueText
```

Avec cette méthode, fini les clés de Storage qui trainent dans les fichiers de config.
