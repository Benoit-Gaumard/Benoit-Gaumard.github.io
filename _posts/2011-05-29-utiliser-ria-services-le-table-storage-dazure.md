---
layout: post
title: Utiliser RIA Services & le Table Storage d’Azure
date: 2011-05-29
categories: [ "Azure", "Table Storage" ]
comments_id: 66 
---

Lors d’un [Azure Camp](http://www.zecloud.fr/post/2011/05/11/Azure-Camp-Mix-Agile-Azure-les-slides-et-les-demos.aspx) organisé par [ZeCloud](http://www.zecloud.fr/), j’ai montré comment exposer le Table Storage de Windows Azure via un WCF Data Services, cela nous permettait d’avoir une exposition de nos données via OData. Vous pouvez retrouver la démonstration sur le [codeplex de ZeCloud](http://zecloud.codeplex.com), et me demander plus d’infos au prochain Azure Camp

Dans la même idée, je me suis aperçu que la dernière version de RIA Services proposait quelque chose du même genre, via son toolkit, on va donc voir comment le mettre en place !

Commençons déjà par créer un projet de type Cloud, ainsi qu’une application Silverlight avec un site web et WCF RIA Services. Il nous faut ensuite ajouter les références, par [NuGet](http://visualstudiogallery.msdn.microsoft.com/27077b70-9dad-4c64-adcf-c7cf6bc9970c) c’est plus facile

![image]({{ site.url }}/images/2011/05/29/utiliser-ria-services-le-table-storage-dazure-img0.png "image")

Maintenant, il nous faut créer notre Model, pour cela, on va prendre un cas très simple :

```csharp
public class Person : TableEntity {
    public int Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }

    /// <summary>
    /// The property is set to be mentioned explicitly in the DataForm ... 
    /// ONLY FOR THE DEMO 
    /// </summary> public string MyPartitionKey
    {
        get {
            return base.PartitionKey;
        }
        set {
            base.PartitionKey = value;
        }
    }
}
```

On peut voir déjà quelques différences, premièrement on n’hérite pas de TableStorageEntity, mais de TableEntity qui hérite lui même de TableServiceEntity, et la deuxième c’est que pour le cas de la démo, j’ai voulu tester plusieurs PartitionKey, j’ai donc réexposé via une autre propriété celle ci afin qu’elle apparaisse dans mon DataForm Silverlight.

Maintenant, voyons notre contexte de données pour notre Table Storage

```csharp
public class AzureServiceContext : TableEntityContext {      
    public AzureServiceContext() : 
        base(RoleEnvironment .GetConfigurationSettingValue("Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString"))
    {
    }

    public TableEntitySet<Person> People
    {
        get { return base.GetEntitySet<Person>(); }
    }
}
```

Donc de même ici, on peut voir quelques différences, déjà au niveau de l’héritage, ici on hérite de TableEntityContext qui hérite lui même de TableServiceEntity.

De plus, on peut voir que l’on ne gère pas non plus la création des tables dans le Table Storage, vu que le toolkit de RIA Services s’en occupe pour nous.

Il ne vous reste plus qu’à créer votre Domain Service de façon classique, il faut juste renseigner aucun contexte.

![image]({{ site.url }}/images/2011/05/29/utiliser-ria-services-le-table-storage-dazure-img1.png "image")

Maintenant, implémentons notre DomainService

```csharp
[EnableClientAccess()]
public class TSDomainService : TableDomainService<AzureServiceContext>
{

    protected override string PartitionKey
    {
        get {
            return null;
        }
    }

    public IQueryable<Person> GetPeople()
    {
        return EntityContext.People;
    }

    public void AddPerson(Person person)
    {
        EntityContext.People.Add(person);
    }

    public void DeletePerson(Person person)
    {
        EntityContext.People.Delete(person);
    }

    public void UpdatePerson(Person person)
    {
        EntityContext.People.Update(person);
    }
}
```

On a dorénavant la possibilité de faire un TableDomainService pour englober notre contexte Azure, de même les méthodes standards de CRUD sont facilitées.

Voyons maintenant la PartitionKey, par défaut  le toolkit met la PartitionKey à la valeur du nom du Domain Service, pour éviter qu’elle soit définit ainsi, il suffit de surcharger la PartitionKey, cependant cela veut dire qu’il vous faudra la spécifier à chaque fois, ce qui est mieux si vous voulez une bonne structure de donnée dans votre Table Storage

Et voilà le résultat dans un DataForm Silverlight

![image]({{ site.url }}/images/2011/05/29/utiliser-ria-services-le-table-storage-dazure-img2.png "image")

Vous pouvez retrouver les sources de la solution [ici](http://cid-27033cda87e10205.office.live.com/self.aspx/Blog/Demo.RiaServicesTableStorage.zip)
