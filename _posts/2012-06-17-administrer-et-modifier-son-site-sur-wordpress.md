---
layout: post
title: Administrer, et modifier son site sur Wordpress
date: 2012-06-17
categories: [ "Azure", "Web App" ]
comments_id: 131 
---

On a vu dans un article précédent, comment déployer Wordpress sur Azure en quelques clics, et très peu de temps, si vous ne savez toujours pas comment faire, voici un peu de [lecture](http://blog.woivre.fr/Archives/2012/6/deployer-wordpress-sur-azure-en-3-clics-et-un-cafe-)

Commençons déjà par nous rendre sur le nouveau portail Windows Azure, puis dans la partie Web Sites, choisissez votre site fraichement déployé. On peut donc voir ci dessous, le tableau de bord de notre application.

![image]({{ site.url }}/images/2012/06/17/administrer-et-modifier-son-site-sur-wordpress-img0.png "image")

Ce tableau de bord, nous permet donc de rapidement visualiser les ressources utilisées par son site internet au niveau de notre instance. Ici par exemple on voit que mon Wordpress ne prend que 13,20Mb de place sur les 1024 qui me sont attribués.

Il est possible de voir aussi les différentes informations de monitoring récupérés sur notre site, comme par exemple le temps CPU, il est possible de configurer les données affichées dans ce graphique dans l’onglet Monitor, il est possible de rajouter des compteurs sur les différents types d’erreurs http, ou les requêtes effectuées avec succès sur notre site.

La partie de configuration nous permet de configurer les différents frameworks installés comme la version de .Net disponibles, et si PHP est activé. Il est possible de gérer aussi l’activation des logs, et on peut gérer les différentes clés de configuration associé au site.

Maintenant la partie qui me semble le plus intéressant, c’est la partie liée à la montée en charge de votre site :

![image]({{ site.url }}/images/2012/06/17/administrer-et-modifier-son-site-sur-wordpress-img1.png "image")

En effet, c’est via cette interface qu’il est possible de soit utilisé des instances réservés ou des instances partagées, en gros c’est hébergement dédié ou mutualisé ! Il est d’ailleurs possible de mettre jusqu’à 3 instances de votre site en mode partagé.

Le dernier onglet quand à lui nous permet de voir les ressources liées à notre instance, donc ici notre base de données mysql.

Maintenant qu’on a vu ce qu’apporte le portail dans le management de notre site internet, il faut savoir qu’il est aussi possible de modifier notre site via WebMatrix, il suffit pour cela de cliquer sur le bouton WebMatrix dans le menu en bas du tableau de bord. Cela aura pour effet de configurer automatiquement votre WebMatrix afin qu’on puisse éditer simplement notre site.  Il installe par ailleurs une copie locale de notre environnement (mysql …) afin d’effectuer des tests sur notre machine.

![image]({{ site.url }}/images/2012/06/17/administrer-et-modifier-son-site-sur-wordpress-img2.png "image")

Il est possible par la suite de modifier, le contenu du site, par exemple le thème en y ajoutant du code personnel, comme si dessus au dessus de chaque article :

![image]({{ site.url }}/images/2012/06/17/administrer-et-modifier-son-site-sur-wordpress-img3.png "image")

Après avoir validé que vos modifications marchent en local, vous pourrez, effectuer une publication de votre site. Et comme on peut le voir ci dessous, il est possible de faire un package différentiel, et de ne pas redéployer l’intégralité du site à chaque fois

![image]({{ site.url }}/images/2012/06/17/administrer-et-modifier-son-site-sur-wordpress-img4.png "image")

Dernière bonne nouvelle, la publication est aussi rapide que le déploiement du site, à condition que vous aillez une connexion supérieure à 56K !
