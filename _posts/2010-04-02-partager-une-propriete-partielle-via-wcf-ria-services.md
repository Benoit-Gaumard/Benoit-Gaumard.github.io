---
layout: post
title: Partager une propriété “partielle” via WCF RIA Services
date: 2010-04-02
categories: [ "Divers" ]
comments_id: 44 
---

J’ai présenté dans un précédent article la méthode pour ajouter une propriété à une entité issue d’un modèle Entity Framework (ou Linq To Sql) –> [http://blog.woivre.fr/blog/2009/03/21/entity-framework-trucs-et-astuces/](http://blog.woivre.fr/blog/2009/03/21/entity-framework-trucs-et-astuces/ "http://blog.woivre.fr/blog/2009/03/21/entity-framework-trucs-et-astuces/")

Pour le résumé, on ajoute une propriété Total via une classe partielle sur la classe Order.

```csharp
public partial class Order  
{  
    public decimal Total  
    {  
        get { return Order_Details.Sum(n => n.Quantity * n.UnitPrice); }  
    }  
}
```

Maintenant si on essaye de faire la même chose, afin de récupérer notre Total via RIA Services on s’aperçoit qu’on a un léger problème lorsqu’on regarde les différentes sources de données disponibles dans Silverlight via RIA Services.

![image]({{ site.url }}/images/2010/04/02/partager-une-propriete-partielle-via-wcf-ria-services-img0.png "image")

Afin de rajouter notre propriété personnalisée dans notre composant Silverlight, il suffit simplement de rajouter un attribut DataMemberAttribute sur Total.

```csharp
public partial class Order  
{  
    [DataMemberAttribute]  
    public decimal Total  
    {  
        get { return Order_Details.Sum(n => n.Quantity * n.UnitPrice); }  
    }  
}
```

En fait, il suffit simplement d’ajouter cet attribut, puis que WCF RIA Services est comme son noml’indique basé sur un service WCF.
