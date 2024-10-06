---
layout: post
title: Partager des classes métiers entre plusieurs services WCF
date: 2011-06-17
categories: [ "Divers" ]
comments_id: 67 
---

Lorsque vous développez des applications Silverlight ou pour Windows Phone 7, il est très courant d’utiliser des Web Services en WCF afin d’exposer nos données métiers depuis les différents serveurs qui les héberge (sous Azure, c’est mieux ^^)

Vous pouvez concevoir vos accès aux données de plusieurs manières avec WCF, par exemple :

* Un seul service WCF qui regroupera toutes les méthodes exposées
* Plusieurs services WCF qui se répartissent les méthodes selon des critères de fonctionnalités (Authentification, Processus Métier A, Processus Métier B …)

On peut voir que le premier cas est très bien pour un effet “démo” ou une petite application, alors que le deuxième cas apporte une structure logique au web service et pour ne rien gâcher permet de répartir la charge entre les différents services WCF.

Bon cependant, vu qu’on n’est plus dans une démonstration, il y a des cas auxquels on ne pense pas de suite, par exemple, un Service A peut devoir utiliser les mêmes classes métiers qu’un Service B tous les deux référencés dans une même application.

Si l’on effectue, un ajout de service standard, on va faire simplement un clic droit sur le projet auquel on veut ajouter notre service, puis un “Add Service Reference”, on obtient une fenêtre telle que celle-ci

![image]({{ site.url }}/images/2011/06/17/partager-des-classes-metiers-entre-plusieurs-services-wcf-img0.png "image")

On va donc pouvoir ajouter nos deux services de la même façon.

J’ai donc reproduit dans mon application le cas dont je parlais, mes deux services utilisent ces contrats réciproquement

```csharp
using System.ServiceModel;
using WCFSharedClass.Model;

namespace WCFSharedClass.Web
{
    // NOTE: You can use the "Rename" command on the "Refactor" menu to change the interface name "IService1" in both code and config file together. 
    [ServiceContract]
    public interface IService1 {
        [OperationContract]
        Class1 DoWork();

        [OperationContract]
        Class2 DoWork2();
    }
}

using System.ServiceModel;
using WCFSharedClass.Model;

namespace WCFSharedClass.Web
{
    // NOTE: You can use the "Rename" command on the "Refactor" menu to change the interface name "IService2" in both code and config file together. 
    [ServiceContract]
    public interface IService2 {
        [OperationContract]
        void DoWork3(Class1 class1, Class2 class2);
    }
}
```

On voit donc que mes deux services utilisent les classes Class1 et Class2, on a donc dans mon application cliente (ici Windows Phone 7.0) ce code pour appeler nos services

```csharp
private **Service1.****Class1** _class1;
private **Service1.****Class2** _class2;

private void Service1()
{
    var service1Client = new Service1.Service1Client();
    service1Client.DoWorkCompleted += (sender, e) =>
                                          {
                                              _class1 = e.Result;
                                              MessageBox.Show("Service 1 - DoWork");
                                          };
    service1Client.DoWorkAsync();


    service1Client = new Service1.Service1Client();
    service1Client.DoWork2Completed += (sender, e) =>
                                           {
                                               _class2 = e.Result;
                                               MessageBox.Show("Service 1 - DoWork2");
                                           };
    service1Client.DoWork2Async();
}

private void Service2()
{
    var service2Client = new Service2.Service2Client();
    service2Client.DoWork3Completed += (sender, e) => MessageBox.Show("Service 2 - DoWork3");
    service2Client.DoWork3Async(new **Service2.Class1**() { Value = _class1.Value }, new **Service2.Class2**() { Value = _class2.Value });
}
```

J’ai mis en gras les différentes instances de Class1 et Class2 et on peut voir que lorsqu’on utilise le Service1, la Class1 se situe dans le namespace Service1.Class1 alors que dans l’autre service elle se trouve dans Service2.Class1. On voit donc que pour appeler le Service2.DoWork3 avec les différents résultats du Service1 on est obligé de reconstruire les différents objets dont on a besoin. Même si ici, on n’a qu’un seul champ, on voit que ce n’est pas pratique. Le mieux est donc d’utiliser les mêmes Class1 et Class2 dans tous nos services !

Pour faire cela, il faut commencer par créer une bibliothèque de classe du côté client donc ici Windows Phone 7, et créer nos deux class de Model avec des propriétés publiques égales à celle exposées par nos Services, on a donc deux choix, le premier est une copie strictement identique, en ajoutant un fichier existant comme lien, comme on peut le voir ci dessous

![image]({{ site.url }}/images/2011/06/17/partager-des-classes-metiers-entre-plusieurs-services-wcf-img1.png "image")

L’avantage de faire ainsi, c’est que le code sera strictement identique du côté client, comme du côté serveur, cependant, si on utilise un objet côté serveur qui n’existe pas côté Windows Phone, on ne pourra pas compiler, mais vous pouvez facilement éviter cela avec des classes partielles.

L’autre technique est de copier séparément les fichiers comme j’ai fait pour la Class2, vous pouvez ainsi les modifier tant que les propriétés publiques exposées existes toujours

Côté Serveur :

```csharp
using System.Runtime.Serialization;

namespace WCFSharedClass.Model
{
    [DataContract]
    public class Class2 
    {
        [DataMember]
        public string Value { get; set; }
    }
}
```

Côté client :

```csharp
namespace WCFSharedClass.Model
{
    public class Class2 
    {
        private string _value;
        public string Value
        {
            get { return _value; }
            set { _value = value; }
        }
        public override bool Equals(object obj)
        {
            if (obj is Class2)
            {
                return Value == ((Class2) obj).Value;
            }
            return false;
        }

        public override int GetHashCode()
        {
            return this.Value.GetHashCode();
        }
    }
}
```

Note dans Visual Studio, on peut facilement voir qu’une classe est ajoutée comme lien, grâce au petit icône à côté de celle-ci.

![image]({{ site.url }}/images/2011/06/17/partager-des-classes-metiers-entre-plusieurs-services-wcf-img2.png "image")

Maintenant il suffit de reconfigurer vos services en utilisant votre assembly  contenant vos différentes classes.

![image]({{ site.url }}/images/2011/06/17/partager-des-classes-metiers-entre-plusieurs-services-wcf-img3.png "image")

Il vous suffit donc de faire cela pour tous vos services, les régénérer, compiler et recommencer si Visual Studio est grincheux ….

Et voilà donc le code final :

```csharp
private **Class1** _class1;
private **Class2** _class2;

private void Service1()
{
    var service1Client = new Service1.Service1Client();
    service1Client.DoWorkCompleted += (sender, e) =>
                                          {
                                              _class1 = e.Result;
                                              MessageBox.Show("Service 1 - DoWork");
                                          };
    service1Client.DoWorkAsync();


    service1Client = new Service1.Service1Client();
    service1Client.DoWork2Completed += (sender, e) =>
                                           {
                                               _class2 = e.Result;
                                               MessageBox.Show("Service 1 - DoWork2");
                                           };
    service1Client.DoWork2Async();
}

private void Service2()
{
    var service2Client = new Service2.Service2Client();
    service2Client.DoWork3Completed += (sender, e) => MessageBox.Show("Service 2 - DoWork3");
    **service2Client.DoWork3Async(_class1, _class2);**
}
```

On utilise donc les mêmes classes pour nos deux services, ce qui est tout de même plus pratique !

A noter que vous avez à la fenêtre de configuration avancée via le bouton “Advanced” dans l’enregistrement du service !

Je ne vous fournis pas le code, tout est là !
