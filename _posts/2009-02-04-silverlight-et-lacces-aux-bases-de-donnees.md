---
layout: post
title: Silverlight et l'accès aux bases de données
date: 2009-02-04
categories: [ "Divers" ]
comments_id: 5 
---

Lors de la création d'un projet, il y a toujours une question qui revient c'est celle sur l'accès aux données.

En effet comment accède-t-on aux données depuis une application aujourd'hui ?

- Un accès direct à la base de données
- Un Web Service
- WCF et ses différents types de binding

Mais pour ce qui est de Silverlight, il est évident qu'on ne peut pas utiliser tous ces types d'accès, en effet on a jamais vu une application cliente se connecter directement à une base de données.

De plus, à quelle base de données peut-on se connecter, car j'espère que tout le monde qui lis ce post sait qu'on peut ajouter des modules Silverlight aussi bien dans une page aspx (ASP.Net) qu'une bonne page html.

Alors personnellement, j'ai utilisé des méthodes aussi libre que propriétaire. C'est à dire une base de données MySQL, un accès direct aux données via diverses pages en php qui génèrent des données XML récupérées dans mon application Silverlight via l'accès aux pages php en question. Où une solution plus propriétaires, soit Sql Serveur 2008, un accès aux données avec Linq To Sql, et un service WCF pour diffuser les données.

Donc je me suis dis une petite démo pour les deux méthodes, histoire que vous puissiez tous profiter de ces exemples pour vos futures applications. De plus, vous pourrez trouver à la fin de ce post un lien pour télécharger les différentes sources utilisé pour la création de cet article.

Commençons par la solution gratuite, c'est à dire MySQL PHP Silverlight avec un petit schéma pour une compréhension plus facile.

![]({{ site.url }}/images/2009/02/04/silverlight-et-lacces-aux-bases-de-donnees-img1.png)

Alors il faut penser à l'accès aux données et aux envois des nouvelles données à notre base.

Donc pour l'accès à la base en PHP, je vais supposer que tout le monde sait faire (enfin si vous ne savez pas, ce n'est pas grave vous n'allez pas en mourir). Mais en gros il faut créer un XML pour qu'on puisse le lire à travers notre application Silverlight

```php
while ($line = mysql\_fetch\_assoc($result))  
{  
    echo "";  
    $id = $line["Id"];  
    echo "".$id."";  
    echo "".utf8_encode($line["Lien"])."";  
    echo "".utf8_encode($line["Libelle"])."";  
    echo "".utf8_encode($line["Auteur"])."";  
    echo "";  
}
```

Vous obtenez grâce à cette boucle une syntaxe XML de ce type, pour une entité Favori :

```xml
<id>1</id>
<Lien>http://etudiants.ms</Lien>
<Libelle>Site Microsoft étudiants</Libelle>
<Auteur>Microsoft</Auteur>
```

Maintenant viens la récupération de ce code XML au travers de l'application Silverlight, j'utilise donc un Helper pour récupérer ces valeurs via un WebClient, puis je traite les données récupérées via un LinqToXML, et ensuite les utiliser à bon escients dans mon application.

Pour la récupération en LinqToXML, j'ai utilisé une requête assez simple que voici :

```csharp
var elements = xmlElements.Descendants("Favori").Select(favori => new  
{  
    Id = (int)favori.Element("id"),  
    Auteur = ((string)favori.Element("Auteur")).Trim(),  
    Libelle = ((string)favori.Element("Libelle")).Trim(),  
    Lien = ((string)favori.Element("Lien")).Trim()  
});  
```

Voilà pour la récupération des données avec cette méthode, et maintenant voyons comment envoyé des données au serveur, car après tout un échange se fait dans les deux sens.

Alors pour l'envoi des données, j'ai aussi utilisé un Helper pour envoyer les données.

```csharp

HttpHelper helper = new HttpHelper(new Uri("http://myWebSite/setFavori.php"), "POST"  
    , new KeyValuePair<string, string>("Favori", null)  
    , new KeyValuePair<string, string>("Favori_Libelle", "Imagine Cup Student Competition 2009")  
    , new KeyValuePair<string, string>("Favori_Lien", " http://imaginecup.com")  
    , new KeyValuePair<string, string>("Favori_Auteur", "Microsoft"));  

helper.ResponseComplete = new HttpResponseCompleteEventHandler(helper_ResponseComplete);  
helper.Execute();
```

En fait le but de ce helper est d'ajouter les données dans différentes données à poster selon le type de méthode voulue, ici en mode « POST », pour plus de détails voici le constructeur utilisé ci-dessus.

```csharp
public HttpHelper(Uri requestUri, string method, params KeyValuePair<string, string>[] postValues)  
{  
    Request = (HttpWebRequest)WebRequest.Create(requestUri);  
    Request.ContentType = "application/x-www-form-urlencoded";  
    Request.Method = method;  
    PostValues = new Dictionary<string, string>();  
  
    if (postValues != null && postValues.Length > 0)  
    {  
        foreach (var item in postValues)  
        {  
            PostValues.Add(item.Key, item.Value);  
        }  
    }  
}  
```

On récupère ensuite ces différentes données via le fichier setFavori.php, puis on les ajoute à la base de données MySQL via un code de ce type, on remarquera par ailleurs que mon niveau en PHP n'est pas très élevé.

