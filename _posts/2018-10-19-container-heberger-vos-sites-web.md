---
layout: post
title: Container - Héberger vos sites Web
date: 2018-10-19
categories: [ "Azure", "Container", "Web App"  ]
comments_id: 151 
---

Depuis un moment, l'utilisation des containers est de plus en plus fréquente, mais attention ce n'est pas parce que c'est à la mode qu'il faut les utiliser à tort et à travers.

La plateforme Azure n'est pas indifférente aux containers, et bien heureusement. Il existe plein de manières de mettre en place des containers dans Azure, nous allons donc voir comment les mettre en place et pourquoi utiliser tel ou tel service sur Azure.

Pour commencer, on va prendre le cas d'un container ou d'un ensemble de containers ayant pour but d'afficher un pur site web, car effectivement l'utilisation des containers n'est pas uniquement exclusive aux architectures microservices.

Prenons en premier exemple un site très simple basé sur un container ayant ce docker file :

```docker
FROM nginx:alpine
COPY . /usr/share/nginx/html
```

Bon comme on peut le voir c'est plus dur de faire compliquer. Mais l'image m'offre l'avantage de ne pas avoir à mettre moi-même en place mon NGINX.

Maintenant si je veux mettre en place ce site Web sur Azure, j'ai plein de possibilités comme celle de créer un cluster AKS ou un cluster Service Fabric, mais vous serez d'accord avec moi sur le fait que ça serait sortir le marteau pour tuer une mouche.

Sur le service de Web Apps d'Azure il est possible d'héberger un container qui se situe dans n'importe quel registry accessible depuis ma Web App.

Pour ma part, je vais créer une registry sur Azure via le Service Azure Container Registry

```powershell
$registry = New-AzureRmContainerRegistry -ResourceGroupName $rgName -Name $acrName -EnableAdminUser -Sku Basic
```

Puis j'enregitre ces accès dans mon Docker afin de pouvoir publier mes images dessus.

```powershell
$credentials = Get-AzureRmContainerRegistryCredential -Registry $registry
docker login $registry.LoginServer -u $credentials.Username -p $credentials.Password
```

Pour ceux qui n'ont jamais utilisé Docker, et pour les autres un rappel ne faisant jamais de mal, voici comment construire notre image et l'envoyer sur une registry distante

```powershell
docker build -t sample-web-app .\WebApp\
docker tag sample-web-app ($registry.LoginServer + '/sample-web-app:v1')
docker push ($registry.LoginServer + '/sample-web-app:v1')
```

Maintenant que notre image est sur notre registry Azure, il est possible de la déployer n'importe où que ce soit dans Azure ou ailleurs.  

Je vais donc créer une nouvelle Web App sur Azure via le portail, il est bien entendu possible de faire la même chose via un template ARM ou des scripts.

![image]({{ site.url }}/images/2018/10/19/container-heberger-vos-sites-web-img0.png "image")

Maintenant que mon container est hébergé, il est automatiquement configuré pour être mis à jour à chaque fois que je pousse une nouvelle version de mon image sur ma registry, il est bien entendu possible de désactiver cette fonctionnalité si besoin.

Il est aussi possible d'utiliser des images plus complexes via l'outil docker compose afin d'avoir de multiples containers qui sont exécutés au sein de votre Web App.
Voici un exemple de configuration yml que vous pouvez utiliser, c'est celle qui est disponible sur la documentation Azure :

```yml
version: '3.3'

services:
   db:
     image: mysql:5.7
     volumes:
       - db_data:/var/lib/mysql
     restart: always
     environment:
       MYSQL_ROOT_PASSWORD: somewordpress
       MYSQL_DATABASE: wordpress
       MYSQL_USER: wordpress
       MYSQL_PASSWORD: wordpress

   wordpress:
     depends_on:
       - db
     image: wordpress:latest
     ports:
       - "8000:80"
     restart: always
     environment:
       WORDPRESS_DB_HOST: db:3306
       WORDPRESS_DB_USER: wordpress
       WORDPRESS_DB_PASSWORD: wordpress
volumes:
    db_data:
```

Comme vous pouvez le voir, il s'agit ici d'un site Wordpress avec sa base de données.
Il n'est par ailleurs actuellement pas possible d'utiliser toutes les fonctionnalités de Docker compose au sein de vos Web Apps, du coup vous pouvez oublier ce service si vous voulez vous servir des éléments suivants :

* build : Non autorisé
* depends_on : ignoré
* networks : ignoré
* secrets : ignoré

Selon moi le support des containers pour les Web App offre une solution idéale pour vos containers légers qui doivent tourner H24, et pour lesquels vous ne voulez pas à avoir à gérer un cluster sous jacent.
