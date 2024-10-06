---
layout: post
title: Créer et supprimer des machines virtuelles sous Windows Azure
date: 2012-07-05
categories: [ "Virtual Machines", "Azure" ]
comments_id: 88 
---

Depuis le 7 juin dernier, Windows Azure a bien changé, notamment une offre de type PAAS a fait son apparition, il est donc possible de créer des machines virtuelles via une galerie tout comme pour la création de Web Site tel que Wordpress.

![image]({{ site.url }}/images/2012/07/05/creer-et-supprimer-des-machines-virtuelles-sous-windows-azure-img0.png "image")

Il est possible bien entendu d’uploader sa propre machine virtuelle, mais par défaut dans la galerie, il existe des machines virtuelles avec Windows Server 2008 nu, où avec SQL Server 2012 de pré-installé, et même des versions avec des systèmes d’exploitation sous Linux ! Pour information, le prix des licences est compris dans la facturation de la machine virtuelle, donc pas besoin d’avoir des licences supplémentaires.

Bien entendu, le nouveau portail contient une interface spécifique pour gérer vos VM, comme celle ci dessous :

![image]({{ site.url }}/images/2012/07/05/creer-et-supprimer-des-machines-virtuelles-sous-windows-azure-img1.png "image")

Donc petit récapitulatif des possibilités du portail :

* Monitoring des performances de la VM (CPU, Data …)
* Gestion du firewall
* Connexion en Remote Desktop
* Statut de la machine (éteindre, démarrer, redémarrer)
* Gestion des disques
* Snapshot de la VM (lorsqu’elle est éteinte)

Donc bon à savoir, lors de la création de votre machine virtuelle, l’assistant vous demande un compte de storage afin d’y stocker votre disque dur. Ainsi on peut voir via un explorer tel que Cloud Storage Studio :

![image]({{ site.url }}/images/2012/07/05/creer-et-supprimer-des-machines-virtuelles-sous-windows-azure-img2.png "image")

Alors rassurez-vous il est impossible de supprimer un disque du blob storage, s’il est utilisé par une machine virtuelle, que celle ci soit allumée ou éteinte, vous aurez un message d’erreur 412 de ce type : “There is currently a lease on the blob and no lease ID was specified in the request.” Donc aucun risque de miss click, puisque oui ça peut arriver !

Pour rappel, la gestion des mises à jour de votre machine doit se faire manuellement, cette opération n’est pas automatisée par Windows Azure en mode IAAS.

Alors maintenant, passons à la partie suppression, ce qu’il y a de plus simple à première vue !

Il suffit d’aller dans l’interface de gestion de sa machine virtuelle, puis de faire supprimer ! Cependant ceci ne supprime pas le disque, pour cela il faut aller dans la partie “Disques” puis de supprimer le disque  que vous souhaitez, comme on peut le voir ci-dessous :

![image]({{ site.url }}/images/2012/07/05/creer-et-supprimer-des-machines-virtuelles-sous-windows-azure-img3.png "image")

Et là attention au piège, malgré le fait que le disque ne soit plus référencer dans le portail, le disque se situe toujours dans votre storage Azure, il vous faut donc le supprimer manuellement !
