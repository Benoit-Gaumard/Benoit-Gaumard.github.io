---
layout: post
title: ARM - Enrichir vos templates avec vos propres fonctions
date: 2019-03-22
categories: [ "Azure", "ARM" ]
comments_id: 161 
---

Les templates ARM vous permettent de déployer vos infrastructures sur Azure ou Azure Stack, et ils vous évitent de nombreux clics dans le portail.

Un des retours que j'ai souvent à leur sujet c'est :

- Trop verbeux
- Trop de json
- Pas assez de méthode built-in
- ...

Ce dernier point peut être en parti résolu par une fonctionnalité méconnue des templates ARM.

Pour la plupart des personnes, un template ARM ressemble à ça :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {},
    "resources": [],
    "outputs": {}
}
```

Et bien sachez qu'il y a une propriété de plus qui n'est pas obligatoire, et qu'on peut voir ici :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {},
    "functions": [],
    "resources": [],
    "outputs": {}
}
```

Voyons comment créer notre fonction, et oui c'est toujours du json:

```json
{
    "namespace": "woivre",
    "members": {
        "arrayToString": {
            "parameters": [
                {
                    "name": "input",
                    "type": "array"
                }
            ],
            "output": {
                "type": "string",
                "value": "[replace(substring(string(parameters('input')), 1, sub(length(string(parameters('input'))), 2)), '\"', '')]"
            }
        }
    }
}
```

Ce que l'on peut faire dans les fonctions est assez limité, mais pour de la manipulation de données c'est très efficace.

Au global cela nous donne le template suivant :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {
        "testValues": [
            "One",
            "Two",
            "Three",
            "Four"
        ]
    },
    "functions": [
        {
            "namespace": "woivre",
            "members": {
                "arrayToString": {
                    "parameters": [
                        {
                            "name": "input",
                            "type": "array"
                        }
                    ],
                    "output": {
                        "type": "string",
                        "value": "[replace(substring(string(parameters('input')), 1, sub(length(string(parameters('input'))), 2)), '\"', '')]"
                    }
                }
            }
        }
    ],
    "resources": [],
    "outputs": {
        "test": {
            "type": "string",
            "value": "[woivre.arrayToString(variables('testValues'))]"
        }
    }
}
```

Pratique si vous ne voulez pas trop vous répéter dans vos templates.
