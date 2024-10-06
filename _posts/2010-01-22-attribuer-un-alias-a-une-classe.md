---
layout: post
title: Attribuer un alias à une classe
date: 2010-01-22
categories: [ "Divers" ]
comments_id: 39 
---

Dans la création de gros site ASP.Net, on se retrouve souvent avec des sites qui contiennent de nombreuses pages ou UserControl, pour éviter que notre projet devienne ne soit dévasté par la pollution de page ou UserControl, il faut créer des dossiers et des sous dossiers pour qu’on puisse facilement si retrouver.

On va donc classiquement créer un dossier User qui regroupera toutes les pages et user control concernant les utilisateurs du site. Jusque là rien de bien surprenant, on va créer une page du type de celle-ci :

```csharp
namespace WebApplication3.User
{
    public partial class EditUser : System.Web.UI.Page {
        protected void Page_Load(object sender, EventArgs e)
        {

        }
    }
}
```

On a donc bien dans notre page WebApplication3.User.EditUser, on va donc vouloir récupérer notre utilisateur à éditer, qui est un objet de type User, on va donc commencer par appeler notre objet métier en créant une méthode GetUser, et là on a un problème, en effet notre entité User n’est pas trouvé, mais il trouve un namespace.

![image]({{ site.url }}/images/2010/01/22/attribuer-un-alias-a-une-classe-img0.png "image")

Ceci est donc parfaitement normal puisqu’il n’y a pas de référence et using vers ce objet de type métier dans notre cas pour le moment, cependant Visual Studio ne nous le propose pas contrairement à d’habitude. On va donc l’ajouter à la main…

Mais là même erreur, en effet Visual Studio est totalement perdu, il ne sait pas s’il s’agit d’un type ou d’un namespace. Et pourtant à cet endroit du code, un namespace serait légèrement mal placé.

On a donc 2 solutions qui s’offrent à nous, soit passé par le nom complet, soit ici Entities.User, soit ajouter un alias dans les using :

```csharp
using EntityUser = Entities.User;

namespace WebApplication3.User
{
    public partial class EditUser : System.Web.UI.Page {
        public EntityUser GetCurrentUser()
        {
            throw new NotImplementedException();
        }
```

Notre application compilera donc sans soucis, on a juste ajouté un alias à la classe Entities.User afin que notre Visual Studio ne soit pas chamboulé par tous ces noms de classes, namespaces ou on n’a jamais d’idée pour les nommer.
