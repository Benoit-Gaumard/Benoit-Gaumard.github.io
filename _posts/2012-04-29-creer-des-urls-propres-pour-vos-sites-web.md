---
layout: post
title: Créer des urls propres pour vos sites Web
date: 2012-04-29
categories: [ "Divers" ]
comments_id: 84 
---

Si comme moi, vous aimez voir des urls lisibles quand vous naviguez sur des sites, vous vous êtes déjà penchez sur la question sur comment formater votre url, afin qu’elle soit facilement lisible pour vos utilisateurs, et pour les moteurs de recherche.

Alors comme vous devez le savoir il y a la méthode UrlEncode disponible dans le Framework, mais personnellement je n’aime pas trop cette méthode, puisqu’elle vous traduit les caractères spéciaux en caractères encodés, ce que je ne trouve pas très lisible.

L’autre solution est de remplacer tous les caractères spéciaux par un autre caractère associé, en créant 2 listes, et en réalisant un mapping, mais il suffit que vous oubliez un caractère spécial, et c’est le drame !

La dernière solution, c’est de réaliser une normalisation de votre chaîne de caractères, et de garder uniquement les caractères qui vous intéressent, voici donc la méthode que j’utilise pour mon blog :

```csharp
public static string GenerateShortName(this string valueToConvert)  
{  
    StringBuilder sb = new StringBuilder();  
    string st = valueToConvert.ToLower().Normalize(NormalizationForm.FormD);  
  
    foreach (char t in st)  
    {  
        System.Globalization.UnicodeCategory uc = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(t);  
        switch (uc)  
        {  
            case System.Globalization.UnicodeCategory.LowercaseLetter:  
            case System.Globalization.UnicodeCategory.DecimalDigitNumber:  
                sb.Append(t);  
                break;  
            case System.Globalization.UnicodeCategory.SpaceSeparator:  
                if (sb.ToString().LastOrDefault() != '-')  
                    sb.Append('-');  
                break;  
            default:  
                break;  
        }  
    }  
  
    string value = sb.ToString().Normalize(NormalizationForm.FormC);  
  
    return value;  
}
```

Alors si on prend comme exemple le texte suivant : “Unity : Gestion des paramètres primitifs”, regardons ce que ça donne lorsqu’on l’encode, où que l’on utilise cette méthode.

![image]({{ site.url }}/images/2012/04/29/creer-des-urls-propres-pour-vos-sites-web-img0.png "image")

A mon sens, le résultat est sans appel, mais je ne suis pas  à 100% objectif !

Et voilà, même près tout ce temps, le Framework .Net peut vous apprendre énormément de choses !
