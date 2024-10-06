---
layout: post
title: Access Control Service - Supprimer un provider d’authentification pour votre application
date: 2012-01-14
categories: [ "Azure", "Access Control Service" ]
comments_id: 76 
---

On a vu précédemment comment ajouter un provider Facebook à une application en se connectant via Access Control Service.

Et maintenant question bête, comment supprime-t-on un provider d’identité ? Et bien, on est chanceux, c’est aussi simple que d’en ajouter un !

Pour cela, il suffit d’aller sur l’interface pour gérer votre Access Control Service, puis dans Relying Party applications, ensuite de modifier votre application.

En dessous des paramétrages, vous pouvez retrouver cette partie :

![image]({{ site.url }}/images/2012/01/14/access-control-service-supprimer-un-provider-dauthentification-pour-votre-application-img0.png "image")

Il vous suffit de décocher les providers d’identité que vous voulez sauvegarder, et de sauvegarder. Je ne serais que trop vous conseiller de nettoyer aussi les règles de groupe associées afin d’avoir une application nickel.
