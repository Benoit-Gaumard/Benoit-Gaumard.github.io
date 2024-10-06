---
layout: post
title: Réaliser une copie de vos bases SQL Database
date: 2018-10-26
categories: [ "Azure", "SQL Database" ]
comments_id: 152 
---

Lorsque vous voulez créer des environnements identiques à un autre, par exemple pour réaliser une copie de votre PROD vers une PPROD, ou mettre en place un environnement de PRA. Le problème se situe au plus souvent de vos données, puisque si je souhaite utiliser un backup et le restore sur une autre base, cela peut prendre beaucoup de temps entre la réalisation du backup et sa restauration.

Sur SQL Database, il est possible de faire une copie de votre base de données vers un autre SQL Database de manière très simple et très rapide en utiliant la commande suivante:

```sql
CREATE DATABASE newDestinationDB AS COPY OF sourcedemo.sourcedb;
```

Cette commande magique a tout de même quelques contraintes : si vous utilisez uniquement des comptes SQL, il faut que le compte que vous utilisez sur les deux servers ait un login et un mot de passe identique.
Si vous utilisez un compte provenant d'un Azure Active Directory, vous n'aurez pas de problème car il s'agira du même compte.

Ayant eu à mettre en place ces comptes récemment et n'ayant pas trouvé la doc Azure très limpide à ce sujet, j'ai décidé d'en écrire un article.

Commençons donc par se connecter sur le SQL Server contenant la base de données que l'on souhaite copier.

Créons notre compte de la manière suivante :

```sql
CREATE LOGIN backup_sa WITH PASSWORD = 'topsecure42!'
```

Puis sur la **base de données** que l'on souhaite copier

```sql
CREATE USER backup_sa FROM LOGIN backup_sa
GO
-- role owner sur la base de données que l'on souhaite copier
sp_addrolemember db_owner, backup_sa
```

En ce qui concerne votre base de données source, vous avez fini votre setup.
Maintenant passons à votre serveur cible, celui où vous voulez copier votre base de données.

Créons notre compte de la même manière que précédemment :

```sql
CREATE LOGIN backup_sa WITH PASSWORD = 'topsecure42!'
```

Puis sur la base de données **master** il faut ajouter notre utilisateur dans le groupe db_manager

```sql
CREATE USER backup_sa FROM LOGIN backup_sa
GO
-- role dbmanager sur la base de données que l'on souhaite copier
sp_addrolemember dbmanager, backup_sa
```

Il est ensuite possible de réaliser votre copie de base de données via la commande suivante :

```sql
CREATE DATABASE destinationdb AS COPY OF sourcedemo.sourcedb;
```
