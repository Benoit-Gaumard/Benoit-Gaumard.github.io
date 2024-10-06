---
layout: post
title: Silverlight 3 - le contrôle DataForm
date: 2009-08-22
categories: [ "Divers" ]
comments_id: 26 
---

Dans cet article, je vais vous présenter les fonctionnalités du DataForm, vous pouvez trouver ce composant dans le Silverlight Toolkit présent sur [codeplex](http://silverlight.codeplex.com/Release/ProjectReleases.aspx?ReleaseId=24246) Alors commençons par notre entité que nous allons afficher :

```csharp
public class Personne {
     public string Nom { get; set; }
     public string Prenom { get; set; }
     public int Age { get; set; }
     public string Mail { get; set; }
 }
 ```

Donc jusque là une entité classique que l’on peut retrouver dans beaucoup d’application (surtout celle de démonstrations ….) Et un code XAML de ce type :

```xml
  <UserControl.Resources>
      <local:Personne Age="23" Nom="Woivré" Prenom="Wilfried" Mail="wilfried.woivre@gmail.com" x:Key="MaPersonne" />
  </UserControl.Resources>
<Grid x:Name="LayoutRoot" Width="400" Height="400">
  <dataFormToolkit:DataForm CurrentItem="{StaticResource MaPersonne}"></dataFormToolkit:DataForm>
</Grid>
```

On obtient donc rien qu’avec cela une fenêtre éditable de mon entité personne, comme on peut le voir sur l’image ci dessous ![image]({{ site.url }}/images/2009/08/22/silverlight-3-le-controle-dataform-img0.png "image") Maintenant, c’est bien beau, mais actuellement, notre DataForm a lié l’intégralité de notre entité, qui est donc modifiable par l’utilisateur, on peut donc se service des attributs Editable et Display pour personnaliser notre DataForm. ATTENTION, dans les anciennes versions de Silverlight Toolkit, ces attributs étaient présent sous la nom de Bindable.

```csharp
[Display(AutoGenerateField=false)]
public string Nom { get; set; }
[Editable(false)]
public string Prenom { get; set; }
public int Age { get; set; }
[Display(Name="E mail")]
public string Mail { get; set; }
```

L’élément Display contient divers arguments pour personnalisez comme vous le souhaiter votre DataForm. ![image]({{ site.url }}/images/2009/08/22/silverlight-3-le-controle-dataform-img1.png "image") On obtient donc le résultat suivant à l’affichage ![image]({{ site.url }}/images/2009/08/22/silverlight-3-le-controle-dataform-img2.png "image") Maintenant, pour savoir lorsque notre entité change ou est en train de changer, on peut bien entendu s’abonner aux différents évènements du DataForm pour exécuter nos différentes opérations. Cependant on peut aussi utiliser l’interface IEditableObject sur notre entité comme ceci :

```csharp
public class Personne : IEditableObject 
{
    #region Properties

    [Display(AutoGenerateField=false)]
    public string Nom { get; set; }
    [Editable(false)]
    public string Prenom { get; set; }
    public int Age { get; set; }
    [Display(Name="E mail")]
    public string Mail { get; set; }

    #endregion

    #region IEditableObject Members

    public void BeginEdit()
    {
    }

    public void CancelEdit()
    {
    }

    public void EndEdit()
    {
    }

    #endregion
```

On peut donc gérer notre entité directement ainsi pour gérer nos opérations sur cette entité en question. Maintenant voyons comment se comporte le DataForm avec une liste d’objet que l’on peut déclarer de la sorte :

```csharp
public ObservableCollection<Personne> MesPersonnes { get; set; }
public MainPage()
{
    InitializeComponent();
    MesPersonnes = new ObservableCollection<Personne>()
    {
        new Personne(){
            Nom = "Woivré",
            Prenom = "Wilfried",
            Age = 23,
            Mail ="wilfried.woivre@gmail.com" },
        new Personne(){
            Nom = "Pera",
            Prenom = "Alexis",
            Age = 22
        },
        new Personne(){
            Nom = "Payet",
            Prenom = "Patrick",
            Age = 26
        }
    };

    this.Loaded += new RoutedEventHandler(MainPage_Loaded);
}

void MainPage_Loaded(object sender, RoutedEventArgs e)
{
    this.DataContext = this;
}

<Grid x:Name="LayoutRoot" Width="400" Height="400">
  <dataFormToolkit:DataForm ItemsSource="{Binding MesPersonnes}"></dataFormToolkit:DataForm>
</Grid>
```

Notre DataForm va donc nous créer une liste d’objet dans laquelle on pourra naviguer grâce aux différents boutons situés sur le header du composant comme on peut le voir. ![image]({{ site.url }}/images/2009/08/22/silverlight-3-le-controle-dataform-img3.png "image") Donc comme on peut le voir, on peut bien entendu naviguer, mais aussi rajouter des éléments ou en supprimer. Alors voilà un petit tour sur les possibilités du DataForm, je vous rappelle que ce contrôle est dans le Silverlight Toolkit ( de la version de juillet, dans ce cas ), il est donc susceptible d’évoluer encore un peu ! _Ressource :_ Une petite vidéo de Mike Taulty sur le DataForm : [http://silverlight.net/learn/learnvideo.aspx?video=187317](http://silverlight.net/learn/learnvideo.aspx?video=187317 "http://silverlight.net/learn/learnvideo.aspx?video=187317") dans une version précédente celle de juillet, donc il y a quelques changements à effectuer si vous voulez reproduire la démonstration !
