---
layout: post
title: Azure - Deployment Stack - Le futur de Blueprint ?
date: 2023-07-30
categories: [ "Azure" ]
comments_id: 187 
---

Microsoft a annoncé [Deployement Stacks en public preview](https://techcommunity.microsoft.com/t5/azure-governance-and-management/arm-deployment-stacks-now-public-preview/ba-p/3871180) la semaine dernière.
Pour ceux qui suivent de manière très attentive ce qu'il se passe dans l'environment Azure, on entend parler de cette technologie depuis au moins 2020

![image]({{ site.url }}/2023/07/30/azure-deployment-stack-le-futur-de-blueprint-img0.png)

Bref, une preview qui s'est fait un peu attendre.

Dans l'article, et sur la documentation Azure, on nous dit qu'il faut migrer de Blueprint à Deployment Stack + Template Specs avant Juillet 2026, donc pas de précipation.

Si on compare les deux très rapidement.

Les blueprints sont un moyen déclaratif d'orchestrer le déploiement de divers modèles de ressources et d'autres artefacts, notamment ceux-ci:

- Role Assignment
- Policy Assignment
- ARM Template
- Resource Groups

Le cycle de vie d'un Blueprint:

- Création et modification d’un blueprint
- Publication du blueprint en v1.0
- Assignation du blueprint en v1.0
- Création et modification d’une nouvelle version du blueprint
- Publication d’une nouvelle version du blueprint en V2.0
- Mise à jour de l’assignation du blueprint en v2.0
- Suppression d’une version spécifique du blueprint
- Suppression du blueprint

Blueprint est inclus avec une gestion du lock, sous la forme de 3 modes:

- Pas de locks
- Lecture seule du groupe de ressource ou de la ressource
- Pas de suppression

Le lock était intégré dans Azure via un Deny Assignment et pas via le type de Lock que vous pouvez gérer en tant qu'utilisateur.

Dans les avantages de blueprint, nous avons donc un système de versionning, et l'utilisation de blueprint est très utile pour une mise en place d'une gouvernance à l'échelle.

Dans les contres, cela gère uniquement de l'ARM, et en plus c'est inclus en tant qu'artefact avec un format custom, donc pas pris en compte par VSCode. Les SDKs lié à blueprint peuvent grandement être améliorer. La gestion des locks est ultra limité, et pour finir c'est toujours en preview....

Maintenant au tour de deployment stack, si on reprend l'article, le rôle de ce dernier:

- Simplifier les opérations de CRUD sur vos ressources Azure
- Un processus de nettoyage plus efficace
- Protection contre les mises à jour non souhaitées

Si on compare point par point à Blueprint.

On peut déjà supporter ARM ou Bicep en tant qu'infra as code, c'est un mieux mais je sais que beaucoup d'entre vous utilisent Terraform.

Le SDK, bien que ce soit une preview c'est déjà disponible dans AzCLI et AzPowershell. On utilise ici des templates ARM ou Bicep natif, pas de notion d'artefact. Et c'est intégré dans le portail quasiment partout. Par contre plus de notion de versionning....

La gestion des locks, n'a rien à voir maintenant on a tout cela :

- **DenySettingsMode**: définit les opérations interdites sur les ressources managées pour vous protéger contre les principaux de sécurité non autorisés qui tentent de les supprimer ou de les mettre à jour. Cette restriction s’applique à tout le monde, sauf si l’accès est explicitement accordé. Ces valeurs incluent None, DenyDelete et DenyWriteAndDelete.
- **DenySettingsApplyToChildScopes**: les paramètres de refus sont appliqués aux ressources imbriquées sous les ressources managées.
- **DenySettingsExcludedAction**: liste des opérations de gestion basées sur les rôles qui sont exclues des paramètres de refus. Jusqu’à 200 actions sont autorisées.
- **DenySettingsExcludedPrincipal**: Liste des ID principaux Microsoft Entra ID exclus du verrou. Jusqu’à cinq principaux sont autorisés.

Je pense que même si c'est relativement nouveau, Deployment stack a de l'avenir, et couplé à Template Specs cela peut faire un bon remplacement à Blueprint. J'espère que d'ici 1 an ou 2 je pourrais vous faire un retour d'expérience sur une migration depuis Blueprint
