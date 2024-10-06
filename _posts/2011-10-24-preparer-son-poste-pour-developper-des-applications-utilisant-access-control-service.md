---
layout: post
title: Préparer son poste pour développer des applications utilisant Access Control Service
date: 2011-10-24
categories: [ "Azure", "Access Control Service" ]
comments_id: 73 
---

Alors Access Control Service, en deux mots vous permets d’utiliser des identités SSO tel que Windows Live, Facebook, Yahoo, et votre Active Directory afin de vous connecter à des applications sur Azure (ou non par ailleurs)

Bien entendu, Visual Studio 2010 et le SDK Azure 1.5 ne suffisent pas, oui il faut toujours installer de plus en plus de choses sur vos machines de dev !

Donc les prérequis, il vous faut Visual Studio 2010 de n’importe quelle édition, mais je suppose que vous l’avez tous, ou alors vous êtes un robot qui passez sur mon blog. Ainsi que IIS installé, mais vous êtes comme moi et fan d’Azure, donc vous l’avez déjà !

Ensuite il vous faudra le Windows Identity Runtime que vous pourrez trouver ici : [http://www.microsoft.com/download/en/details.aspx?displaylang=en&id=17331](http://www.microsoft.com/download/en/details.aspx?displaylang=en&id=17331 "http://www.microsoft.com/download/en/details.aspx?displaylang=en&id=17331")

1ère étape trouver la bonne mise à jour à télécharger, alors les fichiers commençant par Windows 6.0 sont pour Windows Vista et Windows Server 2008, ceux commençant par Windows 6.1 sont pour Windows Seven et Windows Server 2008 R2. Je n’ai pas testé sous Windows 8, cependant je verrais plus tard s’il est possible d’utiliser la mise à jour pour Windows 6.1 (il faudra revenir pour connaître le résultat). De toute façon je rappelle que Windows 8 est en Preview Developper, et qu’il est déconseillé de l’avoir en physique sur sa machine !

Ensuite il faut télécharger le SDK du Windows Identity Foundation que vous pourrez trouver ici : [http://www.microsoft.com/download/en/details.aspx?displaylang=en&id=4451](http://www.microsoft.com/download/en/details.aspx?displaylang=en&id=4451)

Voilà l’article se termine là, je vous montrerais plus tard comment utiliser le Windows Identity Runtime dansvos projets, avec Windows Live, Facebook ou un Active Directory (le dernier si, et seulement si, j’arrive à configurer correctement ce dernier)
