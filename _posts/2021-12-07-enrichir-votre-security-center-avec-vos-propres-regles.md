---
layout: post
title: Enrichir votre Microsoft Defender for Cloud avec vos propres règles
date: 2021-12-07
categories: [ "Azure", "Policy", "Microsoft Defender for Cloud" ]
comments_id: 119 
---

Grâce à Microsoft Defender for Cloud, ou Security Center vous pouvez surveiller facilement et à grande échelle vos souscriptions Azure.
Dans un soucis d'amélioration continue, ou même réglementaire, il est possible de directement affecter des initiatives comme j'ai pu en parler lors d'un précédent [https://woivre.fr/blog/2021/06/security-center-votre-boite-a-outil-pour-la-gouvernance](article)
Cependant on peut aller plus loin via l'onglet "Regulatory compliance" dans Microsoft Defender for Cloud.

Mais il est aussi possible d'intégrer vos propres contrôles avec vos propres policy afin de personnaliser totalement votre expérience avec cet outil.

Afin de commencer, on va commencer par créer une nouvelle Azure Policy, telle que celle ci :

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        {
          "field": "type",
          "equals": "Microsoft.Storage/storageAccounts"
        },
        {
          "field": "Microsoft.Storage/storageAccounts/supportsHttpsTrafficOnly",
          "equals": false
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  },
  "parameters": {}
}
```

On va bien entendu penser à lui donner un nom et un commentaire, mais vous avez le choix pour tous les paramètres, tel que les suivants :

- **Policy Definition** : Tenant Root Group
- **Name** : AzSecure-Storage-OnlyHTTPS
- **Description** : Enforce HTTPS Traffic only for Azure Storage
- **Category** : AzSecure-Storage

Maintenant on ne va pas assigner cette policy directement, mais on va créer une nouvelle **Initiative Definition** avec les paramètres suivants :

- **Initiative Definition** : Tenant Root Group
- **Name** : AzSecure-Compliance
- **Description** : Contains all Azure policies to secure your Azure account
- **Category** : AzSecure
- **Version** : 1.0

Ensuite dans la liste des policies, on va maintenant intégrer la policy que nous avons créé précédemment.
Vous avez aussi la possibilité de créer des groupes afin d'organiser vos différentes policies par la suite.

On va ensuite définir nos paramètres pour notre Initiative, et nos policies si nous en avons. Ici ce n'est pas le cas.

Dès que nous avons créer notre policy, on va par la suite assigner celle-ci sur notre souscription. Et ici, il peut être très pratique d'éditer vos différents messages de Non-Compliance pour vos policy afin de guider au mieux vos utilisateurs.

Maintenant que votre initiative est assignée à votre souscription, vous allez pouvoir observer le comportement des policies de manière très classique, c'est à dire soit créer des services non compliant, et de voir les différents éléments dans les différentes blades Policies disponibles.

Mais il est aussi possible d'aller plus loin grâce à Microsoft Defender for Cloud, dans la partie des paramètres de Microsoft Defender.

Il vous faut aller dans Security Policy puis ajouter votre propre initiative comme ci-dessous :

![]({{ site.url }}/images/2021/12/07/enrichir-votre-security-center-avec-vos-propres-regles-img0.png)

Maintenant il faut prendre votre mal en patience, et attendre plusieurs heures afin de pouvoir votre blade Regulatory compliance enrichie de votre propre initiative comme ci-dessous :

![]({{ site.url }}/images/2021/12/07/enrichir-votre-security-center-avec-vos-propres-regles-img1.png)

Bon maintenant pour les mauvaises nouvelles, il faut activer cette fonctionnalité dans Microsoft Defender for cloud pour pouvoir l'utiliser, et donc payer pour cette fonctionnalité. Mais bon la sécurité n'a pas de prix.
