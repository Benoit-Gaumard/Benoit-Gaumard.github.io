---
layout: post
title: C# et les générics
date: 2009-03-21
categories: [ "Divers" ]
comments_id: 9 
---

Au cours de mes différents développements, j'ai souvent eu besoin d'utiliser des méthodes ou des classes génériques afin de gagner en lisibilité du code, et surtout au niveau du nombre de ligne de code.

Et sur ce sujet on me pose souvent deux questions :

* Comment donner la valeur null à un type générique, puisque si le type en question n'est pas nullable, on aura une erreur à l'exécution.
* Comment caster un objet en type T.

Alors déjà pour caster un objet en type T, on ne peut bien entendu ne pas faire : liste.add((T)elt) ;

Ce qu'il faut faire c'est changer le type de l'objet via cette méthode :

```csharp
liste.Add((T)Convert.ChangeType(elt, typeof(T)));  
```

Maintenant comment donner la valeur null à un objet de type générique, techniquement, on ne peut pas faire ceci, à cause de l'erreur ci-dessous.

![alt]({{ site.url }}/images/2009/03/21/c-et-les-generics-img0.png)

En effet, imaginons que T soit de type int, et bien il est « non-nullable ». On peut donc lui assigner une valeur par défaut à la place de le mettre toujours null.

```csharp
T t = default(T);  
```

En effet dans le cas, ou T est « non-nullable » comme avec un type int, la variable t prendra la valeur 0. Si le type est String, alors t vaudra null.

De plus, ce qui est très utile pour les développeurs lors de la conception de leur programme, on peut rajouter sur les déclarations des méthodes, ou des classes une condition à la généricité.

```csharp
internal Boolean CheckElement<T>(ref T output) where T : BaseElement  
```

Par exemple dans ce cas, on ne pourra se servir de la fonction CheckElement, si, et seulement si, T dérive de BaseElement (ici une classe abstraite du projet), donc tout autre type d'objets passé à la méthode empêche la compilation, ce qui peut s'avérer utilise si l'on veut par la suite utiliser des méthodes ou des attributs de la classe BaseElement.
