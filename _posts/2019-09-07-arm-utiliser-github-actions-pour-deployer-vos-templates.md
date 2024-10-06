---
layout: post
title: ARM - Utiliser Github Actions pour déployer vos templates
date: 2019-09-07
categories: [ "Azure", "Github Actions", "ARM" ]
comments_id: 169 
---

Je suppose que vous n'êtes pas sans savoir que Github Action est disponible en beta !!! Et bonne nouvelle pour moi c'est disponible.

Voyons comment déployer un template ARM depuis notre repo github lorsqu'il y a une modification de ce dernier.

Pour commencer, il nous faut :

- Un repository github (public ou privée)
- Accès à Github Action
- Une souscription Azure
  - Un resource group
  - Un SPN avec les accès contributeurs sur notre ressource group

Sur votre repository Github, il faut ajouter les secrets suivants:

- Tenant Id
- Application Id
- Application Secret

Exactement, comme on peut le voir ci-dessous :
![image]({{ site.url }}/images/2019/09/07/arm-utiliser-github-actions-pour-deployer-vos-templates-img0.png "image")

Maintenant plus qu'à écrire notre action:

```yaml
name: Deploy to Azure Workflow

on:
 push:
    branches:
    - master
    path:
      - arm/*

jobs:
  deploy:
    name: Deploy to Azure
    runs-on: ubuntu-latest
    steps:
    - name: Git - Get Sources
      uses: actions/checkout@master

    - name: Azure - Login
      uses: Azure/github-actions/login@master
      env:
        AZURE_SUBSCRIPTION: MySubName
        AZURE_SERVICE_APP_ID: ${ { secrets.AZURE_SERVICE_APP_ID } }
        AZURE_SERVICE_PASSWORD: ${ { secrets.AZURE_SERVICE_PASSWORD } }
        AZURE_SERVICE_TENANT: ${ { secrets.AZURE_SERVICE_TENANT } }

    - name: Azure - Deploy ARM Template
      uses: Azure/github-actions/arm@master
      env:
        AZURE_RESOURCE_GROUP: github-actions
        AZURE_TEMPLATE_LOCATION: ./arm/sample-arm.deploy.json
        AZURE_TEMPLATE_PARAM_LOCATION: ./arm/sample-arm.deploy.parameters.json
```

Alors si on regarde un petit peu plus notre workflow.

On retrouve les éléments suivants :

Le nom de notre workflow

```yaml
name: Deploy to Azure Workflow
```

Sur quel évènement il se déclenche, ici il s'agit d'un push sur la branche master qui modifie un fichier dans le dossier *arm*

```yaml
on:
 push:
    branches:
    - master
    path:
      - arm/*
```

Puis la définition de notre job, à savoir son nom et où est-c que celui s'éxécute.

```yaml
jobs:
  deploy:
    name: Deploy to Azure
    runs-on: ubuntu-latest
```

A ce jour, les valeurs disponibles pour faire tourner notre actions sont les suivantes [Github Action documentation](https://help.github.com/en/articles/workflow-syntax-for-github-actions#jobsjob_idruns-on):

- ***ubuntu-latest***, ***ubuntu-18.04***, or ***ubuntu-16.04***
- ***windows-latest***, ***windows-2019***, or ***windows-2016***
- ***macOS-latest*** or ***macOS-10.14***

Maintenant, passons à nos différentes étapes, la première est la plus simple il s'agit de récupérer le code source

```yaml
    steps:
    - name: Git - Get Sources
      uses: actions/checkout@master
```

Commençons par nous connecter à nous connecter à Azure grâce à notre SPN.
Ici, nous allons utiliser une action disponible sur le repo Git [Azure Action](https://github.com/Azure/github-actions/tree/master/login)

```yaml
    - name: Azure - Login
      uses: Azure/github-actions/login@master
      env:
        AZURE_SUBSCRIPTION: MySubName
        AZURE_SERVICE_APP_ID: ${{ "{{ secrets.AZURE_SERVICE_APP_ID " }}}}
        AZURE_SERVICE_PASSWORD: ${{ "{{ secrets.AZURE_SERVICE_PASSWORD " }}}}
        AZURE_SERVICE_TENANT: ${{ "{{ secrets.AZURE_SERVICE_TENANT " }}}}
```

Et pour finir, voici notre déploiement :

```yaml
    - name: Azure - Deploy ARM Template
      uses: Azure/github-actions/arm@master
      env:
        AZURE_RESOURCE_GROUP: github-actions
        AZURE_TEMPLATE_LOCATION: ./arm/sample-arm.deploy.json
        AZURE_TEMPLATE_PARAM_LOCATION: ./arm/sample-arm.deploy.parameters.json
```

On peut par ailleurs retrouver notre workflow sur Github :

![image]({{ site.url }}/images/2019/09/07/arm-utiliser-github-actions-pour-deployer-vos-templates-img1.png "image")

En tout cas, voici une raison de plus d'utiliser Github pour vos projets.
