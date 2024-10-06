---
layout: post
title: Unity - Comment injecter ces données ?
date: 2010-12-02
categories: [ "Divers" ]
comments_id: 55 
---

Il y a quelques temps, dans un article, j’ai présenté l’injection de dépendances via Unity sous C# 3.5, vous êtes bien entendu au courant, que cette technologie n’est pas morte avec C# 4.0.

Il existe donc deux méthodes, on peut soit injecter ces différentes instances via le constructeur de notre classe, ou alors en injectant les différentes propriétés de la classe. Donc si vous débutez avec unity, on peut se demander comment l’on fait cette opération, je vais donc vous présenter ces deux méthodes ci dessous, soit via notre code dans notre application, ou via la configuration XML d’Unity.

L’injection via le constructeur, est celle que j’avais utilisé dans une précédente démonstration, on va donc prendre un cas très simple pour montrer comment injecter des données via le constructeur.

Commençons par la gestion d’Unity via le fichier de configuration :

```xml
  <unity xmlns="http://schemas.microsoft.com/practices/2010/unity">
    <alias alias="Interface1" type="Demo.UnityConstructor.Interface1, Demo.UnityConstructor" />
    <alias alias="Interface2" type="Demo.UnityConstructor.Interface2, Demo.UnityConstructor" />
    <alias alias="ITest" type="Demo.UnityConstructor.ITest, Demo.UnityConstructor" />
    <alias alias="ClassImpl1" type="Demo.UnityConstructor.ClassImpl1, Demo.UnityConstructor" />
    <alias alias="ClassImpl2" type="Demo.UnityConstructor.ClassImpl2, Demo.UnityConstructor" />
    <alias alias="TestConstructor" type="Demo.UnityConstructor.TestConstructor, Demo.UnityConstructor" />


    <container>
      <register type="Interface1" mapTo="ClassImpl1" name="classImpl1" />
      <register type="Interface2" mapTo="ClassImpl2" name="classImpl2" />
      <register type="ITest" mapTo="TestConstructor" name="FULL">
        <constructor>
          <param name="interface1" type="Interface1">
            <dependency name="classImpl1" type="ClassImpl1" />
          </param>
          <param name="interface2" type="Interface2">
            <dependency name="classImpl2" type="ClassImpl2" />
          </param>
        </constructor>
      </register>
      <register type="ITest" mapTo="TestConstructor" name="INTERFACE1">
        <constructor>
          <param name="interface1" type="Interface1">
            <dependency name="classImpl1" type="ClassImpl1" />
          </param>
        </constructor>
      </register>
      <register type="ITest" mapTo="TestConstructor" name="INTERFACE2">
        <constructor>
          <param name="interface2" type="Interface2">
            <dependency name="classImpl2" type="ClassImpl2" />
          </param>
        </constructor>
      </register>
      <register type="ITest" mapTo="TestConstructor" name="EMPTY">
        <constructor />
      </register>
    </container>
  </unity> 
```

Donc on peut voir rapidement via ce fichier de configuration, qu’on a 3 interfaces (Interface1, Interface2, ITest) ainsi que les 3 classes qui les implémentent (ClassImpl1, ClassImpl2, TestContructor), de même on peut apercevoir que j’enregistre 4 différentes instances de mon TestConstructor avec différents paramètres dans les constructeurs, puisqu’en effet, ma classe TestConstructor contient différent constructeur comme on peut le voir :

```csharp
public class TestConstructor : ITest 
{
    public TestConstructor()
    {
        Console.WriteLine("Constructeur vide !");
    }

    public TestConstructor(Interface1 interface1)
    {
        Console.WriteLine("Constructeur 1 paramètre : Interface 1");
    }

    public TestConstructor(Interface2 interface2)
    {
        Console.WriteLine("Constructeur 1 paramètre : Interface 2");
    }

    public TestConstructor(Interface1 interface1, Interface2 interface2)
    {
        Console.WriteLine("Constructeur 2 paramètres : Interface 1 & 2");
    }
}
```

Bon maintenant c’est bien beau, mais comment je récupère ma configuration et l’exploite ! Et bien Unity, c’est simple à utiliser, avec simplement 2 lignes de code vous pouvez récupérer votre configuration

```csharp
private void ConfigureContainerXml()
{
    var configurationSection = (UnityConfigurationSection)ConfigurationManager.GetSection("unity");
    configurationSection.Configure(_containerXml);
}
```

Et pour exploiter nos différentes instances, pareil toujours aussi simple

```csharp
_containerXml.Resolve<ITest>("FULL");
Console.WriteLine("**************");
_containerXml.Resolve<ITest>("INTERFACE1");
Console.WriteLine("**************");
_containerXml.Resolve<ITest>("INTERFACE2");
Console.WriteLine("**************");
_containerXml.Resolve<ITest>("EMPTY");
```

On remarquera qu’ici, je suis obligé de passer via un nom pour récupérer mes différentes instances de ITest, ceci est dû au fait, que j’en enregistre plusieurs, mais si j’en enregistre qu’une seule, je peux utiliser un unityContainer.Resolve<MonInterface>(); pour résoudre mon injection.

Bon maintenant qu’on a vu comment le faire via un fichier de config, on va voir comment déclarer nos dépendances via le code, et là pareil rien de bien complexe à mon avis :

