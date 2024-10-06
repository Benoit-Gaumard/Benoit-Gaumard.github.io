---
layout: post
title: Utilisation avancée de Windows Azure Table Storage
date: 2012-09-11
categories: [ "Azure", "Table Storage" ]
comments_id: 93 
---

Le Table Storage est selon moi l’un des composants essentiels de tout bon projet fonctionnant sur Windows Azure, en effet il permet pour un faible cout de stocker des données  utilisable par la suite au sein de votre application. De plus celui-ci est hautement scalable, il est donc parfait pour une architecture de type Cloud !

A part les cas d’usages standards du Table Storage, c’est à dire du CRUD pur et dur, il est possible de modifier son comportement de façon à nous aider dans nos différentes actions, prenons le cas simple, je veux que pour chaque entité que je sauvegarde dans mon Table Storage soit indiqué une date de création, et une date de modification, cependant je ne veux pas que ces dernières viennent polluer mon coder dans chacune de mes classes.

On va donc commencer par créer une entité basique pour la démonstration :

```csharp
public  class  MyEntity : TableServiceEntity  
{  
}
```

Cette classe a donc 3 propriétés qui sont PartitionKey, RowKey et TimeStamp, or je voudrais y ajouter des propriétés pour savoir la date de création de modification de chaque ligne ce qui peut mettre utile lorsque je consulte les données via des outils tels que Cloud Storage Studio ou Azure Storage Explorer.

Pour réaliser cela, il vous faut réaliser l’opération suivante :

```csharp
private static XNamespace _atomNs = "http://www.w3.org/2005/Atom";  
private static XNamespace _dataNs = "http://schemas.microsoft.com/ado/2007/08/dataservices";  
private static XNamespace _metadataNs = "http://schemas.microsoft.com/ado/2007/08/dataservices/metadata";  
  
public MyServiceContext(CloudStorageAccount storageAccount) : base(storageAccount.TableEndpoint.ToString(), storageAccount.Credentials)  
{  
    **this.IgnoreMissingProperties = true;  
    this.WritingEntity += GenericServiceContext_WritingEntity;**

    var tableClient = storageAccount.CreateCloudTableClient();  
    
    tableClient.CreateTableIfNotExist("TestTable");  
}  
  
private  void GenericServiceContext_WritingEntity(object sender, System.Data.Services.Client.ReadingWritingEntityEventArgs e)  
{  
    MyEntity entity = e.Entity as  MyEntity;  
  
    if (entity == null)  
    {  
        return;    
    }  
  
    XElement properties = e.Data.Descendants(_metadataNs + "properties").First();  
  
    XElement id = e.Data.Descendants(_atomNs + "id").First();  
    if (String.IsNullOrWhiteSpace(id.Value))  
    {  
        var creationProperty = new  XElement(_dataNs + "CreationDate", DateTime.Now);  
        creationProperty.Add(new  XAttribute(_metadataNs + "type", "Edm.DateTime"));  
        properties.Add(creationProperty);  
    }  
  
    var modificationProperty = new  XElement(_dataNs + "ModificationDate", DateTime.Now);  
    modificationProperty.Add(new  XAttribute(_metadataNs + "type", "Edm.DateTime"));  
    properties.Add(modificationProperty);  
}
```

Il vous faut avant tout dire que les propriétés manquantes de votre ServiceContext sont ignorées que ce soit lors de la lecture ou de l’écriture. Il faut par la suite s’abonner à l’évènement Writing Entity afin de modifier le XML envoyé à votre storage.

Ainsi on va pouvoir passer de ce XML :

```xml
<entry  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"  
 xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"  
 xmlns="http://www.w3.org/2005/Atom">  
  <title />  
  <author>  
    <name />  
  </author>  
  <updated>2012-09-10T13:08:42.4981763Z</updated>  
  <id />  
  <content  type="application/xml">  
    <m:properties>  
      <d:PartitionKey>42</d:PartitionKey>  
      <d:RowKey>106564e8-5093-4c5b-b059-e02ac75a59d4</d:RowKey>  
      <d:Timestamp  m:type="Edm.DateTime">2012-09-10T15:08:42.4942455+02:00</d:Timestamp>  
    </m:properties>  
  </content>  
</entry>
```

A un XML de ce type :

```xml
<entry  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"  
 xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"  
 xmlns="http://www.w3.org/2005/Atom">  
  <title />  
  <author>  
    <name />  
  </author>  
  <updated>2012-09-10T13:08:42.4981763Z</updated>  
  <id />  
  <content  type="application/xml">  
    <m:properties>  
      <d:PartitionKey>42</d:PartitionKey>  
      <d:RowKey>106564e8-5093-4c5b-b059-e02ac75a59d4</d:RowKey>  
      <d:Timestamp  m:type="Edm.DateTime">2012-09-10T15:08:42.4942455+02:00</d:Timestamp>  
      **<****d:CreationDate  m:type="Edm.DateTime">2012-09-10T15:09:28.6219389+02:00</d:CreationDate>  
      <d:ModificationDate  m:type="Edm.DateTime">2012-09-10T15:09:28.6219389+02:00</d:ModificationDate>  
**    </m:properties>  
  </content>  
</entry>
```

Bien entendu, si vous vouliez réellement mettre en place cette solution, il faut avant tout vérifier que les propriétés que vous ajoutez n’existent pas déjà.