```php
if (isset($_POST["Favori"]))  
{  
    $Libelle = mysql_real_escape_string($_POST["Favori_Libelle"]);  
    $Lien = mysql_real_escape_string($_POST["Favori_Lien"]);  
    $Auteur = mysql_real_escape_string($_POST["Favori_Auteur"]);  
    $query = "INSERT INTO `Flux` (`Id`, `Libelle`, `Lien`, `Auteur`) VALUES (NULL, '".$Libelle."', '".$Lien."', '".$Auteur."')";  
    $result = mysql_query($query);  
    
    if(!result)  
        echo "ERR2";  
}  
```

On effectue donc l'ajout en base, et on écrit un code d'erreur qui sera lu par l'application Silverlight afin d'informer l'utilisateur d'un éventuel souci.

Passons maintenant à la partie « Full Microsoft », une solution où d'ailleurs je me sens plus à l'aise, peut-être du au fait que j'ai rarement fait du PHP durant ma carrière de développeur. Donc pour commencer un petit schéma du fonctionnement de l'exemple.

![]({{ site.url }}/images/2009/02/04/silverlight-et-lacces-aux-bases-de-donnees-img2.png)

Donc avant tout un LinqToSql, dont voici le fichier dbml qui est comme vous pouvez le voir assez succinct.

![]({{ site.url }}/images/2009/02/04/silverlight-et-lacces-aux-bases-de-donnees-img3.png)

Et oui, encore l'exemple du favoris, on remarque que cela change de l'exemple de la personne J

On construit ensuite le WCF, je vais passer sur la création d'un service WCF puisque ce n'est pas le but de cet article, mais néanmoins voici les différentes méthodes exposées sur le Web Services.

```csharp  
///
/// Récupère la liste des favoris de la base
///
///  
List<WCF_DataContract.Favori> WCF_Interface.IService.SelectAllFavoris() 
{  
    if (db != null && db.DatabaseExists())  
    {  
        var query = from f in db.Favoris
                    select new WCF_DataContract.Favori  
                    {  
                        Id = f.IdFavori,  
                        Libelle = f.Libelle,  
                        Auteur = f.Auteur,  
                        Lien = new Uri(f.Lien)  
                    };  
  
        return query.ToList();  
    }     

    return null;  
}  

  
///
/// Insère un favori dans la base et retourne son id
///
///
///  
void WCF_Interface.IService.insertFavori(WCF_DataContract.Favori obj)  
{  
    if (db != null && db.DatabaseExists())  
    {  
        Favori f = new Favori()  
        {  
            Lien = obj.Lien.AbsoluteUri,  
            Auteur = obj.Auteur,  
            Libelle = obj.Libelle  
        };  

        db.Favoris.InsertOnSubmit(f);  
        db.SubmitChanges();  
    }  
}  
```

Donc on peut voir ci-dessous, la méthode pour insérer et pour récupérer tous les éléments de la liste.

Pour publier notre service WCF dans notre site web, rien de plus, il faut configurer le fichier de configuration correctement, et créer un fichier « .svc » après bien entendu avoir ajouter toutes les références nécessaire.

Voici les données du fichier de configuration :

```xml
<system.serviceModel> 
    <services> 
        <service name="WCF_Services.Service" behaviorConfiguration="MyServiceTypeBehaviors"> 
            <endpoint address="" binding="basicHttpBinding" contract="WCF_Interface.IService" /> 
        </service> 
    </services> 
    <behaviors> 
        <serviceBehaviors> 
            <behavior name="MyServiceTypeBehaviors"> 
                <serviceMetadata httpGetEnabled="true" /> 
            </behavior> 
        </serviceBehaviors> 
    </behaviors> 
</system.serviceModel> 
```

Et le contenu du fichier « .svc » :

```xml
<%@ ServiceHost Service="WCF_Services.Service" %>  
```

Bien entendu, l'implémen tation d'un service WCF peut être bien plus compliquée selon les besoins du projet.

Passons au projet Silverlight, on ajoute une référence à notre service WCF précédemment crée, comme le montre l'écran ci-dessous.

![]({{ site.url }}/images/2009/02/04/silverlight-et-lacces-aux-bases-de-donnees-img4.png)

Pour la récupération de tous les favoris, on utilise donc ces différentes méthodes :

```csharp
private ServiceClient client;  
public void Load()  
{  
    client = new ServiceClient();  
    client.SelectAllFavorisCompleted = new EventHandler<SelectAllFavorisCompletedEventArgs>(client_SelectAllFavorisCompleted);  
    client.SelectAllFavorisAsync();  
}  

void client_SelectAllFavorisCompleted(object sender, SelectAllFavorisCompletedEventArgs e)  
{  
    var MyList = e.Result.ToList();  
    client.CloseAsync();  
}  
```

La variable MyList contient dorénavant toutes les données de la base.

Note : Il ne faut pas oublier de fermer la connexion avec le service WCF afin de libérer les ressources, pour qu'elles soient nettoyés par le Garbage Collector.

Donc voici, comme promis les sources de la solution sur ce [lien](http://cid-27033cda87e10205.skydrive.live.com/embedrowdetail.aspx/Blog/DataAccessSilverlight.zip).

Alors pour conclure ce post, on peut dire que voici deux solutions diverses pour accéder à des bases de données depuis Silverlight, on peut bien entendu envisager à partir de ces exemples toutes les possibilités immaginables et réalisables ce qui ne rendra pas vos applications Silverlight isolée sur le poste de l'utilisateur final.
