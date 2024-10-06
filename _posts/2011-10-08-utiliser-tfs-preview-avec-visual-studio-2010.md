---
layout: post
title: Utiliser TFS Preview avec Visual Studio 2010
date: 2011-10-08
categories: [ "Azure", "Azure DevOps" ]
comments_id: 128 
---

Si vous avez la chance d’avoir accès à TFS Preview sur Azure, vous avez sûrement du vouloir l’essayer avec autre chose que Visual Studio 11 Developer Preview, par exemple Visual Studio 2010.

Or lorsque vous voulez rajouter la liaison à votre TFS dans Visual Studio, vous avez cette jolie erreur

![image]({{ site.url }}/images/2011/10/08/utiliser-tfs-preview-avec-visual-studio-2010-img0.png "image")

En effet, il vous faut appliquer un KB afin que votre Visual Studio puisse se connecter à un TFS Preview sur Azure, la raison est je pense l’ouverture de la popup pour les informations de connexion.

Voici le lien de la KB : [KB2581206](http://go.microsoft.com/fwlink/?LinkID=212065 "KB2581206") Notez qu’il vous faudra le SP1 de Visual Studio d’installé.
