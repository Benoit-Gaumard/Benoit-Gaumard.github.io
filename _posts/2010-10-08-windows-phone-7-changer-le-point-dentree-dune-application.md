---
layout: post
title: Windows Phone 7 - Changer le point d’entrée d’une application
date: 2010-10-08
categories: [ "Divers" ]
comments_id: 50 
---

Dans une application Windows Phone 7, la page de démarrage par défaut est celle créer par Visual Studio quand vous créer un nouveau projet. C’est à dire la MainPage.xaml, vous avez donc à la création du projet une application qui ressemble à ça :

![image]({{ site.url }}/images/2010/10/08/windows-phone-7-changer-le-point-dentree-dune-application-img0.png "image")

Maintenant dans des cas d’utilisations, il est envisageable de souhaiter changer la page d’accueil. Et pour cela rien de plus facile, il suffit d’aller dans le fichier “WMAppManifest” de l’application que vous allez trouver ici :

![image]({{ site.url }}/images/2010/10/08/windows-phone-7-changer-le-point-dentree-dune-application-img1.png "image")

Dans ce fichier XML qui décrit les différents besoins de votre application en terme de matériel, comme le GPS par exemple. Vous pouvez avoir les infos détaillés des différents besoins sur ce lien : [http://blogs.msdn.com/b/jaimer/archive/2010/04/30/windows-phone-capabilities-security-model.aspx](http://blogs.msdn.com/b/jaimer/archive/2010/04/30/windows-phone-capabilities-security-model.aspx "http://blogs.msdn.com/b/jaimer/archive/2010/04/30/windows-phone-capabilities-security-model.aspx")

Mais ce fichier indique aussi la page par défaut de votre application

![image]({{ site.url }}/images/2010/10/08/windows-phone-7-changer-le-point-dentree-dune-application-img2.png "image")

Il vous suffit simplement de changer la valeur de “NavigationPage” par la valeur que vous souhaitez, ainsi lorsque vous démarrer votre application, vous aurez une nouvelle page par défaut comme on peut le voir.

![image]({{ site.url }}/images/2010/10/08/windows-phone-7-changer-le-point-dentree-dune-application-img3.png "image")
