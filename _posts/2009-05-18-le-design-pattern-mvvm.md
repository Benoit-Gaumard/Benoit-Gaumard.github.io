---
layout: post
title: Le design pattern - MVVM
date: 2009-05-18
categories: [ "Divers" ]
comments_id: 15 
---

Bon avant de commencer, désolé de vous avoir fait attendre pour cet article. Promis, je vais essayer de me rattraper d'ici les prochaines semaines ... Enfin il faudra venir voir pour savoir ! Alors le deisgn pattern MVVM signifie pour commencer **M**odel **V**iew **V**iew**M**odel, alors j'espère que cet acronyme vous rappelle celui pour le MVC (**M**odel **V**iew **C**ontroller). Celui ci a été crée principalement pour les applications en WPF ou en Silverlight, voir plus généralement les applications supportant un moteur de "_binding_" avancé. A quand le MVVM dans une application en JavaFX (Patrick si tu passes par là) Donc, à mon habitude je vais vous présenter une application implémentant ce design pattern. Donc contrairement à ce que j'avais prévu, cette application contient une liste de personne ou l'on peut afficher leurs détails. Et oui, l'application gérant les FluxRSS n'a pas été faite, puisque sans Internet la gestion de ces flux était légèrement moins pratique. Donc voici l'application au final : ![]({{ site.url }}/images/2009/05/18/le-design-pattern-mvvm-img0.png) On ne pourra s'empêcher le voir le côté design très avancée de celle ci. Quand à la solution, voici à quoi elle ressemble, ce qui est d'ailleurs la partie intéressante de la démonstration. ![]({{ site.url }}/images/2009/05/18/le-design-pattern-mvvm-img1.png)Donc ici, on peut voir le "**M**odel" situé dans le projet "MVVM.Data", la "**V**iew" dans le "MVVM.Client", et le "**V**iew**M**odel" dans le projet "MVVM.ViewModel" Bon alors, vu que j'ai décidé de parler des projets les plus intéressants, on va juste décrire les projets "MVVM.Client" et "MVVM.ViewModel" puisque l'utilisation du moteur de Binding se fait entièrement entre ces deux projets. Donc la partie "**V**iew**M**odel", regardons de plus près la classe ViewModelBase  

```csharp
public abstract class ViewModelBase : DependencyObject   
{   
    public abstract void OnViewReady(); 
    public abstract void OnViewClosed();   
}
```

On peut donc voir notre classe ViewModelBase dérivant de la classe DependencyObject, voyons donc maintenant notre classe LstPersonsViewModel

```csharp
public class LstPersonsViewModel : ViewModelBase  
{ 
    public override void OnViewReady()
    {
        Personnes = PersonRepository.LoadPerson();
    }
    
    public override void OnViewClosed()
    {

    }

    public IEnumerable<Personne> Personnes
    {   
        get { return (IEnumerable<Personne>)GetValue(PersonnesProperty); } set { SetValue(PersonnesProperty, value); }
    }

    public static readonly DependencyProperty PersonnesProperty = DependencyProperty.Register("Personnes", typeof(IEnumerable<Personne>), typeof(LstPersonsViewModel), new UIPropertyMetadata(null));

    public Personne SelectedPersonne
    {
        get { return (Personne)GetValue(SelectedPersonneProperty); }
        set { SetValue(SelectedPersonneProperty, value); }
    }

    public static readonly DependencyProperty SelectedPersonneProperty = 
        DependencyProperty.Register("SelectedPersonne", typeof(Personne), typeof(LstPersonsViewModel), new UIPropertyMetadata(null)); 
}
```

Cette classe implémente comme il se doit notre classe abstraite, on peut donc voir nos deux méthodes, celle pour le OnViewReady() permet d'initialiser nos données, de les charger depuis la base, ou comme ici en dur depuis notre projet "MVVM.Repository" On déclare ici, de plus deux DependencyProperty afin de pouvoir les injecter dans notre vue par la suite. Passons maintenant à la vue. Notre vue est basé sur un ControlBase générique contenant un objet dérivant de notre ViewModelBase, et on lie les méthodes OnViewReady() et OnViewClose() à ce control :

```csharp
public abstract class ControlBase<TViewModel> : UserControl where TViewModel : ViewModelBase 
{
    public TViewModel ViewModel { get; protected set; }

    public ControlBase()
    {
        Loaded += delegate { if (ViewModel != null) ViewModel.OnViewReady(); };
        Unloaded += delegate { if (ViewModel != null) ViewModel.OnViewClosed(); };
    } 
}
```

Les deux classes DelegateCommand et DelegateCommandWithParam permettent d'appeler différentes command depuis la vue grâce au Controller. Je vous laisse donc regarder ces deux classes, qui implémentent l'interface ICommand. Notre classe Controller maintenant :

