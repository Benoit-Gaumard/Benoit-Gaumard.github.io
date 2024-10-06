---
layout: post
title: Migrer une application WPF en Silverlight grâce au MVVM
date: 2009-06-07
categories: [ "Divers" ]
comments_id: 17 
---

Si vous êtes comme moi développeur WPF et Silverlight, on a souvent du vous dire: “mais c’est facile si tu sais faire l’un, l’autre c’est la même chose”. Or nous savons tous que c’est faux, il y a certes certains points similaires, mais ça ne fait pas tout puisque Silverlight c’est pour le Web et donc beaucoup plus limité que WPF tant au niveau des ressources disponibles que des composants, de la possibilité de Binding … Enfin tant de choses qui les différencient que toutes les énumérer serait un peu trop long.

Enfin, clairement on ne peut pas vraiment migrer une application WPF en Silverlight totalement, cependant il serait tout de même bien qu’en parti on puisse migrer une partie. Clairement le Model et son accès, ce n’est pas possible vu que Silverlight s’exécute dans une “Sandbox” on n’a pas accès au model. Vous pouvez tout de même y accéder via plusieurs méthodes que j’ai présenté précédemment. Maintenant la vue, vu ce que j’ai dis précédemment entre les différences entre Silverlight et WPF il est difficilement envisageable de migrer en 2 clics la vue entre ces types d’application. Il nous reste donc le ViewModel que l’on peut réutiliser en WPF ou en Silverlight, vu que comme je vous l’ai présenté dans un ancien poste, il contient des données, des DependencyProperty pour les injecter dans la vue, et bien entendu diverses actions appelées par la vue. Nous allons donc essayer de les migrer … A première vue, on ne peut pas vraiment référencer le projet contenant les ViewModel depuis Silverlight, donc on a une autre solution qui serait de copier le contenu de chacun des ViewModel dans un projet Silverlight ou alors même d’ajouter notre fichier “.cs” à notre application tel quel. Mais cela voudrait dire que pour chaque modification de notre ViewModel pour notre application WPF, nous serions obligé de faire la même en Silverlight, ce qui n’est certes pas pratique.

Cependant les concepteurs de Visual Studio ont pensé à nous, lorsque l’on ajoute un élément existant à notre application il est possible de l’ajouter comme lien vers le fichier en question, comme on peut le voir ci-dessous.

![image]({{ site.url }}/images/2009/06/07/migrer-une-application-wpf-en-silverlight-grace-au-mvvm-img0.png "image")

Cela nous permet donc de modifier les 2 ViewModel sélectionnés dans n’importe laquelle des deux applications.

Bien entendu, si vous avez déjà utilisé ce genre d’ajout, vous savez qu’il y a aussi beaucoup de contraintes, entre autre le fait que les deux projets doivent référencer les mêmes assembly afin de pouvoir fonctionner dans les deux cas.

De plus, en Silverlight ayant accès à beaucoup moins de choses qu’en WPF, si vous créez un projet avec ce principe, il faut que votre application WPF d’origine n’utilise pas des accès direct à la base de données, il vaut mieux passer par un Web Service commun pour vos deux applications afin que votre application WPF soit isolée par rapport à votre base de données.

Bon après tout cette littérature, je vais vous montrer succinctement un projet WPF que j’ai migré en Silverlight pour votre plus grand plaisir. Donc voici avant tous les différents projets :

![image]({{ site.url }}/images/2009/06/07/migrer-une-application-wpf-en-silverlight-grace-au-mvvm-img1.png "image") Le projet Helix et un projet Silverlight qui aide entre autre pour la navigation au sein d’un projet Silverlight, il n’a pas été créé par moi mais vous pouvez voir plus d’infos sur ce projet sur ce [lien](http://blogs.msdn.com/dphill/archive/2008/10/07/silverlight-navigation-part-1.aspx).

Bon comme vous pouvez le voir pour les autres projets, on va parler un peu Flux RSS là ! L’application a pour rôle d’afficher diverses personnes en base de données, puis après sélection on va récupérer les derniers posts de leurs blogs pour les afficher, je n’ai pas mis de lien lors d’un clic sur le titre d’un post, mais je vous laisse le faire par la suite …

Donc nous avons nos deux projets en Silverlight et WPF qui sont respectivement “MVVM.RSS.SL” et “MVVM.RSS”, les autres projets sont le service WCF, le modèle de base de données, et un projet de dépôt avec une Factory pour les différents types de données.

Dans cet article je ne vais pas rentrer dans l’implémentation du code puisque j’ai déjà abordé cette partie dans un autre post. Mais juste pour vous montrer le projet Silverlight contient les différents “ViewModel” du projet WPF en étant ajouté comme lien.

![image]({{ site.url }}/images/2009/06/07/migrer-une-application-wpf-en-silverlight-grace-au-mvvm-img2.png "image")

![image]({{ site.url }}/images/2009/06/07/migrer-une-application-wpf-en-silverlight-grace-au-mvvm-img3.png "image")

La démonstration :[![image]({{ site.url }}/images/2009/06/07/migrer-une-application-wpf-en-silverlight-grace-au-mvvm-img4.png "image")](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/MVVM.RSS.zip) Vous pouvez voir que la partie Silverlight pour les flux RSS ne marche pas avec les liens fournis, puisqu’ils n’ont pas les fichiers XML pour autoriser l’accès aux flux RSS via Silverlight …

Pour une fois je vais conclure sur cet article, j’ai en réalité créé cet article sur un coup de tête puisque le projet initial en MVVM/WPF était pour [mon premier post sur le MVVM](http://wilfriedwoivre.wordpress.com/2009/05/18/le-design-pattern-mvvm/), mais certaines circonstances furent telles que je ne pus le poster.

J’ai donc décidé de réaliser ce post puisque je savais qu’il était possible d’effectuer ce genre de manipulation. Néanmoins la réalisation de la migration en utilisant des fichiers “.cs” d’un projet WPF est assez ardue, du moins avec ma façon de concevoir le MVVM. Cela est dû entre autre à l’architecture de l’application qui est légèrement différente, mes contrôles ne passent pas directement par un ControlBase, mais via une classe intermédiaire puisque le XAML en Silverlight ne prends pas les arguments en compte dans le constructeur.De plus, les DependencyProperty en Silverlight et WPF sont légèrement différentes, je ne pouvais donc pas les utiliser pour les deux applications en mêmes temps. Je n’ai pas regardé si ces diverses différences sont moins importantes en Silverlight 3, ça sera peut être l’intitulé d’un autre post.

Enfin bref, divers problèmes, je pense donc que la migration d’un projet WPF en Silverlight peut s’avérer longue et ardue et il peut être plus rapide de reprendre entièrement un nouveau projet en Silverlight surtout si ce n’est pas vous qui avez réalisé celui en WPF. Je ne vous donne néanmoins pas de chiffres, puisque j’avais beaucoup de morceaux de code déjà fait, donc c’est toujours plus rapide. A près, il faudrait voir si cela serait rentable de réaliser les deux applications en parallèle afin de permettre une plus grande visibilité de votre application finale.
