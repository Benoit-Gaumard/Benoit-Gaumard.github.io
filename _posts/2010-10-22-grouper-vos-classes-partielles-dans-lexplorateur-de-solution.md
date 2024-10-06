---
layout: post
title: Grouper vos classes partielles dans l’explorateur de solution.
date: 2010-10-22
categories: [ "Divers" ]
comments_id: 52 
---

Pour tout ceux qui programme en .Net, notamment avec C# ou VB.Net, vous avez déjà du créer des classes partielles, surtout si vous travaillez avec Entity Framework et que vous allez lu cet [article](http://blog.woivre.fr/?p=69). Vous pouvez donc, vous retrouver un jour dans ce cas avec deux classes partielles avec des noms un peu différents afin de séparer les différents méthodes pour que cela soit plus facile à lire. ![image]({{ site.url }}/images/2010/10/22/grouper-vos-classes-partielles-dans-lexplorateur-de-solution-img0.png "image") Le problème dans ce cas, c’est que les fichiers OuSuisJeService et RequestService ne sont pas placés côté à côte dans l’explorateur de solution comme on peut le voir ![image]({{ site.url }}/images/2010/10/22/grouper-vos-classes-partielles-dans-lexplorateur-de-solution-img1.png "image") Ce qui serait bien, ça serait de grouper vos fichiers, un peu à la manière des edmx ou des interfaces / code behind. Et bien vu qu’avec Visual Studio on peut presque tout faire. Il suffit pour cela d’éditer votre fichier csproj

```xml
  <ItemGroup>
    <Compile Include="GeoLoc\\GeoLoc.cs" />
    <Compile Include="OuSuisJeService.cs" />
    <Compile Include="Place.cs" />
    <Compile Include="Properties\\AssemblyInfo.cs" />
    <Compile Include="Repository.cs" />
    <Compile Include="RequestService.cs" />
    <Compile Include="Response.cs" />
    <Compile Include="User.cs" />
  </ItemGroup> 
```

Ensuite vous retrouver votre élément RequestService.cs, que vous allez modifier de cette façon :

```xml
  <ItemGroup>
    <Compile Include="GeoLoc\\GeoLoc.cs" />
    <Compile Include="OuSuisJeService.cs" />
    <Compile Include="Place.cs" />
    <Compile Include="Properties\\AssemblyInfo.cs" />
    <Compile Include="Repository.cs" />
    <Compile Include="RequestService.cs">
      <DependentUpon>OuSuisJeService.cs</DependentUpon>
    </Compile>
    <Compile Include="Response.cs" />
    <Compile Include="User.cs" />
  </ItemGroup> 
```

Il vous suffit de recharger ensuite votre projet, et voilà la magie opère ![image]({{ site.url }}/images/2010/10/22/grouper-vos-classes-partielles-dans-lexplorateur-de-solution-img2.png "image")
