---
layout: post
title: Azure - Anticiper les impacts de la suppression des services
date: 2024-02-11
categories: [ "Azure" ]
comments_id: 180 
---

Les services Azure évoluent au fur et à mesure du temps. Et l'un des premiers services Azure est justement en sursis, il s'agit des Cloud Services.

Même si aujourd'hui, vous ne pouvez plus en créer, Microsoft s'est appuyé dessus pour un bon nombre de services PAAS, et il l'heure de switcher sur des nouvelles versions. Et pour la plupart de ces composants, cela nécessite une opération de votre part. Où alors vous pouvez attendre que Microsoft vous force la migration, mais vous n'aurez pas la main en cas d'échec.

Parmi les services que j'ai en tête, nous avons:

- API Management stdv1
- Application Gateway Standard
- Virtual Network Gateway Standard SKU

Tous ces produits ont des chemins de migration que vous pouvez suivre. Mais bien entendu, vous ne pouvez passer votre temps sur les mises à jour d'Azure pour construire votre roadmap applicative.

Pour vous aider, Microsoft fourni un workbook [Service Retirements](https://portal.azure.com/#view/Microsoft_Azure_Expert/AdvisorMenuBlade/~/workbooks) dans la partie Advisor, dans celui ci il vous liste tous les services qui seront supprimés à l'avenir, et il peut même vous donner les instances que vous utilisez, il ne s'agit donc pas d'une liste à la Prévert sur laquelle vous devez trier.

![](https://techcommunity.microsoft.com/t5/image/serverpage/image-id/480301iEEB40BE3470595B6/image-dimensions/632x283?v=v2&WT.mc_id=AZ-MVP-4039694)

Et si vous êtes allergique à l'UI, il est toujours possible de faire cela via une requête Ressoure Graph

```kql
advisorresources
| project id, properties.impact, properties.shortDescription.problem
```
