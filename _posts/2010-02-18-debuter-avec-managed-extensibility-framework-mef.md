---
layout: post
title: Débuter avec Managed Extensibility Framework (MEF)
date: 2010-02-18
categories: [ "Divers" ]
comments_id: 40 
---

Actuellement, lors de mes projets personnels, je m’intéresse très particulièrement aux technologies MEF et Unity ainsi que toutes les possibilités qu’elles nous offrent.

Je vais donc vous présenter en trois parties ces deux technologies :

* Débuter avec Managed Extensibility Framework (MEF)
* Débuter avec Unity
* Allier Unity et MEF

Ces différents articles ne parleront pas des spécificités de chacune des technologies, sinon trois articles ne suffiront pas …

Donc, en trois mots, MEF qu’est-ce que c’est : Extensibilité, Découverte et Composition.

Mais avant tout ça, comprenons un peu son but, ce framework a pour vocation à homogénéiser les différents modèles d’application qui utilisent des plugins. En effet, avant MEF, les seuls projets sur lesquels j’ai travaillé avaient leur propre système de gestion de plugin. Prenons un logiciel assez connu, Visual Studio, avant la version 2010, celui-ci n’utilisait pas MEF, et la création des plugins pour celui-ci finissait généralement aux oubliettes, vu qu’on passait plus de temps dans la base de registre que dans la création du plugin elle même. Mais maintenant, le temps de la galère est fini grâce à MEF !

On va donc créer un projet qui nous permettra uniquement de jouer avec les opérations standards de mathématiques. (Oui, les sujets des articles changent, les démonstrations sont toujours les mêmes, addition, personne ….)

Avant de débuter, voici, un petit diagramme des assembly de mon application de démonstration.

![image]({{ site.url }}/images/2010/02/18/debuter-avec-managed-extensibility-framework-mef-img0.png "image")

Comme on peut le voir dans ce schéma, notre application Demo.exe fait référence à notre assembly de contrat, qui est aussi référencer par notre assembly de plugin. Cette dernière regroupe les différentes opérations que l’on exécute dans notre programme.

Le but de notre application de démonstration est quand à lui de charger les différents plugins afin que l’utilisateur puisse interagir avec nos différentes opérations. Ici, notre assembly Contrat joue le rôle d’interface entre notre application et ses extensions, ainsi que d’un SDK puisqu’elle va fournir différentes interfaces à implémenter.

Regardons plus en détails ce que contient cette assembly :

![image]({{ site.url }}/images/2010/02/18/debuter-avec-managed-extensibility-framework-mef-img1.png "image")

Soit ici, deux interfaces, la première exposant les méthodes à implémenter pour notre projet, soit uniquement une méthode Calculate, et la deuxième exposant les Metadata que nous souhaitons, par exemple, dans notre cas uniquement le titre.

Le projet contracts, quand à lui ne référence aucune librairie de MEF, ainsi ce contrat pourrait être utiliser sans ce framework, dans un autre cas d’application par exemple.

Maintenant qu’on a vu le projet de contrat, je vous épargne les 4 lignes de codes de ce projet, nous allons voir plus en détail notre application de démonstration. Puisqu’après tout c’est elle qui va gérer l’import ou non des plugins.

Donc, voici ci dessous la totalité du programme, comme vous pouvez le voir une application Console :

```csharp
class Program  
{  
    static void Main(string\[\] args)  
    {  
    var p = new Program();  
    p.Run();  
    }  
  
    [ImportMany]  
    Lazy<IOperation, IOperationMetadata>[] operations;  
  
    [Export(typeof(Action<String>))]  
    private void Print(string value)  
    {  
        Console.WriteLine(value);  
    }  
  
    [Export(typeof(Func<double>))]  
    private double ReadValue()  
    {  
        Console.WriteLine("Entrez un nombre : ");  
        double x = -1;  
        Double.TryParse(Console.ReadLine(), out x);  
        return x;  
    }  
  
    private void Run()  
    {  
        ComposablePartCatalog catalog = new DirectoryCatalog(@".\\Extensions");  
        var container = new CompositionContainer(catalog);  
        var batch = new CompositionBatch();  
        batch.AddPart(this);  
        batch.AddExportedValue(container);  
  
        container.Compose(batch);  
  
        Console.WriteLine("Nombre d'opérations dans le batch : {0}", operations.Count());  
  
        // Calcul histoire de tester  
        foreach (var operation in operations)  
        {  
            Console.WriteLine("Operation : {0}", operation.Metadata.Title);  
            Console.WriteLine("Le résultat est : {0} ", operation.Value.Calculate());  
        }  
    }  
}
```

