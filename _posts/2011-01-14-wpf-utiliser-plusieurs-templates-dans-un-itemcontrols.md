---
layout: post
title: WPF - Utiliser plusieurs templates dans un ItemControls
date: 2011-01-14
categories: [ "Divers" ]
comments_id: 59 
---

Dans certains cas d’utilisation, il peut vous arriver de vouloir utiliser différents templates dans un ItemControls tel qu’une listbox. Prenons par exemple, un cas concret, soit twitter, si vous voulez réaliser un client WPF pour ce célèbre réseau sociaux, vous pouvez avoir envie de définir différents templates pour les messages que vous avez envoyé, ou ceux que vous recevez (comme on peut le voir dans de nombreux clients).

Le soucis c’est que pour réaliser cela, on voudrait afficher une listbox avec les dernières activités, et donc mixer les templates dans cet ItemControl. Ce qu’on peut faire c’est donc d’utiliser des DataTemplate que l’on va typer selon l’objet. Comment cela marche.

Prenons un cas plus simple d’un model objet de ce type :

![image]({{ site.url }}/images/2011/01/14/wpf-utiliser-plusieurs-templates-dans-un-itemcontrols-img0.png "image")

On a donc une classe Figure, dont tous nos éléments que l’on souhaite afficher vont dériver de cette classe.

Après il nous suffit de déclarer en XAML nos différents DataTemplate en ressources de cette façon :

```xml
    <Window.Resources>
        <DataTemplate DataType="{x:Type Model:Rectangle}">
            <Rectangle Height="20" Width="60" Fill="Blue" Margin="2" />
        </DataTemplate>
        <DataTemplate DataType="{x:Type Model:Ellipse}">
            <Ellipse Height="20" Width="40" Fill="Red" Margin="2" />
        </DataTemplate>
    </Window.Resources> 
```

On va donc typer nos différents DataTemplate grâce à la propriété DataType. Il nous suffit donc de créer notre jeu de données de façon on ne peut plus classique.

```csharp
private void InitData()
{
    var figures = new List<Model.Figure>();
    figures.Add(new Model.Rectangle());
    figures.Add(new Model.Rectangle());
    figures.Add(new Model.Ellipse());
    figures.Add(new Model.Ellipse());
    figures.Add(new Model.Rectangle());
    figures.Add(new Model.Ellipse());

    this.DataContext = figures;
}
```

Et ensuite de les lier à notre ItemControls de la même façon :

```xml
<ListBox ItemsSource="{Binding}" /> 
```

Et voilà, ces quelques lignes vous donnent le rendu souhaité

![image]({{ site.url }}/images/2011/01/14/wpf-utiliser-plusieurs-templates-dans-un-itemcontrols-img1.png "image")

Tout le code est dans l’article, donc pas besoin que je fournisse le projet de démo!

Merci à [Pascal Louveau](http://plouveau.wordpress.com/) de m’avoir posé la question.
