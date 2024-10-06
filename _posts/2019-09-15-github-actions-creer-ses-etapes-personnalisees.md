---
layout: post
title: Github Actions - Créer ses étapes personnalisées
date: 2019-09-15
categories: [ "Azure", "Github Actions", "ARM" ]
comments_id: 170 
---

Lors de mon dernier article je vous ai présenté comment utiliser Github Action pour déployer vos templates ARM.

Pour cela, j'ai utilisé une action provenant d'un repository Microsoft Azure.

Cette action permet de :

- Créer un groupe de ressource
- Déployer un template ARM & un fichier de paramètres depuis une URL relative ou absolue.
- Supprimer un groupe de ressource.

Maintenant elle a aussi des défauts, à ce jour, on ne peut pas déployer sans fichier de paramètre, et il n'est pas possible de déployer au niveau d'une souscription.

J'ai donc décidé de créer ma propre action disponible sur mon github : [Azure Action ARM](https://github.com/wilfriedwoivre/github-actions/tree/master/Azure/arm)

Elle permet de déployer soit sur un groupe de ressource soit sur une souscription avec ou non un paramètre.

Pour ce faire, il vous suffit juste de créer une image Docker qui réalisera ce dont vous avez besoin.
Pour ma part, j'ai repris quelque chose de similaire de celles qui sont fournis par Microsoft.

A savoir le ***Dockerfile*** suivant

```DockerFile

FROM microsoft/azure-cli:2.0.47

LABEL version="1.0.0"

LABEL maintainer="Wilfried Woivré"
LABEL com.github.actions.name="Déploy ARM Template"
LABEL com.github.actions.description="GitHub Action to deploy ARM template to Azure"
LABEL com.github.actions.icon="triange"
LABEL com.github.actions.color="blue"

ENV GITHUB_ACTION_NAME="Azure - Deploy ARM Template"

RUN apk update \
  && apk add --no-cache util-linux

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

Et un fichier bash entrypoint.sh suivant :

```sh
#!/bin/bash

set -e
export AZURE_HTTP_USER_AGENT="GITHUBACTIONS_${GITHUB_ACTION_NAME}_${GITHUB_REPOSITORY}"

URI_REGEX="^(http://|https://)\\w+"
GUID=$(uuidgen | cut -d '-' -f 1)

if [[ -z "$SCOPE" ]]
then
  SCOPE="RESOURCE_GROUP"
fi

if [[ $SCOPE = "RESOURCE_GROUP" ]] && [[ -z "$AZURE_RESOURCE_GROUP" ]]
then
  echo "AZURE_RESOURCE_GROUP is not set." >&2
  exit 1
fi

if [[ -z "$AZURE_TEMPLATE_LOCATION" ]]
then
    echo "AZURE_TEMPLATE_FILE is not set." >&2
    exit 1
fi


# Download parameters file if it is a remote URL

if [[ -z "$AZURE_TEMPLATE_PARAM_LOCATION" ]]
then
  echo "No parameter files set"
else
  if [[ $AZURE_TEMPLATE_PARAM_LOCATION =~ $URI_REGEX ]]
  then
    PARAMETERS=$(curl "$AZURE_TEMPLATE_PARAM_LOCATION")
    echo "Downloaded parameters from ${AZURE_TEMPLATE_PARAM_LOCATION}"
  else
    PARAMETERS_FILE="${GITHUB_WORKSPACE}/${AZURE_TEMPLATE_PARAM_LOCATION}"
    if [[ ! -e "$PARAMETERS_FILE" ]]
    then
      echo "Parameters file ${PARAMETERS_FILE} does not exits." >&2
      exit 1
    fi
    PARAMETERS="@${PARAMETERS_FILE}"
  fi
fi

# Generate deployment name if not specified

if [[ -z "$DEPLOYMENT_NAME" ]]
then
  DEPLOYMENT_NAME="Github-Action-ARM-${GUID}"
  echo "Generated Deployment Name ${DEPLOYMENT_NAME}"
fi

