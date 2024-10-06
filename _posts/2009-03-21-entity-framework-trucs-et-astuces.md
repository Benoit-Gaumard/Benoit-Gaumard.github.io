---
layout: post
title: Entity Framework - Trucs et astuces
date: 2009-03-21
categories: [ "Divers" ]
comments_id: 10 
---

Un article sur les trucs et astuces avec Entity Framework puisqu'après tout c'est la méthode d'accès aux données que je préfère, donc je vais vous en faire profiter. Dans cet article pas de code source au final, juste divers morceaux de codes et screenshots. Avant la base de données de démos :

![]({{ site.url }}/images/2009/03/21/entity-framework-trucs-et-astuces-img0.png)

Comme vous pouvez le voir, c'est les tables « Orders » et « Order_Details » de la base Northwind. Utilisation des classes partielles : Donc comme vous le savez si vous avez fait du Merise, dans une base de données on ne doit mettre aucunes données calculées. C'est-à-dire que pour une commande, on n'a pas de champ « Total », vu qu'en fait c'est la somme des (prix article * nombre d'exemplaire), c'est donc pour cela que dans notre base de données nous n'avons pas le total. Cependant on peut utiliser les classes partielles pour ajouter cette fonctionnalité à notre code. Pour cela il faut rajouter dans le **même namespace** que le fichier edmx une classe partielle « Orders ». Voici par exemple un code que l'on pourrait voir : namespace ApplicationConsole1

```csharp
public partial class Orders

{

    public decimal Total
    {
        get { return Order_Details.Sum(n => n.Quantity * n.UnitPrice); }
    }
}
```

Et donc grâce aux classes partielles, nous obtenons :

![]({{ site.url }}/images/2009/03/21/entity-framework-trucs-et-astuces-img1.png)  
Voilà j'espère que cette astuce vous fera gagner du temps dans vos prochains développement, en tout cas moi j'en use et en abuse. De plus, les classes partielles sont aussi présentes dans le dbml de Linq To Sql !
