---
layout: post
title: Silverlight 5 - Arrivée de l’Ancestor RelativeSource Binding
date: 2011-04-13
categories: [ "Divers" ]
comments_id: 63 
---

Et oui, le voilà, comme quoi, on n’arrête pas le progrès dans Silverlight !

Une petite démonstration sur l’ancestor RelativeSource Binding pour commencer cette soirée ….

Je vous ai montré à plusieurs reprises comment lier vos commandes ou vos actions de vos datatemplate compris dans des ItemsControl à des méthodes de vos ViewModel !

Vous avez donc accès à une solution qui pouvait être amélioré mais qui était tout de même bien pratique, vous pouvez la retrouver [ici](http://blog.woivre.fr/?p=295) ou [là](http://blog.woivre.fr/?p=501) en vidéo.

On va déjà commencer par créer une application en Silverlight 5 !

![image]({{ site.url }}/images/2011/04/13/silverlight-5-arrivee-de-lancestor-relativesource-binding-img0.png "image")

Ensuite on va créer notre ViewModel de façon on ne peut plus classique

```csharp
public class MainViewModel : ViewModelBase {
    private readonly ObservableCollection<Person\> _people = new ObservableCollection<Person>();
    public ObservableCollection<Person\> People
    {
        get { return _people; }
    }

    private ICommand _callCommand;
    public ICommand CallCommand
    {
        get { return \_callCommand ?? (\_callCommand = new RelayCommand<Person>(Call)); }
    }

    public MainViewModel()
    {
        People.Add(new Person() { FirstName = "Wilfried", LastName = "Woivré" });
        People.Add(new Person() { FirstName = "Harry", LastName = "Cover" });
    }

    public void Call(Person person)
    {
        MessageBox.Show(string.Format("Call Person : {0} {1}", person.FirstName, person.LastName));
    }

    public void Call()
    {
        MessageBox.Show("Call Method");
    }
}
```

On lie correctement notre Vue à notre ViewModel, comme cela :

```csharp
public partial class MainPage : UserControl {
    public MainPage()
    {
        InitializeComponent();
        this.Loaded += (sender, e) => this.DataContext = new MainViewModel();
    }
}
```

Et maintenant passons à la vue, puisque le model c’est juste deux propriétés ….

```xml
    <Grid x:Name="LayoutRoot" Background="White">

        <ListBox ItemsSource="{Binding People}">
            <ListBox.ItemTemplate>
                <DataTemplate>
                    <StackPanel Orientation="Horizontal">
                        <Button Content="CallMethodAction" Margin="5"  >
                            <i:Interaction.Triggers>
                                <i:EventTrigger EventName="Click">
                                    <ei:CallMethodAction MethodName="Call" TargetObject="{Binding DataContext, RelativeSource={RelativeSource AncestorType=UserControl}}" />
                                </i:EventTrigger>
                            </i:Interaction.Triggers>
                        </Button>
                        <Button Content="Command" Margin="5" >
                            <i:Interaction.Triggers>
                                <i:EventTrigger EventName="Click">
                                    <i:InvokeCommandAction Command="{Binding DataContext.CallCommand, RelativeSource={RelativeSource AncestorType=UserControl}}" CommandParameter="{Binding}"/>
                                </i:EventTrigger>
                            </i:Interaction.Triggers>
                        </Button>
                        <TextBlock Text="{Binding FirstName}" Margin="5" />
                        <TextBlock Text="{Binding LastName}" Margin="5" />
                    </StackPanel>
                </DataTemplate>
            </ListBox.ItemTemplate>
        </ListBox>
    </Grid> 
```

Et donc quelle est la principale différence par rapport à avant, c’est l’apparition de RelativeSource={RelativeSource AncestorType=UserControl} , cela permet d’appeler notre command ou notre méthode selon le DataContext lié à notre UserControl, nous n’avons donc plus besoin de passer via une méthode dans une classe partielle du model !

Vous pouvez retrouver les sources de la solution [ici](http://cid-27033cda87e10205.office.live.com/self.aspx/Blog/AncestorRelativeSourceBinding.zip)

Pour plus d’infos sur les autres nouveautés de Silverlight 5, je vous conseille le [blog de Tim Heuer](http://timheuer.com/blog/archive/2011/04/13/whats-new-in-silverlight-5-a-guide.aspx)
