---
layout: post
title: Nouveautés C# 5 - Mots clef async et await
date: 2010-10-29
categories: [ "Divers" ]
comments_id: 53 
---

Et voilà, la [PDC](http://player.microsoftpdc.com/session) a débuté aujourd”hui même, c’est donc le moment de faire le plein de nouveautés, entre autre sur Windows Azure, mais on en reparlera dans un autre article sur ce blog, ou sur [ZeCloud](http://zecloud.fr) !!

Il y a bien entendu d’autres nouveautés, mais bon ça a commencé il y a juste 6h à l’heure où j’écris cet article, dont des nouveautés sur C# 5, et les méthodes asynchrones !!

Alors vu que du code en dit toujours plus long que des belles paroles, prenons l’exemple d’une méthode asynchrone classique :

```csharp
public void BeforeAsync()
{
    var client = new WebClient();
    client.DownloadStringCompleted += (sender, e) => ParseRss(e.Result);
    client.DownloadStringAsync(new Uri("http://blog.woivre.fr?feed=rss2"));
}
```

Et on parse notre fichier XML de façon assez simple :

```csharp
private void ParseRss(string rss)
{
    XDocument xdoc = XDocument.Parse(rss);

    var titles = from e in xdoc.Root.Descendants("item")
                 select e.Element("title").Value;

    foreach (String title in titles.Take(4))
        Console.WriteLine(title);
}
```

Voilà jusque là, c’est comme cela qu’on pouvait faire pour récupérer un flux RSS, bon certes si on ne connait pas SyndicationFeed ….

Cependant, comme toute chose à une fin, des nouveautés arrivent, et avec elle le mot clef async, qui va nous simplifier la syntaxe de notre appel en une simple ligne :

```csharp
public async void WithAsync()
{
    ParseRss(await new WebClient().DownloadStringTaskAsync(new Uri("http://blog.woivre.fr?feed=rss2")));
}
```

Donc on peut voir en rouge (grâce à Visual Studio qui ne comprend encore rien) que l’on a ajouté deux mots clefs qui sont async et await. Pour faire simple, async va déclarer une méthode comme ayant un fonctionnement asynchrone, et le mot clef await va demander au programme d’attendre le retour de notre fonction avant d’effectuer la suite des opérations. On utilise de plus un DownloadStringTaskAsync à la place du DownloadStringAsync puis ce premier est fourni par le framework Async CTP, et permet de retourner un objet lorsque l’opération est terminée.

Alors vu que de toute façon, la vie ne se déroule pas sur un seul Thread, on peut jouer avec plusieurs Thread sans aucun soucis en utilisant le Parallel Framework et Async CTP:

```csharp
public async void WithAsyncAndParallel()
{
    Task<string> blogWoivre = new WebClient().DownloadStringTaskAsync(new Uri("http://blog.woivre.fr?feed=rss2"));
    Task<string> blogZeCloud = new WebClient().DownloadStringTaskAsync(new Uri("http://www.zecloud.fr/syndication.axd"));

    ParseRss(await blogWoivre);
    ParseRss(await blogZeCloud);
}
```

Voici, donc le résultat final de l’application en ce qui concerne les données, on ne perd à priori aucun temps d’exécution, il faudra cependant tester sur un plus grand jeu de données que le simple flux Rss de ce blog

![image]({{ site.url }}/images/2010/10/29/nouveautes-c-5-mots-clef-async-et-await-img0.png "image")

Et voilà, encore un peu de sucre syntaxique, mais c’est tellement bon de ne plus se prendre la tête sur ce genre de truc ! Bref ça surpoutre ^^

Quelques liens : [Async CTP](http://msdn.microsoft.com/en-us/vstudio/async.aspx)

Blog de Matthieu Mezil qui a posté avant moi, et dont j’ai honteusement piqué le nom des méthodes : [http://blogs.developpeur.org/matthieu/archive/2010/10/28/async-et-await-l-asynchrone-avec-c-5-a-surm-gapoutre.aspx](http://blogs.developpeur.org/matthieu/archive/2010/10/28/async-et-await-l-asynchrone-avec-c-5-a-surm-gapoutre.aspx "http://blogs.developpeur.org/matthieu/archive/2010/10/28/async-et-await-l-asynchrone-avec-c-5-a-surm-gapoutre.aspx")

Un peu de ressources anglo saxonne : [http://blogs.msdn.com/b/ericlippert/archive/2010/10/28/asynchrony-in-c-5-part-one.aspx](http://blogs.msdn.com/b/ericlippert/archive/2010/10/28/asynchrony-in-c-5-part-one.aspx "http://blogs.msdn.com/b/ericlippert/archive/2010/10/28/asynchrony-in-c-5-part-one.aspx")

Et les sources, bien entendu !!!

[![image]({{ site.url }}/images/2010/10/29/nouveautes-c-5-mots-clef-async-et-await-img1.png "image")](http://cid-27033cda87e10205.office.live.com/self.aspx/Blog/Demo.AsyncAwait.zip)
