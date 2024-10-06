---
layout: post
title: ASP.Net MVC et Silverlight
date: 2009-03-16
categories: [ "Divers" ]
comments_id: 7 
---

Alors un nouvel article, après un petit moment d'absence.

Cet article va porter sur le modèle MVC dans un site ASP.Net et la possibilité d'intégrer Silverlight dans l'application, sans pour autant modifier l'architecture de l'application.

Alors on va commencer par créer l'application ASP.Net MVC sans le module Silverlight, pour la démonstration, on va créer une application gérant des notes.

Bien entendu, le code source de l'application sera en lien à la fin de cet article.

Donc la création du projet ASP.Net MVC :

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img1.png)

Dans cet exemple, on ne va pas utiliser les tests unitaires. On arrive donc à une architecture de type MVC classique.

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img2.png)

Maintenant nous allons créer la base de données que nous allons utiliser dans cet application.

Pour ajouter la base de données, nous avons soit le choix de la mettre dans la solution où alors héberger cette base au travers un moteur de base de données. Pour la démonstration, nous allons utiliser Sql Serveur 2008.

On crée donc la base NotesDB comme ci-dessous :

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img3.png)

Dans cet article, nous allons Entity Framework afin de relier notre base de données à notre application, on obtient donc un modèle de données de ce type.

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img4.png)

On rajoute bien entendu notre fichier « edmx » dans la partie « Models » de l'application.

Maintenant que nous avons relié notre application à la base de données, il nous faut créer les différentes méthodes pour utiliser au mieux cette base. Nous allons donc créer une interface « INoteService » et une classe « NoteService » qui implémentera l'interface précédente. Ci-dessous le code de l'interface.

```csharp
public interface INoteService
{  
    IEnumerable<Note> ListNotes();  
    Note GetNote(int id);  
    void CreateNote(Note noteToCreate);  
    void EditNote(Note noteToEdit);  
    void DeleteNote(Note noteToDelete);  
}  
```

Afin de ne pas surcharger l'article, je ne mets pas le code de la classe, mais elle utilise avant tout la syntaxe Linq, et les différentes propriétés d'Entity Framework.

Passons maintenant à la partie « C » de MVC. On rajoute donc un contrôleur à notre application.

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img5.png)

Alors nous allons créer un « NoteController.cs » qui regroupera nos différents contrôleurs, ci-dessous les constructeurs de la classe, et le contrôleur pour la page Index.

```csharp
public class NoteController : Controller  
{  
    private INoteService _service;  
    
    public NoteController() : this(new NoteService()) { }  
    public NoteController(NoteService service)  
    {  
        _service = service;  
    }  
    
    public ActionResult Index()  
    {  
        return View(_service.ListNotes());  
    }  
```

Pour la création des vues, nous allons utiliser le simple clic droit sur la méthode Index.

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img6.png)

Donc pour les autres vues, on utilisera le même principe. Faisons un point sur l'architecture du projet actuellement :

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img7.png)

Nous avons donc nos 3 contrôleurs (MV**C**) :

* Account
* Home
* Note

Notre partie modèle (**M**VC) contenant :

* L'accès à la base de données via Entity Framework
* Notre classe, et son interface, pour accéder à la table Note

Notre partie (M**V**C) vue contenant pour chacun des contrôleurs :

* Les différentes vues associés : Par exemple, pour nos Notes, nous avons « Index », « Create », « Edit », « Delete »

De plus nous avons aussi le dossier « Shared » qui contient les différentes pages d'erreur, puisque c'est toujours plus jolie qu'une fameuse page jaune, et aussi les différentes MasterPage de l'application.

Maintenant passons à l'intégration de Silverlight dans ce projet. Comme on peut le voir ci-dessus, le principe de l'ASP.Net MVC injecte des données dans la page, afin qu'elle soit affichées et traitées dans l'application. On peut donc chercher comment ajouter ces données dans l'application Silverlight, cependant les personnes ayant développé le framework ASP.Net MVC ont pensé à nous les développeurs Silverlight, puisqu'il nous ont fournit la classe « JsonResult ». Donc pour passer les données à l'application Silverlight nous allons ajouter une méthode au contrôleur.

