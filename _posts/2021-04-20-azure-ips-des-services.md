---
layout: post
title: Azure - IPs des services
date: 2021-04-20
categories: [ "Azure" ]
comments_id: 116 
---

Sur Azure une des demandes qui revient souvent, c'est celle de mettre en place des NSG ou des firewalls afin de sécuriser nos assets dans le Cloud. Ces dernières années, Microsoft a fait un travail remarquable pour fournir des capacités tels que les Service Endpoints et les Services tags qui sont popularisés par tous. Maintenant tous les services n'ont pas ces fonctionnalités.

Si vous faites une recherche sur internet vous allez trouver cette page : [Azure IP Range and Service Tags](https://www.microsoft.com/en-us/download/details.aspx?id=56519)

Si vous télécharger ce document vous trouverez un fichier JSON que vous pouvez parser pour retrouver les informations dont vous avez besoin.
Cependant les datacenters Azure se dotent de nouvelles capacités jour après jour, et de ce fait de nouvelles IPs peuvent apparaitre dans ce fichier, il est donc mis à jour très régulièrement par Microsoft.

Avant il n'existait que ce fichier, et encore avant c'était du XML, qu'il fallait récupérer de manière régulière, puis le parser puis l'injecter dans nos configurations de NSG.

Maintenant, cette mécanique est beaucoup plus simple, car il existe la commande `Get-AzNetworkServiceTag` en Powershell, ou `az network list-service-tags` en CLI pour vous aider.

Ci-dessous en Powershell, voici comment récupérer les IPs des noeuds de management d'Azure Batch pour la région West Europe :

*1ère étape* : Récupérer toutes les valeurs pour notre région

```powershell
PS C:\Users\wilfr> $allTags = Get-AzNetworkServiceTag -Location westeurope
PS C:\Users\wilfr> $allTags


Name         : Public
Id           : /subscriptions/e7bd1bb5-e9af-49c7-b5aa-ac09992fdfeb/providers/Microsoft.Network/serviceTags/Public
Type         : Microsoft.Network/serviceTags
Cloud        : Public
ChangeNumber : 65
Values       : {ApiManagement, ApiManagement.AustraliaCentral, ApiManagement.AustraliaCentral2, ApiManagement.AustraliaEast...}
```

*2ème étape* : Filtrer uniquement sur le service souhaité

```powershell
PS C:\Users\wilfr> $serviceName = "BatchNodeManagement.WestEurope"
PS C:\Users\wilfr> $serviceTag = $allTags.Values | Where { $_.Name -eq $serviceName }
PS C:\Users\wilfr> $serviceTag


Name             : BatchNodeManagement.WestEurope
System Service   : BatchNodeManagement
Region           : westeurope
Address Prefixes : {13.69.65.64/26, 13.69.106.128/26, 13.69.125.173/32, 13.73.153.226/32...}
Change Number    : 1
```

*3ème et dernière étape* : Récupérer nos Ips

```powershell
PS C:\Users\wilfr> $serviceTag.Properties.AddressPrefixes
13.69.65.64/26
13.69.106.128/26
13.69.125.173/32
13.73.153.226/32
13.73.157.134/32
13.80.117.88/32
13.81.1.133/32
13.81.59.254/32
13.81.63.6/32
13.81.104.137/32
13.94.214.82/32
13.95.9.27/32
23.97.180.74/32
40.68.100.153/32
40.68.191.54/32
40.68.218.90/32
40.115.50.9/32
52.166.19.45/32
52.174.33.113/32
52.174.34.69/32
52.174.35.218/32
52.174.38.99/32
52.174.176.203/32
52.174.179.66/32
52.174.180.164/32
52.233.157.9/32
52.233.157.78/32
52.233.161.238/32
52.233.172.80/32
52.236.186.128/26
104.40.183.25/32
104.45.13.8/32
104.47.149.96/32
137.116.193.225/32
168.63.5.53/32
191.233.76.85/32
```

Et voilà il ne reste plus qu'à les mettre dans vos NSG ou dans votre configuration de Firewall selon votre topologie réseau.
