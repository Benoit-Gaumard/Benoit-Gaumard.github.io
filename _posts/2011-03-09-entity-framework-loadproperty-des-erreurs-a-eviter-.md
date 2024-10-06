---
layout: post
title: Entity Framework - LoadProperty, des erreurs à éviter !
date: 2011-03-09
categories: [ "Azure", "SQL Database" ]
comments_id: 61 
---
La fonction LoadProperty dans Entity Framework vous permet de charger les différentes propriétés d’une entité selon les conditions de navigations qui sont définies dans le Model.

Pour voir ce que vous pouvez réaliser avec cette méthode, je ne peux que vous conseiller que de consulter [MSDN](http://msdn.microsoft.com/fr-fr/library/dd382835.aspx) !

Bon c’est bien beau, mais parfois vous pouvez avoir différents bugs, je vais donc vous en montrer deux avec les différents messages d’erreurs associés. Prenons donc le code suivant, basé sur Northwind, il compile correctement.

```csharp
var entities = new NorthwindEntities();
var result = entities.Region;
foreach (var item in result)
    entities.LoadProperty(item, "Territory");

foreach (var item in result)
{
    Console.WriteLine(String.Format("Region : {0}, nb de territoires {1}",
        item.RegionDescription.Trim(),
        item.Territories.Count));
}
```

On a donc une première erreur à l’exécution

![image]({{ site.url }}/images/2011/03/09/entity-framework-loadproperty-des-erreurs-a-eviter--img0.png "image")

Bon le message de l’erreur est clair, il faut mettre la propriété de navigation qui est “Territories” et non “Territory”, il vous faut donc faire attention, puisque contrairement aux requêtes Linq, ici, on se base sur des chaines de caractères et donc susceptibles aux erreurs.

Bon maintenant qu’on a corrigé cela, passons à la deuxième erreur que nous affiche gentiment Visual Studio

![image]({{ site.url }}/images/2011/03/09/entity-framework-loadproperty-des-erreurs-a-eviter--img1.png "image")

Bon cette erreur est déjà un peu moins explicite que la précédente, si l’on regarde le message de l’InnerException, on peut voir ce message d’erreur

“There is already an open DataReader associated with this Command which must be closed first.”

Donc après quelques recherches non fructueuses, le problème vient de la chaine de connexion généré par l’utilitaire Entity Framework qui a indiqué ceci :

```xml
    <add name="NorthwindEntities" 
         connectionString="metadata=res://*/NWModel.csdl|res://*/NWModel.ssdl|res://*/NWModel.msl;
         provider=System.Data.SqlClient;
         provider connection string=&quot; Data Source=.\\SQLEXPRESS;Initial Catalog=Northwind;
         Integrated Security=True;MultipleActiveResultSets=False&quot;" 
         providerName="System.Data.EntityClient" /> 
```

Bien qu’elle a l’air correct (et d’ailleurs, elle l’est), elle ne permet pas d’effectuer deux requêtes en même temps par connexion à cause de la propriétés MultipleActiveResultSets qui est à false, il vous suffit donc de le mettre à true, et le tour est joué !

Bon ce cas m’est arrivé avec une connexion à une base SQL Azure, puisque sinon il me génère correctement la chaine de connexion pour autoriser le LoadProperty.

Voilà en espérant que ça vous soit utile à vous aussi !
