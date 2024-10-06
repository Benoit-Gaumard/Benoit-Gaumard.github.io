---
layout: post
title: Cas Pratique - Utilisation d'un Repeater à l'intérieur d'un UpdatePanel
date: 2009-03-30
categories: [ "Divers" ]
comments_id: 11 
---

Aujourd'hui , lors de la réalisation d'un projet, on m'a demandé de gérer l'ajout de multi pièces jointes dans notre solution Web. En sachant que l'utilisateur peut choisir deux types de documents. Pour la partie technique notre projet est un projet ASP.Net 2.0 avec très forte utilisation du JavaScript dans celui ci. Dans l'implémentation du projet, nous avons déjà crée un module de pièce jointe qui ouvre une popup et qui permet d'ajouter un de nos fichiers, et renseigne la fenêtre mère en JavaScript afin d'obtenir une meilleure navigation De façon simplifié, voilà ce qu'on doit avoir : Etat avec 0 pièces jointes :

![]({{ site.url }}/images/2009/03/30/cas-pratique-utilisation-dun-repeater-a-linterieur-dun-updatepanel-img0.png)

On ajoute une pièce jointe :

![]({{ site.url }}/images/2009/03/30/cas-pratique-utilisation-dun-repeater-a-linterieur-dun-updatepanel-img1.png)

Etat avec 1 pièces jointes :

![]({{ site.url }}/images/2009/03/30/cas-pratique-utilisation-dun-repeater-a-linterieur-dun-updatepanel-img2.png)

Ceci est donc possible avec un nombre infini de pièces jointes. L'idée est donc d'utiliser un repeater placé dans un UpdatePanel afin d'obtenir un postback asynchrone. J'ai donc réalisé cette première implémentation :

```xml
<asp:UpdatePanel ID="UpdatePanel1" runat="server">
    <Triggers>
        <asp:AsyncPostBackTrigger ControlID="hf" EventName="ValueChanged" />
    </Triggers>
    <ContentTemplate>
        <asp:HiddenField runat="server" ID="hf" OnValueChanged="hf_ValueChanged" />
        <asp:Repeater runat="server" ID="repeat" OnItemDataBound="repeat_ItemDataBound">
            <ItemTemplate>
            <UC:PieceJointe runat="server" ID="pjnew" PJ='<%\# Container.DataItem %>' />
        </ItemTemplate>
        </asp:Repeater>
    </ContentTemplate\> 
</asp:UpdatePanel\>
```

 Néanmoins, même avec l'ajout du Trigger, le postback asynchrone ne s'effectue pas du fait que la modification du contenu d'un HiddenField ne soulève pas un PostBack (ceci dit fort heureusement, sinon le composant perdrait de son intérêt). Après donc recherche sur internet pour effectuer ce fameux postBack j'ai trouvé cette méthode Javascript :

```javascript
function postBackHiddenField(hiddenFieldID) {
    var hiddenField = $get(hiddenFieldID);
    if (hiddenField) { 
        hiddenField.value = "";
        __doPostBack(hiddenFieldID, '');  
    }
}
```

Grâce à cette fonction, le postBack s'effectue et je peux ainsi reconstruire mon Repeater pour afficher toutes les pièces jointes choisies par l'utilisateur. Voilà, je voulais vous faire partager la solution à un problème que j'ai eu aujourd'hui. Je vous mets de plus, la version simple (celle utilisé pour l'article) afin que vous ayez plus de détails sur l'implémentation.

[![]({{ site.url }}/images/2009/03/30/cas-pratique-utilisation-dun-repeater-a-linterieur-dun-updatepanel-img3.png)](http://cid-27033cda87e10205.skydrive.live.com/embedrow.aspx/Blog/Demonstration.zip)
