---
layout: post
title: Unity - Gestion des paramètres primitifs
date: 2012-04-28
categories: [ "Divers" ]
comments_id: 83 
---

On a vu précédemment qu’avec de l’IoC comme Unity, il est facilement possible d’instancier des objets avec des paramètres complexes qui ont été au préalable enregistrés dans Unity. Cependant, il est aussi possible de résoudre des objets qui contiennent des types primitifs

Pour un cas concret, prenons ce code qui contient des paramètres optionnels.

```csharp
public class MyClass : IMyInterface  
{  
    public MyClass(string param1, int param2, string param3 = "test", int param4 = 42)  
    {  
        Console.WriteLine("Params : {0}, {1}, {2}, {3}", param1, param2, param3, param4);  
    }  
}
```

Si l’on souhaite résoudre via Unity cette classe, il nous faut donc définir les paramètres, pour cela nous allons utiliser la classe ParametersOverride pour passer nos paramètres lors de la résolution de notre classe.

```csharp
UnityRoot.Container.Resolve<IMyInterface>(new ParameterOverrides()  
                                              {  
                                                  {"param1", "val"},  
                                                  {"param2", 3},  
                                                  {"param3", "toto"},  
                                                  {"param4", 12}  
                                              });
```

Ainsi lors de la résolution de notre container, nous aurons bien la valeur de nos 4 paramètres.

![image]({{ site.url }}/images/2012/04/28/unity-gestion-des-parametres-primitifs-img0.png "image")

Alors, comme vous avez pu le voir, dans mon exemple j’ai indiqué des paramètres optionnels, que j’ai néanmoins voulu résoudre lors de l’instanciation de ma classe. Parce qu’en effet à ce jour, Unity ne gère pas les paramètres optionnels, c’est à dire que si je souhaite résoudre ma classe de cette façon :

```csharp
UnityRoot.Container.Resolve<IMyInterface>(new ParameterOverrides()  
                                              {  
                                                  {"param1", "val"},  
                                                  {"param2", 3}  
                                              });
```

Il se produira une erreur de type Microsoft.Practices.Unity.ResolutionFailedException car celui-ci n’arrive pas à résoudre les paramètres optionnels, comme on peut le voir ci-dessous

![image]({{ site.url }}/images/2012/04/28/unity-gestion-des-parametres-primitifs-img1.png "image")

Donc mon conseil, soit vous passez par des propriétés que vous injectez, ce qui vous évite d’avoir des paramètres optionnels que vous devez absolument saisir. Soit vous pouvez définir tous vos paramètres de façon non optionnel.
