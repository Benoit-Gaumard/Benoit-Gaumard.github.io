---
layout: post
title: Sandbox Azure - Gestion des groupes de ressources
date: 2018-06-04
categories: [ "Azure", "Function" ]
comments_id: 135 
---

Dans le cadre de la sandbox Azure dont je vous ai parlé dans les articles précédents:

* Introduction : [http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory](http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory "http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory")
* Provisionnement des utilisateurs : [http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs](http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs "http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs")

On va maintenant parler de la création des Resource Groups, je vais là aussi utiliser une API qui réalisera les étapes suivantes :

* Créer un resource group
* Ajouter les droits à la personne qui aura réalisé la demande.
* Stocker la demande afin de pouvoir mettre en place une expiration de celle-ci

Pour effectuer cela, j’ai besoin que mon Azure Function ait les droits pour accéder aux API de management d’Azure. Pour cela je vais utiliser la fonctionnalité des “Managed Service Identity”, celle-ci permet à mon Azure Function d’étre authentifiée en tant que Service sur mon Azure Active Directory, il suffira après de lui attribuer les droits suffisants pour pouvoir réaliser la création de mes ResourceGroups, la suppression de ceux-ci et la gestion de mes utilisateurs. Il est possible pour cela de soit créer un Custom Role qui fait ces actions, ou alors d’attribuer directement les droits Owner à la souscription.

Pour activer cette fonctionnalité, rien de plus simple dans le portail Azure, vous allez sur l’interface de votre Azure Function, puis dans “Platform Features” , il vous suffit d’aller sur Managed Service Identity et de l’activer :

![image]({{ site.url }}/images/2018/06/04/sandbox-azure-gestion-des-groupes-de-ressources-img0.png "image")

Comme on peut le voir l’activation est assez simple à mettre en place, et bonne nouvelle cette fonctionnalité de “Managed Service identity” est disponible sur App Services et sur les machines virtuelles à ce jour.

Dans mon cas, j’utilise les Fluent Management librairies sur Azure, ce qui permet de m’affranchir de la construction des appels à l’API REST, de plus ce SDK me permet de m’authentifier à Azure via mon Service Identity précédemment créé :

```csharp
AzureCredentials credentials = SdkContext.AzureCredentialsFactory.FromMSI(new MSILoginInformation(MSIResourceType.AppService), AzureEnvironment.AzureGlobalCloud);  
  
var azure = Azure  
        .Configure()  
        .WithLogLevel(HttpLoggingDelegatingHandler.Level.Basic)  
        .Authenticate(credentials)  
        .WithDefaultSubscription();
```

Par la suite, tous les appels que je ferai via mon objet azure seront identifiés avec le compte lié à mon Azure Function. Du coup je n’ai pas besoin de gérer les certificats ou à avoir une gestion de clé pour m’authentifier sur Azure.

```csharp
await azure.ResourceGroups.Define(data.Name).WithRegion(Region.Create(data.Location)).CreateAsync()
```
  
Il est possible d’utiliser ce compte applicatif pour interroger les API du KeyVault afin de récupérer les secrets dont on a besoin :

```csharp
var azureServiceTokenProvider = new AzureServiceTokenProvider();  
var keyVaultClient = new KeyVaultClient(new KeyVaultClient.AuthenticationCallback(azureServiceTokenProvider.KeyVaultTokenCallback));  
  
var result = await keyVaultClient.GetSecretAsync($"https://mykv.vault.azure.net/secrets/{secretKey}");
```
  
En résumé les MSI c’est le moyen idéal pour que votre application communique avec votre infrastructure Azure et elle vous permet de vous affranchir de la gestion des secrets de vos comptes applicatifs.
