---
layout: post
title: Silverlight & WCF - Interroger un service via une url relative
date: 2011-06-23
categories: [ "Divers" ]
comments_id: 68 
---

Quand on développe une application Silverlight, on a souvent besoin de s’abonner à des services afin d’accéder aux données situées sur un serveur distant, on créé donc le plus généralement un service WCF qui exposera nos données.

Si vous n’utilisez pas IIS pour vos développements, vous avez du remarquer, du moins je l’espère, que Visual Studio démarre un serveur web allégé qui hébergera votre application. On accède donc à notre application via une url de ce type <http://localhost:24421/MaSuperApplicationQuiDeboiteTestPage.aspx> jusque là aucun problème votre application marche et vous avez accès à votre service via cette url : [http://localhost:24421/MonSuperServiceQuiDeboite.svc](http://localhost:24421/MonSuperServiceQuiDeboite.svc).

Donc quand vous vous abonnez au service via Visual Studio, il va vous générer le proxy, ainsi qu’un fichier de config avec les données de configuration du service, comme on peut le voir ci-dessous :

```xml
<configuration>
    <system.serviceModel>
        <bindings>
            <basicHttpBinding>
                <binding name="BasicHttpBinding_IService1" maxBufferSize="2147483647"
                    maxReceivedMessageSize="2147483647">
                    <security mode="None" />
                </binding>
            </basicHttpBinding>
        </bindings>
        <client>
            <endpoint address="**http://localhost:20624/Service1.svc**" binding="basicHttpBinding"
                bindingConfiguration="BasicHttpBinding_IService1" contract="ServiceReference1.IService1"
                name="BasicHttpBinding_IService1" />
        </client>
    </system.serviceModel>
</configuration> 
```

Le problème que l’on peut cependant obtenir et que Visual Studio, selon son humeur, peut décider de changer le port de votre application, et donc vos informations de connexion seront incorrectes. Vous pouvez donc soit fixer le port du serveur web, soit changer ces informations comme on va le voir par la suite. Plus concrètement, ce problème arrive très souvent lorsque vous faites du développement pour Azure avec l’émulateur qui vous génère une url de ce type <http://127.0.0.1:81>, le port peut changer si vous quittez l’appli brutalement, typiquement lorsque vous avec un point d’arrêt déclenché dans votre Visual Studio et que vous arrêtez le debug !

Alors pour éviter le soucis, il vous suffit de mettre votre adresse de service en relative, comme ci dessous

```xml
<configuration>
    <system.serviceModel>
        <bindings>
            <basicHttpBinding>
                <binding name="BasicHttpBinding_IService1" maxBufferSize="2147483647"
                    maxReceivedMessageSize="2147483647">
                    <security mode="None" />
                </binding>
            </basicHttpBinding>
        </bindings>
        <client>
            <endpoint address="/Service1.svc" binding="basicHttpBinding"
                bindingConfiguration="BasicHttpBinding_IService1" contract="ServiceReference1.IService1"
                name="BasicHttpBinding_IService1" />
        </client>
    </system.serviceModel>
</configuration> 
```

C’est beaucoup mieux que de reconstruire l’url du service à partir de l’url courante !
