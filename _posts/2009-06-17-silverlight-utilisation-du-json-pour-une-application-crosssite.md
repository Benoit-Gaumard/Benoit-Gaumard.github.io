---
layout: post
title: Silverlight - Utilisation du Json pour une application Cross-Site
date: 2009-06-17
categories: [ "Divers" ]
comments_id: 19 
---

Dans ma quête de toujours vouloir [accéder aux données en Silverlight](http://blog.woivre.fr/2009/02/silverlight-et-l%e2%80%99acces-aux-bases-de-donnees/), je vous ramène une petite astuce tout en JavaScript  !!

Bon alors histoire de vous résumer un peu le précédent article pour ceux qui ne voudrait pas le relire….

J’avais montré qu’en Silverlight on pouvait accéder à des données situées en base par l’intermédiaire d’une page en PHP qui génère un XML avec ces données, ou alors un Web Service sur une page ASPX, et bien entendu toutes les combinaisons possibles de ces deux exemples.

Cependant il y avait un souci avec ce genre d’accès aux données, il fallait que le site distant ait à la racine de son serveur IIS ou Apache un fichier XML autorisant justement l’accès de Silverlight à leurs données. Ce qui il faut l’avouer ne facilite pas toujours les choses ….

Il existe cependant une méthode qui existe en Javascript pour créer une application dîtes “Cross-Site”. Cette méthode est dans plusieurs de mes projets pour apprendre Silverlight, mais j’ai néanmoins retrouvé un très bon site ou tous le code est montré en détail.

[http://dimebrain.com/2008/12/how-to-make-cross-site-service-calls-in-silverlight-using-json.html](http://dimebrain.com/2008/12/how-to-make-cross-site-service-calls-in-silverlight-using-json.html "http://dimebrain.com/2008/12/how-to-make-cross-site-service-calls-in-silverlight-using-json.html") (Site en anglais)

Moi je vais vous présenter donc très succinctement comment cela marche.

Donc en fait comme le nom l’indique, cette opération est possible grâce à la communication du plug-in Silverlight avec le code DOM de la page qui l’héberge. C’est donc pour cela que l’on peut voir que le code exécuter en C# pour appeler ce type de service est assez maigre.

```csharp
public static void SendJson(this string url)
{
    if (!_scriptables.ContainsKey("Json"))
    {
        HtmlPage.RegisterScriptableObject("Json", new JsonEvent());
    }

    var id = HtmlPage.Plugin.Id;
    HtmlPage.Window.Invoke("jsonLoad", url, id);
}
```

En effet dans cette méthode d’extension de la classe String, on peut appeler de façon simple et néanmoins efficace notre méthode JavaScript ci-dessous

```javascript
function jsonLoad(url, id) {
    $id = id;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.src += hasParameters(url) ? '&' : '?';
    script.src += 'callback=jsonCallback';

    var head = document.getElementsByTagName('head')\[0\];
    head.appendChild(script);
};
```

C’est donc cette fonction qui va appeler notre site distant afin qu’il effectue le traitement et nous renvoie les données via le callback en Javascript.

```javascript
function jsonCallback(jsonData) {
    var id = $id;
    var silverlight = document.getElementById(id);

    if (silverlight) {
        var response = JSON.stringify(jsonData);
        silverlight.Content.Json.Received(response);
    }
};
```

Et voilà comme “par magie”, on récupère nos données dans notre application Silverlight., on peut donc les traiter et les afficher par la suite.

Bon alors je voulais vous faire une petite démonstration en récupérant quelques articles de mon blog (oui je sais c’est follement original) mais j’ai appris à mes dépends que WordPress ne contient ni le fichier XML qu’il faut pour le premier mode d’accès aux données que j’ai cité. Et qu’en plus, il ne supporte pas nativement les fonctions de CallBack en Javascript, certains plug-in le font mais on ne peut en installer sur les sites hébergés chez WordPress.

Donc voilà, comme quoi il faut faire très attention à la façon d’accéder à des données distantes.
