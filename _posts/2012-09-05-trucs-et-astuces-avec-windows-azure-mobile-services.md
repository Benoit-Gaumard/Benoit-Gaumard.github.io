---
layout: post
title: Trucs et astuces avec Windows Azure Mobile Services
date: 2012-09-05
categories: [ "Azure", "Mobile App Services" ]
comments_id: 91 
---

Vu que c’est la dernière nouveauté de Windows Azure, vous comprendrez qu’en ce moment je joue avec toute la journée, donc voilà des petits trucs et astuces que je peux vous donner pour vous aider lorsque vous développez avec ce SDK, donc pour une application de type Metro !

Déjà pour instancier votre client mobile, et créer une table, il faut réaliser un code de ce type

```csharp
MobileServiceClient _mobileServiceClient = new  MobileServiceClient(_mobileServiceUrl, _mobileServiceKey);  
IMobileServiceTable<AnEntity> _anEntityMobileServiceTable = _mobileServiceClient.GetTable<AnEntity>();
```

Si pendant l’exécution de ce code, notamment à la deuxième ligne vous avez une erreur de ce type :

![image]({{ site.url }}/images/2012/09/05/trucs-et-astuces-avec-windows-azure-mobile-services-img0.png "image")

Vu que l’erreur vous indique que le paramètre “key” est null, alors qu’il ne le doit pas, vous avez deux solutions, soit hypothétiser une solution et la tester, soit regarder où se trouve ce paramètre key, qui se situe en fait dans le SDK de Windows Azure Mobile Service ….

Alors la solution pour résoudre cette erreur est assez simple, dans la déclaration de votre entité vous avez simplement oublié de donner le nom d’une de vos propriétés (oui c’est simple quand on a la solution)

```csharp
[DataContract(Name = "anentity")]  
public  class  AnEntity : BaseEntity  
{  
    [DataMember(Name = "id")]  
    public  int Id;  
  
    [DataMember(Name = "astring")]  
    public  string AString;  
  
    [DataMember(Name = "anint")]  
    public  int AnInt;  
  
    [DataMember]  
    public  bool ABool;  
}
```

Là dans ce cas, j’avais uniquement oublié le “Name” de ma propriété “ABool” !

Deuxième et dernière astuce, au niveau du portail Windows Azure, il est possible de modifier les différentes  méthodes de CRUD, il s’agit de Node.js, de plus il n’y a qu’un seul environnement disponible, donc attention aux modifications en production ! Je vous conseille donc d’avoir une application Mobile Services de tests pour éviter les catastrophes du type envoyé un toast à tous vos utilisateurs en disant “Bazinga” ou alors de modifier les droits d’accès à une table !

De plus, écrivez vos scripts dans Visual Studio, Web Matrix, ou tout autre logiciel / IDE capable de fournir un minimum d’intellisense sinon ça devient rapidement laborieux.

Voilà un peu de Node.js pour envoyer un toast lors de l’insertion en base d’une entité :

```javascript
function insert(item, user, request) {  
    request.execute({  
success: function () {  
            request.respond();  
            console.log(item.astring);  
            console.log(item.channel);  
            push.wns.sendToastText04(item.channel, { text1: item.astring }, {  
success: function (pushResponse) {  
                    console.log("Sent push: ", pushResponse);  
                }  
            });  
        }  
    });  
}
```

N’oubliez pas les logs, ils sont consultables facilement depuis le portail HTML 5 !

Voilà en espérant que ça vous sera utile !
