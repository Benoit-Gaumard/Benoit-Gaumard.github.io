---
layout: post
title: Azure Bicep - Enfin des functions pour manipuler les CIDRs
date: 2023-08-18
categories: [ "Azure", "Bicep", "ARM" ]
comments_id: 178 
---

Après des longs moments d'attente, et de scripts Powershell pour préparer des paramètres pour déployer des réseaux ou des NetworkRules sur les services, Microsoft propose enfin des fonctions pour manipuler les CIDR au sein de vos template Bicep.

Vous pouvez retrouver les différentes méthodes sur la [documentation Microsoft](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-functions-cidr?WT.mc_id=AZ-MVP-4039694#cidrsubnet)

Maintenant on va essayer de jouer avec ici même.

La première méthode **cidrSubnet** permet de splitter un CIDR en différent ranges, ce qui peut être très pratique lorsque vous déployer des landing zones standardisés, et que vous ne voulez pas précalculer tous les ranges de vos subnets. En clair dans notre template Bicep, on aura quelque chose de ce style

```bicep
var cidr = '10.0.0.0/20'
var cidrSubnets = [for i in range(0, 10): cidrSubnet(cidr, 24, i)]

resource virtual_network 'Microsoft.Network/virtualNetworks@2023-04-01'= {
  name: 'virtual-network-demo'
  location: resourceGroup().location
  properties: {
    addressSpace: {
      addressPrefixes: [
        cidr
      ]
    }
  }
}


@batchSize(1)
resource subnets 'Microsoft.Network/virtualNetworks/subnets@2023-04-01' = [for (item, index) in cidrSubnets : {
  name: 'subnet-${index}'
  parent: virtual_network
  properties: {
    addressPrefix: item
  }
}]
```

Et maintenant chose très utile, lorsque vous configurer des Network Rules sur vos services Azure, vous savez très bien que chaque service à son format. Et notamment PostgreSQL qui ne demande un range, mais qui veut la start IP et la end IP. Et bien grâce à la méthode **parseCidr** plus besoin de le faire dans votre script qui calcule les paramètres. On peut simplement faire comme cela :

```bicep
var cidrSubnets = [
  '4.175.0.0/16'
  '4.180.0.0/16'
  '4.210.128.0/17'
  '4.231.0.0/17'
  '4.245.0.0/17'
  '13.69.0.0/17'
  '13.73.128.0/18'
  '13.73.224.0/21'
  '13.80.0.0/15'
  '13.88.200.0/21'
  '13.93.0.0/17'  
]


resource flexServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: 'flexwwopgs'
  location: resourceGroup().location
  properties: {
    administratorLogin: 'bigchief'
    administratorLoginPassword: ''
    version: '13'
    availabilityZone: '1'  
    storage: {
      storageSizeGB: 32
    }
    highAvailability: {
      mode: 'Disabled'
    }
    maintenanceWindow: {
      customWindow: 'Disabled'
      dayOfWeek: 0
      startHour: 0
      startMinute: 0
    }
  }
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
}

@batchSize(1)
resource flexServerAcls 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = [for (item, index) in cidrSubnets: {
  name: 'flexpgswwo-${index}'
  parent: flexServer
  properties: {
    startIpAddress: parseCidr(item).firstUsable
    endIpAddress: parseCidr(item).lastUsable
  }
}]

```

Donc un grand gain de temps, et cela permet d'éviter les erreurs.
De mon côté je suis bien content de voir que Microsoft continu d'investir dans de nouvelles fonctions avec une vraie valeur ajoutée.
