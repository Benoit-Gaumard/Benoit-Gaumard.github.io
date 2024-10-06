---
layout: post
title: Migrer une application ASP.Net MVC sous Windows Azure
date: 2009-07-04
categories: [ "Azure", "Cloud Services" ]
comments_id: 21 
---

Dans cet article, nous allons voir comment placer une application ASP.Net MVC totalement sous Windows Azure.

Pour cette démonstration, je vais prendre mon projet ASP.Net MVC “Notes” sans la version Silverlight, vous pouvez le retrouver sur [cet article](http://blog.woivre.fr/blog/2009/03/16/l%e2%80%99aspnet-mvc-et-silverlight/).

Maintenant passons à notre projet Azure, donc après avoir installer le SDK si ce n’est déjà fait, nous allons créer un projet Azure vierge comme cela :

![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img0.png "image")

Maintenant nous allons ajouté notre projet ASP.Net MVC à la solution, afin qu'on puisse le placer dans Azure.

Donc première étape, faire du projet ASP.Net MVC un Web Role pour Azure, parce que dans l’état actuel des choses, il n’est pas possible d’associer notre projet à notre Cloud Service, comme on peut le voir.

![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img1.png "image")Donc pour ceux qui ont déjà eu à faire des choses comme cela il faut éditer le csproj de la solution “Notes”, soit le projet ASP.Net MVC afin d’incorporer le texte suivant en dessous du “TargetFramework”

```xml
<RoleType>Web</RoleType>
<ServiceHostingSDKInstallDir Condition=" '$(ServiceHostingSDKInstallDir)' == '' ">
    $(Registry:HKEY\_LOCAL\_MACHINE\\SOFTWARE\\Microsoft\\Microsoft SDKs\\ServiceHosting\\v1.0@InstallPath
</ServiceHostingSDKInstallDir> 
```

Puis vous recharger votre solution si vous n’avez pas fermer Visual Studio, et là on peut voir qu’il détecte bien un Web Role dans la solution.

![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img2.png "image")

Bon maintenant qu’on a ajouté notre Web Role à notre application, il faut maintenant modifier et configurer celui ci pour qu’il marche sous Azure, car pour rappel, dans le projet initial, on accéder à la base de données grâce à Entity Framework, donc il va nous falloir refaire la partie model de l’application.

Mais avant tout, configurons notre application pour qu’elle tourne sur la fabrique Azure installé en local sur notre machine. Il y a deux fichiers à configurer qui sont ServiceDefinition.csdef, et ServiceConfiguration.cscfg. Ces deux fichiers comme leurs noms le laissent envisager permettent de configurer notre application pour qu’elle puisse fonctionner soit avec des composants installer en local sur votre machine, soit avec un compte Windows Azure.

Donc maintenant passons à notre modèle de données à modifier, il va nous falloir gérer une table “Note” avec un libellé et une date de saisie ainsi qu’un Id unique.

La première problématique est donc de créer notre table, et bien en fait il n’y a rien de plus simple, enfin si vous avez regardé rapidement les démos fournis par le SDK, vous avez du voir un projet StorageClient qui permet entre autre de créer les tables pour Azure.

```csharp
public class Note : TableStorageEntity {
    public int Id { get; set; }
    public DateTime DateSaisie { get; set; }
    public String Libelle { get; set; }

    public Note(int id, DateTime dateSaisie, String libelle)
    {
        Id = id;
        DateSaisie = dateSaisie;
        Libelle = libelle;

        PartitionKey = String.Concat(Id, '_', Libelle);
        RowKey = String.Format("{0:10}", DateTime.Now.Ticks);
    }

    public Note() { }
} 
```

Voici, par exemple, la Table Note, elle contiendra nos champs, tel qu’il était avant, soit l’Id, la DateSaisie et le Libelle. Mais en plus elle aura des champs spécifiques à Azure que nous verrons par la suite.

Bon maintenant qu’on a crée notre table, il faut créer un contexte pour regrouper ces tables.

```csharp
public class NoteService : TableStorageDataServiceContext, INoteService 
{
    private static StorageAccountInfo account
    {
        get {
            var accountInfo = StorageAccountInfo.GetAccountInfoFromConfiguration("TableStorageEndpoint");
            if (accountInfo == null)
            {
                return null;
            }
            return accountInfo;
        }
    }

    public IQueryable<Note> Notes
    {
        get { return CreateQuery<Note>("Notes"); }
    }

    public NoteService() : base(account) { }
```

Donc comme vous pouvez le voir, la création d’un contexte sous Azure n’est pas très compliqué, il suffit de récupérer le StorageAccountInfo que nous avons rempli précédemment dans nos fichiers de config pour le Service Azure, et de créer un IQueryable<Note> . Après cela on crée nos tables de tests grâce à cette option:

![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img3.png "image")On obtient, si tout s’est correctement passé la création de notre base de données “AzureNotes” qui contient notre Table “Notes”

Attention, il faut que votre projet compile pour créer les “Test Storage Tables” !!

![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img4.png "image")       ![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img5.png "image")

On peut voir ainsi que dans notre Table, le SDK d’Azure nous a rajouté 3 champs qui sont Timestamp, PartitiionKey et RowKey, de plus ces deux derniers constituent la clé primaire de notre table “Notes”, c’est donc pour cela que je les initialise dans le le constructeur de ma classe Note.

Donc récapitulons, où on en est, on a migrer notre application sous Azure, et on a crée notre base de données de tests sur notre poste, il ne nous reste plus qu’à modifier notre partie de Service pour ne pas perdre en fonctionnalité !

```csharp
public IEnumerable<Note> ListNotes()
 {
     return Notes.AsEnumerable();
 }

 public Note GetNote(int id)
 {
     return (from n in Notes
             where n.Id == id
             select n).FirstOrDefault();
 }

 public void CreateNote(Note noteToCreate)
 {
     try {
         Note n = new Note(Notes.AsEnumerable().Count() + 1, noteToCreate.DateSaisie, noteToCreate.Libelle);
         this.AddObject("Notes", n);
         this.SaveChanges();
     }
     catch (DataServiceRequestException dsre)
     {
         RoleManager.WriteToLog("Information", "NoteService, CreateNote : Entry already exists");
     }
     catch (InvalidOperationException ioe)
     {
         RoleManager.WriteToLog("Information", "NoteService : Implementation Error");
     }
 }

 public void EditNote(Note noteToEdit)
 {
     Note originalNote = GetNote(noteToEdit.Id);

     originalNote.Libelle = noteToEdit.Libelle;
     originalNote.DateSaisie = noteToEdit.DateSaisie;
     this.UpdateObject(originalNote);
     this.SaveChanges();
 }

 public void DeleteNote(Note noteToDelete)
 {
     Note n = GetNote(noteToDelete.Id);
     this.DeleteObject(n);
     this.SaveChanges();
 }
```

Et voilà, à partir de maintenant on a notre application prête à être déployer sur Azure, mais je ne le ferais pas pour ce projet vu que je ne pense pas que je le laisserais indéfiniment en place …

Le code source de l’application :

[![image]({{ site.url }}/images/2009/07/04/migrer-une-application-aspnet-mvc-sous-windows-azure-img6.png "image")](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/Azure.Notes.zip)

Il ne faut pas oublier qu’Azure n’est pas un produit fini, il reste encore des évolutions qui me semblent majeures à mettre en place, par exemple les tables relationnelles qui pour le moment n’existe pas ! Enfin, j’essayerai de vous faire un topo courant Juillet avec les différentes mises à jour qui arrivent, ainsi que les tarifs !

Un grand merci à Aymeric de la communauté Windows Azure sur [ZeCloud](http://zecloud.fr) pour m’avoir présenté la plateforme. D’ailleurs si vous voulez venir aux Azure Camp n’hésitez pas  !
