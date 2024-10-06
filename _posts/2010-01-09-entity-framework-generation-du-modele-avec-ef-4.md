---
layout: post
title: Entity Framework - Génération du modèle avec EF 4
date: 2010-01-09
categories: [ "Divers" ]
comments_id: 38 
---

Pendant que j’étais en train de préparer une future présentation pour Expertime, je me suis aperçu que lors de la création du modèle Entity Framework il me proposait une option à laquelle je n’avais pas fait attention auparavant.

![image]({{ site.url }}/images/2010/01/09/entity-framework-generation-du-modele-avec-ef-4-img0.png "image")

J’ai donc crée deux modèles à partir de la base NorthWind, l’un avec l’option activée, et l’autre sans, afin de pouvoir comparer.

Je me suis donc aperçu, que comme son nom l’indique cette option nomme automatiquement les objets de la base en fonction de leurs pluralités. En effet, la table “Employees” sera représenter par un objet “Employee”, et la liste des “Orders” sera représentée par la propriété de navigation “Orders”.

Cette option est je pense bien pratique, vu le nombre de fois ou je renomme tout dans mon modèle juste pour enlever des ‘s’. Par contre, je n’ai pas testé sur Visual Studio 2010 FR + SQL Server 2008 FR, mais j’espère que pour ceux qui préfèrent cette configuration que cela marche aussi.
