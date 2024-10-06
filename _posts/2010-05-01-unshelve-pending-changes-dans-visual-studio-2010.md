---
layout: post
title: Unshelve Pending Changes dans Visual Studio 2010
date: 2010-05-01
categories: [ "Divers" ]
comments_id: 46 
---

Lorsque l’on travaille avec Team Foundation Server ou un autre contrôleur de code source, il est habituel d’effectuer une sauvegarde de son travail que l’on ne veut pas partager sur le serveur, ça peut arriver lors d’une évolution assez longue qui impacte les différentes couches du code.

On peut donc réaliser ceci en réalisant un Shelve, puis un UnShelve pour revenir à l’état que l’on avait sauvegarder ! Donc pour ceux qui connaissaient déjà cela, vous avez du vous apercevoir que dans Visual Studio 2010, ils ont enlevé le UnShelve du Menu Contextuel (à gauche VS 2008, et à droite VS 2010)

![image]({{ site.url }}/images/2010/05/01/unshelve-pending-changes-dans-visual-studio-2010-img0.png "image")

Pour récupérer vos sauvegardes, il faut maintenant faire  “View Pending Changes”, puis “Unshelve Changes”, et là on peut voir vos différentes sauvagardes !

![image]({{ site.url }}/images/2010/05/01/unshelve-pending-changes-dans-visual-studio-2010-img2.png "image")

Ca peut vous être utile si vous utilisez souvent cette fonctionnalité ! Qui pour information est d’ailleurs très utiles pour passer d’une machine à l’autre sans avoir à “Checkiner” un code qui ne compile pas !
