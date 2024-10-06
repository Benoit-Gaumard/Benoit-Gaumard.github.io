---
layout: post
title: Silverlight 3 et les EasingFunction
date: 2009-04-27
categories: [ "Divers" ]
comments_id: 14 
---

Hier, entre 2 moments d'implémentation d'une future démonstration sur le WPF et le MVVM, je me renseigne un peu sur Silverlight 3, il faut bien monter en version de temps en temps ! Bref, mylife.com n'ayant pas lieu ici (du moins pas encore), j'ai trouvé les EasingFunction sous Silverlight 3. Alors j'ai pensé à vous, je vous ai fait un petit projet de démonstration afin de vous montrer comment c'est très sympathique ! Vous aurez les sources ci dessous bien entendu ! Donc, je suis parti d'une interface très simple regroupant les différents types d'EasingFunction, ainsi que les différents modes, j'ai rajouté un bouton, ainsi qu'un cercle à mon application, ce qui donne au final cela :

![]({{ site.url }}/images/2009/04/27/silverlight-3-et-les-easingfunction-img0.png)

Donc une interface simple et pourtant très efficace, dans l'évènement "Click" de mon bouton, je récupère à la fois le mode et le type de la fonction, ensuite j'exécute le Storyboard suivant :

![]({{ site.url }}/images/2009/04/27/silverlight-3-et-les-easingfunction-img1.png)

Je modifie par la suite ce Storyboard lors du click du bouton:

![]({{ site.url }}/images/2009/04/27/silverlight-3-et-les-easingfunction-img2.png)

Voilà, grâce à cette application rapide (codé en à peine 20min), vous pouvez voir un exemple de toutes les animations

[![]({{ site.url }}/images/2009/04/27/silverlight-3-et-les-easingfunction-img3.png)](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/DemoEasingFunction.zip)

Modification : Oui je sais, beaucoup de monde les as vu avant, mais j'avoue qu'en ce moment, je ne travaille pas vraiment sur Silverlight 3 !
