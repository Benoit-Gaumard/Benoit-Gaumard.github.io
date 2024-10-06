---
layout: post
title: ASP.Net & Unity - Gestion des contrôleurs
date: 2011-01-03
categories: [ "Divers" ]
comments_id: 57 
---

Dans un [article précédent](http://blog.woivre.fr/?p=478), je vous ai montré comment injecter vos différentes dépendances via Unity en utilisant plusieurs techniques. Si depuis, vous avez voulu essayer en ASP.Net MVC, vous vous êtes surement aperçu que l'on ne peut pas directement résoudre nos dépendances puisque la création des différents contrôleurs est par défaut géré par le Framework.

Donc avant de voir comment modifier cela, il faut comprendre comment une page est construite. (Image issue de : [http://msdn.microsoft.com/en-us/magazine/dd695917.aspx](http://msdn.microsoft.com/en-us/magazine/dd695917.aspx "http://msdn.microsoft.com/en-us/magazine/dd695917.aspx"))

![image]({{ site.url }}/images/2011/01/03/aspnet-unity-gestion-des-controleurs-img0.png "image")

On peut donc voir que lors du Worflow de création d’une page ASP.Net MVC, le MvcHandler interagit avec le IControllerFactory qui va lui fournir le, ou les, instances de IController qui correspondent, soient nos contrôleurs que nous utilisons en ASP.Net MVC. Et bien entendu, vous pouvez redéfinir vous même votre propre fabrique afin de pouvoir y placer la création de vos contrôleurs via Unity.

Déjà commençons par créer notre classe qui enregistre notre Container Unity :

```csharp
public class UnityRoot 
{
    private readonly static IUnityContainer _container = new UnityContainer();

    internal  static void EnsureInitialized()
    {
        
    }

    static UnityRoot()
    {
        Configure(_container);
        var controllerFactory = new UnityControllerFactory(_container);
        ControllerBuilder.Current.SetControllerFactory(controllerFactory);
    }

    private static void Configure(IUnityContainer container)
    {
        container.RegisterType<Interface1, ClassImpl1>();
        container.RegisterType<Interface2, ClassImpl2>();
    }
}
```

Ensuite, comme on peut le voir aux lignes 13 et 14, je créé une instance de IUnityControllerFactory qui va gérer la création des différents contrôleurs.

```csharp
public class UnityControllerFactory : DefaultControllerFactory 
{
    private IUnityContainer container;

    public UnityControllerFactory(IUnityContainer container)
    {
        this.container = container;
    }

    protected override IController GetControllerInstance(System.Web.Routing.RequestContext requestContext, Type controllerType)
    {
        IController controller;
        if (controllerType == null)
            throw new HttpException(404, String.Format("The controller for path '{0}' could not be found" +
                "or it does not implement IController.", requestContext.HttpContext.Request.Path));

        if (!typeof(IController).IsAssignableFrom(controllerType))
            throw new ArgumentException(string.Format("Type requested is not a controller: {0}", controllerType.Name), "controllerType");
        try {
            controller = container.Resolve(controllerType) as IController;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException(String.Format("Error resolving controller {0}", controllerType.Name), ex);
        }
        return controller;
    }
}
```

Et voilà, uniquement en surchargeant la méthode GetControllerInstance, vous pouvez modifier la création de vos contrôleurs, ici en ajoutant les différentes implémentations de Interface1 et Interface2.

Voici les [sources](http://cid-27033cda87e10205.office.live.com/self.aspx/Blog/Demo.ControllerFactory.7z) de l’application avec laquelle j’ai fait cet article.

Et merci à [Julien Corioland](http://blogs.dotnet-france.com/julienc/) de m’avoir donné cette astuce.
