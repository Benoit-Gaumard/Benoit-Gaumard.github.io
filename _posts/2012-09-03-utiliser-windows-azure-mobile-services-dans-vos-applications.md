---
layout: post
title: Utiliser Windows Azure Mobile Services dans vos applications
date: 2012-09-03
categories: [ "Azure", "Mobile App Services" ]
comments_id: 90 
---

Si Windows Azure Mobile Service ne vous dit rien, je vous conseille avant tout d’aller voir l’annonce de Scott Guthrie à ce [sujet](http://weblogs.asp.net/scottgu/archive/2012/08/28/announcing-windows-azure-mobile-services.aspx) !

Et maintenant que vous avez compris à quoi cela sert, vous vous dîtes, et flûte le service a l’air pourtant intéressant, cependant actuellement je ne peux l’utiliser qu’avec une application Windows 8 ! Et bien, sachez que non, il est possible de l’utiliser pour des applications Windows Phone 7, voir WPF, ou ce que vous souhaitez ! Bon, bien entendu, il ne sera pas possible d’utiliser les possibilités de push et d’authentification fournis par ce service, par contre un système CRUD bête et méchant, c’est possible !

Alors pour le prouver, j’ai réalisé (très rapidement) une application WPF permettant d’ajouter des items dans une table, et de les lire.

Le schéma de ces données est le suivant :

![image]({{ site.url }}/images/2012/09/03/utiliser-windows-azure-mobile-services-dans-vos-applications-img0.png "image")

Alors pour pouvoir attaquer notre service hébergé dans Azure, de quoi avons-nous besoin, uniquement des urls pour lire, ajouter, modifier, supprimer ainsi que de votre clé privée pour accéder à votre service.

```csharp
public readonly string GetTestDatas = "https://votrenamespace.azure-mobile.net/tables/testdata/";  
public readonly string AddTestData = "https://votrenamespace.azure-mobile.net/tables/testdata/";  
public readonly string UpdateTestData = "https://votrenamespace.azure-mobile.net/tables/testdata/";  
public readonly string DeleteTestData = "https://votrenamespace.azure-mobile.net/tables/testdata/";  
public readonly string ApiKey = "VotreCléPrivée";
```

Alors comment cela se passe ? Et bien c’est fort simple, votre application doit faire des appels en Json, soit en GET ou en POST selon les besoins, en prenant bien soin d’ajouter dans les headers de vos requêtes.

Par exemple, pour lister les différents éléments de ma table, il me suffit d’exécuter ce code :

```csharp
public List<TestData> Get()  
{  
    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(GetTestDatas);  
    **request.Headers.Add("X-ZUMO-APPLICATION", ApiKey);**  
    request.Method = "GET";  
    request.ContentType = "application/json";  
  
    HttpWebResponse response = (HttpWebResponse)request.GetResponse();  
    Stream responseStream = response.GetResponseStream();  
  
    DataContractJsonSerializer ser = new DataContractJsonSerializer(typeof(List<TestData>));  
    return (List<TestData>)ser.ReadObject(responseStream);  
}
```

Bien entendu, il faut avoir au préalable créé une classe TestData dans mon cas, qui contient les différents valeurs nécessaires à la sérialisation, et la désérialisation.

```csharp
[DataContract]  
public class TestData  
{  
    [DataMember(Name="id")]  
    public int Id { get; set; }  
    [DataMember(Name = "value")]  
    public string Value { get; set; }  
}
```

De même pour l’insertion de données, ou pour la modification de données, il suffit de passer l’id de l’élément que vous voulez modifier pour qu’il le mette à jour ou insère une ligne, quand à la suppression, il faut juste passer la clé primaire de l’objet à supprimer pour réaliser cette action.

```csharp
public TestData Put(TestData item)  
{  
    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(AddTestData);  
    **request.Headers.Add("X-ZUMO-APPLICATION", ApiKey);**  
    request.Method = "POST";  
    request.ContentType = "application/json";  
  
    using (var streamWriter = new StreamWriter(request.GetRequestStream()))  
    {  
        string json = "{\\"value\\": \\"" \+ item.Value + "\\"}";  
  
        streamWriter.Write(json);  
    }  
  
  
    HttpWebResponse response = (HttpWebResponse)request.GetResponse();  
    Stream responseStream = response.GetResponseStream();  
  
    DataContractJsonSerializer ser = new DataContractJsonSerializer(typeof(TestData));  
    return (TestData)ser.ReadObject(responseStream);  
}
```

On a donc vu qu’il est possible de détourner cette fonctionnalité pour l’utiliser au sein de nos projets, et dans ce cas de s’abstraire de toute la partie CRUD d’une application.

Tout le code est là, je ne vous le fournis donc pas !
