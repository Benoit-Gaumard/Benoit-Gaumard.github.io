---
layout: post
title: Service Fabric - Déployer sur un cluster multi-nodes
date: 2018-06-06
categories: [ "Azure", "Service Fabric" ]
comments_id: 104 
---
  

Lorsque vous créez des clusters Service Fabric il est possible de mettre en place plusieurs types de nœuds. Il y a plusieurs raisons pour lesquelles vous voulez faire ça qui peuvent être entre autre les suivantes :

* Isoler les nœuds primaires contenant les services dédiées Service Fabric
* Mettre en place une séparation réseau entre vos différents services
* Avoir plusieurs configurations de serveurs : Beaucoup de CPU, Beaucoup de RAM, GPU,...

A partir du moment où vous avez créé plusieurs nodes types, il est fortement conseillé de mieux maitriser le déploiement de vos applications sur votre cluster afin qu’elles ne soient pas déployées n’importe où.

Prenons par exemple, un exemple de cluster respectant cette configuration suivante :

* 2 nodes types
  * AdminNode : Nœuds uniquement pour les services fournis par Microsoft
  * AppNode : Nœuds  pour héberger les services que je développe

* 1 point d’entrée par type de nœuds.

Passons à notre application, si je prends un service stateless issu du template Visual Studio et que je le déploie tel quel sur mon cluster, j’aurais une valeur d’instance count à –1, c’est-à-dire qu’il sera présent sur tous les noeuds de mon cluster comme on peut le voir ci dessous:

![image]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img0.png "image")

Si par ailleurs je provisionne uniquement 3 instances, je n’aurais pas la certitude que mon application soit présente uniquement sur les 3 serveurs qui m’intéressent dans ce cas précis.

Je vais donc rajouter des contraintes de placement à mon application afin d’être sûr qu’elle se déploie uniquement sur les noeuds de type AppNode, pour cela dans le fichier ApplicationManifest.xml, je rajoute la contrainte suivante :

```xml
    <Service Name="Web" ServicePackageActivationMode="ExclusiveProcess">  
      <StatelessService ServiceTypeName="WebType" InstanceCount="[Web_InstanceCount]">  
        <SingletonPartition />  
        <PlacementConstraints>(NodeTypeName==AppNode)</PlacementConstraints>  
      </StatelessService>  
    </Service>
```
  
Grâce à cette contrainte de placement, je m’assure que mon service se déploiera uniquement sur mon nodetype AppNode, et je peux laisser sereinement mon InstanceCount à –1.

Ici j’ai décidé de me baser sur les noms des NodeTypes puisque j’ai la maitrise de ceux-ci. Cependant il est possible de se baser sur des métriques personnalisées, pour cela il faut les déclarer sur les différents nodetypes de votre cluster. Il est possible de faire cela de deux manières :

* A la création de votre cluster, via votre template ARM (donc aussi via un update) en ajoutant ceci à la définition de votre type :

[![image]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img1.png "image")]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img1.png )

* En mettant à jour le manifest de votre cluster Service Fabric :

[![image]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img2.png "image")]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img2.png )

* Via le portail Azure comme on peut le voir ci-dessous :

[![image]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img3.png "image")]({{ site.url }}/images/2018/06/06/service-fabric-deployer-sur-un-cluster-multinodes-img3.png )

Dans un prochain article je vous montrerai comment mettre en place des contraintes de placement sur votre cluster de développement.
