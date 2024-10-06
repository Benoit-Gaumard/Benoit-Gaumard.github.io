---
layout: post
title: Azure - Resource Graph Explorer votre prochain outil favori
date: 2020-02-26
categories: [ "Azure" , "Resource Graph" ]
comments_id: 109 
---

Lorsque vous avez plusieurs souscriptions, il peut être complexe de lister toutes vos ressources, ou de faire des rapports comme :

- Combien avez vous de Storage Account par type de SKU ?
- Combien avez vous de VM dans vos pools AKS ?

Maintenant, essayons de répondre à la première question :

A l'ancienne, on aurait fait un script Powershell, et en utilisant les modules Az pour lister nos Storage Accounts, comme ceci :

```powershell
$subscriptions = Get-AzSubscription -TenantId $tenantId

$storages = @()
foreach ($subscription in $subscriptions)
{
    Select-AzSubscription -Subscription $subscription
    $storages += Get-AzStorageAccount
}

$storages | Select-Object -Property StorageAccountName, @{label="Sku"; expression={$_.Sku.Name}} | Group-Object Sku | Select Name, Count | Format-Table

```

Vous aurez un résultat de ce genre :

```powershell
Name         Count
----         -----
Standard_GRS     1
Standard_LRS    15
```

Sur mes souscriptions de tests, ici 5 dans ce tenant, ce script s'est exécuté en 10 secondes à peu près.

Maintenant soyons moderne, on va utiliser Azure Resource Graph Explorer pour ce besoin, je peux utiliser Powershell ou Az Cli pour éxecuter ma requête, mais là je vais utiliser le portail Azure pour m'aider à l'écrire :

![]({{ site.url }}/images/2020/02/26/azure-resource-graph-explorer-votre-prochain-outil-favori-img0.png)

Cette interface devrait vous sembler familière si vous utilisez des requêtes dans Log Analytics ou Application Insights, et bonne nouvelle, il s'agit du même language de requête.

Donc, je peux lister tous mes Storage Account par type avec cette requête

```sql
resources
| where type == "microsoft.storage/storageaccounts"
| extend sku = sku.name
| summarize count(name) by tostring(sku)
```

Et j'ai le même résultat, mais avec un temps d'exécution de moins d'1 seconde....

Resource Graph Explorer est clairement un très bon outil pour explorer les ressources de vos souscriptions avec un language connue et que vous utilisez tous les jours.
