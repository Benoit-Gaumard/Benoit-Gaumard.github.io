---
layout: post
title: Azure Policy - Surveillez à qui vous donnez vos droits RBAC
date: 2022-04-20
categories: [ "Azure", "Policy" ]
comments_id: 127 
---

Les droits RBAC sur Azure, si vous êtes plusieurs à pouvoir les gérer, et que vous n'êtes pas tous sensibilisés au même niveau de sécurité, cela peut rapidement devenir un bordel monstre...

En entreprise, il y a souvent des arrivées et des départs dans les équipes, et donc il n'est pas conseillé de mettre en place des role Assignment dédié à une personne en directe, car il devient rapidement compliqué de retrouver toutes les actions d'une personne dans Azure. C'est donc pour cala qu'il est conseillé de mettre en place des RoleAssignements pour des groupes ou des SPN.

Après il faut gérer les dérives et donc vérifier régulièrement qu'il n'y a pas d'attribution de droits en direct, afin de limiter les dérives.

Bien entendu le contrôle c'est bien, mais le mieux c'est de prévenir les dérives avant qu'elles n'arrivent. Et pour cela on va utiliser une Azure Policy bien entendu :

```json
"policyRule": {
    "if": {
        "allOF": [
            {
                "field": "type",
                "equals": "Microsoft.Authorization/roleAssignments"
            },
            {
                "field": "Microsoft.Authorization/roleAssignments/principalType",
                "notIn": [
                    "Group",
                    "ServicePrincipal"
                ]
            }
        ]
    },
        "then": {
            "effect": "deny"
    }
}
```

Et voilà comment simplement limiter les RolesAssignments à des groupes, des SPN, ou des Managed Identity.