```csharp
private void ConfigureContainer()
{
    _container.RegisterType<Interface1, ClassImpl1>();
    _container.RegisterType<Interface2, ClassImpl2>();
    _container.RegisterType<ITest, TestConstructor>("FULL");
    _container.RegisterType<ITest, TestConstructor>("INTERFACE1", new InjectionConstructor(_container.Resolve<Interface1>()));
    _container.RegisterType<ITest, TestConstructor>("INTERFACE2", new InjectionConstructor(_container.Resolve<Interface2>()));
    _container.RegisterType<ITest, TestConstructor>("EMPTY", new InjectionConstructor());
}
```

Donc dans ce code, ce que je fais c’est enregistrer mes différentes interfaces avec un simple RegisterType, où je peux nommer mon instance. A noter que je passe par un InjectionConstructor pour fournir mes différents paramètres.

Il faut savoir que par défaut, si l’on ne fournit pas d’information pour le constructeur Unity va résoudre le constructeur qui a le plus de paramètre, c’est donc pour cela que j’utilise un InjectionConstructor sans aucun paramètre.

Bon maintenant qu’on a fait avec le constructeur, on se dit “oui, c’est bien, c’est beau, mais on peut le faire avec les propriétés ? “, et bien entendu Unity peut aussi le faire ! Et bien entendu, c’est aussi simple qu’avec l’injection de constructeur.

Donc pour commencer, l’injection via le fichier de configuration :

```xml
  <unity xmlns="http://schemas.microsoft.com/practices/2010/unity">
    <alias alias="Interface1" type="Demo.UnityInjectionProperty.Interface1, Demo.UnityInjectionProperty" />
    <alias alias="Interface2" type="Demo.UnityInjectionProperty.Interface2, Demo.UnityInjectionProperty" />
    <alias alias="ITest" type="Demo.UnityInjectionProperty.ITest, Demo.UnityInjectionProperty" />
    <alias alias="ClassImpl1" type="Demo.UnityInjectionProperty.ClassImpl1, Demo.UnityInjectionProperty" />
    <alias alias="ClassImpl2" type="Demo.UnityInjectionProperty.ClassImpl2, Demo.UnityInjectionProperty" />
    <alias alias="TestInjection" type="Demo.UnityInjectionProperty.TestInjection, Demo.UnityInjectionProperty" />

    <container>
      <register type="Interface1" mapTo="ClassImpl1" name="classImpl1" />
      <register type="Interface2" mapTo="ClassImpl2" name="classImpl2" />
      <register type="ITest" mapTo="TestInjection" name="FULL">
        <property name="Interface1">
          <dependency name="classImpl1" type="ClassImpl1" />
        </property>
        <property name="Interface2">
          <dependency name="classImpl2" type="ClassImpl2" />
        </property>
      </register>
      <register type="ITest" mapTo="TestInjection" name="INTERFACE1">
        <property name="Interface1">
          <dependency name="classImpl1" type="ClassImpl1" />
        </property>
      </register>
      <register type="ITest" mapTo="TestInjection" name="INTERFACE2">
        <property name="Interface2">
          <dependency name="classImpl2" type="ClassImpl2" />
        </property>
      </register>
      <register type="ITest" mapTo="TestInjection" name="EMPTY">
      </register>
    </container>
  </unity> 
```

Bon comme on peut voir, à part les différents paramètres, rien ne change par rapport à la version précédent, il suffit de déclarer les différentes propriétés à instancier ! Et c’est toujours aussi simple ! Bien entendu le reste du code (Construction du container et résolution de l’instance) sont les mêmes !

Maintenant comment enregistrer nos différentes instances via le code :

```csharp
_container.RegisterType<Interface1, ClassImpl1>();
_container.RegisterType<Interface2, ClassImpl2>();
_container.RegisterType<ITest, TestInjection>("FULL",
    new InjectionProperty("Interface1", _container.Resolve<Interface1>()),
    new InjectionProperty("Interface2", _container.Resolve<Interface2>()));
_container.RegisterType<ITest, TestInjection>("INTERFACE1",
    new InjectionProperty("Interface1", _container.Resolve<Interface1>()));
_container.RegisterType<ITest, TestInjection>("INTERFACE2",
    new InjectionProperty("Interface2", _container.Resolve<Interface2>()));
_container.RegisterType<ITest, TestInjection>("EMPTY");
```

Donc ici, on utilise un InjectionProperty, cependant, c’est légèrement plus verbeux que la version avec les constructeurs, mais bon ce n’est pas encore méchant ! Seul différence, c’est que là pour enregistrer notre classe ayant le plus de propriété il faudra toutes les saisir !

Voilà le code source si vous voulez tester la solution :

[![image]({{ site.url }}/images/2010/12/02/unity-comment-injecter-ces-donnees--img0.png "image")](http://cid-27033cda87e10205.office.live.com/self.aspx/Blog/Demo.UnityConstructor.zip)

Bien entendu, vous pouvez aussi mixer les deux méthodes, si vous avez envie ! Pour ma part, j’utilise principalement la méthode via le constructeur ainsi que via le code, tout simplement parce que je préfère résoudre mes éléments automatiquement et ne pas avoir à déclarer mes différentes propriétés ! De plus via le code, puisque le problème du fichier de configuration, c’est que l’on ne sait pas quand les données de ce fichier ne sont pas correct, enfin du moins avant d’avoir lancer l’application …. Et de plus, il n’y a aucune chance qu’un IT réseau peu compétent fasse du zèle en essayant de modifier seul le fichier de config.
