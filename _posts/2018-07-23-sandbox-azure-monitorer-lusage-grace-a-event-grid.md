---
layout: post
title: Sandbox Azure - Monitorer l'usage grâce à Event Grid
date: 2018-07-23
categories: [ "Azure", "Logic Apps", "Event Grid" ]
comments_id: 141 
---


Dans le cadre de la sandbox Azure dont je vous ai parlé dans les articles précédents:

* Introduction : [http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory](http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory)
* Provisionnement des utilisateurs : [http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs](http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs)
* Gestion des groupes de ressources : [http://blog.woivre.fr/blog/2018/06/sandbox-azure-gestion-des-groupes-de-ressources](http://blog.woivre.fr/blog/2018/06/sandbox-azure-gestion-des-groupes-de-ressources)
* Azure Policy : [http://blog.woivre.fr/blog/2018/06/sandbox-azure-mise-en-place-de-policy-azure](http://blog.woivre.fr/blog/2018/06/sandbox-azure-mise-en-place-de-policy-azure)

Sur ma sandbox, j'ai donc mis en place la création des utilisateurs, et des groupes de ressources. Les utilisateurs sont dorénavant autonomes sur la plateforme Azure.

Afin que la consommation ne s'envole pas, j'utilise des Azure Policy afin de limiter les SKUs de certains services, à la fois ceux que je juge possiblement coûteux et ceux que je juge utiles. Pas besoin d'avoir un IoT Hub en standard pour faire des tests.

Cependant il s'agit ici d'une souscription utilisée pour faire de l'auto-formation, afin d'être proactif, je souhaite savoir quel type de service est utilisé sur la plateforme et par qui. Pour réaliser cela, je vais utiliser Event Grid afin de m'abonner aux actions qui sont réalisées sur la souscription.

Afin de mettre cela en place, je vais créer une Logic Apps, et utiliser le trigger *"When a Event Grid event occurs"*

![image]({{ site.url }}/images/2018/07/23/sandbox-azure-monitorer-lusage-grace-a-event-grid-img0.png "image")

Ensuite je configure ce trigger de cette manière afin de monitorer l'intégralité des évènements qui sont déclenchés sur la souscription

![image]({{ site.url }}/images/2018/07/23/sandbox-azure-monitorer-lusage-grace-a-event-grid-img1.png "image")

Après cette étape je vous conseille de jouer quelques évènements afin de voir le format qui est généré par celui-ci pour l'exploiter par la suite.

De ces données je souhaite extraire les informations suivantes :

* Id de l'évènement
* Heure de l'évènement
* Action réalisée (Création ou Suppression principalement)
* Scope
* Nom de l'utilisateur ou Id du service principal

J'ai donc effectué divers tests pour avoir quelques exemples de json générés par des actions. Dès que j'ai mes différents exemples, je les compare afin de chercher les informations dont j'ai besoin. Ici, je vois que la structure est légèrement différente entre les actions générées par un utilisateur, et celles faites par un Service Principal.

Dans mon workflow Logic Apps, je vais donc ajouter une action de type *"Data Operations - Parse JSON"* et je vais lui fournir un exemple de json afin de générer un schéma, j'aurai bien entendu pris en compte les différences entre mes deux structures.

Ce qui me donne cette opération suivante :

![image]({{ site.url }}/images/2018/07/23/sandbox-azure-monitorer-lusage-grace-a-event-grid-img2.png "image")

J'ai donc en 2 étapes récupéré les données que je souhaitais avoir, je peux donc soit les stocker dans un Table Storage par exemple, ou les envoyer par mail dans mon cas.

Je le fais ici via une tâche Gmail, car Logic Apps est un produit contenant une grande quantité de connecteurs et qui ne sont pas tous liés à Microsoft.

![image]({{ site.url }}/images/2018/07/23/sandbox-azure-monitorer-lusage-grace-a-event-grid-img3.png "image")

On peut noter par ailleurs que ma tâche précédente extrait toutes le données dans des variables, ce qui est très facile à utiliser par la suite.

Par ailleurs, petit tips, dans la tâche Gmail, le format HTML est dans les options avancées.
