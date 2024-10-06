---
layout: post
title: Nouvel endpoint disponible dans le mode PAAS de Windows Azure
date: 2012-07-21
categories: [ "Azure", "Cloud Services" ]
comments_id: 89 
---

Depuis le 7 juin dernier, vous avez du remarqué qu’il y a eu pas de changement du côté d’Azure, notamment avec l’arrivée du mode IAAS, cependant le mode PAAS qui existait avant ces nouveautés a été enrichies. Une des nouvelles fonctionnalités que j’aime bien, est la possibilité de définir des InstanceInput dans les endpoints de notre rôle Azure.

Pour configurer un endpoint de ce type, il vous suffit d’aller dans la configuration de votre rôle Azure, puis dans la partie Endpoint, comme on peut le voir ci-dessous :

![image]({{ site.url }}/images/2012/07/21/nouvel-endpoint-disponible-dans-le-mode-paas-de-windows-azure-img0.png "image")

Il est aussi possible de saisir ces informations directement dans le fichier de définition du service, comme ceci :

```xml
<Endpoints>  
  <InputEndpoint  name="Endpoint1"  protocol="http"  port="80" />  
  <InstanceInputEndpoint  name="Endpoint2"  protocol="tcp"  localPort="3389">  
    <AllocatePublicPortFrom>  
      <FixedPortRange  max="10109"  min="10105" />  
    </AllocatePublicPortFrom>  
  </InstanceInputEndpoint>  
</Endpoints>
```

Le but de cet endpoint est d’attribué au load balancer Azure une plage de port qui redirigera vers un port privée, ainsi si dans mon cas j’ai 3 instances, lorsque que j’irais sur <http://monservice.cloudapp.net:10105/> j’atteindrais ma machine virtuelle sur le port 3389, cependant les autres ports amèneront vers d’autres machines virtuelles.

Ici dans mon cas, je me sers de cette fonctionnalité pour accéder en remote desktop à mes machines, ce qui me permet d’accéder en remote à toutes mes machines sans pour autant avoir tous les fichiers rdp à télécharger sur le portail.

![image]({{ site.url }}/images/2012/07/21/nouvel-endpoint-disponible-dans-le-mode-paas-de-windows-azure-img1.png "image")

Ce cas là n’est en soit pas très utile, mais cette fonctionnalité vous offre la possibilité d’implémenter des fonctionnalités propres à une seule machine et non pas à tout votre cluster de machines.
