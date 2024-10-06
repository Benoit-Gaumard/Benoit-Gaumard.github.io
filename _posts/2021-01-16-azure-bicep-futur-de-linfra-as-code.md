---
layout: post
title: Azure Bicep - Futur de l'infra as code ?
date: 2021-01-16
categories: [ "Azure", "ARM", "Bicep" ]
comments_id: 113 
---

Je pense que vous êtes nombreux à avoir au moins jeter un oeil à Azure Bicep, dans cet article je vais essayer de vous expliquer pourquoi à mon avis c'est une technologie à suivre à l'avenir.

<u>Azure Bicep en récapitulatif, c'est quoi selon Microsoft ?</u>

*(extrait de [https://github.com/Azure/bicep](https://github.com/Azure/bicep))*

Bicep est un DSL pour déployer des ressources Azure via un langage déclaratif. Il vise à simplifier l'expérience de création avec une syntaxe plus propre et un meilleur support pour la modularité et la réutilisation du code. Bicep est une abstraction transparente des templates ARM. Tous les types de ressources, versions, et propriétés disponible via ARM sont présentes dans Bicep dès leur sortie.

<u>Et maintenant mon avis</u>

Maintenant que l'on s'est un peu intéressé aux informations fournies par Microsoft, je me suis intéressé un peu à l'utilisation de Bicep sachant que je suis plutôt habitué à ARM pour déclarer mes ressources Azure.

Alors pour bien commencer sur Azure Bicep, il vous faut :

- Visual Studio Code
- Bicep CLI que vous pouvez retrouver dans les releases sur [Github](https://github.com/Azure/bicep/releases)
- Bicep Extension pour VSCode : [https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-bicep](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-bicep)

Les outils sont très importants pour gagner en productivité, si je prends la création de template ARM, si vous n'utilisez pas les différents snippets inclus dans l'extension de Microsoft, il est clairement plus long d'écrire ces templates from scratch.

Étant donné que Bicep génère des templates ARM localement que l'on peut ensuite déployer sur Azure, on va donc comparer le processus de création de template ARM avec les outils que Microsoft met à notre disposition.

Avant toute chose, il est important d'avoir des tutoriaux sur la création de nos templates, et pour cela voici les liens :

- ARM : [Documentation Azure](https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/)
- Bicep : [Github](https://github.com/Azure/bicep/tree/main/docs)

A ce jour Bicep est encore en beta, il est donc normal d'avoir une documentation moins fournie que celle pour ARM qui a pour avantage d'exister depuis un moment.

Ensuite il faut des exemples, afin de ne pas commencer à partir de rien.

- ARM : [Github](https://github.com/Azure/azure-quickstart-templates)
- Bicep : [Github](https://github.com/Azure/bicep/tree/main/docs/examples)

Au niveau des exemples, il y a beaucoup de contributions sur Bicep récemment, donc sur ce point là on est à égalité avec les templates ARM. Cependant un point de plus pour Bicep, car les templates peuvent être plus complexe avec l'utilisation des modules ce que ne propose pas par défaut les exemples ARM.

Et maintenant passons à l'édition, et surtout les fonctionnalités de chacune des extensions VSCode:

- ARM :
  
  - Snippets d'exemples de ressources
  - Intégration des schémas Azure
  - Support des fichiers de paramètres
  - Auto Complétion
  - Navigation facilitée dans les templates

- Bicep :

  - Validation
  - Intellisense
  - Snippets des objets bicep
  - Navigation facilitée dans les fichiers bicep
  - Refactoring

A l'usage, il apparaît nettement que l'édition de fichier Bicep est simplifiée grâce à l'intellisense, qui est bien plus puissante qu'une simple Auto complétion.

Quand aux différences entre Bicep et les templates ARM, je ne vais pas trop les détailler ici, car il est nettement écrit dans la roadmap que Bicep n'inclue pas à ce jour toutes les fonctionnalités d'ARM, comme les copy, mais c'est prévu qu'elles y soient.

Pour finir, je dirais simplement que depuis que j'ai testé Bicep, je n'utilise plus que cela, malgré le fait que j'ai du écrire plusieurs milliers lignes de templates ARM. Et pour les différences, je les inclus a postériori dans le template ARM tant que Bicep ne les fournis pas nativement.
