---
layout: post
title: Azure Storage - Une résolution DNS en fonction du SKU
date: 2024-01-25
categories: [ "Azure", "Storage", "Network" ]
comments_id: 181 
---

Lors d'une de mes investigations je suis tombé sur quelque chose que je juge intéressant qu'il soit plus connu. J'ai demandé à Microsoft de l'ajouter dans la documentation, mais ce n'est toujours pas le cas.

La gestion des DNS d'un storage n'est pas la même en fonction des SKUs, ce qui fait que si vous utilisez des proxy pour accéder à des storages, vous pouvez avoir des mauvaises surprises.

Pour vous montrer cela, on va commencer par créer un storage par type de SKU avec ce bicep:

```bicep
var skus = [
  'Standard_LRS'
  'Standard_ZRS'
  'Standard_GRS'
  'Standard_GZRS'
  'Standard_RAGRS'
  'Standard_RAGZRS'
  'Premium_LRS'
  'Premium_ZRS'
]

resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = [for (item, index) in skus: {
  name: 'stodns${uniqueString(deployment().name)}${index}'
  location: resourceGroup().location
  kind: 'StorageV2'
  sku: {
    name: item
  }
  properties: {
    accessTier: 'Hot'
    minimumTlsVersion: 'TLS1_2'
  }
}]
```

On va maintenant faire un simple nslookup

```powershell
$storages = Get-AzStorageAccount -ResourceGroupName "dns-storage-rg"

foreach ($storage in $storages) {
    Write-Output "------------------------------"
    Write-Output "Storage Account $($storage.StorageAccountName) with the SKU $($storage.Sku.Name)"

    nslookup "$($storage.StorageAccountName).blob.core.windows.net"
}


```

Et on voit dans les résultats des choses intéressantes:

```bash
------------------------------
Storage Account stodnsrbgf3xv4ufgzg0 with the SKU Standard_LRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.amz06prdstr04c.store.core.windows.net
Address:  20.38.109.228
Aliases:  stodnsrbgf3xv4ufgzg0.blob.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg1 with the SKU Standard_ZRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.AMS07PrdStrz04A.trafficmanager.net
Addresses:  20.150.9.196
	  20.150.76.4
	  20.150.9.228
Aliases:  stodnsrbgf3xv4ufgzg1.blob.core.windows.net
	  blob.ams07prdstrz04a.store.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg2 with the SKU Standard_GRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.ams20prdstr15a.store.core.windows.net
Address:  20.209.108.75
Aliases:  stodnsrbgf3xv4ufgzg2.blob.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg3 with the SKU Standard_GZRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.AMS07PrdStrz10A.trafficmanager.net
Addresses:  20.209.193.33
	  20.209.231.33
	  20.209.193.65
Aliases:  stodnsrbgf3xv4ufgzg3.blob.core.windows.net
	  blob.ams07prdstrz10a.store.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg4 with the SKU Standard_RAGRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.ams23prdstr18a.store.core.windows.net
Address:  20.60.27.132
Aliases:  stodnsrbgf3xv4ufgzg4.blob.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg5 with the SKU Standard_RAGZRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.AMS07PrdStrz10A.trafficmanager.net
Addresses:  20.209.231.33
	  20.209.193.65
	  20.209.193.33
Aliases:  stodnsrbgf3xv4ufgzg5.blob.core.windows.net
	  blob.ams07prdstrz10a.store.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg6 with the SKU Premium_LRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob.ams06prdstp06a.store.core.windows.net
Address:  52.239.212.228
Aliases:  stodnsrbgf3xv4ufgzg6.blob.core.windows.net

------------------------------
Storage Account stodnsrbgf3xv4ufgzg7 with the SKU Premium_ZRS
Server:  UnKnown
Address:  10.104.244.68

Name:    blob2.AMS08PrdStfz01A.trafficmanager.net
Addresses:  20.209.109.130
	  20.209.108.2
	  20.209.108.162
Aliases:  stodnsrbgf3xv4ufgzg7.blob.core.windows.net
	  blob2.ams08prdstfz01a.store.core.windows.net
```

On voit donc ici que tous les storages avec un SKU ayant une résilience de zone passent par un Traffic Manager dans la résolution de leur nom de domaine. Il faudra donc bien penser à ouvrir la résolution vers le domaine __*.trafficmanager.net__ dans vos proxys.
