---
layout: post
title: Service Fabric 6.4 - Récupérer les évènements via les REST API
date: 2019-01-11
categories: [ "Azure", "Service Fabric" ]
comments_id: 157 
---

Dans la dernière version de Service Fabric, il y a une nouveauté qui est arrivée sur les clusters, il s'agit bien entendu de l'apparition de l'onglet **Events** qui est disponible sur toutes les pages de votre cluster.

On peut le voir ci-dessous sur mon cluster local :

![image]({{ site.url }}/images/2019/01/11/service-fabric-64-recuperer-les-evenements-via-les-rest-api-img0.png "image")

Dans cet onglet on y retrouve tout ce qu'on a toujours voulu trouver concernant l'historique de l'état de votre cluster Service Fabric. Plus bessoin donc d'aller dans les archives du Table Storage liées aux diagnostics.

Voici, un exemple de ce que l'on peut retrouver sur les évènements liés à un noeud :

![image]({{ site.url }}/images/2019/01/11/service-fabric-64-recuperer-les-evenements-via-les-rest-api-img1.png "image")

Bien que ce soit disponible via le Service Fabric Explorer, il n'existe pas à ce jour de commande Powershell qui récupère ces informations.

Vu que l'explorer se base sur des REST API, il est possible pour vous aussi de récupérer les mêmes informations via la REST API.

Voici l'url qui est appelée pour afficher vos events :
**<http://localhost:19080/EventsStore/Nodes/_Node_0/$/Events?starttimeutc=2018-12-14T23:00:00Z&endtimeutc=2018-12-17T11:06:00Z&api-version=6.4>**

On retrouve donc les éléments suivants :

- L'endpoint web de votre cluster : **<http://localhost:19080/>**
- Le path de la ressource : **/Nodes/_Node_0/**
- Le service utilisé : **/$/Events**
- Les paramètres utilisés en GET : **starttimeutc=2018-12-14T23:00:00Z&endtimeutc=2018-12-17T11:06:00Z&api-version=6.4**

Il est possible de retrouver les différentes API disponibles à cette url : [https://docs.microsoft.com/en-us/rest/api/servicefabric/sfclient-index-eventsstore](https://docs.microsoft.com/en-us/rest/api/servicefabric/sfclient-index-eventsstore)
