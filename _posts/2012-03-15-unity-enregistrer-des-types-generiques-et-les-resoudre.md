---
layout: post
title: Unity - Enregistrer des types génériques et les résoudre
date: 2012-03-15
categories: [ "Divers" ]
comments_id: 81 
---

Bon une fois n’est pas coutume, cela fait vraiment longtemps que je n’ai pas publié un billet n’ayant pas de rapport avec la plateforme Windows Azure. Même si j’avoue que je viens d’utiliser cette astuce dans la future version de mon blog sur Azure, mais vous en serez plus très bientôt j’espère !

Alors ma problématique est la suivante, je souhaitais faire un cache générique pour mon application, et bien entendu, j’utilise Unity dans tous mes projets, et donc celui ci ne fait pas exception à la règle. J’ai donc cherché à résoudre mes dépendances selon le type dont j’ai besoin.

On va donc commencer par créer une interface générique comme celle-ci  :

```csharp
  public interface MyGenericInterface<T>
  {
      void DisplayType(T instance);
  }
```

On va ensuite l’implémenter dans une classe :

```csharp
  public class MyClass : MyGenericInterface<String>
  {
      public void DisplayType(String instance)
      {
          Console.WriteLine(instance.GetType().FullName + Environment.NewLine);
      }
  }
```

Voyons maintenant comment l’enregistrer dans un conteneur Unity :

```csharp
  private static void Configure(IUnityContainer container)
  {
      container.RegisterType(typeof (MyGenericInterface<>), typeof(MyClass));
  }
```

Comme on peut le voir, on enregistre les types de façon assez classique, il nous faut juste ajout les chevrons afin de définir un paramètre générique.

Si par hasard, vous avez plusieurs paramètres, par exemple, il faudra faire comme ci-dessous afin de définir qu’il y a bien 3 paramètres génériques

```csharp
  private static void Configure(IUnityContainer container)
  {
      container.RegisterType(typeof (MyGenericInterface<,,>), typeof(MyClass));
  }
```

Et maintenant, voyons comment résoudre nos types, si on prend l’exemple suivant :

```csharp
  UnityRoot.EnsureInitialized();
  UnityRoot.Container.Resolve<MyGenericInterface<String>>().DisplayType("Hello");

  try
  {
      UnityRoot.Container.Resolve<MyGenericInterface<Int32>>().DisplayType(42);
  }
  catch (Exception ex)
  {
      Console.ForegroundColor = ConsoleColor.Red;
      Console.WriteLine(ex);
      Console.ForegroundColor = ConsoleColor.White;
  }
```

On va donc essayer de résoudre une classe implémentant notre interface avec le type String, et ensuite avec le type Int32. Dans notre cas, nous n’avons ajouté qu’une classe avec une interface avec le type String.

Si nous lançons notre application, nous allons donc avoir ceci  :

![image]({{ site.url }}/images/2012/03/15/unity-enregistrer-des-types-generiques-et-les-resoudre-img0.png "image")

Nous avons bien la résolution de notre premier élément, par contre la deuxième ne marche pas comme prévu, puisque nous n’avons pas enregistrer de classe avec notre interface implémentant le type Int32.

Voilà, je ne vous donne pas le code source de la solution, puisque tout est là, il ne manque que les références à Unity, et pour cela NuGet est votre meilleur ami !
