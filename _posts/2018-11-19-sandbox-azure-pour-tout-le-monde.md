---
layout: post
title: Sandbox Azure pour tout le monde
date: 2018-11-19
categories: [ "Azure" ]
comments_id: 153 
---

Il y a quelques articles de cela, j'ai écrit une série d'articles pour vous montrer comment j'ai créé une sandbox Azure à SOAT.

* Introduction : [http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory](http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory)
* Provisionnement des utilisateurs : [http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs](http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs)
* Gestion des groupes de ressources : [http://blog.woivre.fr/blog/2018/06/sandbox-azure-gestion-des-groupes-de-ressources](http://blog.woivre.fr/blog/2018/06/sandbox-azure-gestion-des-groupes-de-ressources)
* Azure Policy : [http://blog.woivre.fr/blog/2018/07/sandbox-azure-mise-en-place-de-policy-azure](http://blog.woivre.fr/blog/2018/07/sandbox-azure-mise-en-place-de-policy-azure)
* Monitoring & Event Grid : [http://blog.woivre.fr/blog/2018/07/sandbox-azure-monitorer-lusage-grace-a-event-grid](http://blog.woivre.fr/blog/2018/07/sandbox-azure-monitorer-lusage-grace-a-event-grid)

Il faut savoir que j'ai aussi sur mon compte Azure une sandbox basée sur les mêmes services à savoir :

* Azure Functions
* Managed Service Identity

Cette sandbox est donc moins avancée que celle disponible pour SOAT, mais elle me sert grandement pour tout ce qui est démo pour mes clients ou pour les différents meetups / conférences auxquels je participe.

Elle gère donc uniquement la création et la suppression de mes ResourceGroups, ce qui me suffit amplement, car seul moi ai accès à toutes les ressources de mes souscriptions Azure.

Bien qu'il existe à ce jour la sandbox by Microsoft, j'ai tout de même décidé de vous fournir la mienne, elle est disponible sur le site : [https://www.serverlesslibrary.net/](https://www.serverlesslibrary.net/), il s'agit du projet **Azure Sandbox Utils**

Via le site Serverless Library, vous pouvez aller sur le repository de ma sandbox et appuyer sur le bouton déployer afin de mettre cette fameuse sandbox sur votre compte Azure.

Par la suite, il vous suffira d'effectuer les étapes suivantes:

* Mettre le MSI en tant que contributeur ou ayant les droits Read / write / delete sur les ressources group
* Ajouter un application insight, car les logs c'est important
* Appeler l'url de création de ressource group avec les paramètres suivants

```json
{ 
     name: "nameValue", 
     expirationDate: "2018-09-25",
     location: "West Europe" 
}
```

Et voilà fini les resourcegroups inutilisés dans votre souscription.
N'hésitez pas à me faire des retours en cas de bug ou de nouvelles fonctionnalités à implémenter.

J'utilise cette sandbox à la place de celle de Microsoft pour les raisons suivantes :

* Disponible sur mon tenant Azure (j'ai des clients qui bloquent tous les tenants sauf les leurs)
* Temps de disponibilité des ressources modifiables
* Partageable entre plusieurs utilisateurs
