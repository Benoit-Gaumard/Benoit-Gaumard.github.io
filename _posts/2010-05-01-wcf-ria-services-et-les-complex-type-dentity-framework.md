---
layout: post
title: WCF RIA Services et les Complex Type d’Entity Framework
date: 2010-05-01
categories: [ "Divers" ]
comments_id: 47 
---

Actuellement, je suis en train de réaliser un projet pour une formation Silverlight, le but de ce projet est de réaliser un mini site eCommerce totalement en Silverlight. Il s’articule autour des technologies Entity Framework et RIA Services ainsi que Silverlight 4 avec un design pattern de type MVVM. J’utilise comme base de données AdventureWorksLT2008. Je donnerais tout le code de cette démonstration sur mon blog un autre jour, avec une explication un peu plus conséquente !

Enfin passons, pour ma vie, dans cet article je vais vous montrer comment renvoyer un Complex Type crée depuis EntityFramework et renvoyer dans notre Silverlight.

Je commence donc par créer un projet de type Silverlight Business Application, ensuite je crée un modèle Entity Framework, ici, on se basera uniquement sur la table Employees de NorthWind.

Sur cette table, je vais vouloir récupérer uniquement les noms et les prénoms des employés, afin de les renvoyer à mon application Silverlight, je vais donc créer un ComplexType contenant deux chaines de caractères.

J’en suis donc arrivé à un diagramme ressemblant à ceci :

![image]({{ site.url }}/images/2010/05/01/wcf-ria-services-et-les-complex-type-dentity-framework-img0.png "image")

Maintenant créons notre Domain Service, et notre requête Linq qui ressemble à cela :

```csharp
[EnableClientAccess()]  
public class NortwindDomainService : LinqToEntitiesDomainService<NorthwindEntities>  
{

    // TODO: Consider  
    // 1\. Adding parameters to this method and constraining returned results, and/or  
    // 2\. Adding query methods taking different parameters.  
    public IQueryable<EmployeeInformation\> GetEmployees()  
    {  
        return from e in ObjectContext.Employees  
        select new EmployeeInformation() { FirstName = e.FirstName, LastName = e.LastName };  
    }  
}
```

On s’apprête donc à créer une interface pour afficher les données en Silverlight, sauf qu’en compilant on obtient une erreur :

![image]({{ site.url }}/images/2010/05/01/wcf-ria-services-et-les-complex-type-dentity-framework-img1.png "image")

Il manque donc une clef à notre complex type, qu’à cela ne tienne, pour en rajouter une, il suffit de créer une classe partielle à notre type et d’y ajouter une clé.

```csharp
public partial class EmployeeInformation  
{  
    [Key]  
    [DataMember]  
    public int EmployeeInformationId { get; set; }  
}
```

Maintenant que ce problème est réglé et qu’on a bien entendu ajouter la déclaration de notre clé dans notre requête, il faut passer au front, on va donc créer un liste qui affiche les noms et les prénoms des employés

On obtient un code de ce style :

```csharp
public IEnumerable<Entity> Employees  
{  
    get { return (IEnumerable<Entity>)GetValue(EmployeesProperty); }  
    set { SetValue(EmployeesProperty, value); }  
}

// Using a DependencyProperty as the backing store for Employees.  This enables animation, styling, binding, etc...  
public static readonly DependencyProperty EmployeesProperty =  
DependencyProperty.Register("Employees", typeof(IEnumerable<Entity>), typeof(MainPage), new PropertyMetadata(null));

public MainPage()  
{  
    InitializeComponent();  
    this.DataContext = this;  
    this.Loaded += (sender, e) => LoadData();  
}

private void LoadData()  
{  
    NortwindDomainContext context = new NortwindDomainContext();  
    LoadOperation loadOp = context.Load(context.GetEmployeesQuery());  
    Employees = loadOp.Entities;  
}
```

On charge donc le tout dans une liste que l’on expose à notre interface, le tout compile sans aucun problème on s’attend donc à voir un résultat, cependant on obtient encore une erreur :

![image]({{ site.url }}/images/2010/05/01/wcf-ria-services-et-les-complex-type-dentity-framework-img2.png "image")

On a donc une exception au niveau de notre DomainService, la requête quand à elle est bonne, le seul problème est en fait une erreur d’Entity Framework, on ne peut pas créer de Complex Type dans une requête Linq To Entities.

Il nous faut donc passer via un objet anonyme pour pouvoir ensuite instancier notre complex Type.

```csharp
public IQueryable<EmployeeInformation> GetEmployees()  
{  
    var employees = from e in ObjectContext.Employees  
        select new { e.EmployeeID, e.FirstName, e.LastName };

    return employees.ToList().ConvertAll(e => new EmployeeInformation()  
    {  
        EmployeeInformationId = e.EmployeeID,  
        FirstName = e.FirstName,  
        LastName = e.LastName  
    }).AsQueryable();
}
```

On obtient donc par la suite nos différentes données :

![image]({{ site.url }}/images/2010/05/01/wcf-ria-services-et-les-complex-type-dentity-framework-img3.png "image")

Et voilà en espérant que cette technique vous sera utile dans vos futurs développements avec RIA Services ! En plus je vous fournis tout le code source !

[![image]({{ site.url }}/images/2010/05/01/wcf-ria-services-et-les-complex-type-dentity-framework-img4.png "image")](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/ComplexTypeInRiaService.zip)