```csharp
public ActionResult List()  
{  
    return Json(_service.ListNotes());  
}  
```

Cette méthode va nous permettre de sérialiser la liste des notes au travers du navigateur.

Passons à la création du projet Silverlight que nous nommerons « SLNotes » (oui je sais, je fais dans l'original aujourd'hui)

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img8.png)

On relie notre application Silverlight dans notre projet « Notes ». Maintenant passons à la création de l'application, cependant éviter que cet article ne soit trop long, je vais juste créer la partie qui affiche la liste des Notes. Il nous faut donc pour cela une « ListBox », dont voici le code :

```xml
<ListBox x:Name="lstNotes" ItemsSource="{Binding}">  
    <ListBox.ItemTemplate>  
        <DataTemplate>  
            <StackPanel Orientation="Horizontal">  
                <TextBlock Text="{Binding DateSaisie}" Margin="5" />  
                <TextBlock Text="{Binding Libelle}" Margin="5" />  
            </StackPanel>  
        </DataTemplate>  
    </ListBox.ItemTemplate>  
</ListBox>  
```

Maintenant passons à la partie du code behind qui elle sera nettement plus interessante, du moins à mon goût

```csharp
void Page_Loaded(object sender, RoutedEventArgs e)  
{  
    WebClient wc = new WebClient();  
    wc.OpenReadCompleted = new OpenReadCompletedEventHandler(wc_OpenReadCompleted);  
    wc.OpenReadAsync(new Uri("http://localhost:1295/Note/List"));  
}  
  
void wc_OpenReadCompleted(object sender, OpenReadCompletedEventArgs e)  
{  
  
    DataContractJsonSerializer json = new DataContractJsonSerializer(typeof(List<Note>));  
    List<Note> notes = (List<Note>)json.ReadObject(e.Result);  
    lstNotes.DataContext = notes;  
}  
```

Donc dans le Page Load, on retrouve nos objets que nous avons sérialiser tous à l'heure. Puis par la suite, lorsque le traitement est terminé nous ajoutons nos objets à notre liste.

Maintenant que l'application Silverlight est prête, il faut l'ajouter dans notre application. Afin de ne pas recréer une énième vue, nous allons ajouter notre objet Silverlight dans la page Index

```html
<object data="data:application/x-silverlight-2," type="application/x-silverlight-2" width="100%" height="100%"><param name="source" value="ClientBin/SLNotes.xap" />

<param name="onerror" value="onSilverlightError" />

<param name="background" value="white" />  
<param name="minRuntimeVersion" value="2.0.31005.0" />  

<param name="autoUpgrade" value="true" />  
<a href="http://go.microsoft.com/fwlink/?LinkID=124807" style="text-decoration: none;"><img src="http://go.microsoft.com/fwlink/?LinkId=108181" alt="Get Microsoft Silverlight"  
style="border-style: none" />  
</a>object>  
```

Comme on peut le voir on utilise la balise object pour intégrer notre partie en Silverlight et non la balise qui demande quand à elle de rajouter un Script Manager ainsi qu'un formulaire, ce qui n'est pas utile dans cette application.

![]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img9.png)
On voit ici dans le résultat que nous avons bien notre Note qui s'affiche dans la ListBox.

Donc pour conclure cet article, ce que je peux c'est que l'intégration d'une application Silverlight à l'intérieur d'un site en ASP.Net MVC peut enrichir de façon très conséquente vos applications.

Cependant un point négatif que j'ai repéré, c'est qu'il faut soit relier les entités à nos applications Silverlight via WCF par exemple, ou il faut recopier intégralement les entités à l'intérieur de nos applications Silverlight, comme j'ai du le faire dans ce cas ci.

Et voilà comme promi le code source de l'application (note : il faudra sûrement modifier le port de votre Visual Studio ou alors modifier le code source pour l'application Silverlight)

[![alt]({{ site.url }}/images/2009/03/16/aspnet-mvc-et-silverlight-img10.png)](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/Notes.zip)
