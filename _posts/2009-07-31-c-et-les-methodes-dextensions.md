---
layout: post
title: C# et les méthodes d’extensions
date: 2009-07-31
categories: [ "Divers" ]
comments_id: 23 
---

Alors pour ceux qui me connaissent du moins dans le monde du travail, vous savez que je n’aime pas redévelopper la roue à chaque projet.

Depuis la version 3 de C#, le langage s’est doté d’un outil que je trouve très puissant, ce sont les méthodes d’extensions. Le but en 2 lignes c’est de permettre d’ajouter des méthodes à des classes existantes du Framework ou de librairies que vous intégrez dans votre code.

Enfin le mieux est un petit exemple, je pense !

Imaginons que pour une sauvegarde quelconque, vous ayez besoin, d’enlevez tous les espaces, et tous les accents d’une chaîne saisie par l’utilisateur.

Bon l’on peut trouver sur Internet très rapidement cette fonction :

```csharp
/// <summary>
/// Fonction de conversion de chaîne accentué en chaîne sans accent /// http://www.csharpfr.com/codes/CONVERTIR-CHAINE-CARACTERES-CHAINE-SANS-ACCENT_34235.aspx /// </summary>
/// <param name="chaine">La chaine à convertir</param>
/// <returns>string</returns> private string convertirChaineSansAccent(string chaine)
{
    // Déclaration de variables string accent = "ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÌÍÎÏìíîïÙÚÛÜùúûüÿÑñÇç";
    string sansAccent = "AAAAAAaaaaaaOOOOOOooooooEEEEeeeeIIIIiiiiUUUUuuuuyNnCc";

    // Conversion des chaines en tableaux de caractères char\[\] tableauSansAccent = sansAccent.ToCharArray();
    char[] tableauAccent = accent.ToCharArray();

    // Pour chaque accent for (int i = 0; i < accent.Length; i++)
    {
        // Remplacement de l'accent par son équivalent sans accent dans la chaîne de caractères chaine = chaine.Replace(tableauAccent\[i\].ToString(), tableauSansAccent\[i\].ToString());
    }

    // Retour du résultat return chaine;
}
```

Donc dans un projet, on peut supposer que l’on met cette classe en statique dans une bibliothèques “Tools” ou quelque chose de ce genre.

Donc pas de problème, on sait que cette méthode existe, maintenant prenons le cas qu’un autre développeur arrive sur le projet et ne connaissent pas l’existence de cette méthode, ce qu’il fait, c’est soit rechercher dans la documentation technique l’implémentation d’une telle méthode, soit il recherche dans le code avant de développer.

Mais depuis cette nouvelle version de C#, qui certes commence à être assez ancienne, les méthodes d’extensions sont apparus, on peut donc changer le code de la façon suivante :

```csharp
class Program {
    static void Main(string[] args)
    {
        String sOut;
        String sIn = "ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÌÍÎÏìíîïÙÚÛÜùúûüÿÑñÇç";
        sOut = sIn.convertirChaineSansAccent();

    }
}

public static class StringExtensions {
    /// <summary>
    /// Fonction de conversion de chaîne accentué en chaîne sans accent /// </summary>
    /// <param name="chaine">La chaine à convertir</param>
    /// <returns>string</returns> public static string convertirChaineSansAccent(this String chaine)
    {
        // Déclaration de variables string accent = "ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÌÍÎÏìíîïÙÚÛÜùúûüÿÑñÇç";
        string sansAccent = "AAAAAAaaaaaaOOOOOOooooooEEEEeeeeIIIIiiiiUUUUuuuuyNnCc";

        // Conversion des chaines en tableaux de caractères char\[\] tableauSansAccent = sansAccent.ToCharArray();
        char[] tableauAccent = accent.ToCharArray();

        // Pour chaque accent for (int i = 0; i < accent.Length; i++)
        {
            // Remplacement de l'accent par son équivalent sans accent dans la chaîne de caractères chaine = chaine.Replace(tableauAccent\[i\].ToString(), tableauSansAccent\[i\].ToString());
        }

        return chaine;
    }
}
```

Alors analysons les changements apportés, à priori rien au niveau de l’algorithme, aucun changement apparent.

Nous voyons en fait que c’est le prototype de la méthode qui a surtout changé, en effet la méthode est maintenant static, et l’on voit apparaître comme paramètre :

this String chaine

En fait c’est grâce à ce paramètre que l’on peut réaliser une méthode d’extensions sur la classe String.

Et les méthodes d’extensions seront visibles directement dans l’intellisense comme vous pouvez le voir :

![image]({{ site.url }}/images/2009/07/31/c-et-les-methodes-dextensions-img0.png "image")

Bien entendu, vous voyez cette méthode d’extensions, si vous avez ajouté le bon namespace à votre classe !

Après pour des raisons de facilité d’organisation des méthodes d’extensions de projet, ce que je fais je nomme ma classe StringExtensions pour les méthodes d’extensions de la classe String. De plus, toutes mes méthodes d’extensions sont dans un projet personnel que je garde, je n’ai qu’à ajouter les dll, ou ce projet à d’autres projets plus conséquents afin de pouvoir l’utiliser dans tout mes développements.
