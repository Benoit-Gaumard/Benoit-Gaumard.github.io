---
layout: post
title: Azure Resource Graph Explorer - Quelques exemples
date: 2020-09-01
categories: [ "Azure", "Resource Graph" ]
comments_id: 112 
---

Dans de précédents articles, je vous ai montré que Resource Graph Explorer était ultra puissant pour requêter vos différentes souscriptions Azure.

Maintenant il est toujours plus pratique d'avoir quelques requêtes sous la main, car tout réécrire à chaque fois, cela nous fait perdre du temps.

Microsoft fourni quelques exemples sur leur site : [Requêtes simples](https://docs.microsoft.com/en-us/azure/governance/resource-graph/samples/starter?tabs=azure-cli) et [Requêtes avancées](https://docs.microsoft.com/en-us/azure/governance/resource-graph/samples/advanced?tabs=azure-cli)

Cependant, je préfère les requêtes "fonctionnelle" c'est à dire celle qui me servent durant mon travail, car lister l'ensemble des KeyVaults avec le nom de la souscription, ce n'est pas quelque chose que je fais tous les jours.

De ce fait j'ai créé un repository Github [Azure Resource Graph Queries](https://github.com/wilfriedwoivre/azure-resource-graph-queries) sur lequel j'invite tout ceux qui veulent contribuer afin d'ajouter des requêtes Azure Resource Graph. Vous y retrouverez tous les requêtes que j'ai déjà mise sur mon blog.

Pour contribuer, rien de plus simple :

- Via une issue Github, il suffit de créer une issue Github avec votre requête Resource Graph à ajouter.
- Via une pull request en ajoutant à la fois votre requête et un readme explicatif.

Le bonus, la partie template ARM et le button pour le déployer est ajoutée de manière automatique pour votre requête, comme pour les autres.

Et pour finir un petit exemple de requête pour retrouver tous vos subnets n'ayant pas de Route Table

```yaml
resources
| where type == "microsoft.network/virtualnetworks"
| project vnetName = name, subnets = (properties.subnets)
| mvexpand subnets
| extend subnetName = (subnets.name)
| extend hasRouteTable = isnotnull(subnets.properties.routeTable)
| where hasRouteTable == 0
| project vnetName, subnetName
```
