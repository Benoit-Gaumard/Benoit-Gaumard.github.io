---
layout: post
title: Azure Resource Graph - Lister toutes les souscriptions d'un Management Group
date: 2020-04-15
categories: [ "Azure" , "Resource Graph" ]
comments_id: 110 
---

Vu que comme moi, vous êtes devenu un grand fan de Resource Graph pour explorer les ressources de vos souscriptions Azure.

Maintenant rien n'est parfait, et encore moins sur Azure, il manque toujours des fonctionnalités notamment celle-ci : [Resource Graph type for Management Groups](https://feedback.azure.com/forums/915958-azure-governance/suggestions/39760720-resource-graph-type-for-management-groups)

Ce type serait pratique pour par exemple lister toutes les souscriptions présentes dans un Management Group.

Mais bonne nouvelle avant que cette fonctionnalité planifiée soit disponible, il y a toujours un moyen d'arriver à nos fins.

Pour cela on va lister toutes nos souscriptions via la requête suivante :

```graph
resourcecontainers
 | where type == "microsoft.resources/subscriptions"
```

Si votre souscription est dans un Management Group, vous allez trouver un tag spécifique comme suit :

```json
{
    "hidden-link-ArgMgTag": "[\"Admin\",\"GUID\"]"
}
```

ou

```json
{
    "hidden-link-ArgMgTag": "[\"Sandbox\",\"SOAT\",\"GUID\"]"
}
```

Ce champ correspond à l'arborescence de vos Management Group, qui se lit de gauche à droite.

Le premier champ à gauche est un Guid qui est celui de votre tenant, et les suivants correspondent aux ID de vos Management Groups en suivant la hiérarchie.

Bon bien entendu si vous avez moins d'une dizaine de souscriptions, vous pouvez filtrer globalement votre requête, mais quand vous en avez une centaine, vous serez bien content de connaître cette astuce.

Il ne vous reste plus qu'à filter vos souscriptions via une requête de ce type :

```graph
resourcecontainers
 | where type == "microsoft.resources/subscriptions"
 | where tags contains "Sandbox"
 ```
