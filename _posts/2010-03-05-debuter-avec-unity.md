---
layout: post
title: Débuter avec Unity
date: 2010-03-05
categories: [ "Divers" ]
comments_id: 41 
---

Maintenant qu’on a vu comme débuter avec MEF (Managed Extensibility Framework), on va passer à Unity.

Unity est un concept de développement, disponible dans les [Enterprise Library](http://msdn.microsoft.com/en-us/library/cc467894.aspx) de Microsoft, en version 4.1 lors de l’écriture de cet article. Unity sert à effectuer de l’IoC (Inversion de contrôle) sur les composants que l’on souhaite.

Avant de commencer, à quoi sert l’IoC ? L’IoC permet d’apporter à vos projets un nouveau niveau d’abstraction à votre code. Le but de l’IoC est que ce soit le contrôle qui appelle qui fournisse les différents accès, classes, instances au contrôle appelé.

Imaginons un cas simple, dans une application nous voulons logger des éléments, nous avons diverses manières de le faire. On peut dans un premier cas, instancier un nouveau logger à chaque fois qu’on en a besoin. La deuxième qui est mieux, et d’utiliser une factory qui va gérée elle-même la ou les instances de logger. La troisième se fait via Unity, ou lors de la création de nos contrôles on lui passe un type ou une instance de ILogger. On va comprendre ça mieux par la suite avec l’exemple.

Déjà installer et récupérer Unity, ça peut être utile histoire de s’amuser avec ! Vous pouvez trouver Unity sur Codeplex à l’adresse [http://unity.codeplex.com](http://unity.codeplex.com), de plus il est compris dans les [enterprise library](http://msdn.microsoft.com/en-us/library/cc467894.aspx) que je conseille à tous d’utiliser que ce soit pour Unity ou autres, il y a vraiment plein de choses sympas dedans !

Pour mon exemple, histoire de ne pas faire trop compliqué, je suis reparti d’une présentation de [Mike Taulty](http://mtaulty.com/communityserver/blogs/mike_taultys_blog/default.aspx) sur PRISM et Silverlight. Unity fait partie de PRISM, mais il peut très bien tourner sans. Vous pouvez retrouver la vidéo sur Channel 9 [http://channel9.msdn.com/posts/mtaulty/Prism--Silverlight-Part-2-Dependency-Injection-with-Unity/](http://channel9.msdn.com/posts/mtaulty/Prism--Silverlight-Part-2-Dependency-Injection-with-Unity/ "http://channel9.msdn.com/posts/mtaulty/Prism--Silverlight-Part-2-Dependency-Injection-with-Unity/")

Donc pour ceux qui n’iront pas voir les vidéos de cette saga, il présente les différentes caractéristiques de PRISM. Pour Unity, il réalise une calculette en application Console que je vais vous présenter ci dessous.

Utilisons un peu les possibilités de Visual Studio 2010 pour notre schéma, voici donc la structure éclaté de la solution.

![image]({{ site.url }}/images/2010/03/05/debuter-avec-unity-img0.png "image")

La solution est donc divisé en 6 namespaces :

* InterfacesLibrary contient les différentes interfaces implémentées dans l’application
* InputOutputLibrary contient les différentes classes gérant les entrées et sorties (Console.WriteLine, Console.ReadLine …)
* Demo.Unity, c’est le point d’entrée du Program
* CommonTypesLibrary contient les types communs de l’application (enum d’opération, et une classe Arguments qui contient uniquement 2 int)
* CalculatorLibrary contient la logique du programme, et oui même pour une addition, il faut que ce soit un peu structuré
* CalculatorCommandParsingLibrary va se charger de parser toutes les données saisies par l’utilisateur

Le but de notre application est que le cœur du programme utilise les différents éléments tel que le parser, les entrées-sorties uniquement via les interfaces. Suivant le principe d’Unity c’est le point d’entrée de notre Program qui va référencer les différentes instances que notre logique va utiliser.

Si on regarde le schéma des dépendances de nos assembly on obtient ceci avec [NDepend](http://ndepend.com) :

![image]({{ site.url }}/images/2010/03/05/debuter-avec-unity-img1.png "image")

On peut voir que seul Demo.Unity référence les différentes assembly dont nous allons nous servir pour effectuer notre traitement. On remarque aussi, que CalculatorLibrary et Demo.Unity référence Microsoft.Practices.ServiceLocation, et Demo.Unity référence aussi Microsoft.Practices.Unity et Microsoft.Practices.Composite.UnityExtensions, on va voir par la suite, pourquoi ces deux assemblys références cette dll.

Bon si on regardait un peu le code maintenant, je ne vous mets pas tout, je vous fournirais tout le code à la fin de cet article.

Donc en fait dans Unity tout se joue à la création des éléments, on va donc analyser notre classe CalculatorReplLoop et notre Program.cs

Voici notre classe CalculatorReplLoop, enfin une partie :

```csharp
IInputService inputService;  
List<IOutputService> outputServices;  
ICalculator calculator;  
IInputParserService parsingService;

public CalculatorReplLoop()  
{

}

public CalculatorReplLoop(ICalculator calculator, IServiceLocator container, IInputService inputService, IInputParserService inputParserService)  
{  
    this.calculator = calculator;  
    this.inputService = inputService;  
    outputServices = new List<IOutputService>(container.GetAllInstances<IOutputService>());  
    parsingService = inputParserService;  
}
```

Regardons un peu plus en détail notre deuxième constructeur, on voit qu’il prend en paramètre diverses interfaces.

ICalculator, IInputService et IInputParserService sont les différences interfaces implémentées dans notre programme, elles servent respectivement à effectuer les opérations, récupérer les valeurs saisies via la console, parser les différentes commandes saisies par l’utilisateur.

IServiceLocator est un objet qui dans notre cas va encapsuler un UnityContainer qui contient les différents types que nous avons injecté. Vous pouvez retrouver IServiceLocator sur Codeplex : [http://compositewpf.codeplex.com/](http://compositewpf.codeplex.com/ "http://compositewpf.codeplex.com/"). On reviendra néanmoins sur ce que contient ce container, lorsque je vais vous présenter ce qu’on injecte avec Unity.

Passons maintenant à la partie lancement du programme, puis ce que comme je vous l’ai dit c’est l’appelant qui injecte des données à l’appelé, et non l’appelé qui demande des données.

```csharp
class Program  
{  
    static void Main(string[] args)  
    {  
        UnityContainer container = new UnityContainer();

        container.RegisterType<ICalculator, Calculator>();  
        container.RegisterType<ICalculatorReplLoop, CalculatorReplLoop>();  
        container.RegisterType<IInputService, ConsoleInputService>();  
        container.RegisterType<IInputParserService, InputParserService>();

        container.RegisterType<IOutputService, ConsoleOutputService>("Consoleoutput");  
        container.RegisterType<IOutputService, MsgBoxOutputService>("MsgBoxOutput");  
        container.RegisterInstance<IServiceLocator>(new UnityServiceLocatorAdapter(container));

        ICalculatorReplLoop loop = container.Resolve<ICalculatorReplLoop>();  
        loop.Run();  
    }  
}
```

Au premier abord, Unity peut faire peur à cause de cela. Mais en fait, la réalisation est assez simple, on utilise un objet de type UnityContainer qui va contenir tous les types et les instances que l’on veut utiliser dans notre application.

Prenons le premier bloc, ici, nous “enregistrons” les types ICalculator, ICalculatorReplLoop, IInputService et IInputParserService associés à des classes qui implémentent ces interfaces. Ensuite, les choses se corsent un peu, en effet pour présenter le plus d’éléments, j’ai décidé d’utiliser différents instances de IOutputService, j’enregistre donc les deux types dans mon container, puis j’enregistre une instance de IServiceLocator qui encapsulera mon UnityContainer, j’utilise pour cela un UnityServiceLocatorAdapter qui est contenu dans l’assembly Microsoft.Practices.UnityExtension disponible sur [http://compositewpf.codeplex.com/](http://compositewpf.codeplex.com/ "http://compositewpf.codeplex.com/")

Pourquoi cela ? Et bien tout simplement, parce que je ne voulais pas que le composant que j’appelle connaisse Unity, si ça avait été le cas, le composant pourrait vivre sa propre vie sans que l’appelant le contrôle.

Maintenant qu’on a enregistré nos différents types, instances, il va falloir maintenant résoudre tout cela afin d’avoir une application qui fonctionne. Et là Unity est magique pour cela, il n’y a qu’à demander quel type on veut résoudre, et il fait par lui même les associations.

Bon, et si on exécutait un peu l’application pour voir le rendu :

![image]({{ site.url }}/images/2010/03/05/debuter-avec-unity-img2.png "image")

On demande une opération Add qui sera reconnue par notre parser, puis on lui fournit deux entiers, qui seront lus puis stocké dans un objet Arguments, et on affiche le résultat de l’opération à la fois dans la Console et dans une MessageBox.

Il existe de nombreuses façon d’utiliser Unity, dans ce cas je l’ai utilisé totalement au niveau du code, cependant il est possible d’enregistrer nos différents types au niveau d’un simple fichier de configuration, et ce sans référencer les différentes assembly. Pour ma part, je ne suis pas très adepte de cette méthode, car pour moi ce qui doit être en configuration est quelque chose qui est voué à changer un jour. Or là Unity est prévue pour la conception des applications qui elle n’est pas vouée à changer.

Et voici comme promis le code source de l’application (sous Visual Studio 2008, je pense à ceux qui n’ont pas encore migré) :

[![image]({{ site.url }}/images/2010/03/05/debuter-avec-unity-img3.png "image")](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/Demo.Unity.zip)
