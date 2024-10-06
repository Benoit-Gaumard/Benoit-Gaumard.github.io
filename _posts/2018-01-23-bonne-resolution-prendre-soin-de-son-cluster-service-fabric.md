---
layout: post
title: Bonne résolution - Prendre soin de son cluster Service Fabric
date: 2018-01-23
categories: [ "Azure", "Service Fabric" ]
comments_id: 100 
---

Pour ceux qui ne connaissent pas Service Fabric, il s’agit d’un produit fourni par Microsoft qui permet de mettre en place des architectures micro-services basées soit sur des “Guest Exe”, des containers ou des “reliable service” qui sont dans ce cas présent, des applications développées avec un SDK fourni par l’éditeur.

Ceux qui ont déjà testé Service Fabric dans un cadre projet ont pu voir qu’il est assez magique et rapide de mettre en place des solutions qui fonctionnent toutes seules. Par toutes seules, je veux bien entendu parler de toutes les fonctionnalités “automagiques” qu’offre Service Fabric, comme la répartition automatique des micro-services au sein du cluster, l’auto-healing du cluster, ou encore la gestion des données des différents services stateful.

Maintenant rien n’est vraiment magique si on creuse vraiment comment cela marche, mais ce n’est pas le but de cet article, nous allons voir comment faire en sorte de bien prendre soin de son cluster pour qu’il n’arrive rien d’irrémédiable à celui-ci. Et quand je veux dire rien d’irrémédiable, je parle du moment où vous vous dîtes : “Autant créer un nouveau cluster et rattraper mes données, car l’actuel est bon pour la casse”, bon après vous me direz que cette méthode marche et elle a souvent été éprouvée, mais bon ça n’arrive jamais au bon moment.

## Laissez lui de l’air pour que votre cluster s’épanouisse

A part le fait que cette phrase marche aussi avec un adolescent, il est nécessaire de laisser de l’espace disque sur les différents nœuds de votre cluster pour qu’il puisse effectuer ses opérations sans aucun soucis. Alors grand scoop, Service Fabric a beau être présenté comme du PaaS sur Azure, derrière, vous allez monter un cluster de Virtual Machine Scale Set (moi j’appelle ça du IaaS), le côté PaaS offert par Azure sur votre cluster SF concerne surtout les updates des versions de Service Fabric, les autres fonctionnalités qui sont présentées avec le produit sont les mêmes pour un cluster on premise ou créer à la main sur des Virtual Machine Azure ou AWS ou autre ... Donc ce cluster Scale Set, il faut le bichonner c’est grâce à lui que votre Service Fabric fonctionne, un des éléments à prendre en compte c’est l’espace disque disponible pour vos applications.

Bon vous me direz un disque dur ça ne se remplit pas tout seul, et bien je suis d’accord, tout dépend de votre utilisation de votre cluster. Si on exclu les erreurs courantes d’occupation d’espace disque, comme la génération de fichiers de logs sur le disque local sans mettre en place de politique de purge. Service Fabric peut utiliser l’espace disque pour stocker l’état des services stateful que ce soit vos acteurs ou vos “reliable service”, donc si vous ne supprimez jamais les données locales, il est possible de ne plus avoir d’espace disque si vous avez des acteurs qui gèrent beaucoup de données en disque.

Pour éviter ce problème, il est possible de faire les actions suivantes :

* Supprimer vos acteurs qui ne sont plus utilisés, par exemple ceux qui font des actions temporaires dans un traitement

* Mettre en place une politique de stockage à double niveau, à la fois basée sur le cluster, puis un déchargement sur un Blob Storage (ou autre).

* Mettre en place des alertes sur l’espace disque utilisé afin d’éviter les mauvaises surprises le jour où cela pose problème.

