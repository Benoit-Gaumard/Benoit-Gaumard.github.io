---
layout: post
title: Service Fabric - Utiliser des contraintes de placements en local
date: 2018-06-19
categories: [ "Azure", "Service Fabric" ]
comments_id: 137 
---

Lors d’un précédent article, je vous ai montré comment mettre en place des contraintes de placement sur votre cluster Service Fabric. Un lien vers l’article si vous ne l’avez pas lu, je le recommande : [http://blog.woivre.fr/blog/2018/06/service-fabric-deployer-sur-un-cluster-multinodes](http://blog.woivre.fr/blog/2018/06/service-fabric-deployer-sur-un-cluster-multinodes)

Maintenant je suppose que vous n’utilisez pas un véritable cluster pour déployer vos applications lors des phases de développement, mais votre cluster de dev situé sur votre poste. Il existe plusieurs manières d’utiliser les contraintes de placement en local, et nous allons voir comment les mettre en place dans cet article.

La solution la plus simple, c’est de s’affranchir de la gestion des contraintes de placement en local. Pour cela on va utiliser les différents PublishProfile que nous offre Visual Studio.

Pour cela, dans notre fichier ApplicationManifest.xml, il faut déclarer des valeurs par défaut, comme ci-dessous :

```xml
<Parameter Name="Stateful_Constraint" DefaultValue="NodeTypeName==AppNode" />
  <Parameter Name="Web_Constraint" DefaultValue="" />
</Parameters>
```

Il est par la suite possible de les utiliser dans le même fichier de cette manière :

```xml
<Service Name="Stateful" ServicePackageActivationMode="ExclusiveProcess">
  <StatefulService ServiceTypeName="StatefulType" TargetReplicaSetSize="[Stateful_TargetReplicaSetSize]" MinReplicaSetSize="[Stateful_MinReplicaSetSize]">
    <UniformInt64Partition PartitionCount="[Stateful_PartitionCount]" LowKey="-9223372036854775808" HighKey="9223372036854775807" />
    <PlacementConstraints>[Stateful_Constraint]</PlacementConstraints>
  </StatefulService>
</Service>
<Service Name="Web" ServicePackageActivationMode="ExclusiveProcess">
  <StatelessService ServiceTypeName="WebType" InstanceCount="[Web_InstanceCount]">
    <SingletonPartition />
    <PlacementConstraints>[Web_Constraint]</PlacementConstraints>
  </StatelessService>
</Service>
```

On retrouve ici un usage que je classifierai de classique dans le monde de la programmation, puisqu’après il suffit de modifier nos PublishProfile pour adapter nos contraintes de placement.

Si par contre vous mettez en place des services qui démarrent à la demande via votre code, il est possible de mettre en place dans votre code la notion de contraintes de placement uniquement sur des clusters de production, mais cela peut être source d’erreur en cas d’oubli de configuration sur votre poste local, ou pire une mauvaise configuration lorsque vous déployez sur un véritable cluster.

On va donc s’intéresser au cluster local, et voir à quoi il ressemble de plus près via la cluster map ci-dessous

![image]({{ site.url }}/images/2018/06/19/service-fabric-local-constraint-img0.png "image")

On voit ici que nous avons un cluster local basé sur 5 nœuds, qui ont par défaut les propriétés suivantes :

```json
"nodes": [
  {
    "nodeName": "_Node_0",
    "iPAddress": "ComputerFullName",
    "nodeTypeRef": "NodeType0",
    "faultDomain": "fd:/0",
    "upgradeDomain": "0"
  },
  {
    "nodeName": "_Node_1",
    "iPAddress": "ComputerFullName",
    "nodeTypeRef": "NodeType1",
    "faultDomain": "fd:/1",
    "upgradeDomain": "1"
  },
  {
    "nodeName": "_Node_2",
    "iPAddress": "ComputerFullName",
    "nodeTypeRef": "NodeType2",
    "faultDomain": "fd:/2",
    "upgradeDomain": "2"
  },
  {
    "nodeName": "_Node_3",
    "iPAddress": "ComputerFullName",
    "nodeTypeRef": "NodeType3",
    "faultDomain": "fd:/3",
    "upgradeDomain": "3"
  },
  {
    "nodeName": "_Node_4",
    "iPAddress": "ComputerFullName",
    "nodeTypeRef": "NodeType4",
    "faultDomain": "fd:/4",
    "upgradeDomain": "4"
  }
],
```

On peut voir que chaque nœud est associé à un type différent, qui est décrit dans le fichier que vous pouvez retrouver sur votre poste, et qui se trouve à cet endroit :

```cmd
C:\Program Files\Microsoft SDKs\Service Fabric\ClusterSetup\NonSecure\FiveNode\ClusterManifestTemplate.json
```

Il est possible de modifier ce fichier afin de le configurer selon vos besoins, pour cela je vous conseille de supprimer votre cluster local, ainsi que les différents dossiers résiduels afin de commencer sur un environnement “propre”.

Dans mon cas je vais modifier le node 4 pour que son type soit le suivant :

```json
{
  "name": "AppNode",
  "clientConnectionEndpointPort": "19040",
  "clusterConnectionEndpointPort": "19042",
  "leaseDriverEndpointPort": "19041",
  "serviceConnectionEndpointPort": "19046",
  "httpGatewayEndpointPort": "19088",
  "reverseProxyEndpointPort": "19089",
  "applicationPorts": {
    "startPort": "34001",
    "endPort": "35000"
  },
  "isPrimary": false,
  "placementProperties": {
    "HasSSD": "true",
    "NodeColor": "green",
    "SomeProperty": "5"
  }
}
```

J’ai donc ici changé son nom afin qu’il corresponde à celui que j’utilise dans mon précédent article, et j’y ajoute différentes propriétés via le champs placementProperties.

Lorsque je relance mon cluster, je peux donc voir dans le manifest de celui-ci mes différents changements, comme on peut le voir ci dessous :

![image]({{ site.url }}/images/2018/06/19/service-fabric-local-constraint-img1.png "image")

C’est donc aussi simple que cela de personnaliser votre cluster local si besoin, car c’est aussi ce fichier qui vous permettra de changer les différents ports utilisés ou bien de changer les différents dossiers par défaut qui sont utilisés.
