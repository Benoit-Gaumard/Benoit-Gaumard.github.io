---
layout: post
title: Azure - Utiliser les endpoints régionaux d'ARM
date: 2022-03-09
categories: [ "Azure", "Powershell" ]
comments_id: 123 
---


Récemment j'ai ouvert différents cases de support à Microsoft pour un comportement inhabituel sur Azure.

Lorsque je créais une nouvelle ressource en West Europe, celle ci était bien disponible sur le portail Azure, cependant depuis mon Automation Account en North Europe je ne la voyais pas.

En clair lorsque je faisais un **Get-AzStorageAccount -ResourceGroup $resourceGroupName** depuis mon poste je voyais bien mon nouveau storage, cependant depuis mon Automation non.

Afin de diagnostiquer le problème il y a un moyen très simple, il suffit de faire en powershell les commandes suivantes :

```powershell
$token = Get-AzAccessToken
$authHeader = @{
    'Content-Type'='application/json'
    'Authorization'='Bearer ' + $token.Token
}

$locations = @("westeurope", "northeurope")


foreach ($location in $locations) {
    Write-Host "Location : $location" -ForegroundColor  Cyan
    $restUrl = "https://$location.management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroupName/resources?api-version=2022-01-01"; 
    (Invoke-WebRequest -Uri $restUrl -Method GET -Headers $authHeader).Headers
}
```

Et vous verrez via quel region vos appels passent via le Header **x-ms-routing-request-id** qui contient la valeur **WESTEUROPE** correspondant à la région

Très pratique quand il y a un problème de synchronisation côté Azure, et le support peut forcer une synchro si vous ne souhaitez pas attendre que cela se fasse
