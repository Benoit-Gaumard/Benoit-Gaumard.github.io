---
layout: post
title: Copier du code depuis Visual Studio dans Live Writer
date: 2009-05-26
categories: [ "Divers" ]
comments_id: 16 
---

Bonjour à tous, Bon pas vraiment un article technique, mais tout ceux qui utilise Live Writer, comme moi, pour écrire leurs articles ne peuvent s’empêcher de s'apercevoir qu’il manque un bon plug-in pour copier du code depuis Visual Studio. Et bien ce matin en trainant sur un de mes flux RSS, j’ai trouvé ce [lien](http://gallery.live.com/liveItemDetail.aspx?li=d8835a5e-28da-4242-82eb-e1a006b083b9&bt=9&pl=8) qui vous permets de rajouter dans vos options d’insertion la possibilité d’ajouter du code HTML depuis votre Visual Studio, il conserve ainsi l’indentation, et les couleurs ! Petit exemple pour vous montrer :

```csharp
public class DelegateCommandWithParam<TParam> : ICommand {
    private Action<TParam> _handler;
    private Boolean _IsEnabled = true;

    public event EventHandler CanExecuteChanged;

    public Boolean IsEnabled
    {
        get { return _IsEnabled; }
        set {
            _IsEnabled = value;
            OnCanExecuteChanged();
        }
    }
```

[](http://11011.net/software/vspaste)

```xml
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
```

[](http://11011.net/software/vspaste)Et voilà, finis vos longues heures à changer les couleurs ou à devoir passer par Word et ensuite ré-indenter le code
