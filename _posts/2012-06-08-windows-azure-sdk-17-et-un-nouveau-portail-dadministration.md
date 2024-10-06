---
layout: post
title: Windows Azure SDK 1.7 et un nouveau portail d’administration
date: 2012-06-08
categories: [ "Azure", "SDK" ]
comments_id: 86 
---

Si vous avez loupé la déferlente de nouveautés sur Windows Azure hier, voici une occasion de vous rattraper, je vais vous résumer les principales nouveautés, mais j’y reviendrais dans d’autres articles bien entendu !

Alors la première news, c’est que la plateforme se dote d’une véritable offre de type IAAS, vous pouvez donc maintenant héberger tout ce que vous voulez sur Azure, via des machines virtuelles, et bien entendu comme une bonne nouvelle n’arrive jamais seule, il est possible d’y ajouter des systèmes d’exploitation comme Linux, comme on peut le voir ci-dessous

![image]({{ site.url }}/images/2012/06/08/windows-azure-sdk-17-et-un-nouveau-portail-dadministration-img0.png "image")

Les fanatiques du pingouin peuvent donc y retrouver leurs petits !

Comme je l’ai dit dans le titre, il y a un nouveau SDK .Net qui est disponible à cette [adresse](http://www.microsoft.com/en-us/download/details.aspx?id=29988), avec comme principale nouveauté le support de Visual Studio 2012, ainsi que plein de nouveautés dans l’API Rest, que je détaillerais très bientôt !

La suite, un nouveau portail Azure, que vous pouvez retrouver à l’adresse [http://manage.windowsazure.com](http://manage.windowsazure.com) totalement en HTML 5, finit Silverlight, vous allez pouvoir tout gérer depuis votre prochaine tablette Windows 8  ! Je tâcherais de vous faire une petite vidéo prochainement afin que vous voyez les différentes fonctionnalités de ce portail ! Qui va encore évoluer, car pour le moment il est encore en preview !

Déployer vos sites Wordpress en 2 clic, un peu d’attente, et un café à la main, est maintenant possible grâce à la nouvelle fontionnalité Web Site, avec une gallery disponible, qui ressemble beaucoup à ce qui est disponible sur Web Platform Installer

![image]({{ site.url }}/images/2012/06/08/windows-azure-sdk-17-et-un-nouveau-portail-dadministration-img1.png "image")

Il est de plus maintenant très facile de faire de l’intégration continue avec la plateforme Azure, grâce à TFS, GIt ou même un simple FTP, on y reviendra plus tard, mon blog sera je pense mon premier projet à bénificier de cette fonctionnalité !

La disponibilté d’un stockage durable via des disques virtuels rapidement accessibles est dorénavant possible, il est donc possible d’héberger facilement votre propre Sql Server sur Azure, ainsi que des bases de données MySql !

Si avec toutes ces nouveautés, vous ne voulez toujours pas passer sur Azure, je vous conseille de venir le 20 juin au [Dev Camp Microsoft](https://msevents.microsoft.com/CUI/EventDetail.aspx?EventID=1032513192&Culture=fr-FR) pour poser toutes vos questions !
