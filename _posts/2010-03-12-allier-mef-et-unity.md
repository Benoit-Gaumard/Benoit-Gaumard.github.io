---
layout: post
title: Allier MEF et Unity
date: 2010-03-12
categories: [ "Divers" ]
comments_id: 42 
---

On a vu dans les deux derniers articles comment débuter avec MEF (Managed Extensibility Framework) et Unity, on peut donc maintenant imaginer les possibilités que ceux-ci offrent en terme de développement. Mais il faut avouer que coupler les deux serait encore un plus pour nos architectures. Et bien c’est possible grâce à MEFContrib ([http://mefcontrib.codeplex.com](http://mefcontrib.codeplex.com), oui Codeplex est une source de framework presque intarissable)

Bon alors imaginons un cas assez concret, comme une application client lourd, celle-ci permet la création (et donc l’ajout) de plugins. Il est bien évident que chacun des plugins aura une tâche particulière. Par exemple, un plugin pourrait afficher des flux RSS, un autre attaquer la base de données de l’application afin d’afficher les différents utilisateurs présent en base. Bref beaucoup de possibilité, on voit donc ici l’intérêt de MEF afin de créer des plugins ayant un traitement spécifique et cependant se liant parfaitement à notre application.

Donc assez de parole, si l’ont crée cette application (tout le code sera fourni à la fin de cet article)

On va donc commencer par créer notre application en utilisant une architecture à base de plugins, voici donc ci-dessous les références entre nos différentes assemblys :

![image]({{ site.url }}/images/2010/03/12/allier-mef-et-unity-img0.png "image")

Si on détaillait un peu ce qu’il y a dans chaque assembly :

* Client : Notre application WPF qui hébergera les différents plugins
* Service : Cette assembly va dans notre cas servir de Repository, elle jouera donc le rôle de base de données.
* Model : Contient les différentes entités de notre application
* Contracts : Contient les différentes interfaces nécessaires à notre application
* Plugin : Contient les différents plugins de notre application

Bon maintenant, qu’on a vu les références dans notre application, si on voyait notre application avec son joli design (ou pas)

![image]({{ site.url }}/images/2010/03/12/allier-mef-et-unity-img1.png "image")

Je ne vais détaillé tous le code, mais on va tout de même voir les interactions pour MEF. Commençons par notre assembly Contract, elle contient deux interfaces qui sont IModule, et IModuleMetadata, qui sont respectivement, l’interface pour définir un module, et l’interface qui contiendra les metadata de chaque objet.

```csharp
public interface IModule  
{  
}

public interface IModuleMetadata  
{  
    string Title { get; }  
    string Author { get; }  
}
```

Notre première interface va en fait être utilisé pour nos différentes interactions utilisées par MEF, ici, cette interface ne défini aucune méthode puisque nos modules sont indépendants.

Notre deuxième définit un titre un nom d’auteur pour chacun des composants, comme ça on sait sur qui il faut taper quand ça ne marche pas ….

Passons à un module, celui des flux RSS par exemple,

```csharp
[Export(typeof(IModule))]  
[ExportMetadata("Title", "Flux RSS de Wilfried Woivré")]  
[ExportMetadata("Author", "Wilfried Woivré")]  
public partial class RSSControl : UserControl, INotifyPropertyChanged, IModule
```

On voit donc ici un export de type IModule, et les différentes metadatas de ce module. Bref, rien de bien compliqué dans notre cas du coup.

Il ne manque plus que notre client WPF qui héberge notre application

```csharp
public partial class Window1 : Window  
{  
    [ImportMany]  
    Lazy<IModule, IModuleMetadata>[] modules;

    [Export(typeof(Func<List<Person>>))]  
    private List<Person> GetPersons()  
    {  
        return new ServiceMock().GetPerson();  
    }
```

On a donc ici notre liste de modules que l’on va chargé grâce à MEF. Dans notre fonction que l’on déclare en mode export, on expose la liste des personnes comprises dans notre application, puisque le module qui affiche ces informations n’a pas accès à l’assembly qui gère cela.

Ici, au terme de cette première étape, on a donc une application modulaire grâce à MEF ! Mais chacun de ces modules est “libre” de faire ce qu’il veut, prenons un cas concret, imaginons que l’on veuille instaurer des logs dans notre application. Comment fait-on ? On a le choix me direz-vous, chacun des modules peut choisir de faire ce qu’il veut, ou alors on essaye d’unifier nos différents logs.

Même autre cas, notre méthode ‘GetPersons()’ qui est exportées par MEF n’est déclarée dans aucune interface, donc il faut rédiger une documentation sur toutes les méthodes disponibles, documentation qui ne sera d’ailleurs peut être même pas lue …

Une solution serait donc de passer via une Factory, en effet, si l’on indique que notre ‘ServiceMock’ implémente une interface IContract, on peut utiliser une seule méthode à exportée qui renverrait une instance de notre ServiceMock, on pourrait donc avoir une seule méthode à exporter qui serait de ce type :

```csharp
[Export(typeof(Func<IFactory>))]  
private IFactory GetPersons()  
{  
    return ServiceMock.GetSingleton();  
}
```

Ainsi, il n’y aurait qu’une fonction principale à répertorier dans notre documentation, pour le reste, l’IntelliSense peut vous aider très facilement, mais bien entendu cela n’empêche pas de faire tout plein de doc !

Bon, vous allez me dire, qu’on arrive enfin à un rendu pas trop mal, mais qu’en est-il d’Unity là dedans …. Grâce à lui nous allons ajouter notre logger dans notre cas.

Alors on sait que MEF est fait pour intégrer des éléments non connus dans notre application, alors qu’Unity travaille sur des éléments connus à l’avance, donc ça peut poser problème au final. Donc heureusement, Codeplex est riche en utilitaire et framework en tout genre, il y a donc comme je l’ai dit le projet [MefContrib](http://mefcontrib.codeplex.com) qui est une bonne base pour créer une application intégrant MEF et Unity.

Pour plus de facilité, j’ai redéfini le Bootstrapper d’Unity afin d’y injecter mes données relatives à MEF.

```csharp
public class BootStrapper : UnityBootstrapper  
{  
    public CompositionContainer MefContainer { get; private set; }

    protected override IUnityContainer CreateContainer()  
    {  
        var aggregateCatalog = new AggregateCatalog(new ComposablePartCatalog[] { new DirectoryCatalog(@".\\Extensions") });  
        var unityContainer = new UnityContainer();  
        MefContainer = unityContainer.RegisterFallbackCatalog(aggregateCatalog);

        return unityContainer;  
    }

    protected override void ConfigureContainer()  
    {  
        Container.RegisterInstance(MefContainer);  
        Container.RegisterInstance<ILogger>(new Logger());

        base.ConfigureContainer();  
    }

    protected override IModuleCatalog GetModuleCatalog()  
    {  
        return new DirectoryModuleCatalog() { ModulePath = @".\\Extensions" };  
    }

    protected override System.Windows.DependencyObject CreateShell()  
    {  
        var view = Container.Resolve<Window1>();  
        view.Show();

        var mefModules = MefContainer.GetExports<IModule>();  
        view.LoadModules(mefModules);

        return view;  
    }  
}
```

Ici, on hérite donc de la classe Bootstrapper qui est présente dans Unity, c’est une méthode courante que l’on retrouve souvent lorsqu’on utilise PRISM.

Notre première méthode va donc créer notre container Unity, et va y rajouter un catalogue pointant sur notre dossier de plugin. La deuxième va nous permettre de configurer ce précédent container, et d’y ajouter une instance de type ILogger. La suivante indique le chemin des Module, dans laquelle on va injecter du Unity. Et enfin la dernière va créer notre Shell, et lui affecter les différentes instances de modules.

J’ai de plus redéfini quelques méthodes d’extension pour IUnityContainer que vous pourrez voir dans la source du code, je vous laisse un peu de surprise.

A partir de là, on est presque près, cependant au lancement de l’application on n’a pas les logs actifs, ce qui est un soucis, étant donné que c’est ce qu’on désirait. Afin d’arranger cela, rien de plus simple, il suffit de jouer avec les attributs de MEF en exportant le constructeur prenant une instance de ILogger en entrée.

```csharp
[ImportingConstructor]  
public RSSControl(ILogger logger) : this()  
{  
    Logger = logger;  
}
```

Et là rien de plus, on a bien nos différents logs actifs. On a donc réussi à intégrer MEF avec Unity, grâce à tout plein de librairies…

Bref, pour conclure avant de vous fournir le code source de l’application, l’intégration de MEF avec Unity est un bon moyen de coupler IoC et Extensions, cependant cela ralentit fortement le chargement des applications, et je pense que la maintenance de celles-ci ne doit pas être améliorée étant donné qu’il faut connaitre les deux technologies pour maintenir le Shell. Mais cependant c’est tout de même un beau challenge à réaliser … La suite plus tard, étant donné que mon projet pour la fin de l’année se base sur ces trois derniers articles.

[![image]({{ site.url }}/images/2010/03/12/allier-mef-et-unity-img2.png "image")](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/ArticleMEFContrib.zip)
