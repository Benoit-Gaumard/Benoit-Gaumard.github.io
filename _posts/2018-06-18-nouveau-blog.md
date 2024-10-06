---
layout: post
title: Nouveau blog
date: 2018-06-18
categories: [ "Divers" ]
comments_id: 136 
---

Et voilà, j'ai encore migré mon blog. En même temps ça ne sera que la 2ème fois depuis sa création.

Petit historique pour ceux qui ne savent pas :

* Création en 2009 sur un Wordpress hébergé gratuitement sur leur plateforme
* Migration en 2012 vers Azure avec une solution basée sur les services suivants :
  * Azure Table Storage : pour les métadonnées des articles
  * Azure Blob Storage : pour les articles et les images
  * Azure CDN : parce que plus vite c'est toujours mieux
  * Azure Cloud Services : pour l'hébergement des services, les Web Apps n'existaient pas à l'époque
  * Le tout réalisé en full custom en C# par mes soins
  * Et une absence totale de backend, j'alimentais les articles via Open Live Writer.
* Nouveau blog basé sur Jekyll et hébergé sur Github

Alors la seule constante dans ces 3 moutures de blog c'est bien entendu que le design est toujours aussi peu travaillé.

J'ai migré sur cette nouvelle mouture pour plusieurs raisons :

* Arrêter d'utiliser Open Live Writer, c'est un bon produit, mais c'est un client lourd, et qui tourne que sur Windows
* Plus de code à gérer lorsque je veux implémenter une nouvelle fonctionnalité ou faire un fix rapide.
* Fini les galères à colorer le code, le Markdown c'est bien plus simple qu'une extension Visual Studio qui génère un HTML approximatif.

Et la dernière raison, qui est celle qui m'a fait mettre cette migration en priorité, c'est qu'à partir de début juillet 2018 je ne serai plus MVP Azure. J'ai perdu le titre car j'ai clairement un manque de contribution public ces dernières années où je n'ai pas assez fait la part des choses entre mon investissement privé chez mes clients, et mes investissements publics.

Cependant ceux qui me suivent, savent qu'en ce moment j'écris des articles et je suis assez régulièrement en meetup, parce que j'ai envie de continuer l'aventure en tant que MVP. Pour moi cette distinction apporte énormément aussi bien en terme professionnel que personnel, je vais donc continuer à partager ce que je sais au sein d'évènements communautaires et tâcher de récupérer ce titre.
