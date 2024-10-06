---
layout: post
title: C# 4.0 - Le mot clef dynamic et la Reflexion
date: 2009-11-04
categories: [ "Divers" ]
comments_id: 31 
---

Comme vous avez du en entendre parler une des grandes nouveautés de la version 4 du framework est le mot clef dynamic. Celui-ci permet de simplifier l’utilisation de la réflexion dans les applis .Net.

On va voir dans cet article les différentes façon d’utiliser la réflexion entre la 2.0 et la 4.0. Pour l’exécution de ces diverses méthodes, nous allons utiliser la réflexion sur une DLL, réalisé en F#, dont le contenu fortement complexe est le suivant :

```fsharp
module Module1

type Multiplication(val1, val2) =
    let result = val1 * val2
    member obj.Result = result
```

Commençons donc par le tout début, c’est à dire avec un bon vieux InvokeMember, comme on peut le voir ci-dessous :

```fsharp
Type Module = Assembly.LoadFrom("CalcLibrary.dll").GetType("Module1");
Type Multiplication = Module.GetNestedType("Multiplication");

object multiplication = Activator.CreateInstance(Multiplication, new object[2] { val1, val2 });
PropertyInfo propertyResult = multiplication.GetType().GetProperty("Result");
txbResult.Text = propertyResult.GetValue(multiplication, null).ToString();
```

On obtient donc dans notre jolie interface le bon résultat comme on peut le voir aussi, et heureusement j’ai envie de dire :

 ![image]({{ site.url }}/images/2009/11/04/c-40-le-mot-clef-dynamic-et-la-reflexion-img0.png "image")

Bon malgré le fait que cette réflexion ne soit pas trop poussé, on se rappelle tout de suite que c’est toujours très verbeux. Heureusement, le mot clef dynamic arrive.

On voit donc qu’on charge toujours notre DLL, que l’on crée une instance, non pas cette fois dans une variable de type object, mais de type dynamic, grâce à laquelle on a directement accès à la propriété Result.

```csharp
Type Module = Assembly.LoadFrom("CalcLibrary.dll").GetType("Module1");
Type Multiplication = Module.GetNestedType("Multiplication");

dynamic multiplication = Activator.CreateInstance(Multiplication, new object[2] { val1, val2 });
txbResult.Text = multiplication.Result.ToString();
```

Et notre fenêtre donne toujours le bon résultat :

![image]({{ site.url }}/images/2009/11/04/c-40-le-mot-clef-dynamic-et-la-reflexion-img1.png "image")

Bien entendu, le mot clef dynamic est à utiliser à bon escient, mais je suppose que je n’ai pas besoin de vous le rappeler ! Donc surtout dans les phases de réflexion, et l’interopérabilité avec le monde COM

Donc pas de solution cette fois-ci encore, tout le code est là ! Je tâcherais de vous faire une petite présentation de F# bientôt (si j’ai un peu de temps …)
