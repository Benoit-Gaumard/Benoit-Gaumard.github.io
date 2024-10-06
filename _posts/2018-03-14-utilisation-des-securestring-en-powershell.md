---
layout: post
title: Utilisation des SecureString en Powershell
date: 2018-03-14
categories: [ "Powershell" ]
comments_id: 133 
---

La gestion de vos mots de passe en powershell se fait souvent via des securestring, si toutefois la gestion de vos mots de passe se passe via un ensemble de post-it proche de votre bureau, il s’agit d’un problème de sécurité, mais ce n’est pas le sujet ici.

Pour convertir vos mots de passe en securestring, vous pouvez exécuter le code suivant :

```powershell
$original  =  'myPassword'  
  
$secureString  =  ConvertTo-SecureString  $original  -AsPlainText  -Force
```
  
Cela vous donnera un objet de type System.Security.SecureString qui n’est pas très lisible comme cela, il est possible de récupérer une chaine de caractère correspondante à votre SecureString, mais cependant il ne s’agira pas de la chaine d’origine, comme on peut le voir ci-dessous :

```powershell
$secureStringValue = ConvertFrom-SecureString $secureString
```

La valeur de notre variables secureStringValue est donc la suivante :

```powershell
01000000d08c9ddf0115d1118c7a00c04fc297eb01000000e5e21feb868c94468d6fab05f535e198000000000200000000001066000000010000200000002aa496e945431d41 fe82e4e007773caf9379c1cbf563b7163689a5f752b325f5000000000e80000000020000200000007f1837b77634b506072902d0ea16276f66a6b7b05eec06979823d9271fe7 4975100000008a44ddb2f63d13dd1bf298bbc30b679240000000b94350179a432fc6ec084e2ee6ae9099963a82ee2768f8687309a59d8b371d337495240feb9efae58fba6945 9f4e018e070339798facebac15ba06ac845784dc
```

Si je vous dis que cette chaine de caractère ne correspond pas à l’exemple de code présent ici, vous devez uniquement me croire sur parole, car si on ne fournit pas de clé d’encryption ce qui est mon cas, la cmdlet se base sur les API Windows Data Protection, donc pour faire une conversation inverse, il faut faire celle ci sur la même machine avec le même utilisateur.

Cependant si vous voulez faire un ConvertBack, il est possible de le faire via ces différentes commandes Powershell :

```powershell
$secureStringBack = $secureStringValue | ConvertTo-SecureString  
  
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureStringBack);  
$finalValue = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
```
