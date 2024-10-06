---
layout: post
title: Configurer Access Control Service pour utiliser une authentification Windows Live
date: 2011-10-25
categories: [ "Azure", "Access Control Service" ]
comments_id: 74 
---

Dans cet article, nous allons voir comment utiliser Access Control Service dans vos applications, afin d’utiliser un provider d’identité tierce à celui que vous auriez pu développer au sein de votre application.

Commençons donc par créer notre accès sur le portail Windows Azure, je suppose que vous avez tous un compte !

Sur le [portail](https://windows.azure.com/default.aspx) vous allez vous rendre dans la catégorie Service Bus, Access Control & Caching, et ensuite créer un nouveau namespace (il est activé au bout d’environ 5min)

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img0.png "image")

Par la suite, vous allez le configurer, via le bouton Access Control Service, ensuite Relying Party, vous pouvez le configurer comme vous le souhaitez, à noter qu’il est possible d’utiliser des url en localhost comme ci dessous pour tester, c’est tout de suite plus facile que de déployer dans un environnement de test accessible via le Web.

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img1.png "image")

Pour le reste, je vais uniquement décider de me connecter avec le provider Windows Live pour le moment, je ferais des articles pour se connecter avec Facebook, voir avec un Active Directory si j’arrive à en configurer correctement … Oui je ne suis pas IT !

Après la sauvegarde on a donc ceci :

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img2.png "image")

Ensuite, dans Rule Group, vous allez éditer les règles de connexion à votre application, pour cela il vous suffit de générer une règle pour Windows Live dans notre cas

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img3.png "image")

Bon, maintenant que vous vous dites finie la configuration, j’espère que vous avez bien pensé à installer les différents prérequis pour utiliser Access Control Services, sinon il n’est pas trop tard, et allez voir cet [article](http://blog.woivre.fr/?p=600) !

Et ensuite, place à Visual Studio, votre outil préféré qui est je doute déjà ouvert, on va donc créer une nouvelle application ASP.Net MVC 3, sans Razor pour la démonstration, mais rien ne vous empêche de l’utiliser.

On va commencer par configurer notre application avant de créer les pages nécessaires, pour cela effectuer un clic droit sur votre projet Web, et cliquer sur Add STS Reference. Vous aurez ensuite la fenêtre ci dessous qui va apparaitre à vous de la compléter avec l’url que vous avez précédemment fournis sur le portail Azure :

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img4.png "image")

Ensuite vous créer votre STS existant et vous rentrez l’url que vous allez trouver sur le portail Azure, dans la configuration de votre namespace, vous avez accès à l’url de votre FederationMetadata comme on peut le voir ci dessous :

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img5.png "image")

Maintenant que la configuration est réellement finie, on va essayer de lancer notre solution (et oui pas de code à faire !) !

Et bien entendu, comme à chaque premier essai ça ne marche pas ….

Voilà maintenant gestion des erreurs, comme vous utilisez .Net 4.0 sur votre Cassini, vous allez probablement tomber sur cette erreur

![image]({{ site.url }}/images/2011/10/25/configurer-access-control-service-pour-utiliser-une-authentification-windows-live-img6.png "image")

Pour contourner cette erreur il vous suffit d’ajouter dans votre Web.config (dans system.web) la ligne suivante :

```xml
<httpRuntime requestValidationMode="2.0" /> 
```

Pour récupérer des informations sur l’utilisateur connecté, et bien, je suis désolé, Windows Live protège fortement ces utilisateurs contrairement à d’autres sites, vous pouvez cependant récupérer un ID unique (qui n’est pas celui de votre compte live, via cette ligne de code) :

((IClaimsIdentity)HttpContext.User.Identity).Claims.First(n => n.ClaimType == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier").Value;

Il vous faudra référencer la libraire Microsoft.IdentityModel dans votre solution pour avoir accès à l’interface IClaimsIdentity. Je chercherais tout de même s’il y a un moyen détourner de récupérer ne serait-ce que le nom et le prénom, mais j’ai de sérieux doute …. Je demanderais tout de même ! Et ça fera le sujet d’un autre article !

Par ailleurs je ne vous fournis pas la source, puisqu’il n’y a pas de code, uniquement de la configuration mais je reste à votre disposition si vous souhaitez des informations !

PS : J’ai eu des problèmes juste après ma première configuration de namespace dans ACS, genre il était inaccessible, donc ne vous inquiétez pas si ça arrive ça reviendra !