Les disques à monitorer dépendent de l’installation de votre cluster, si vous êtes passé par un template ARM comme celui disponible sur le GitHub de Microsoft ([https://github.com/Azure/azure-quickstart-templates/blob/master/service-fabric-secure-cluster-5-node-1-nodetype/azuredeploy.json](https://github.com/Azure/azure-quickstart-templates/blob/master/service-fabric-secure-cluster-5-node-1-nodetype/azuredeploy.json "https://github.com/Azure/azure-quickstart-templates/blob/master/service-fabric-secure-cluster-5-node-1-nodetype/azuredeploy.json")), vous pouvez voir qu’il y a une propriété nodeDataDrive qui vous permet de positionner les données de votre cluster sur le disque OS ou sur le disque Temp. A noter qu’il est possible de mettre vos données sur le disque Temp sans risque majeur si vos applications sont bien conçues elles sont redondées sur différents nœuds du cluster.

Dans l’hypothèse ou il est trop tard, et que votre cluster est chargé de beaucoup de données, il est parfois possible de supprimer des applications via les API Service Fabric. Cependant, cette opération ne marche pas toujours si votre cluster est vraiment plein. La dernière chance est souvent celle de se connecter au cluster via RDP (ou SSH si c’est un cluster Linux) et de supprimer les dossiers contenant les données liées à la persistance de vos services. J’espère par ailleurs que vous n’arriverez pas à cette solution ultime et brutale.

## Les clusters adoptent une démarche démocratique

Si vous vous êtes intéressé un peu à la notion de cluster, notamment celui de Service Fabric, vous devez savoir qu’il y des nœuds et des composants qu’on ne peut pas supprimer sans y prendre une attention toute particulière. Au sein de Service Fabric, il y a une notion de “Seed Node” que ce soit on-premise ou sur Azure, ces nœuds particuliers hébergent entre autre les applications systèmes servant au bon fonctionnement du cluster, il est donc fortement conseillé de faire en sorte que ces nœuds soient toujours opérationnels. Vous allez me dire que vu que c’est du Service Fabric managé, et que c’est automagique, vous n’avez rien à craindre pour ces nœuds. Et bien non, ce n’est pas le cas, derrière votre cluster il y a un cluster de Virtual Machine Scale Set, et la mauvaise nouvelle c’est que vous y avez accès, donc c’est à vous de le manager et de s’assurer qu’il se porte bien. Vous pouvez voir la liste de vos “Seed Node” dans le cluster manifest, comme on peut le voir ci dessous :

![image]({{ site.url }}/images/2018/01/23/bonne-resolution-prendre-soin-de-son-cluster-service-fabric-img0.png "image")

A noter que le XML de déclaration de l’infrastructure change entre un cluster “on premise” et un cluster Azure. De même selon le niveau de durabilité de votre cluster, le nombre de vos seed nodes est différents.

Alors je parle de démocratie, puisque toute opération d’infrastructure doit être votée par l’ensemble du chorum que forme l’ensemble de ses Seed Nodes. Un cas concret, si par exemple vous avez perdu un de vos seeds node, et que vous souhaitez mettre à jour votre cluster, celle-ci ne se fera pas.

Alors ce cas là arrive uniquement quand vous faites les opérations suivantes :

* Supprimer un nœud de votre cluster ScaleSet (oui la ressource n’est pas verrouillée par Service Fabric)

* Scale Up / Scale down, il est possible que les nœuds du chorum soient supprimés

* Créer votre cluster Scale Set avec le paramètre overProvision à true, dans ce cas précis lors de la création il crée plus de serveurs que nécessaire, et après il supprime ceux qu’il juge en trop, donc peut être vos nœuds de chorum

* Maltraiter les fichiers Service Fabric situés sur votre cluster, bon là ça devient intentionnel....

Si par hasard, c’est trop tard et que vos “Seed Nodes” sont cassés, vous pouvez envoyer un mail au support Microsoft Azure qui vous dira quasiment à chaque fois qu’il faut recréer votre cluster, ce qui peut être problématique dans le cas où vous vous êtes basé sur un cluster appartenant à un Virtual Network un peu petit et ayant des contraintes d’adressage IP, comme pour un cluster privé.

Pour éviter cela, c’est très simple, il suffit soit de faire grandement attention lorsque vous touchez l’infrastructure sous jacente à votre cluster. Il est possible de totalement protéger votre cluster Scale Set Service Fabric si vous prenez la peine de créer 2 types de nœuds lors de la création de votre cluster, le premier type contiendra les services “systèmes” et le deuxième vos services applicatifs, il faudra bien entendu prendre ceci en compte lors de vos déploiements.

Via le portail Azure, lorsque vous créer votre cluster, vous pouvez faire comme cela :

[![image]({{ site.url }}/images/2018/01/23/bonne-resolution-prendre-soin-de-son-cluster-service-fabric-img1.png "image")]({{ site.url }}/images/2018/01/23/bonne-resolution-prendre-soin-de-son-cluster-service-fabric-img1.png)

Il est bien entendu possible de faire tout cela en ARM (car après tout qui déploie des ressources Azure depuis le portail Azure ....) Bref à la création, vous aurez 2 clusters Scale Set, à vous de mettre des droits restreints sur le scale set sysnode dans mon cas, et pour preuve :

[![image]({{ site.url }}/images/2018/01/23/bonne-resolution-prendre-soin-de-son-cluster-service-fabric-img2.png "image")]({{ site.url }}/images/2018/01/23/bonne-resolution-prendre-soin-de-son-cluster-service-fabric-img2.png)

Si vous creusez un peu plus le cluster, vous pourrez voir que les applications systèmes sont toutes dans le scale set “sysnode” à l’exception du DnsService qui est présent sur tous les nœuds.

Bref prenez soin de vos clusters avant que les problèmes surviennent, car ils n’arrivent jamais au bon moment et les résolutions sont soit pas simples à mettre en œuvre, soit assez destructives pour le cluster.
