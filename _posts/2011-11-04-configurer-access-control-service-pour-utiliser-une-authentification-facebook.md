---
layout: post
title: Configurer Access Control Service pour utiliser une authentification Facebook
date: 2011-11-04
categories: [ "Azure", "Access Control Service" ]
comments_id: 75 
---

Suite aux articles précédents sur [l’installation du Windows Identity Runtime](http://blog.woivre.fr/?p=600), et sur la [mise en place de l’authentification via Windows Live](http://blog.woivre.fr/?p=613) et Access Control Services dans vos applications ASP.Net MVC, j’ai décidé de vous présenter comment on y intègre Facebook, car de nos jours il est de plus en plus commun de pouvoir se connecter avec son compte Facebook au lieu de devoir créer un énième compte avec un énième mot de passe à oublier !

Pour cela, je vais partir sur la démonstration que j’ai fait précédemment, on gardera donc la même configuration que pour Windows Live, nous allons juste rajouter un fournisseur d’identité de type Facebook.

Pour commencer, nous allons créer une application sur Facebook, il vous pour cela aller à cette adresse : [https://developers.facebook.com/apps](https://developers.facebook.com/apps "https://developers.facebook.com/apps")

On va ensuite créer une nouvelle application :

![image]({{ site.url }}/images/2011/11/04/configurer-access-control-service-pour-utiliser-une-authentification-facebook-img0.png "image")

Maintenant, il vous suffit de configurer votre application sur Facebook, comme ci-dessous

![image]({{ site.url }}/images/2011/11/04/configurer-access-control-service-pour-utiliser-une-authentification-facebook-img1.png "image")

Il vous faut donc remplir l’App Domain avec l’url de votre namespace créé précédent sur Access Control Service, ainsi que l’url d’authentification pour le site.

Garder aussi précieusement l’App Id et l’App Secret dans un coin, car vous allez en avoir besoin très rapidement.

Maintenant retour à Active Control Service, ou vous allez ajouter un nouveau fournisseur d’identité, vous pouvez faire cela dans Access Management Control, puis Identity Providers, ensuite Add, et vous trouverez Facebook très rapidement je pense.

Par la suite, il suffit de remplir les champs comme ci dessous :

![image]({{ site.url }}/images/2011/11/04/configurer-access-control-service-pour-utiliser-une-authentification-facebook-img2.png "image")

Alors la partie la plus importante, après les informations sur l’application sont les différentes permissions Facebook que l’on va demander à l’utilisateur, ici que l’email, ce n’est qu’une démonstration, mais vous pouvez retrouver les différentes permissions possibles [ici](http://developers.facebook.com/docs/reference/api/permissions/). Si je n’ai qu’un conseil à vous donner, ces permissions valent de l’or pour récupérer des informations à propos des personnes qui se connecte à votre site.

Ensuite, vu qu’on a éditer notre application, nous allons aller dans l’onglet Rule groups afin d’ajouter les différents Claims que l’on souhaite récupérer, vous faites Generate, et vous sélectionner Facebook afin d’obtenir ceci :

![image]({{ site.url }}/images/2011/11/04/configurer-access-control-service-pour-utiliser-une-authentification-facebook-img3.png "image")

Et voilà vous pouvez relancer votre projet de démonstration que vous avez fait la dernière fois, si vous avez suivi le tuto au pas à pas, et là vous verrez lors du lancement de l’application ceci :

![image]({{ site.url }}/images/2011/11/04/configurer-access-control-service-pour-utiliser-une-authentification-facebook-img4.png "image")

De plus, par rapport à Windows Live qui est très fermé, Facebook est connu pour son partage, donc vous pouvez retrouver par exemple le nom de la personne connecté sur votre site comme d’habitude, c’est à dire avec un simple HttpContext.User.Identity.Name, mais aussi l’email sans problème dans ce même objet.  

A noter que les modifications au niveau de l’ACS peuvent mettre actuellement un peu de temps à s’appliquer, il est donc possible que vous n’ayez pas accès à votre application de suite.
