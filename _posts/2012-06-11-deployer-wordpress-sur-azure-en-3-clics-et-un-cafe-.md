---
layout: post
title: Déployer Wordpress sur Azure en 3 clics et un café !
date: 2012-06-11
categories: [ "Azure", "Web App" ]
comments_id: 130 
---

Suite à toutes les nouveautés de la plateforme Windows Azure sortie en ce début juin, il y en a une que j’apprécie tout particulièrement, c’est la partie Web Sites, que vous pouvez retrouver sur le tout nouveau portail Azure : [http://manage.windowsazure.com](http://manage.windowsazure.com)

On remarquera au passage, que Silverlight a disparu, et que ça y est vous pouvez y accéder sans à avoir à installer Silverlight !

![image]({{ site.url }}/images/2012/06/11/deployer-wordpress-sur-azure-en-3-clics-et-un-cafe--img0.png "image")

Bon et sinon, à quoi ça sert, avant le 7 juin, quand je voulais faire un site web, je créais un nouveau rôle Azure, et c’est parti pour de l’ASP.Net, ou tout autre langage supporté par Windows Azure ! Alors certes c’était pratique on avait la main sur tout ce qui se passait, mais si on voulait installer Wordpress, par exemple, on avait en gros cela à faire : [http://www.siteduzero.com/tutoriel-3-519694-deployer-wordpress-sur-windows-azure.html](http://www.siteduzero.com/tutoriel-3-519694-deployer-wordpress-sur-windows-azure.html "http://www.siteduzero.com/tutoriel-3-519694-deployer-wordpress-sur-windows-azure.html") (si le tutoriel n’est pas mis à jour)

* Création du serveur SQL Azure
* Création de la base de données SQL Azure
* Création du compte de stockage
* Téléchargement  & configuration de [Windows Azure Companion](http://archive.msdn.microsoft.com/azurecompanion)
* Déploiement sur Azure
* Installation de Wordpress
* Configuration de Wordpress

Bon ce n’était pas les 12 travaux d’Astérix, mais en gros le blog n’était pas en ligne avant une petite demi journée, si on n’a rien oublié !

Bref, maintenant c’es fini, il suffit d’aller dans la partie Web Site, faire New > From Gallery et choisir Wordpress, ou autre chose, la galerie contient aussi Drupal, Orchad

![image]({{ site.url }}/images/2012/06/11/deployer-wordpress-sur-azure-en-3-clics-et-un-cafe--img1.png "image")

Il vous suffit ensuite de donner un nom à votre blog, définir dans quel datacenter, vous voulez l’héberger, et utiliser une base de données MySQL existante ou en créer une nouvelle.

![image]({{ site.url }}/images/2012/06/11/deployer-wordpress-sur-azure-en-3-clics-et-un-cafe--img2.png "image")

Ensuite, configuration du MySQL, soit lui donner un joli nom, et dire ou on le déploie

![image]({{ site.url }}/images/2012/06/11/deployer-wordpress-sur-azure-en-3-clics-et-un-cafe--img3.png "image")

Alors là il vous suffit de prendre un café, je vous conseille un expresso, que vous avez préparer à l’avance, car ça déploie le tout en 1 à 2 minutes, qui a dit que déployer Wordpress sur Azure ça prenait 1/2 journée !

Et voilà, vous avez dorénavant un joli site Wordpress sur Azure, avec une interface d’administration, et un blog par la suite !

![image]({{ site.url }}/images/2012/06/11/deployer-wordpress-sur-azure-en-3-clics-et-un-cafe--img4.png "image")

Bref, pour ma part j’avais un Wordpress chez Ikoula avant la refonte de mon blog en .Net, et vous mettez autant de temps à créer votre blog, sauf que derrière vous avez la puissance du Cloud !

Nous verrons dans un autre article, comment le nouveau portail nous permet de gérer nos instances déployés en tant que Web Sites.
