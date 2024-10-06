---
layout: post
title: Linqpad - Nouvelles fonctionnalités
date: 2018-08-22
categories: [ "Outils" ]
comments_id: 144 
---

Suite à un tweet de Joe Albahari pour la nouvelle beta de Linqpad qui annonce entre autre la fonctionnalité **Interactive Regex Utility**, j'ai décidé de la tester, et j'ai vu qu'il y a quelques autres fonctionnalités bien cools qui sont dedans !

Si comme moi vous utilisez Linqpad quasiment quotidiennent, il est là pour vous aider dans les cas suivants :

* Eviter la création de la consoleApp1243525
* Création d'algorithme
* Tests de fonctionnalités
* Debug

Maintenant vous allez pouvoir vous en servir pour créer des utilitaires, un peu comme la fonctionnalité présentée dans le tweet.

Voici un exemple très simple :

```csharp
void Main()
{
 DumpContainer results = new DumpContainer();
 TextArea input = new TextArea(onTextInput: sender => {
  results.Content = sender.Text;
 });
 input.Dump("Input Text"); 
 results.Dump("Outputs");
}
```

Si vous exécuter cela dans la dernière version beta de LinqPad (la 5.33.7), vous obtiendrez le résultat suivant :

![image]({{ site.url }}/images/2018/08/22/linqpad-nouvelles-fonctionnalites-gif0.gif "gif")

Vous pourrez retrouver l'ensemble du patch note de Release sur ce site : [https://www.linqpad.net/download.aspx#beta](https://www.linqpad.net/download.aspx#beta)
