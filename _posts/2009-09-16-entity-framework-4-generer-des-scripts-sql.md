---
layout: post
title: Entity Framework 4 - Générer des scripts Sql
date: 2009-09-16
categories: [ "Divers" ]
comments_id: 27 
---

/\* Ce post a été écrit avec la version Visual Studio 2010 Beta et la CTP1 d’Entity Framework, il se peut donc qu’il ne soit plus valable lorsque vous le lirez */

Dans la version actuelle du Framework, soit la 3.5 SP1, Microsoft nous a offert Entity Framework qui est certes très puissants, mais tout de même incomplet au niveau de certaines fonctionnalités. Bien entendu, je pense à la création du script Sql ou de la base de données associée au schéma que nous avons créé. Heureusement la version 4 approchant à grand pas, avec son lot de fonctionnalité pour nous faciliter la vie, surtout sur ce point de vue.

Avant tout vous pouvez télécharger la version de EF4 CTP1 à cette adresse : [http://www.microsoft.com/downloads/details.aspx?displaylang=en&FamilyID=7fd7164e-9e73-43f7-90ab-5b2bf2577ac9](http://www.microsoft.com/downloads/details.aspx?displaylang=en&FamilyID=7fd7164e-9e73-43f7-90ab-5b2bf2577ac9 "http://www.microsoft.com/downloads/details.aspx?displaylang=en&FamilyID=7fd7164e-9e73-43f7-90ab-5b2bf2577ac9")

Et il vous faudra bien entendu Visual Studio 2010 Beta et un Sql Serveur 2008 pour que cette fonctionnalité puisse fonctionner correctement. N’oublions pas que c’est une CTP, nous n’avons qu’à espérer qu’il supporte aussi les anciennes versions de Sql (2000 & 2005)

Alors commençons par créer une application console afin d’effectuer cette démonstration, puis rajoutons notre fichier edmx en utilisant un modèle vide. Nous avons donc le designer de notre fichier vierge, ou nous pouvons ajouter les éléments que l’on souhaite. On va donc créer ici nos différents objets que l’on se servira dans notre application.

Alors prenons un modèle assez simple tel que celui ci :

![image]({{ site.url }}/images/2009/09/16/entity-framework-4-generer-des-scripts-sql-img0.png "image")

On peut donc voir une relation n-aire entre des employés et leur entreprise, de plus on voit ici l’apparition du champ Adresse qui est un type complexe que j’ai crée comme on peut le voir dans ces propriétés :

![image]({{ site.url }}/images/2009/09/16/entity-framework-4-generer-des-scripts-sql-img1.png "image")

Ce champ complexe contient divers autres champs. Cette possibilité aussi arrivé avec EF4 vous permettra d’extraire différents champs communs à vos tables afin de créer un objet associés à ceux ci sans pour autant à avoir à créer une table pour ceux ci. Comme typiquement ce champ adresse qui peut se retrouver aussi bien chez un contact, un employé, une entreprise, un fournisseur et qui pourtant n’a aucun lieu dans le modèle à être séparé de ces tables. ![image]({{ site.url }}/images/2009/09/16/entity-framework-4-generer-des-scripts-sql-img2.png "image")

Maintenant que nous nous sommes crée notre schéma qui va bien, que nous avons modifié certaines propriétés de notre modèle, tel que par exemple notre Entity Set Name, nous pouvons passer à la génération du script. Donc comme je l’aime bien dans Visual Studio, cette opération se trouve fortement complexe, et n’est pas disponible à ceux qui ne fouillent pas dans l’application. Mais sinon faites un clic droit et “Generate Database Script from Model …”

![image]({{ site.url }}/images/2009/09/16/entity-framework-4-generer-des-scripts-sql-img3.png "image")

Donc après vous avoir choisi votre base de données, il vous génère votre fichier sql , il ne vous reste plus qu’à l’exécuter et vérifier le résultat :

![image]({{ site.url }}/images/2009/09/16/entity-framework-4-generer-des-scripts-sql-img4.png "image")

On voit donc bien nos deux tables avec notre type complexe inclus à l’intérieur de chacune d’elle.

Alors pour conclure, on peut dire que cette possibilité de génération était une chose tant attendu à Entity Framework, puisque effectivement ça manquait encore à sa panoplie de compétence. Mais ceci est réglé à présent ! De plus, cela peut permettre de construire des bases de données avec une notion beaucoup plus objets grâce aux types complexes ! Cette nouvelle mouture d’Entity Framework correspond bien à l’ancienne, innovante, pratique, et bientôt indispensable pour toutes les applications.
