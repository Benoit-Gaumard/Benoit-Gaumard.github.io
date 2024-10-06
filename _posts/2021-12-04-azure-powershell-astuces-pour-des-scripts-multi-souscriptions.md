---
layout: post
title: Azure Powershell - Astuces pour des scripts multi souscriptions
date: 2021-12-04
categories: [ "Azure", "Powershell" ]
comments_id: 118 
---

Lorsque vous avez plusieurs souscriptions Azure qui communiquent entre elles, il est souvent nécessaire de faire des scripts utilisant plusieurs souscriptions. Le moyen le plus simple et le plus documenté est le suivant :

```powershell
Connect-AzAccount #Avec un compte ayant accès à toutes les souscriptions

$hubSubscriptionId = "...."
$spokeSubscriptionId = "...."

Select-AzSubscription -SubscriptionId $hubSubscriptionId

Get-AzResource ....

Select-AzSubscription -SubscriptionId $spokeResourceId

Get-AzResource
```

Alors oui c'est pratique de facilement changer de contexte via une seule ligne de powershell, mais lorsqu'il s'agit de récupérer une information unique sur la deuxième souscription, cela peut être contraignant de changer de contexte toutes les 2 lignes. Et je ne parle même pas si vous souhaitez exécuter plusieurs actions en parallèle.

Le prérequis pour que cela fonctionne, il faut avoir une authentification Azure sur plusieurs comptes, ce que vous avez par défaut avec cette commande :

```powershell
# With user login
Connect-AzAccount

# With SPN Login
$Credential = Get-Credential
Connect-AzAccount -Credential $Credential -Tenant 'xxxx-xxxx-xxxx-xxxx' -ServicePrincipal
```

Par exemple si je veux récupérer les informations des virtual network peeré à mon vnet d'une souscription A, je peux faire ainsi :

```powershell
$vnetHub = Get-AzVirtualNetwork -ResourceGroupName $rgName -Name $vnetName

foreach ($peering in $vnetHub.VirtualNetworkPeerings) {
  $remoteVnet = Get-AzResource -Id $peering.RemoteVirtualNetwork.Id -ExpandProperties

  Write-Host $remoteVnet.Properties.addressSpace.addressPrefixes
}
```

Et bien entendu, cela marche même si mon RemoteVirtualNetwork se trouve dans une autre souscription ou dans celle courante.

Voilà c'est une petite astuce, qui je pense est bonne à connaitre surtout pour les afficionados de Powershell.
