---
layout: post
title: Connectez vous à vos comptes de Stockage via Azure Active Directory
date: 2018-09-25
categories: [ "Azure", "Storage", "Azure Active Directory" ]
comments_id: 148 
---

On a vu dans un précédent article comment utiliser le KeyVault pour générer des SAS Keys : [http://blog.woivre.fr/blog/2018/09/generer-des-cles-sas-pour-vos-storage-grace-a-keyvault](http://blog.woivre.fr/blog/2018/09/generer-des-cles-sas-pour-vos-storage-grace-a-keyvault)

Dans la même philosophie que ce dernier, il est possible de s'affranchir totalement des clés de Storage dans vos configs ou votre code source, même si j'espère que pour ce dernier c'est déjà le cas.

Certains services sur Azure supportent des rôles RBAC sur les données, comme notamment les Storage Accounts, qui contiennent des droits Reader ou Contributor sur les Blob et les Queues.

Grâce à cela il est possible pour un compte AD spécifique de se connecter à mon Stockage Azure pour récupérer un fichier par exemple.

Les noms des rôles build-in qui existent autour de la donnée sont les suivants :

* Storage Blob Data Contributor (Preview)
* Storage Blob Data Reader (Preview)
* Storage Queue Data Contributor (Preview)
* Storage Queue Data Reader (Preview)

A noter, qu'il est possible de setup ces différentes permissions via la propriété DataAction dans la définition de vos rôles RBAC

Vu que pour le moment le SDK C# pour le Storage ne supporte pas cette nouvelle fonctionnalité il faut le faire via les API REST Azure, comme ci-dessous :

```csharp
AuthenticationContext authContext = new AuthenticationContext($"https://login.microsoftonline.com/{TenantId}");
AuthenticationResult authResult = await authContext.AcquireTokenAsync($"https://{StorageAccountName}.blob.core.windows.net/", new ClientCredential(ApplicationId, SecretKey));
 
HttpClient client = new HttpClient(); 
client.DefaultRequestHeaders.Add("Authorization", "Bearer " + authResult.AccessToken);
client.DefaultRequestHeaders.Add("x-ms-version", "2017-11-09");

var response = await client.GetStringAsync($"https://{StorageAccountName}.blob.core.windows.net/{ContainerName}/{BlobName}"); 
```

A noter qu'ici, je génère un token grâce à ADAL et que je demande bien celui-ci pour mon compte de stockage.

Avec cet article, vous avez encore moins d'excuses de conserver vos clés de stockage dans vos configs.
