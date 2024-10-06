---
layout: post
title: Trucs et astuces - Le débuggeur Visual Studio
date: 2009-10-01
categories: [ "Divers" ]
comments_id: 29 
---

Alors je suppose que comme tout le monde qui passe par ici, vous devez utiliser comme IDE Visual Studio, cet outil que vous trouvez probablement magique, tant au point de vu de la facilité d’utilisation, et surtout à l’utilitaire de Debug intégré en natif à cet IDE. Mais connaissez-vous toutes les possibilités que vous avez sur ce logiciel, sûrement que non. Et moi aussi d’ailleurs, et pourtant j’ai beau l’utiliser tous les jours, je ne suis même pas sûr d’utiliser plus de 50% de ces capacités. Alors, je voulais vous faire partager une petite astuce qui je pense vous simplifieras grandement la vie, du moins pendant vos longues heures de debuggage. Il s’agit de personnaliser l’affichage de votre debuggeur dans vos fenêtres espions. En effet, je suppose, que vous êtes comme moi susceptibles de créer vos propres classes, si ce n’est pas le cas, un cours sur la POO ne vous ferait pas de mal, enfin bref, du coup, par défaut vos espions ressemblent souvent à ceci : ![image]({{ site.url }}/images/2009/10/01/trucs-et-astuces-le-debuggeur-visual-studio-img0.png "image") Bon là comme on voit, malgré le fait que l’on sache ce que contient les objets p1 et p2 vu que c’est écrit au dessus, il sera tout de même pratique de faire comme pour la liste de personnes afficher des éléments de l’objet Personne afin d’avoir rapidement un aperçu de celui dans notre débuggeur. Et bien heureusement, Visual Studio est là pour nous aider, il nous faut ajouter cet attribut à la classe Personne :

```csharp
[DebuggerDisplay("Nom : {Nom}, Prénom : {Prenom}")]
public class Personne {
    public String Nom { get; set; }
    public String Prenom { get; set; }
    public int Age { get; set; }
}
```

Alors notre chaine de caractère en attribut permet d’afficher les valeurs des propriétés Nom et Prenom dans notre débuggeur. La syntaxe est assez simple, il faut écrire “{PropertyName}” pour afficher la valeur de PropertyName. On a donc comme résultat à l’exécution : ![image]({{ site.url }}/images/2009/10/01/trucs-et-astuces-le-debuggeur-visual-studio-img1.png "image") On peut donc voir que cela permet de visualiser très facilement nos entités sans avoir à déployer les détails de celle-ci. Et voilà une astuce utile qui j’espère vous servira dans vos développements futurs.
