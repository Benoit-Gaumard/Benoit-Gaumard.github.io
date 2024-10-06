---
layout: post
title: Travailler avec Windows Azure et un débit réduit
date: 2012-12-05
categories: [ "Azure" ]
comments_id: 95 
---

Depuis que je travaille avec Windows Azure, j’ai eu l’occasion d’utiliser plusieurs types de connexion internet, que ce soit au travail, ou chez moi sur Paris, avec des connexions en fibre optique ou du 20Mo en étant très près de la borne, mais aussi bien des connexions au fin fond de la corrèze, ou en pleine Beauce ou la qualité de la connexion internet n’est pas satisfaisante et où l’upload de votre package Azure peut prendre plus de temps que la création de votre application ! Et bien entendu, c’est aussi le cas durant les divers Hackathons où il y a 100 développeurs avides d’informations que l’on ne trouve que sur Internet.  Bref, vie ma vie dans ce numéro de vie ma vie de développeurs, je vais vous donner quelques astuces pour pouvoir travailler avec Windows Azure lorsque vous avez un débit réduit !

Alors bien entendu tout cet article, et tous les avantages / inconvénients sont listés en vu du hackathon Windows Phone 8 qui se déroulera mi décembre !

## Windows Azure Mobile Services

Vous voulez construire un backend sur Windows Azure pour vos applications Windows 8 ou Windows Phone 8 ou iOS, dans ce backend, vous avez besoin d’un mode CRUD très simple à mettre en place, d’un processus d’identification, ou d’un mode push, ce service est fait pour vous !

Ce service a de nombreux avantages, cependant pendant un hackathon, je vous conseille de configurer ce service avant d’y aller, et surtout de créer vos différents fournisseurs d’identité, et de les tester avant d’y aller, puisque certains d’entre eux ont des fois des sites qui ne répondent pas du premier coup ! De plus, si vous voulez sortir des cas d’utilisations simples qui ne sont pas cités sur le site Windows Azure, il y a besoin d’avoir des compétences en Node.js où de suivre certains tutoriaux spécifiques qui sont malheureusement peu nombreux  …

Pour résumé, les avantages sont :

* Simple à mettre en place
* Intègre les fonctionnalités de base que l’on veut d’un backend d’une application mobile
  * CRUD
  * Push
  * Authentification

Les inconvénients  :

* Difficile de sortir des sentiers battus sans faire diverses recherches sur internet
  * Gestion de listes d’objets (ex : liste des commentaires associés à un message)
  * Gestion de l’identité des utilisateurs connectées.
* Application totalement reliée à internet, et donc si vous avez une connexion soumise à des coupures réseau, il n’est pas possible de faire tourner votre application en local.

## Windows Azure WebSites

Que ce soit en Node.js, PHP ou ASP.Net, Windows Azure Websites vous permet simplement de déployer vos applications sur Windows Azure ! Et si vous le couplez avec ASP.Net MVC Web API vous avez le duo gagnant pour créer rapidement et simplement un backend sur lequel vous avez entièrement la main, de plus la publication se fait simplement par un Web Deploy, ce qui permet de ne déployer que des différentielles de votre application.

Pour résumé, les avantages sont :

* Simple à mettre en place
* Rapide à déployer
* Testable en local

Les inconvénients :

* Tout doit être développé : Push, fournisseurs d’identité …

## Windows Azure Cloud Services

Le service historique de Microsoft, vous n’avez aucune limite avec celui-ci que ce soit en terme de technologie, d’accès à la machine ! Et même de montée en charge rapidement et efficacement ! Le seul conseil que je vous donne, c’est de déployer avant votre service avec les options de remote desktop et de Web deploy

![image]({{ site.url }}/images/2012/12/05/travailler-avec-windows-azure-et-un-debit-reduit-img0.png "image")

Alors, je vous entends d’ici, effectivement en déployant votre site avec Web Deploy sur un Cloud Services, ça ne marche pas lorsqu’on a plusieurs instances, où que l’on souhaite faire monter en charge notre application, cependant entre prendre 45mn pour déployer et tester au lieu de 5min, le choix est rapide ! Il vous suffira de redéployer quand ça sera possible et que ça ne vous empêchera pas de travailler !

Pour résumé, les avantages sont :

* Tellement nombreux pour être listés ici
* N’ayez aucune limite en mode PAAS avec ce service

Les inconvénients :

* Plus ou moins long à déployer selon le réseau

Bon cet article est très orienté hackathon, mais c’est surtout pour préparer le hackathon Windows Phone 8 organisé au moulin de la forge au mois de décembre !
