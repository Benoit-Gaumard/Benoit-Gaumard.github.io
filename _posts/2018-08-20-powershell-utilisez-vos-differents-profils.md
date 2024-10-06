---
layout: post
title: Powershell - Utilisez vos différents profils
date: 2018-08-20
categories: [ "Powershell" ]
comments_id: 143 
---

En cette période de vacances, il est grand temps de faire le plein d'astuces. Pour ceux qui font du scripting pour interargir avec Azure ou autre, vous savez qu'il est très souvent utile d'avoir des scripts réutilisables, et si possible toujours à porteé de main.

Si je prends mon cas, j'ai par exemple souvent besoin de me connecter à Azure sur une souscription spécifique, de configurer mon proxy, ou de créer des Resources Groups temporaires, ou bien alors de faire le grand ménage dans mes images Docker locales.

Il est très aisé de mettre tous ces scripts dans un dossier bien particulier pour les utiliser, mais il y a bien mieux, powershell peut vous aider à faire cela, grâce à la notion de profil.

Pour cela, le plus simple est d'ouvrir une console powershell et exécuter le code suivant :

```powershell
$profile
---
Output : D:\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1
```

Ce fichier vous permet de mettre en place des scripts que vous pourrez utiliser dans tous vos shells. Pour cela rien de plus simple, il vous suffit de créér ce fichier s'il n'existe pas via la commande suivante :

```powershell
if ((Test-Path $profile) -eq $false) {
    New-Item $profile
}
code $profile
```

Après, vous pouvez écrire ce que vous souhaitez dans ce fichier afin de pouvoir le réutiliser partout sans le chercher, comme par exemple ces commandes pour Docker

```powershell
 Function Remove-DockerContainers {
    docker stop $(docker ps -a -q)
    docker rm $(docker ps -a -q)    
 }

 Function Remove-DockerImages {
    docker rmi -f $(docker images -a -q)
 }
```

Ce fichier est par ailleurs pris en charge au lancement d'un terminal, donc pensez à fermer et rouvrir votre terminal après le changement de ce fichier.

De plus, il existe un fichier par type de terminal, par exemple sur mon poste j'en ai 3 actuellement :

```powershell
 ls D:\Documents\WindowsPowerShell


    Directory: D:\Documents\WindowsPowerShell


Mode                LastWriteTime         Length Namee
----                -------------         ------ ----
d-----        08-Nov-16     00:51                Scripts
-a----        27-Jul-18     11:25            846 Microsoft.PowerShellISE_profile.ps1
-a----        25-Jul-18     11:35            846 Microsoft.PowerShell_profile.ps1
-a----        25-Jul-18     11:35            846 Microsoft.VSCode_profile.ps1
```

A l'usage vous verrez que c'est très pratique pour les scripts récurrents, mais attention, si vous utilisez les fonctions mises en place dans votre profil, elles ne seront pas disponibles ni sur un autre poste ni depuis une usine logicielle.
