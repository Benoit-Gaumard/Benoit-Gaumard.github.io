---
layout: post
title: Créer ses templates sous Visual Studio 2010
date: 2011-04-04
categories: [ "Divers" ]
comments_id: 62 
---

Visual Studio 2010 étant un outil formidable, il a surtout l’avantage de pouvoir être enrichi soit par des plugins, soit par de nouveaux templates de projets ou d’éléments. Nous allons voir aujourd’hui comment créer ses différents templates.

Prenons les templates de projets qui par défaut vous permettent facilement de créer des applications, cependant si vous êtes comme moi, vous êtes à chaque fois obligé de faire quelques petites modifications avant de commencer à proprement dit le code. Par exemple ajouter les différentes classes pour faire du MVVM, on va donc créer un nouveau template de projet qui contient par défaut les classes dont nous avons besoin. Pour cela rien de plus il suffit d’ouvrir Visual Studio et de créer un projet de départ qui correspond à vos besoins.

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img0.png "image")

Le nom du projet importe peu, donc vous pouvez laisser celui par défaut. Ensuite vous n’avez qu’à modifier votre projet selon vos besoins, donc dans mon exemple, il faut uniquement ajouter une classe ViewModelBase, l’implémenter et déplacer le fichier MainWindow dans un dossier Views comme on peut le voir ci dessous

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img1.png "image")

Bon c’est assez basique comme modification, mais vous pouvez rajouter bien d’autres choses, comme plus de classes, des références ! Et beaucoup de code préexistant que vous avez déjà !

Maintenant on va donc créer un template de tout ça ! Et quand je disais que Visual Studio était un outil formidable, je ne blaguais pas, puisque c’est tout simplement dans le menu File/Export Template … On a donc une fenêtre de ce type qui apparait

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img2.png "image")

On va donc pouvoir choisir de créer soit un template de projet, soit un template de fichier. Commençons donc par le template de projet :

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img3.png "image")

On va donc pouvoir le nommer, ainsi que lui ajouter une description et différentes images. De plus il est possible d’importer directement le projet dans Visual Studio, ce que l’on ne va pas faire pour le moment. Il suffit de terminer l’assistant, et là on va avoir une fenêtre explorer qui va s’ouvrir contenant un zip de notre application. On va donc l’extraire pour en analyser le contenu qui est celui-ci

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img4.png "image")

On voit donc non pas par magie notre projet accompagné d’un fichier Icône ainsi qu’un fichier appelé MyTemplate qui est en fait un fichier XML que l’on va analyser

```xml
<VSTemplate Version="3.0.0" xmlns="http://schemas.microsoft.com/developer/vstemplate/2005" Type="Project">
  <TemplateData>
    <Name>WPF Application with MVVM</Name>
    <Description>Application WPF with ViewModelBase</Description>
    <ProjectType>CSharp</ProjectType>
    <ProjectSubType>
    </ProjectSubType>
    <SortOrder>1000</SortOrder>
    <CreateNewFolder>true</CreateNewFolder>
    <DefaultName>Application WPF with MVVM</DefaultName>
    <ProvideDefaultName>true</ProvideDefaultName>
    <LocationField>Enabled</LocationField>
    <EnableLocationBrowseButton>true</EnableLocationBrowseButton>
    <Icon>__TemplateIcon.ico</Icon>
  </TemplateData>
  <TemplateContent>
    <Project TargetFileName="WpfApplication5.csproj" File="WpfApplication5.csproj" ReplaceParameters="true">
      <ProjectItem ReplaceParameters="true" TargetFileName="App.xaml">App.xaml</ProjectItem>
      <ProjectItem ReplaceParameters="true" TargetFileName="App.xaml.cs">App.xaml.cs</ProjectItem>
      <Folder Name="Properties" TargetFolderName="Properties">
        <ProjectItem ReplaceParameters="true" TargetFileName="AssemblyInfo.cs">AssemblyInfo.cs</ProjectItem>
        <ProjectItem ReplaceParameters="true" TargetFileName="Resources.resx">Resources.resx</ProjectItem>
        <ProjectItem ReplaceParameters="true" TargetFileName="Resources.Designer.cs">Resources.Designer.cs</ProjectItem>
        <ProjectItem ReplaceParameters="true" TargetFileName="Settings.settings">Settings.settings</ProjectItem>
        <ProjectItem ReplaceParameters="true" TargetFileName="Settings.Designer.cs">Settings.Designer.cs</ProjectItem>
      </Folder>
      <Folder Name="ViewModels" TargetFolderName="ViewModels">
        <ProjectItem ReplaceParameters="true" TargetFileName="ViewModelBase.cs">ViewModelBase.cs</ProjectItem>
      </Folder>
      <Folder Name="Views" TargetFolderName="Views">
        <ProjectItem ReplaceParameters="true" TargetFileName="MainWindow.xaml">MainWindow.xaml</ProjectItem>
        <ProjectItem ReplaceParameters="true" TargetFileName="MainWindow.xaml.cs">MainWindow.xaml.cs</ProjectItem>
      </Folder>
    </Project>
  </TemplateContent>
</VSTemplate> 
```

Donc on peut voir qu’il référence tout le contenu de mon template, ainsi que toutes les informations que j’ai renseigné lors de mon export. Et une dernière chose, qui est le nom par défaut du projet. Et comme on peut le voir ici “WPF Application With ViewModelBase” n’est pas un nom super sexy pour un projet, et de plus il contient des espaces, on va donc le remplacer par un simple WpfApplication. Puis en suite réinjecter le fichier Template dans le zip initialement créé, où en créer un nouveau. Il faut ensuite importer ce projet dans Visual Studio, pour cela il vous suffit d’aller dans le dossier Visual Studio, dans vos documents, et d’y ajouter votre zip comme ci-dessous

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img5.png "image")

Et là, vu que la vie est très faite, vous pouvez voir votre projet dans Visual Studio

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img6.png "image")

On notera donc qu’il est préférable de bien mettre une icône histoire que ce soit esthétiquement plus sympatique pour le développeur. Quand on créé un nouveau projet de ce type, appelé par exemple ApplicationTest, on peut voir que Visual Studio se charge bien de renommer correctement les namespaces selon la solution

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img7.png "image")

Donc maintenant qu’on a créé notre nouveau template de projet, passons au template de fichier. On va donc créer un fichier de type ViewModel, et commencer son application, on va donc avoir un rendu de ce type

```csharp
using System;

namespace WpfApplication5.ViewModels
{
    public class MainViewModel : ViewModelBase {
        public override void OnLoaded()
        {
            throw new NotImplementedException();
        }

        public override void OnUnloaded()
        {
            throw new NotImplementedException();
        }
    }
}
```

Quand on export un Item, on voit apparaître un écran qui nous permet de choisir le fichier que l’on veut exporter

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img8.png "image")

On doit ensuite ajouter les différentes références que l’on veut inclure de base dans notre fichier

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img9.png "image")

Il suffit après de l’enregistré et de le mettre dans votre dossier ItemTemplate de Visual Studio, comme on peut le voir ci-dessous.

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img10.png "image")

On le retrouve donc bien dans notre Visual Studio selon l’arborescence qu’on a défini

![image]({{ site.url }}/images/2011/04/04/creer-ses-templates-sous-visual-studio-2010-img11.png "image")

Bien entendu le nom de la classe est correctement modifié lorsqu’on créé un nouvel élément.

Voilà une petite astuce qui peut vous être utile si vous voulez encore un peu plus customiser votre Visual Studio, ou même si vous voulez modifier les projets de bases qui y sont disponibles.
