---
layout: post
title: Intégration continue sur Windows Azure grâce à TFS Preview
date: 2012-06-20
categories: [ "Azure", "Azure DevOps" ]
comments_id: 132 
---

Depuis l’arrivée du nouveau portail Windows Azure qui se trouve toujours à cette url : [https://manage.windowsazure.com](https://manage.windowsazure.com) il est possible de mettre simplement un système d’intégration continue pour héberger votre application sur Windows Azure, que ce soit un service hébergé, ou un Site Web. Il est possible  d’intégrer le système d’intégration continue soit avec TFS Preview, Git ou alors via FTP, dans notre cas, nous allons utiliser TFS Preview, puisque la solution de mon blog est dessus, et autant se servir d’un cas pratique !

Pour mettre en place l’intégration continue pour votre projet, il faut tout d’abord avoir votre projet dans TFS Preview, puis sur le portail Windows Azure, sur le tableau de bord, il est possible de voir sur la droite un bouton “Set up TFS publishing” comme on peut le voir ci-dessous

![image]({{ site.url }}/images/2012/06/20/integration-continue-sur-windows-azure-grace-a-tfs-preview-img0.png "image")

Pour configurer votre TFS Preview, il vous faut donc donner l’url de votre TFS Preview comme on peut le voir sur cette interface :

![image]({{ site.url }}/images/2012/06/20/integration-continue-sur-windows-azure-grace-a-tfs-preview-img1.png "image")

Notez qu’il est possible de se créer un nouveau compte sur TFS Preview depuis cette interface. Par la suite vous devez sélectionner le projet que vous voulez lier à votre service Azure. Voilà pour le côté Azure, il est cependant à noter que si vous avez créer votre Team Project sur TFS Preview après le 7 juin, il est possible que cela échoue puisqu’il manque le fichier “AzureContinuousDeployment.11.xaml” dans vos Build Template disponible sur votre projet, si c’est le cas vous pouvez le télécharger sur cette [url](http://blogs.msdn.com/cfs-file.ashx/__key/communityserver-components-postattachments/00-10-31-60-27/AzureContinuousDeployment.11.xaml), ajouter le à vos templates de Build de vos projets, puis suivez le reste de cet article et revenez ensuite à la configuration dans Windows Azure afin que celle-ci soit fonctionnelle.

Donc, retournons à Visual Studio, et configurons notre template de build, pour cela dans le volet Team Explorer, il faut faire “New Build Definition” comme on peut le voir ci-dessous

![image]({{ site.url }}/images/2012/06/20/integration-continue-sur-windows-azure-grace-a-tfs-preview-img2.png "image")

Sur l’écran général, vous allez choisir le nom de la build, puis dans la partie trigger vous allez pouvoir choisir quand se déclenche votre build, notez que l’intégration continue se fait à chaque check in ! Cependant il est possible de choisir un autre type de fréquence.

![image]({{ site.url }}/images/2012/06/20/integration-continue-sur-windows-azure-grace-a-tfs-preview-img3.png "image")

Maintenant il nous faut réellement configurer la partie Azure, c’est à dire dans le process de build, il faut définir notre template, notre projet, ainsi que notre slot de déploiement ciblé comme on peut le voir ci-dessous :

![image]({{ site.url }}/images/2012/06/20/integration-continue-sur-windows-azure-grace-a-tfs-preview-img4.png "image")

Et voilà après quelques builds, on peut voir directement sur le portail Azure, les différents déploiements qui ont été effectués

![image]({{ site.url }}/images/2012/06/20/integration-continue-sur-windows-azure-grace-a-tfs-preview-img5.png "image")

L’avantage de voir les anciens déploiements, c’est qu’il est possible de redéployer une build précédente sur la plateforme sans avoir à redéployer !

Voilà, encore une des nouvelles fonctionnalités de Windows Azure qui prouve que Microsoft l’intègre de plus en plus dans son envrionnement !
