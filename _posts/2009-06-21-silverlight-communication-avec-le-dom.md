---
layout: post
title: Silverlight - Communication avec le DOM
date: 2009-06-21
categories: [ "Divers" ]
comments_id: 20 
---

Alors un peu de ma vie, récemment au travail on m’a demandé les possibilités d’interaction entre Silverlight et une page ASPX. Donc bon après une réponse brêve et j’espère explicite de ma part, que ce qu’il envisageait de faire est totalement possible, et plus puissant via le code DOM ! Bon après coup, je me suis dis qu’il serait tout de même bien de faire une petite démonstration des possibilités qu’offre Silverlight pour la communication avec le DOM :) Alors on va partir d’une application toute simple qui ne comporte qu’un bouton en XAML. Pour mon projet, j’ai ajouté sur chacune des pages hébergeant mon application Silverlight, une div ayant un ID=”MyDiv”. Nous avons donc ceci lorsque nous lançons l’application : ![image]({{ site.url }}/images/2009/06/21/silverlight-communication-avec-le-dom-img0.png "image") On voit bien mon bouton, et ma div dans le code DOM. Maintenant, lorsque l’on clique sur le bouton Silverlight on obtient ceci : ![image]({{ site.url }}/images/2009/06/21/silverlight-communication-avec-le-dom-img1.png "image") On voit bien que sans modifier la page HTML/ASPX dans laquelle est hébergée mon application, le code DOM a bien été modifié. Maintenant voyons l’action engendrée par le click sur le bouton “Create HTML Page”

```csharp
private void Button_Click(object sender, RoutedEventArgs e)
{
    HtmlElement host = HtmlPage.Document.GetElementById("MyDiv");

    HtmlElement table = HtmlPage.Document.CreateElement("table");
    HtmlElement tr = HtmlPage.Document.CreateElement("tr");

    HtmlElement tdName = HtmlPage.Document.CreateElement("td");
    HtmlElement labelName = HtmlPage.Document.CreateElement("label");
    labelName.SetAttribute("innerText", "Valeur : ");
    tdName.AppendChild(labelName);
    tr.AppendChild(tdName);

    HtmlElement tdValue = HtmlPage.Document.CreateElement("td");
    HtmlElement inputValue = HtmlPage.Document.CreateElement("input");
    inputValue.SetAttribute("type", "text");
    inputValue.SetAttribute("id", "inputValue");
    tdValue.AppendChild(inputValue);
    tr.AppendChild(tdValue);

    HtmlElement tdSubmit = HtmlPage.Document.CreateElement("td");
    HtmlElement inputSubmit = HtmlPage.Document.CreateElement("input");
    inputSubmit.SetAttribute("type", "button");
    inputSubmit.SetAttribute("id", "inputSubmit");
    inputSubmit.SetAttribute("value", "Valider");

    inputSubmit.AttachEvent("onclick", (object s, EventArgs ea) =>
        {
            HtmlElement value = HtmlPage.Document.GetElementById("inputValue");
            String v = value.GetAttribute("value");
            HtmlPage.Window.Alert(String.Concat("Value is : ", v));
        });

    tdSubmit.AppendChild(inputSubmit);
    tr.AppendChild(tdSubmit);

    table.AppendChild(tr);
    host.AppendChild(table);
}
```csharp

Alors dans ce code, on se sert essentiellement des classes HTMLPage et HTMLElement comme vous pouvez le voir ! Donc dans ce petit bout de méthode, l’on va créer un tableau qui contiendra notre libellé , notre valeur à saisir, et notre bouton valider. On ajoute de plus un évènement au click de son bouton, qui va tout simplement nous afficher une Alerte javascript contenant la valeur de notre textbox. Donc bien, entendu, en Silverlight, on ne peut pas uniquement lire et écrire dans le DOM, on peut aussi appeler des fonctions JavaScript depuis Silverlight et vice-versa, mais cela je vous l’ai montré dans le post précédent. Donc avec tout cela, vous pourrez faire tout ce que voulez pour intégrer correctement des projets Silverlight dans vos applications Web. Je ne vous fournis pas la démo cette fois-ci, puisque tout le code est là :)
