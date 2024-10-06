---
layout: post
title: Customiser une ListBox en WPF
date: 2009-11-29
categories: [ "Divers" ]
comments_id: 35 
---

Il est très courant en WPF que l’on doivent redéfinir le rendu des composants de base afin d’avoir une interface plus ergonomique pour l’utilisateur.

Prenons par exemple le cas d’une ListBox de personne, qui ressemblerait à peu près à ça :

![image]({{ site.url }}/images/2009/11/29/customiser-une-listbox-en-wpf-img0.png "image")

Pour ce code XAML :

```xml
<ListBox ItemsSource="{Binding}">
    <ListBox.ItemTemplate>
        <DataTemplate>
            <TextBlock>
                <TextBlock.Text>
                    <MultiBinding StringFormat="{}{0} {1}">
                        <Binding Path="FirstName" />
                        <Binding Path="LastName" />
                    </MultiBinding>
                </TextBlock.Text>
            </TextBlock>
        </DataTemplate>
    </ListBox.ItemTemplate>
</ListBox>
```

Maintenant, on va supposer que le client veut que tous les Items soit placé, non pas l’un en dessous de l’autre, mais disperser au niveau de la fenêtre selon différents critères. Il voudrait donc que l’interface ressemble à quelque chose de ce genre :

![image]({{ site.url }}/images/2009/11/29/customiser-une-listbox-en-wpf-img1.png "image")

Donc là on voit clairement que selon les besoins des spécifications, les items de la liste ne sont ni vraiment ordonnées, mais plus vraisemblablement placé au hasard dans l’application. Cependant on a tout de même bien affaire à une liste d’élément.

Nous avons donc plusieurs choix qui s’offre à nous, le premier est de créer un Canvas, ou l’on ajoute les éléments 1 à 1 en code behind. Ce choix peut être pas trop mal, mais va de ce fait nécessité un peu de code, et la maintenance sur cet ajout de composant peut rapidement devenir compliqué, surtout si vous voulez “binder” les différents champs.

Notre deuxième choix serait donc de customiser la ListBox, ce qui permettrait uniquement grâce au binding de placer nos Items, sans nous embêter, et de plus nous pourrons rendre ça plus facilement dynamique. Donc, pour cela, on va commencer par faire des tests, on va changer la propriété ItemsPanelTemplate, pour y mettre un Canvas.

```xml
        <ListBox ItemsSource="{Binding}">
            <ListBox.ItemsPanel>
                <ItemsPanelTemplate>
                    <Canvas />
                </ItemsPanelTemplate>
            </ListBox.ItemsPanel>
            <ListBox.ItemTemplate> 
```

Puis après, nous allons ajouter deux propriétés à notre objet Personne afin d’y spécifier les coordonnées X et Y de l’item dans la ListBox, notons qu’on pourrait ajouter ces propriétés d’une autre manière, mais là ce n’est qu’une démonstration….

Ceci fait, nous allons maintenant lier les positions aux propriétés Canvas.Top et Canvas.Left de notre TextBlock. Alors déjà premier petit problème, l’intellisense ne nous fournit pas ces propriétés dans notre DataTemplate, on peut donc se dire que cela provient d’un bug de l’Intellisense, après tout Visual Studio 2008 et le XAML n’apporte pas beaucoup d’aide là ou il le faudrait. Donc on va tout de même le taper et voir si ça compile.

```xml
                <DataTemplate>
                    <TextBlock Canvas.Top="{Binding Pos.Y}" Canvas.Left="{Binding Pos.X}">
                        <TextBlock.Text> 
```

Et là c’est magique, Visual Studio compile correctement le projet, ne signale aucune erreur, n’annonce pas de problème de binding dans la sortie. Mais par contre l’application quand à elle ne marche pas comme on le souhaite, car on obtient ceci :

![image]({{ site.url }}/images/2009/11/29/customiser-une-listbox-en-wpf-img2.png "image")

On voit ici très bien qu’il ne prend pas en compte nos coordonnées, on se dit maintenant que Visual Studio avait peut être raison de ne pas nous proposer les propriétés Canvas.Left et Canvas.Top sur notre TextBlock.

Après un peu de réflexion, on se dit qu’il faudrait essayer de définir un style à notre Item, et là encore, la ListBox, est bien équipé pour ça, avec sa propriété ItemContainerStyle.

```xml
            <ListBox.ItemContainerStyle>
                <Style>
                    <Setter Property="Canvas.Left" Value="{Binding Pos.X}" />
                    <Setter Property="Canvas.Top" Value="{Binding Pos.Y}" />
                </Style>
            </ListBox.ItemContainerStyle> 
```

On enlève maintenant nos propriétés de la TextBlock , vu que visiblement elles ne fonctionnent pas, et puis on relance notre application. On obtient donc ainsi notre joli fenêtre :

![image]({{ site.url }}/images/2009/11/29/customiser-une-listbox-en-wpf-img3.png "image")

Alors, effectivement comme ça on peut ne pas trop voir l’utilité de repositionner chacun des Items, en fait c’est parce que pour mon projet Imagine Cup, je suis en train de réaliser une ListBox ou les items sont disposés sous forme de cercle. Mais je ne vous dévoile pas tout !

D’ailleurs j’en profite pour passer une annonce, si vous connaissez un étudiant sur Paris qui est intéressé par les technologies comme le XAML, ainsi que l’ergonomie et le design d’application, notre équipe recherche quelqu’un, vous pouvez donc m’envoyer un mail à wilfried.woivre\[at\]gmail.com.
