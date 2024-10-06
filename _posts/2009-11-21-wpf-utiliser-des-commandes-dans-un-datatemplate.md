---
layout: post
title: WPF - Utiliser des commandes dans un DataTemplate
date: 2009-11-21
categories: [ "Divers" ]
comments_id: 33 
---

Après une très longue période sans réutiliser de technologies tel que WPF ou Silverlight, on s’aperçoit que l’on perd très vite la main. C’est donc durant un projet éclair que je me suis décidé de refaire un petit projet en utilisant le MVVM.

C’est donc confiant que je commence mon code, que je me décide à le lancer au bout d’une heure, histoire de voir ce que ça donne en dehors du Designer WPF. Mon interface ressemble donc à ce que je veux, cependant je m’aperçois que certaines de mes commandes ne marchaient pas, je passe donc 10 bonnes minutes pour trouver ce qu’il se passe et enfin corriger.

On va donc voir dans cet article un moyen de contourner la déclaration des commandes dans un DataTemplate, sans pour autant perdre en fonctionnalité.

Pour cette démonstration je vais utiliser comme base le template de MVVM qui vient de codeplex ([WPF Model-View-ViewModel Toolkit 0.1](http://wpf.codeplex.com/Release/ProjectReleases.aspx?ReleaseId=14962#DownloadId=67235)) que je vais modifier de tel sorte que ViewModelBase dérive de DependencyObject, et implémente deux méthodes abstraites qui sont OnViewReady(), et OnViewDispose(). On obtient donc ceci :

```csharp
/// <summary>
/// Provides common functionality for ViewModel classes /// </summary> public abstract class ViewModelBase : DependencyObject, INotifyPropertyChanged {
    public event PropertyChangedEventHandler PropertyChanged;

    protected void OnPropertyChanged(string propertyName)
    {
        PropertyChangedEventHandler handler = PropertyChanged;

        if (handler != null)
        {
            handler(this, new PropertyChangedEventArgs(propertyName));
        }
    }

    public abstract void OnViewReady();
    public abstract void OnViewDispose();

}
```

Note les modifications apportées ici ne sont pas nécessaire pour la démonstration, mais grâce à cela vous pouvez utiliser les DependencyProperty dans votre ViewModel, et propager les évènements Loaded et Unloaded de vos vues, vers vos ViewModel. Voilà pour l’astuce du jour !

Voici donc  la commande que nous allons utiliser :

```csharp
#region GestionCommandes
private DelegateCommand<Models.Person> editPersonCommand;

public ICommand EditPersonCommand
{
    get {
        if (editPersonCommand == null)
            editPersonCommand = new DelegateCommand<Models.Person>(EditPerson);
        return editPersonCommand;
    }
}

private void EditPerson(Models.Person person)
{
    MessageBox.Show("Ici on éditera la personne", "", MessageBoxButton.OK);
}
#endregion 
```

Bon maintenant, affichons nos données dans la vue au pas à pas. Après un binding initial on obtient quelque chose du style

```xml
<Window x:Class="WpfModelViewApplication3.Views.MainView" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" xmlns:c="clr-namespace:WpfModelViewApplication3.Commands" Title="Main Window" Height="400" Width="800">
    <Grid>
        <ListBox ItemsSource="{Binding People}" />
    </Grid>
</Window> 
```

Avec pour interface générée :

![image]({{ site.url }}/images/2009/11/21/wpf-utiliser-des-commandes-dans-un-datatemplate-img0.png "image")

Bon ceci, n’étant pas très lisible pour un client, on va donc créer un DataTemplate. Or pour des raisons de lecture, nous allons ajouter ce DataTemplate en ressources de la fenêtre.

Donc confiant, j’écris ceci :

```xml
<Window.Resources>
    <DataTemplate DataType="{x:Type localModel:Person}">
        <StackPanel Orientation="Horizontal">
            <Label Content="{Binding FirstName}" />
            <Button Content="Modifier" Margin="5 0" Command="{Binding EditPersonCommand}" CommandParameter="{Binding}" />
        </StackPanel>
    </DataTemplate>
</Window.Resources>

<Grid>
    <ListBox ItemsSource="{Binding People}" />
</Grid>
```

J’ai donc mon interface qui change en conséquence :

![image]({{ site.url }}/images/2009/11/21/wpf-utiliser-des-commandes-dans-un-datatemplate-img1.png "image")

Le problème se situe en fait lorsque je clique sur le bouton Modifier, en effet rien ne se produit. J’ai donc regardé si lors de la construction de la fenêtre il allait bien me chercher ma commande, mais il ignora mon point d’arrêt dans Visual Studio.

Alors l’astuce facile à réaliser avec ce template est d’utiliser leur CommandReference, de tel sorte :

```xml
<Window.Resources>
    <c:CommandReference x:Key="EditPerson" Command="{Binding EditPersonCommand}" />


    <DataTemplate DataType="{x:Type localModel:Person}">
        <StackPanel Orientation="Horizontal">
            <Label Content="{Binding FirstName}" />
            <Button Content="Modifier" Margin="5 0" Command="{StaticResource EditPerson}" CommandParameter="{Binding}" />
        </StackPanel>
    </DataTemplate>
</Window.Resources>

<Grid>
    <ListBox ItemsSource="{Binding People}" />
</Grid>
```

Là, notre code fonctionne comme on le souhaitait, et l’on récupère bien entendu le bon membre lors du déclenchement de la commande. En fait, ce qui a changé, nous avons déclaré la command, dans l’objet CommandReference. Notre bouton peut donc appeler la commande via le nom qu’on lui a donné. En effet, il passe par une ressource statique qui existe, et non une donnée dynamique comme il était question dans le DataTemplate.

Vous pouvez retrouvez la CommandReference dans le MVVM Toolkit, ce qui nous prouve encore une fois qu’avec des Toolkit bien pensé on optimise fortement notre temps de développement.

En espérant que cet article vous aide dans de futurs développement !
