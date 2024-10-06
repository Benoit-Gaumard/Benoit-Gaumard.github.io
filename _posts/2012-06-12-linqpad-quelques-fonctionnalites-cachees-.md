---
layout: post
title: LinqPad - Quelques fonctionnalités cachées !
date: 2012-06-12
categories: [ "Outils" ]
comments_id: 87 
---

J’avais publié il y a bien longtemps un [article](http://blog.woivre.fr/Archives/2009/9/linqpad-lediteur-linq-par-excellence) sur le logiciel LinqPad, comme quoi c’était un des must have à avoir pour tout développeur !

Alors à force de l’utiliser, j’ai enfin trouvé quelques fonctionnalités que je trouve fort utiles, et qu’on ne trouve pas dans les exemples de bases !

La première, LINQPad, votre nouvel fenêtre de commande.

![image]({{ site.url }}/images/2012/06/12/linqpad-quelques-fonctionnalites-cachees--img0.png "image")

Vous pouvez donc lancer vos commandes depuis LINQPad, vos “iisreset”, et tout ce que vous voulez !

Et ce n’est pas fini ! En tant que commande, vous pouvez aussi saisir des valeurs durant l’exécution de votre programme

![image]({{ site.url }}/images/2012/06/12/linqpad-quelques-fonctionnalites-cachees--img1.png "image")

Donc les ConsoleApplication1 à infini, c’est totalement fini, si maintenant vous pouvez même saisir des valeurs dans cet outil !

Bon la console c’est bien jolie, mais un peu de html, c’est encore plus, c’est aussi possible de customiser vos textes de sorties via la méthode Util.RawHtml

![image]({{ site.url }}/images/2012/06/12/linqpad-quelques-fonctionnalites-cachees--img2.png "image")

il est donc possible de configurer vos sorties de résultats de programme via LinqPad, afin d’y ajouter un peu d’HTML afin que ce soit plus lisible !

Et pour ceux que ça intéresse, il est aussi possible d’afficher une page web dans la fenêtre de résultat !

![image]({{ site.url }}/images/2012/06/12/linqpad-quelques-fonctionnalites-cachees--img3.png "image")

Voilà, alors comment j’ai trouvé ces features, puisque je cherchais à ajouter du HTML dans ma fenêtre de sortie afin de créer un rapport sur les nouveautés des API REST Azure ! Il faut suffit d’utiliser Reflector, ou un outil du genre, et de désassembler l'assembly de LinqPad, et vous allez trouver la classe Util !

Bon je ne dis pas que maintenant vous pouvez vous abstenir de Visual Studio, mais bon ça ne devient pas loin quand vous devez faire du code jetable !
