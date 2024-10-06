---
layout: post
title: Silverlight 3.0 et les .Net RIA Services
date: 2009-08-12
categories: [ "Divers" ]
comments_id: 25 
---

Dans la continuité d’un de mes articles sur Silverlight et les différents moyens d’accéder aux données soit via l’utilisation du [JSon](http://blog.woivre.fr/blog/2009/06/17/silverlight-utilisation-du-json-pour-une-application-cross-site/), ou par des [services Web (WCF …)](http://blog.woivre.fr/blog/2009/02/04/silverlight-et-l%e2%80%99acces-aux-bases-de-donnees/). Il en manquait inévitablement un sur les .Net RIA Services. Alors les .Net RIA Services en deux mots, qu’est-ce que c’est, c’est une nouvelle mouture d’ADO.Net pour Silverlight. En effet, lors de la conception d’application Silverlight, on avait vu que cela péchait pour récupérer les données, vu que Silverlight est une technologie cliente. Il fallait donc, comme le montre le schéma ci-dessous pour accéder aux données contenues dans notre base depuis notre interface, passer par le code métier et ensuite, via un service arrivé à notre base de données pour effectuer la requête. C’est donc ce que l’on appelle une architecture n-tiers, facile à implémenter et facilement maintenable. ![image]({{ site.url }}/images/2009/08/12/silverlight-30-et-les-net-ria-services-img0.png "image") Cependant ce découpage est bien souvent pas respecté pour beaucoup de projets, il n’est donc pas rare de voir les différentes parties clientes mélangées, ainsi que le côté serveur pour des questions de rapidité de développement. On a donc généralement une architecture de ce type pour finir. ![image]({{ site.url }}/images/2009/08/12/silverlight-30-et-les-net-ria-services-img1.png "image") Cette facilité de développement, j’avoue peut être intéressante dans l’instant lorsque l’on n’a absolument pas l’habitude de bien séparer les diverses couches d’une application, ou que l’on ne veut pas implémenter de Design Pattern (comme le MVVM) dans son projet en plus. Néanmoins, la reprise de tel projet par la suite est d’autant plus dur … Alors maintenant, voyons comment nous structurons nos données avec .Net RIA Services ![image]({{ site.url }}/images/2009/08/12/silverlight-30-et-les-net-ria-services-img2.png "image") Bon maintenant que nous avons vu comment est construit une application Silverlight utilisant les .Net RIA Services, on va pouvoir en faire une. Alors pour base de données, je vais prendre celle de NorthWind non modifié, vous pouvez la trouver à ce [lien](http://www.microsoft.com/Downloads/details.aspx?FamilyID=06616212-0356-46a0-8da2-eebc53a68034&displaylang=en) si vous ne l’avez pas. Alors pour commencer nous allons créer une nouvelle application Silverlight de type Business Application. Ce type d’application est ajouté après avoir installer les .Net RIA Services. Maintenant que notre projet est créé, nous allons accéder à notre base, donc dans notre projet ASP.Net, nous allons créer cet accès avec Entity Framework, avec lequel nous allons récupérer tous les employés de la base Northwind. Donc jusque là, rien de bien anormal par rapport à un autre projet Silverlight que vous auriez pu faire avant. Maintenant, toujours dans le projet ASP.Net, nous allons créer un nouvel item qui s’appelle “Domain Service Class”, on peut le trouver dans la partie Web, comme on peut le voir ci dessous : ![image]({{ site.url }}/images/2009/08/12/silverlight-30-et-les-net-ria-services-img3.png "image") Maintenant, nous avons un deuxième écran qui nous demande quels éléments seront disponibles du côté client. Pour la démonstration, nous allons donc choisir les “Employees”, et la possibilité d’éditer ceux-ci. ![image]({{ site.url }}/images/2009/08/12/silverlight-30-et-les-net-ria-services-img4.png "image") Cette classe nous génère donc entre autre ce code ci :

```csharp
    // Implements application logic using the NorthwindEntities context.
    // TODO: Add your application logic to these methods or in additional methods. \[EnableClientAccess()\]
    public class NorthwindDomainService : LinqToEntitiesDomainService<NorthwindEntities>
    {

        // TODO: Consider
        // 1\. Adding parameters to this method and constraining returned results, and/or
        // 2\. Adding query methods taking different parameters. public IQueryable<Employees\> GetEmployees()
        {
            return this.Context.Employees;
        }

        public void InsertEmployees(Employees employees)
        {
            this.Context.AddToEmployees(employees);
        }

        public void UpdateEmployees(Employees currentEmployees)
        {
            this.Context.AttachAsModified(currentEmployees, this.ChangeSet.GetOriginal(currentEmployees));
        }

        public void DeleteEmployees(Employees employees)
        {
            if ((employees.EntityState == EntityState.Detached))
            {
                this.Context.Attach(employees);
            }
            this.Context.DeleteObject(employees);
        }
    }
}
```

Comme on peut le voir, cette action nous permet de générer tous ce qu’il faut pour lire et modifier des employés de la base, bien entendu rien ne vous empêche d’en rajouter, pour des questions de performances, comme par exemple, une partie qui ne retourne seulement 10 employés de la base au lieu de toute la base. L’autre partie qui est généré sont les metadatas nécessaire pour le bon fonctionnement de la communication avec les .Net RIA Services. Donc maintenant qu’on a crée notre partie accès aux données, ainsi que notre code métier, et le service pour accéder à nos données, nous n’avons plus qu’à gérer le côté client en Silverlight. Alors commençons par la partie XAML, pour notre exemple, nous allons afficher les noms et les prénoms des employés de la base de données :

```xml
                <ListBox ItemsSource="{Binding}" Margin="0,50,0,0" Height="300">
                    <ListBox.ItemTemplate>
                        <DataTemplate>
                            <StackPanel Orientation="Horizontal" >
                                <TextBlock Text="{Binding FirstName}" Width="250" />
                                <TextBlock Text="{Binding LastName}" />
                            </StackPanel>
                        </DataTemplate>
                    </ListBox.ItemTemplate>
                </ListBox> 
```

Nous allons maintenant charger les données depuis la base grâce aux RIA Services :

```csharp
private void Page_Loaded(object sender, RoutedEventArgs e)
{
    var context = new NorthwindDomainContext();
    DataContext = context.Employees;
    context.Load(context.GetEmployeesQuery());
}
```

Nous chargeons les données de façon assez simple, grâce à une requête Linq, ou à la méthode context.GetEmployeesQuery() qui renvoie ceci :

```csharp
public EntityQuery<Employees> GetEmployeesQuery()
{
    return base.CreateQuery<Employees>("GetEmployees", null, false, true);
}
```

Soit toutes les données de la table Employees. Bien entendu, toutes ces opérations avec .Net RIA Services sont asynchrone afin que l’application reste fluide pour l’utilisateur. Alors pour conclure sur cet article, et sur cette technologie, les .Net RIA Services sont très puissant pour toutes les applications Business, néanmoins la faille que je vois par rapport à un service classique en WCF, c’est que les .Net RIA Services sont orientés uniquement pour Silverlight, alors qu’un service WCF permet de partager l’accès aux services entre divers types d’application. Voilà bien entendu je vous fournis le code source de l’application, il faudra bien entendu changer la chaine de connexion à la base de données. [![image]({{ site.url }}/images/2009/08/12/silverlight-30-et-les-net-ria-services-img5.png "image")](http://cid-27033cda87e10205.skydrive.live.com/embedrowdetail.aspx/Blog/DemosRIAServices.zip) _Ressouces :_ Un très bon lien sur .Net RIA Services que je vous conseille : [http://blogs.msdn.com/brada/archive/tags/RIAServices/default.aspx](http://blogs.msdn.com/brada/archive/tags/RIAServices/default.aspx "http://blogs.msdn.com/brada/archive/tags/RIAServices/default.aspx")