Maintenant que je sais que vous n’avez pas tout lu, si on expliquait ce que le code fait, enfin du moins les parties en rapport avec MEF !

```csharp
[ImportMany]  
Lazy<IOperation, IOperationMetadata>[] operations;
```

Ce tableau va nous permettre d’importer nos différentes opérations, il faut que ces opérations héritent de IOperation, on mappera de plus tous les attributs de notre classe dans l’interface IOperationMetadata.

```csharp
[Export(typeof(Action<String>))]  
private void Print(string value)  
{  
    Console.WriteLine(value);  
}  
  
[Export(typeof(Func<double>))]  
private double ReadValue()  
{  
Console.WriteLine("Entrez un nombre : ");  
double x = -1;  
Double.TryParse(Console.ReadLine(), out x);  
return x;
```

Ces deux méthodes vont être exposés via MEF, grâce à l’attribut Export en spécifiant le type. On pourra donc depuis chacun des plugins y faire appel si on le souhaite.

```csharp
ComposablePartCatalog catalog = new DirectoryCatalog(@".\\Extensions");  
  
var container = new CompositionContainer(catalog);  
var batch = new CompositionBatch();  
batch.AddPart(this);  
batch.AddExportedValue(container);  
  
container.Compose(batch);
```

Ici, c’est la partie de MEF qui nous permet de lier notre programme à ces plugins.

Premièrement, on va chercher les assemblys où sont références nos plugins, dans ce cas dans un sous dossier du projet généré. On va ensuite ajouter les différentes assemblys dans un batch, afin que MEF puisse réaliser son traitement sur des éléments connus.

MEF va ainsi composer toutes les associations possibles, dans notre cas, notre programme va référencer toutes les classes implémentant IOperation et les ajouter dans notre propriétés operations afin que l’on puisse les utiliser par la suite.

Maintenant que l’on a vu la partie du programme, voyons la conception d’un plugin, par exemple celui de
l’Addition (c’est à peu près tous les mêmes)

```csharp
[Export(typeof(IOperation))]  
[ExportMetadata("Title", "Addition")]  
public class Addition : IOperation  
{  
    [Import]  
    Action<String\> Print { get; set; }  
  
    [Import]  
    Func<Double> Read { get; set; }  
  
    #region IOperation Members  
  
    public double Calculate()  
    {  
        Print("Effectuons l'opération");  
        return Read() + Read();  
    }  
    #endregion  
}
```

On voit ici que l’on déclare un export de type IOperation, ainsi qu’une metadata d’export qui correspond à la metadata de notre interface IOperationMetadata.

On va créer ensuite les différents imports de fonctions que nous avons crée précédemment, on notera par ailleurs que les noms des méthodes peuvent être différents ReadValue // Read.

Pour le reste du traitement, on voit qu’il n’y a aucun changement par rapport à une classe addition standard.

Passons à l’exécution :

![image]({{ site.url }}/images/2010/02/18/debuter-avec-managed-extensibility-framework-mef-img2.png "image")

On voit bien que le résultat attendu est bien celui qu’on a, puisqu’on a bien importé nos 4 opérations, elles sont bien différentes, vu que que le traitement est correct, il me semble que 2 + 4 = 6.

MEF est disponible gratuitement sur codeplex : [http://mef.codeplex.com](http://mef.codeplex.com)

Si on résume ce que l’on vient de voir, on arrive grâce à MEF à étendre notre programme le plus facilement possible, tout ça grâce à de la réflexion et bien d’autres choses contenus dans MEF. Je pense que ce framework sera présent dans bien des applications utilisant la gestion de plugin au vu de sa simplicité d’utilisation. De plus, histoire de mettre la cerise sur le gâteau, MEF est aussi disponible en version Silverlight !!!
