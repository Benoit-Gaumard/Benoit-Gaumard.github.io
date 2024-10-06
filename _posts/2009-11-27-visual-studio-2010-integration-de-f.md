---
layout: post
title: Visual Studio 2010 - Intégration de F#
date: 2009-11-27
categories: [ "Divers" ]
comments_id: 34 
---

Alors je suppose que vous êtes au courant, Visual Studio 2010 supporte en natif depuis ces premières versions le langage F#.

Basé sur le langage Caml, il intègre toutes les supers fonctionnalités de la plateforme .Net. Enfin bref, aucune démonstration ici, mais je voulais vous montrer un élément à Visual Studio bien utile quand vous voulez jouer un peu avec le F#.

Je suppose donc que comme moi, lorsque vous avez commencé le C#, vous deviez regretter de devoir à chaque fois compiler, lancer votre jolie application console, et attendre le résultat, qui généralement n’était pas le bon ! (Souvenirs, souvenirs …) Vous auriez je pense avoir une joli fenêtre interactive afin de construire votre application pas à pas, mais tout en vérifiant rapidement vos données.

Alors F# et Visual Studio apporte cela, en effet dans les nouvelles fenêtres de notre outil de développement, on peut voir apparaître “F# Interactive” :

![image]({{ site.url }}/images/2009/11/27/visual-studio-2010-integration-de-f-img0.png "image")

Cette fenêtre a toujours été en fait mon rêve, pouvoir rapidement coder et tester en même temps sans à avoir à créer un projet console appelé “ConsoleApplication142”

Alors comment ça marche maintenant, dans votre fenêtre vous pouvez écrire tout code F# que vous voulez tester, par exemple :

![image]({{ site.url }}/images/2009/11/27/visual-studio-2010-integration-de-f-img1.png "image")

On voit donc ici, la création d’une méthode square qui prend une valeur en paramètre, et qui retourne le carré de celle-ci, puis un appel afin de tester.

Mais très important, on peut voir aussi que la fenêtre F# Interactive retient bien la méthode square en mémoire, pour d’éventuel appel, et donc on peut vraiment tester, ou apprendre le F# au pas à pas.

Voilà, j’essayerai de vous publier divers articles sur la technologies F#, qui m’a l’air très intéressante, et qui je pense peut avoir un bel avenir dans la recherche, calcul algorithmique, et bien entendu les mathématiques.