# Deploy ARM template

if [[ $SCOPE = 'RESOURCE_GROUP' ]]
then
  if [[ $AZURE_TEMPLATE_LOCATION =~ $URI_REGEX ]]
  then
    if [[ -z "$PARAMETERS" ]]
    then
      az group deployment create -g "$AZURE_RESOURCE_GROUP" --name "$DEPLOYMENT_NAME" --template-uri "$AZURE_TEMPLATE_LOCATION"
    else
      az group deployment create -g "$AZURE_RESOURCE_GROUP" --name "$DEPLOYMENT_NAME" --template-uri "$AZURE_TEMPLATE_LOCATION" --parameters "$PARAMETERS"
    fi
  else
    TEMPLATE_FILE="${GITHUB_WORKSPACE}/${AZURE_TEMPLATE_LOCATION}"
    if [[ ! -e "$TEMPLATE_FILE" ]]
    then
      echo "Template file ${TEMPLATE_FILE} does not exists." >&2
      exit 1
    fi
    if [[ -z "$PARAMETERS" ]]
    then
      az group deployment create -g "$AZURE_RESOURCE_GROUP" --name "$DEPLOYMENT_NAME" --template-file "$AZURE_TEMPLATE_LOCATION"
    else
      az group deployment create -g "$AZURE_RESOURCE_GROUP" --name "$DEPLOYMENT_NAME" --template-file "$AZURE_TEMPLATE_LOCATION" --parameters "$PARAMETERS"
    fi
  fi
fi

if [[ $SCOPE = 'SUBSCRIPTION' ]]
then
  if [[ $AZURE_TEMPLATE_LOCATION =~ $URI_REGEX ]]
  then
    if [[ -z "$PARAMETERS" ]]
    then
      az deployment create --location "$DEPLOYMENT_LOCATION" --name "$DEPLOYMENT_NAME" --template-uri "$AZURE_TEMPLATE_LOCATION"
    else
      az deployment create --location "$DEPLOYMENT_LOCATION" --name "$DEPLOYMENT_NAME" --template-uri "$AZURE_TEMPLATE_LOCATION" --parameters "$PARAMETERS"
    fi
  else
    TEMPLATE_FILE="${GITHUB_WORKSPACE}/${AZURE_TEMPLATE_LOCATION}"
    if [[ ! -e "$TEMPLATE_FILE" ]]
    then
      echo "Template file ${TEMPLATE_FILE} does not exists." >&2
      exit 1
    fi
    if [[ -z "$PARAMETERS" ]]
    then
      az deployment create --location "$DEPLOYMENT_LOCATION" --name "$DEPLOYMENT_NAME" --template-file "$AZURE_TEMPLATE_LOCATION"
    else
      az deployment create --location "$DEPLOYMENT_LOCATION" --name "$DEPLOYMENT_NAME" --template-file "$AZURE_TEMPLATE_LOCATION" --parameters "$PARAMETERS"
    fi
  fi
fi
```

Pour l'utiliser, il suffit de créer vos étapes de la manière suivantes :

```yaml
    - name: Azure - Deploy ARM Template - Subscription Level with parameters
      uses: wilfriedwoivre/github-actions/Azure/arm@master
      env:
        SCOPE: SUBSCRIPTION
        DEPLOYMENT_LOCATION: West Europe
        AZURE_TEMPLATE_LOCATION: arm-deployment-sub.json
        AZURE_TEMPLATE_PARAM_LOCATION: arm-deployment-sub.parameters.json
```

Dans la propriété ***use*** on retrouve mon image Docker selon le format suivant : **mon_nom_d'utilisateur**/**mon_repo_github**/**arborescence**@**branch**

L'image est ensuite construite lors de chaque début de job sur Github Action

Pour aller plus loin, il est possible de publier votre action sur le marketplace de Github :
[https://developer.github.com/marketplace/actions/publishing-an-action-in-the-github-marketplace/](https://developer.github.com/marketplace/actions/publishing-an-action-in-the-github-marketplace/)
