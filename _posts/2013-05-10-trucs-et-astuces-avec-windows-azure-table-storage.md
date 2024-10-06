---
layout: post
title: Trucs et astuces avec Windows Azure Table Storage
date: 2013-05-10
categories: [ "Azure", "Table Storage" ]
comments_id: 98 
---

En ce vendredi quasiment férié…. je vous donne une petite astuce pour valider vos connexion avec le Table Storage.

Bon je suppose que vous connaissez tous la classe CloudStorageAccount, vu que le Table Storage c’est la vie. En ce moment je travaille beaucoup sur des outils génériques autour du Table Storage pour changer. J’ai donc une problématique, je dois valider que la chaine de connexion saisie par l’utilisateur est bien valide.

Alors pour rappel, il est possible de créer une instance de CloudStorageAccount de deux façons :

```csharp
string accountKey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";  
string accountName = "azertyqsdfgh";  
  
var csa = new  CloudStorageAccount(new  StorageCredentials(accountName, accountKey), true);  
var csa2 = CloudStorageAccount.Parse(string.Format("DefaultEndpointsProtocol=https;AccountName={0};AccountKey={1}", accountKey, accountName));
```

Le problème, c’est qu’avec cette méthode il est tout à fait possible de créer un CloudStorageAccount, mais cela ne nous dit pas s’il correspond à un vrai storage derrière, ce qui peut être problématique dans de nombreux cas.

Alors tant que Microsoft ne nous fournit pas une méthode simple de validation, il faut tout simplement réaliser une requête vers notre storage afin de savoir qu’il y a bien quelque chose derrière. Je vous conseille de faire un test non intrusif, donc par exemple lister les tables, les blobs ou les queues, mais en aucun cas créer un élément de “test” afin de voir que cela répond bien.

Et vu que je suis un grand seigneur aujourd’hui (comme tous les jours) je vous fournis ma méthode d’extension qui fait cela.

```csharp
public static bool ValidateStorageAccount(this CloudStorageAccount storageAccount)  
{  
    if (storageAccount == null) throw new ArgumentNullException("storageAccount");  
  
    var tableClient = storageAccount.CreateCloudTableClient();  
    try  
    {  
        tableClient.ListTablesSegmented(string.Empty, 1, null);  
    }  
    catch(StorageException ex)  
    {  
        return false;  
    }  
  
    return true;  
}
```

A noter, que si c’est la clé du storage qui est mauvaise, j’ai une erreur 403, et si c’est le storage qui n’existe, c’est plus long déjà lors de l’execution, et je récupère une erreur comme quoi l’url est introuvable.

Et pour finir, je vous donne un lien vers un super article qui parle du Table Storage  :  **[Windows Azure Table Storage 2.0 Qu’est ce qui a changé ?](http://blog.soat.fr/2013/03/windows-azure-table-storage-2-0-quest-ce-qui-a-change/)** écrit par moi.
