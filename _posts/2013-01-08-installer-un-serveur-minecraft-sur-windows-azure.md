---
layout: post
title: Installer un serveur Minecraft sur Windows Azure
date: 2013-01-08
categories: [ "Virtual Machines", "Azure" ]
comments_id: 96 
---

Et oui Windows Azure ne sert pas qu’à travailler, il est aussi possible de s’en servir comme d’un serveur personnel !

Je vais vous montrer comment installer un serveur Minecraft sur Windows Azure avec le mode IAAS qu’il faut donc au préalable activer, mais maintenant je pense que c’est fait pour tout le monde !

Donc au cas où ce ne soit pas le cas, il vous faut vous rendre à l’url : [https://account.windowsazure.com/PreviewFeatures](https://account.windowsazure.com/PreviewFeatures "https://account.windowsazure.com/PreviewFeatures")

Et activer la fonctionnalité des machines virtuelles :

![image]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img0.png "image")

Ensuite, dans le portail, vous allez installer une machine Linux via la gallerie ! Car c’est bien connu que la JVM tourne mieux sous linux ! Et puis ce n’est pas parce que l’on est sur Azure qu’il faut choisir que des solutions Microsoft !

[![image]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img1.png "image")]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img1.png)

Il faut ensuite la configurer, notamment définir le mot de passe administraeur, et la taille de la machine virtuelle, surtout si vous voulez inviter plein de personne pour jouer avec vous !

[![image]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img2.png "image")]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img2.png)

Maintenant que vous avez votre linux, vous pouvez installer votre serveur Minecraft, pour cela, il faut vous connecter en SSH à votre instance grâce à PuTTy par exemple

[![image]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img3.png "image")]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img3.png)

Premièrement il vous faut installer Java pour installer le server, pour cela il faut executer ces trois requêtes linux :

```bash
> sudo add-apt-repository ppa:webupd8team/java
> sudo apt-get update
> sudo apt-get install oracle-java7-installer
```

Par la suite, vous pouvez installer votre serveur Minecraft d’abord en téléchargeant le fichier du jeu comme ceci :

```bash
> wget [https://s3.amazonaws.com/MinecraftDownload/launcher/minecraft_server.jar](https://s3.amazonaws.com/MinecraftDownload/launcher/minecraft_server.jar)
```

Puis en créant un script RunMinecraft.sh par exemple pour lancer votre serveur, ce script contiendra les lignes suivantes :

```bash
> #!/bin/sh
> java -Xmx512M -Xms512M -jar ./minecraft_server.jar nogui
```

Vous rendez votre script executable

```bash
> chmod +x RunMinecraft.sh
```

Et vous le démarrer !!

Ce n’est pas fini, dans le portail Azure il vous faut router le port utilisé pour le jeu vers l’extérieur, pour cela il faut aller dans Endpoint, et y ajouter dans votre point de terminaison comme ci-dessous :

[![image]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img4.png "image")]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img4.png)

Et voilà, vous pouvez lancer Minecraft, et y ajouter votre serveur Azure !!

[![image]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img5.png "image")]({{ site.url }}/images/2013/01/08/installer-un-serveur-minecraft-sur-windows-azure-img5.png)

Et voilà, pour conclure, c’était juste une étape amusante, et on voit bien qu’Azure peut faire tourner un peu n’importe quoi ! Même un serveur Minecraft !
