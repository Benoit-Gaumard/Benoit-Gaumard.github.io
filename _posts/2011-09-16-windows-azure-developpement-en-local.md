---
layout: post
title: Windows Azure - Développement en local
date: 2011-09-16
categories: [ "Azure", "Cloud Services" ]
comments_id: 69 
---

Bon cela fait un petit bout de temps que je n’ai pas bloggé ! Non pas par manque de sujet, mais plus par manque de temps….

Donc pour recommencer, une petite astuce pour Windows Azure, avec les récents Tools qui sont sortis, une panoplie de nouvelles fonctionnalités sont apparues ! Et notamment une modification au niveau des performances de l’émulateur dont vous vous servez en développement.

Vu les nouvelles performances qui sont très acceptables, si vous êtes dans le même cas que moi et que le ventilateur de votre machine commence à essayer de tourner plus vite qu’il ne le doit dès que l’émulateur démarre, une nouvelle fonctionnalité est apparue dans les propriétés des projets Windows Azure

![image]({{ site.url }}/images/2011/09/16/windows-azure-developpement-en-local-img0.png "image")

Et oui on peut enfin couper l’émulateur de storage Azure, alors si comme moi, vous faites tous vos projets avec essentiellement des données dans Azure, n’hésitez pas à le couper votre PC vous remerciera plus tard !

On notera au passage, qu’on peut enfin avoir le choix entre plusieurs configurations ce qui peut être sympa quand vous avez des config de production, et de développement qui sont différentes. De même vous pouvez traiter les Warnings comme des erreurs, option bien pratique puisqu’elle vous permet d’être averti lorsque vous faites référence à une assembly ne se trouvant pas dans le GAC et que vous avez oublié d’activer la copie de celle-ci ! Et c’est clairement mieux un message d’erreur que 20 min d’attente pour voir via l’Intellitrace que votre application cherche encore l’assembly….

J’ai quelques articles en cours ! Mais n’hésitez pas à m’envoyer un messagesi vous désirez des infos plus précises sur Azure notamment !
