---
layout: post
title: Installer le Windows Azure Toolkit pour Windows Phone sur Windows 8
date: 2011-10-04
categories: [ "Azure", "SDK" ]
comments_id: 71 
---

Alors si comme moi, vous avez jouer au geek, et que vous avez décidé d’installer Windows 8 Developer Preview sur votre machine physique, vous pouvez avoir quelques problèmes avec certains installeurs.

J’ai récemment essayé le [Windows Azure Toolkit pour Windows Phone](http://watwp.codeplex.com/) sur Windows 8, et là c’est le drame, ça ne marche pas, on obtient cette erreur :

 ![image]({{ site.url }}/images/2011/10/04/installer-le-windows-azure-toolkit-pour-windows-phone-sur-windows-8-img0.png "image")

Alors pour contourner ce problème rien de plus simple, il vous faudra éditer le fichier "C:\\WindowsAzure\\WATWindowsPhone\\Setup\\Dependencies.dep" et modifier les numéros de version d’OS ciblés en y ajoutant le numéro 8102 comme on peut le voir ci dessous :

```xml
<dependencies>  
  <os type="Vista;Server" buildNumber="6001;6002;7000;7100;7600;7601;8102">  
```

Voilà en espérant que ça en aidera quelques uns !