On notera par ailleurs, qu’il n’y a pas de gestion de statut dans le XML, donc pour savoir si c’est une entité que l’on créé où une entité que l’on modifie, il faut se baser sur la présence ou non de la valeur du champ id.

On peut donc voir le résultat ci-dessous au sein de mon table storage, je ne modifie que la dernière ligne dans mon application de démonstration :

![image_thumb1]({{ site.url }}/images/2012/09/11/utilisation-avancee-de-windows-azure-table-storage-img0.png "image_thumb1")

Maintenant, passons à un mode lecture avancé. Prenons le cas suivant, on vous donne un Table Storage à lire et explorer sans utiliser d’outils tierces, ni même Visual Studio et son explorateur de Table Storage ! Bref la galère à première vue …. Bon en même temps, c’est pas le scénario qui arrive tous les jours.

On va donc commencer par créer une entité plus complexe que la précédente qui va contenir un Tuple permettant de stocker nos différentes propriétés :

```csharp
public  class  ExtractEntity  
{  
    private  List<Tuple<string, object, object>> _properties = new  List<Tuple<string, object, object>>();  
    public  List<Tuple<string, object, object>> Properties  
    {  
        get  
        {  
            return _properties;  
        }  
        set  
        {  
            _properties = value;  
        }  
    }  
}
```

On notera au passage, que mon entité n’hérite pas de TableServiceEntity, et donc il est possible de créer son propre système de wrapping pour certaines entités.

Au niveau du code, il est possible de faire comme ci-dessous, c’est à dire s’abonner à l’évènement ReadingEntity et de modifier le XML d’entrée

```csharp
public MyServiceContext(CloudStorageAccount storageAccount) : base(storageAccount.TableEndpoint.ToString(), storageAccount.Credentials)  
{  
    this.IgnoreMissingProperties = true;  
    this.WritingEntity += GenericServiceContext_WritingEntity;  
    **this.ReadingEntity += GenericServiceContext_ReadingEntity;**  
    var tableClient = storageAccount.CreateCloudTableClient();  
  
    tableClient.CreateTableIfNotExist("TestTable");  
}  
  
    private void GenericServiceContext_ReadingEntity(object sender, System.Data.Services.Client.ReadingWritingEntityEventArgs e)  
    {  
        ExtractEntity entity = e.Entity as  ExtractEntity;  
        if (entity == null)  
        {  
            return;  
        }  
  
        var q = from p in e.Data.Element(_atomNs + "content")  
                .Element(_metadataNs + "properties")  
                .Elements()  
                select new  
                {  
                    Name = p.Name.LocalName,  
                    IsNull = string.Equals("true", p.Attribute(_dataNs + "null") == null 
                                ? null  
                                : p.Attribute(_metadataNs + "null").Value, StringComparison.OrdinalIgnoreCase),  
                    TypeName = p.Attribute(_dataNs + "type") == null ? null : p.Attribute(_metadataNs + "type").Value,  
                    p.Value  
                };  
  
        foreach (var dp in q)  
        {  
            entity.Properties.Add(new  Tuple<string, object, object>(dp.Name, dp.TypeName ?? "Edm.String", dp.Value));  
        }  
    }
```

Le XML que l’on récupère en entrée, ressemble à celui ci-dessous, il est donc possible de retrouver l’ensemble des informations nécessaires pour connaitre l’entité et sa table d’origine

```xml
<entry  m:etag="W/&quot;datetime'2012-09-10T13%3A34%3A20.327Z'&quot;"  
 xmlns="http://www.w3.org/2005/Atom"  
 xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata">  
  <id>http://127.0.0.1:10002/devstoreaccount1/TestTable(PartitionKey='42',RowKey='365aa1c5-ac6b-42ea-b674-749dfdc7b514')</id>  
  <title  type="text"></title>  
  <updated>2012-09-10T14:52:49Z</updated>  
  <author>  
    <name />  
  </author>  
  <link  rel="edit"  title="TestTable"  href="TestTable(PartitionKey='42',RowKey='365aa1c5-ac6b-42ea-b674-749dfdc7b514')" />  
  <category  term="devstoreaccount1.TestTable"  scheme="http://schemas.microsoft.com/ado/2007/08/dataservices/scheme" />  
  <content  type="application/xml">  
    <m:properties>  
      <d:PartitionKey  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">42</d:PartitionKey>  
      <d:RowKey  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">365aa1c5-ac6b-42ea-b674-749dfdc7b514</d:RowKey>  
      <d:Timestamp  m:type="Edm.DateTime"  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">2012-09-10T13:34:20.327Z</d:Timestamp>  
      <d:CreationDate  m:type="Edm.DateTime"  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">2012-09-07T11:54:29Z</d:CreationDate>  
      <d:ModificationDate  m:type="Edm.DateTime"  xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">2012-09-07T11:54:29Z</d:ModificationDate>  
    </m:properties>  
  </content>  
</entry>
```

On va donc se retrouver avec une entité comprenant toutes les propriétés de notre table, comme on peut le voir ci-dessous :

[![image_thumb4]({{ site.url }}/images/2012/09/11/utilisation-avancee-de-windows-azure-table-storage-img1.png "image_thumb4")]({{ site.url }}/images/2012/09/11/utilisation-avancee-de-windows-azure-table-storage-img1.png)

Voilà en espérant que ça puisse vous donner quelques idées pour vos développements futurs ou passés !
