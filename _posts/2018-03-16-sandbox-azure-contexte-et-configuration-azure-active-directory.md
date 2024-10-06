---
layout: post
title: Sandbox Azure - Contexte et configuration Azure Active Directory
date: 2018-03-16
categories: [ "Azure", "Azure Active Directory" ]
comments_id: 102 
---

Dans le cadre de SOAT, je suis en train de mettre en place un bac à sable afin que les différents consultants qui le souhaitent puissent utiliser Azure afin de se former, et de découvrir les différentes technologies liées à la plateforme.

J’ai décidé pour cela de partir sur une page blanche dans Azure, c’est-à-dire une nouvelle souscription rattachée à un nouvel Azure Active Directory. Et bien entendu, je souhaite gérer cette souscription le moins possible pour ne pas rajouter cela à ma journée de travail, et surtout offrir la meilleure disponibilité de services aux consultants qui souhaitent se former.

Mes différentes problématiques sont donc les suivantes :

* Gestion des comptes Azure, que ça soit de la création, de l’assignation des droits et de la suppression des consultants de l’Azure AD
* Gestion des ressources Azure : Créations et suppressions de celles-ci après expérimentation
* Gestion des coûts Azure
* Peu de management pour les Admins Azure

Je suis donc parti sur les différents choix pour la gestion des services via Azure avec les types de services suivants :

* Azure AD
* Azure Function
* Azure Storage
* Azure KeyVault
* Application Insights
* SendGrid

Je vais tâcher de décliner la création de cette zone de bac à sable en une série d’article qui pourront vous aider par la suite, soit pour créer vous même une zone de tests, soit pour en apprendre un peu plus sur la partie management d’Azure.

Commençons donc par l’Active Directory, parce qu’il est souvent mieux de commencer par la gestion des droits.

Dans mon cas, peu de gestion de droits par groupe, puisque je compte mettre en place un système qui crée des groupes de ressources, je vais donc créer deux groupes qui sont les suivants :

* Admins : Qui contiendra les différents admins de la souscription Azure
* Users : Qui contient tous les autres utilisateurs, pour leur donner accès à des ressources communes à ma sandbox

Donc rien de bien complexe en terme de groupe AD, maintenant les permissions que je mets sur l’Azure AD sont les suivantes :

* Autorisation : Les utilisateurs peuvent inscrire des applications

* Utile pour la création de compte applicatif, notamment pour faire un peu de DevOps via VSTS ou tout autre outil, le publish depuis Visual Studio c’est mal....

* Refus : Les membres peuvent inviter

* Je n’ai pas envie de gérer des comptes persos sur cette plateforme, donc j’empêche les invitations aux membres.

* Refus : Les invités peuvent inviter

* C’est notamment s’il y a un écart un jour et qu’un admin créé un compte Guest

Les autres droits je les laisse par défaut, je n’ai aucunement besoin de les modifier dans mon cas présent.

Bien entendu, j’optimise les coûts il s’agit d’un AD gratuit.

Le prochain article parlera de comment utiliser la Graph API et des Converged Applications pour créer de nouveaux utilisateurs dans l’AD selon leur demande, donc stay tuned !