```csharp
public static ICommand NavigateUri 
{
    get 
    { 
        return new DelegateCommandWithParam<Uri>(OnNavigateUri); 
    } 
} 
private static void OnNavigateUri(Uri uri) 
{
    Process.Start(new ProcessStartInfo(uri.AbsoluteUri));
} 
public static ICommand StartApplication 
{
    get { return new DelegateCommand(OnStartApplication); } 
}

private static void OnStartApplication() 
{
    Window window = Application.Current.MainWindow; if (window == null)

    window = new Window1();

    if (window.Visibility != Visibility.Visible)
    {   
        window.Dispatcher.BeginInvoke(
            DispatcherPriority.Send, new Action(() => window.Show()));
    }
    Application.Current.MainWindow = window;
}
```

On peut voir ici la déclaration de deux commandes, la première sert pour naviguer vers les différents sites des personnes présentes dans l'application. et la deuxième permet de gérer le démarrage de l'application. Maintenant voici la partie Xaml de notre application :

```xml
<local:ControlBase
    x:Class="MVVM.Client.LstPersons"
    x:TypeArguments="viewModel:LstPersonsViewModel"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:local="clr-namespace:MVVM.Client"
    xmlns:viewModel="clr-namespace:MVVM.ViewModel;assembly=MVVM.ViewModel"> 
<Grid>
    <Grid.RowDefinitions>
        <RowDefinition Height="250" />
        <RowDefinition Height="Auto" />
    </Grid.RowDefinitions>
    
    <ListView x:Name="lst_Personnes" ItemsSource="{Binding Personnes}" IsSynchronizedWithCurrentItem="True" SelectedItem="{Binding SelectedPersonne}" >
        <ListView.ItemTemplate>
            <DataTemplate>
                <StackPanel Orientation="Horizontal">
                    <TextBlock Text="{Binding Prenom}" />
                    <TextBlock Text="{Binding Nom}" Margin="5,0,0,0" />
                </StackPanel>
            </DataTemplate>
        </ListView.ItemTemplate>
    </ListView>
    
    <Grid Grid.Row="1">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto" />
            <RowDefinition Height="Auto" />
            <RowDefinition Height="Auto" />
        </Grid.RowDefinitions>

        <StackPanel Orientation="Horizontal">
            <TextBlock Text="{Binding SelectedPersonne.Prenom}" />
            <TextBlock Text="{Binding SelectedPersonne.Nom}" Margin="5,0,5,0" />
        </StackPanel>
        
        <TextBlock Grid.Row="1">
            <Hyperlink Command="local:Controller.NavigateUri" CommandParameter="{Binding SelectedPersonne.SiteInternet}" >
                <TextBlock Text="Site Internet" />
            </Hyperlink>
        </TextBlock>

        <TextBlock Grid.Row="2" Text="{Binding SelectedPersonne.NomEntreprise}" />

    </Grid>
 </Grid>
</local:ControlBase>
```

 Donc maintenant regardons uniquement les parties intéressantes de ce fichier Xaml, on intègre les deux namespaces "MVVM.Client" et "MVVM.ViewModel", et on ajoute bien entendu le ControlBase et son argument pour la création de ce fichier Xaml, afin qu'on puisse profiter de notre classe précédemment créer. Maintenant passons aux commandes, celle de démarrage je vous l'épargne pour le moment, mais elle intervient lors du démarrage de l'application "OnStartupApplication" dans App.xaml.cs. Donc on voit l'appelle d'une commande avec paramètre dans le composant Hyperlink. Command="local:Controller.NavigateUri" Ici, on voit l'appel de notre commande, puis on passe notre paramètre avec cet attribut : CommandParameter="{Binding SelectedPersonne.SiteInternet}" Pour le reste, en fait la classe DelegateCommandWithParam s'occupe de relayer et d'exécuter cette action. Edit : Alors depuis que j'ai installé Visual Studio 2010, autant profiter de ces fonctionnalités. Voici un schéma des différentes liaisons entre mes Namespaces, j'ai seulement laissé ceux en liaison avec le MVVM bien entendu. ![Schéma liaison Namespace]({{ site.url }}/images/2009/05/18/le-design-pattern-mvvm-img2.png "Schéma liaison Namespace") Alors une fois n'est pas coutume, voici les sources de la solution:

[![]({{ site.url }}/images/2009/05/18/le-design-pattern-mvvm-img3.png)](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/MVVM.zip)

Toutefois, je souhaite remercier [Fabrice Marguerie (MVP)](http://weblogs.asp.net/fmarguerie/default.aspx) pour ces différents liens sur le MVVM qu'il m'a fourni, ainsi qu'une application fortement détaillé implémentant ce design pattern.
