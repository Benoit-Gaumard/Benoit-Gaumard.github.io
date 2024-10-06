---
layout: post
title: Pulumi - Stocker l'état de votre infrastructure dans un Azure Storage
date: 2020-02-19
categories: [ "Azure", "Pulumi" ]
comments_id: 108 
---

Le Cloud n'est plus une plateforme pour les projets personnels, l'industrialisation de son utilisation est devenue pratiquement obligatoire.

Il y a plusieurs manières d'automatiser son environnement Cloud :

- Utiliser les outils fournis par l'éditeur : ARM pour Azure ou Cloud Formation pour AWS
- Passer par des outils tierces comme Terraform, ou Pulumi.

Pulumi se distingue par rapport à Terraform sur le fait qu'ils ont fait le choix d'utiliser des technologies existantes comme C# ou Python plutôt que de faire comme Terraform qui a son propre language de développement le HCL.

Cependant entre Pulumi et Terraform, on y voit des similitudes, et la première concerne la présence d'un state.
Par défaut Terraform propose un state basé sur un fichier local, alors que Pulumi propose un state hébergé sur leur plateforme SAAS, comme on peut le voir ci-dessous :

![]({{ site.url }}/images/2020/02/19/pulumi-stocker-letat-de-votre-infrastructure-dans-un-azure-storage-img1.png)
(source : [https://www.pulumi.com/docs/intro/concepts/state/](https://www.pulumi.com/docs/intro/concepts/state/))

Nous allons voir comment mettre en place notre *state* dans un Azure Blob Storage Azure.
Pour cela il nous faut un compte de stockage Azure et un container, le tout via az cli comme ci-dessous :

```bash
RESOURCE_GROUP_NAME="pulumi-demo-blog"
STORAGE_ACCOUNT_NAME="pulumidemo"
STORAGE_CONTAINER_NAME="pulumi-state"
az storage account create -n $STORAGE_ACCOUNT_NAME -g $RESOURCE_GROUP_NAME -l westeurope --sku Standard_LRS --https-only --kind StorageV2

CONNECTION_STRING=$(az storage account show-connection-string -n $stoName -g $rgName -o tsv)  

az storage container create -n $STORAGE_CONTAINER_NAME --connection-string $CONNECTION_STRING
```

Avant de commencer toute création de stack via pulumi, la CLI vous demande de créer un **state**, vous avez plusieurs choix qui sont à ce jour les suivants :

- Pulumi SAAS
- Local
- Azure Blob
- AWS S3

Pour notre cas, on va utiliser Azure Blob via une SAS Key, la documentation pulumi indique qu'il faut réaliser cette opération pour utiliser notre compte de stockage fraichement créé :

```bash
pulumi login --cloud-url azblob://pulumi-state
```

Si on exécute naïvement cette commande sur une nouvelle console, nous avons cet output :

```bash
error: problem logging in: unable to open bucket azblob://pulumi-state: azureblob.OpenBucket: accountName is required
```

En creusant un peu la documentation et les différents articles de blog, nous voyons qu'il faut indiquer en variable d'environnement les informations suivantes :

- AZURE_STORAGE_ACCOUNT : Pour le nom de votre compte de stockage
- AZURE_STORAGE_KEY : Pour la clé de votre compte de stockage
- AZURE_STORAGE_SAS_TOKEN : Si vous préférez les SAS Key

On peut retrouver ces informations sur la documentation du SDK Go pour Azure : [https://pkg.go.dev/gocloud.dev/blob/azureblob?tab=doc](https://pkg.go.dev/gocloud.dev/blob/azureblob?tab=doc)

On va donc générer notre SAS Key, puis ajouter nos 2 variables d'environnements qui nous intéresse c'est à dire **AZURE_STORAGE_ACCOUNT** et **AZURE_STORAGE_SAS_TOKEN**

```bash
end=`date -u -d "30 minutes" '+%Y-%m-%dT%H:%MZ'`
az storage account generate-sas --permissions cdlruwap --account-name $STORAGE_ACCOUNT_NAME --services b --resource-types sco --expiry $end -o tsv
```

Et voilà, il est possible de relancer notre login.

Et ensuite il est possible de créer votre stack pulumi, comme par exemple via la commande suivante :

```bash
pulumi new azure-python
```

Et voilà le tour est joué vous avez la possibilté d'utiliser pulumi avec un Backend qui se trouve chez vous et plus sur le SAAS de Pulumi.
