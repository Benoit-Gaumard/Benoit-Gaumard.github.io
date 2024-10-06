---
layout: post
title: Windows Azure SDK 1.5 - Support de la projection pour requêter le Table Storage Azure
date: 2011-09-17
categories: [ "Azure", "SDK", "Table Storage" ]
comments_id: 70 
---

Avec la //Build/ une nouvelle version des Tools pour Windows Azure et sorti, avec son lot de nouveauté non négligeable ! Et donc une que j’attends depuis le premier jour où j’ai fait de l’Azure, lors d’un Azure Camp by [ZeCloud](http://zecloud.fr) d’ailleurs. Cette nouveauté est donc le support de la projection dans le Select avec Windows Azure.   En effet, avant avec Windows Azure pour récupérer uniquement quelques champs d’une Table dans le Table Storage Azure, il fallait récupérer tous les entités que l’ont souhaité et ensuite faire notre projection sur une liste d’objet. Cela nous donnait à peu près le code suivant :  

```csharp
var query = from n in serviceContext.TestDatas
            select n;

var result = query.AsEnumerable().Select(n => n.Name);
```

  Le principal problème c’est qu’Azure devait sérialiser entièrement nos “TestDatas” pour les retourner, alors qu’un support du Select en mode natif serait magique, et bien maintenant c’est le cas ! Il est donc directement possible de faire cela :  

```csharp
var storageAccount =
       CloudStorageAccount.FromConfigurationSetting(
           "Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString");
var serviceContext = new AzureServiceContext(storageAccount);

var query = from n in serviceContext.TestDatas
            select n.Name;
```

L’avantage donc, c’est que l’API Azure ne va sérialiser que les noms Name.   Alors j’ai réalisé un petit bout de code en ASP.Net MVC pour voir si les performances était probante des deux côtés. Mon cas de test : - Environnement sous Visual Studio 2010, Windows Azure SDK 1.5, Windows 8 Preview Developer x64 - 10 000 enregistrements de la classe TestDatas sur un Azure Pass avec le storage au niveau de Dublin La classe TestDatas

```csharp
public class TestData : TableServiceEntity {
    public string Name { get; set; }
    public DateTime DateInsert { get; set; }
}
```

Les méthodes de tests avec la projection et sans celle ci :

```csharp
public ActionResult ListWithoutSelect()
{
    Stopwatch watch = new Stopwatch();
    watch.Start();
    var storageAccount =
           CloudStorageAccount.FromConfigurationSetting(
               "Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString");
    var serviceContext = new AzureServiceContext(storageAccount);

    var query = from n in serviceContext.TestDatas
                select n;

    watch.Stop();

    return View(
        new TestResult()
        {
            ElapsedTime = watch.ElapsedMilliseconds
        });
}

public ActionResult ListWithSelect()
{
    Stopwatch watch = new Stopwatch();
    watch.Start();
    var storageAccount =
        CloudStorageAccount.FromConfigurationSetting(
            "Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString");
    var serviceContext = new AzureServiceContext(storageAccount);

    var query = from n in serviceContext.TestDatas
                select n.Name;

    watch.Stop();

    return View(new TestResult()
                    {
                        ElapsedTime = watch.ElapsedMilliseconds
                    });

}
```

Voici mon tableau de quelques résultats en millisecondes, j’ai relancé la solution en mode debug avant chaque résultat.

Sans projection

3590

3020

4771

5145

2057

Avec projection

2089

2189

3060

2321

2496

  Il faut savoir que le deuxième appel est beaucoup plus rapide (environ 150ms), grâce à un cache. On peut donc voir qu’avec la projection, c’est relativement plus rapide. Cependant notre classe TestDatas ne contient que 2 champs ….   Attention il n’est actuellement pas possible d’effectuer une requête select avec de la projection afin de traiter le contenu ultérieurement. Sauf une projection sur les PrimaryKey et RowKey.   Je ne fournis pas le code, je suppose que vous pourrez le refaire !
