---
layout: post
title: Visual Studio Code Extensions - ARM Params File Generator
date: 2018-08-03
categories: [ "Azure", "ARM", "Visual Studio Code" ]
comments_id: 142 
---

Si comme moi, vous êtes un utilisateur courant de Visual Studio Code, vous savez qu'il s'agit du deuxième meilleur produit fourni par Microsoft (juste après Azure).

Ce produit est génial parce qu'il est très simple de l'enrichir via des extensions, comme Visual Studio, sauf que contrairement à ce dernier la création des extensions est extrêmement simple.

J'ai donc créé une extension qui s'appelle [ARM Params File Generator](https://marketplace.visualstudio.com/items?itemName=wilfriedwoivre.arm-params-generator)

Le pourquoi de cette extension est très simple, j'écris le plus souvent des templates ARM qui ont les particularités d'être très paramétrables, voire trop, et elles impliquent le plus souvent des ressources complexes comme Service Fabric.

Ce qui me donne l'avantage de pouvoir réutiliser mes templates dans plusieurs cas, par exemple si je prends celui que je vous ai présenté dans l'article : [http://blog.woivre.fr/blog/2018/05/service-fabric-creer-un-cluster-via-un-template-arm](http://blog.woivre.fr/blog/2018/05/service-fabric-creer-un-cluster-via-un-template-arm)

J'utilise ce template dans les cas suivants :

* 1 node type de 3 noeuds pour les démos
* 2 node type de 3 noeuds chacun pour des tests *infra*
* 3 node type de 7 noeuds primaires et pleins de secondaires pour les clients

Créer mes templates via VS Code est assez facile avec les tools ARM qui vont biens à savoir :

* ARM Snippets de Sam Cogan : [https://marketplace.visualstudio.com/items?itemName=samcogan.arm-snippets](https://marketplace.visualstudio.com/items?itemName=samcogan.arm-snippets)
* ARM Tools de Microsoft : [https://marketplace.visualstudio.com/items?itemName=msazurermtools.azurerm-vscode-tools](https://marketplace.visualstudio.com/items?itemName=msazurermtools.azurerm-vscode-tools)

Autant créer son fichier de paramètres sans faire de faute de frappe sur le nom de mes paramètres est une plaie, j'ai donc créé une extension qui le fait pour moi et donc pour vous !

Allez vite l'installer -> [ARM Params File Generator](https://marketplace.visualstudio.com/items?itemName=wilfriedwoivre.arm-params-generator)

Dans les fonctionnalités que j'ai mises en place :

***Génération d'un nouveau fichier de paramètres***

Il est possible de le faire de pleins de manières différentes :

* Clic droit un peu partout si cela a un rapport avec le fichier (editeur, exploreur, titre), puis **Azure RM: Generate parameters file**
* Lancer la commande **Azure RM: Generate parameters file** qui prendra en compte la fenêtre active

***Consolidation d'un fichier de paramètre existant***

Pour cela, rien de plus simple il faut lancer la commande **Azure RM: Consolidate parameters file**, puis renseigner les 2 fichiers.

Pour cette fonctionnalité, j'ai pris le choix de n'ajouter que des valeurs et de ne pas supprimer des paramètres exitants.

Le mieux maintenant pour vous est de télécharger cette extension, et je serais bien entendu enchanté si vous avez des fonctionnalités que vous souhaiteriez que j'implémente.

Pour rappel voici les liens

* ARM Params Generator extensions : [https://marketplace.visualstudio.com/items?itemName=wilfriedwoivre.arm-params-generator](https://marketplace.visualstudio.com/items?itemName=wilfriedwoivre.arm-params-generator)
* Github de l'extension (pour vos prochaines PR) : [https://github.com/wilfriedwoivre/vscode-arm-params-generator](https://github.com/wilfriedwoivre/vscode-arm-params-generator)
