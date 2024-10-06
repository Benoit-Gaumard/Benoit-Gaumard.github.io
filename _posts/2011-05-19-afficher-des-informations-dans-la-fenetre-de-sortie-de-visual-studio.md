---
layout: post
title: Afficher des informations dans la fenêtre de sortie de Visual Studio
date: 2011-05-19
categories: [ "Divers" ]
comments_id: 65 
---

Quand on fait du XAML que ce soit en WPF, Silverlight ou WP7, on est bien heureux de voir apparaitre ces petits messages d’erreur dans la fenêtre de sortie lorsque l’on est en mode debug de notre application !

Ici comme on peut le voir il s’agit uniquement d’une erreur de binding, qui nous informe que la propriété “FirstName” n’a pas été trouvée :

![image]({{ site.url }}/images/2011/05/19/afficher-des-informations-dans-la-fenetre-de-sortie-de-visual-studio-img0.png "image")

Et si on voyait comment ajouter nos propres messages dans cette fenêtre, et bien tout est là pour nous aider, c’est très facilement faisable grâce au namespace System.Diagnotics

```csharp
this.Loaded += (sender, e) => System.Diagnostics.Debug.Print("Message perso => Un petit test ?");
```

On obtient en mode DEBUG, notre message personnel dans la fenêtre de sortie

![image]({{ site.url }}/images/2011/05/19/afficher-des-informations-dans-la-fenetre-de-sortie-de-visual-studio-img1.png "image")

Et comme la vie est bien faite, en mode release, rien n’apparait !

Bon bien entendu, rien ne sert de polluer cette fenêtre outre mesure, mais c’est toujours mieux qu’une trentaine de message box d’information pour lancer votre programme et être sûr que tout ce passe bien !
