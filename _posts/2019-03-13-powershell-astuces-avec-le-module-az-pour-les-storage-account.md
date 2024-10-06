---
layout: post
title: Powershell - Astuces avec le module Az pour les Storage Account
date: 2019-03-13
categories: [ "Azure", "Storage", "Powershell" ]
comments_id: 106 
---

Vous n'êtes pas sans savoir que Microsoft a mis à jour son module Powershell AzureRM par Az. Ce module a l'usage a pour principale modification de remplacer vos commandes *AzureRM* par *Az* comme on peut le voir ci-dessous :

```powershell
Connect-AzureRMAccount

Connect-AzAccount
```

Techniquement pour les migrations de vos scripts c'est assez simple à mettre en oeuvre, donc n'hésitez pas à migrer !

Par ailleurs, le module Az apporte quelques nouveautés plutôt cools notamment pour le Storage.
J'avais publié différents articles sur le support de RBAC pour accéder aux data du blob storage :

- [Connectez-vous à vos comptes de stockage via Azure Active Directory](http://woivre.fr/blog/2018/09/connectez-vous-a-vos-comptes-de-stockage-via-azure-active-directory)
- [Générer un token Azure AD via les REST API](http://woivre.fr/blog/2018/10/generer-un-token-azure-ad-via-les-rest-api)

Et bien maintenant il y a une nouvelle solution, vous pouvez le faire via le module Powershell via les commandes suivantes

```powershell
Connect-AzAccount # Via un Service Principal ou non

New-AzStorageContext -StorageAccountName $storageDestinationName -UseConnectedAccount
```

Et voilà comment passer un token AD sans avoir à écrire 30 lignes de powershell.
A noter qu'il existe aussi une fonctionnalité similaire pour vos comptes de Storage de dev local

```powershell
New-AzStorageContext -Local
```

Et dans une moindre mesure, il est possible de se connecter à un storage de manière anonyme, même si dans ce cas précis, je ne vois pas l'avantage par rapport à des appels REST standards.

```powershell
New-AzStorageAccount -StorageAccountName $storageDestinationName -Anonymous
```

Mais bon l'option existe donc si vous voulez l'utiliser, allez-y.
