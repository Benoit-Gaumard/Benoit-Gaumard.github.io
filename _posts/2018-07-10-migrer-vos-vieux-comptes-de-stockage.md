---
layout: post
title: Migrer vos vieux comptes de stockage
date: 2018-07-10
categories: [ 'Azure', 'Storage' ]
comments_id: 139 
---

Mois de juillet oblige, c'est le grand nettoyage de printemps avec quelques mois de retard. Je suis donc en train de faire le grand ménage dans mes différents comptes Azure.

Si comme moi il vous reste des vieux comptes de stockage en mode classic, il est peut être temps de les migrer.

La procédure est très simple à faire en Powershell notamment, à partir du moment ou vous êtes Classic Admin de votre souscription Azure.

Pour commencer il vous faut le module powershell Azure, installer le si vous n'avez que AzureRM.

```powershell
Install-Module Azure
```

Ensuite, il vous faut vérifier que le provider Microsoft.ClassicInfrastructureMigrate est bien enregistré sur votre souscription, soit via le portail Azure, soit via powershell via les commandes suivantes :

```powershell
Install-AzureRmResourceProvider -ProviderNamespace Microsoft.ClassicInfrastructureMigrate

Get-AzureRmResourceProvider -ProviderNamespace Microsoft.ClassicInfrastructureMigrate
```

Attention, il s'agit là de commande AzureRM, il faut donc être loggué en conséquence.

Maintenant tout le reste se fait en mode classic, on va donc commencer par s'authentifier à l'ancienne

```powershell
Add-AzureAccount
Select-AzureSubscription -SubscriptionName $subscriptionName
```

Afin de valider si votre storage est migrable, vous pouvez utiliser la commande suivante :

```powershell
Move-AzureStorageAccount -Validate -StorageAccountName $storageAccountName
```

Cette commande vérifie notamment qu'il n'y a pas de disques de VM attaché à ce storage account.

Maintenant que tout est validé, il est possible de migrer via ces 2 commandes powershell

```powershell
Move-AzureStorageAccount -Prepare -StorageAccountName $storageAccountName

Move-AzureStorageAccount -Commit -StorageAccountName $storageAccountName
```

Il est possible d'annuler l'opération entre le Prepare et le Commit via la commande

```powershell
Move-AzureStorageAccount -Abort -StorageAccountName $storageAccountName
```

Après un temps plus ou moins long, selon votre Storage Account, vous pouvez retrouver votre Storage Account fraichement migré dans un nouveau Resource Group s'appelant "$storageAccountName-Migrated"

Il est bien entendu possible de le Move par la suite afin de le mettre au bon endroit dans votre souscription

A noter au passage qu'il a changé de resourceId, cela va donc impacter les différentes ressources liées telles que :

* Les dashboard Application Insights
* L'autoscaling basé sur des métriques provenant de ce storage
* Tout autre produit se basant sur les resourceId

Bien entendu, cela va de soit, vos clés primaires et secondaires d'accès au storage sont inchangées.

Je vous souhaite une bonne migration !
