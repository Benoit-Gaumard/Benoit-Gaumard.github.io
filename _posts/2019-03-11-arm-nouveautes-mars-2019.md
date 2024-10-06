---
layout: post
title: ARM - Nouveautés mars 2019
date: 2019-03-11
categories: [ "Azure", "ARM"  ]
comments_id: 105 
---

Un petit article pour vous faire part des nouveautés disponibles sur ARM que je trouve vraiment cool, et surtout que j'attendais particulièrement.

Possibilité d'ajouter un paramètre avec la date courante.

```json
"parameters": {
    "time": {
        "type": "string",
        "defaultValue": "[utcNow()]",
        "metadata": {
            "description": "This returns the current UTC time of deployment. This function may only be used in the defaultValue of a parameter."
        }
    },
    "date": {
        "type": "string",
        "defaultValue": "[utcNow('dd-MM-yy')]",
        "metadata": {
            "description": "Standard dateTime format strings are supported: https://docs.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings"
        }
    }   
}
```

A noter que celui-ci ne marche que dans l'objet paramètre et non pas dans la partie variable. Du coup il est maintenant possible d'ajouter la date de création de vos ressources dans vos tags.

Il est maintenant possible d'ajouter un peu d'aléa grâce à la génération de guid dans vos templates

```json
"parameters": {
    "guid": {
        "type": "string",
        "defaultValue": "[newGuid()]",
        "metadata": {
            "description": "This will generate a new GUID each time this template is deployed. This function may only be used in the defaultValue of a parameter."
        }
    },
    "trulyUnique": {
        "type": "string",
        "defaultValue": "[uniqueString(newGuid())]",
        "metadata": {
            "description": "This will generate a new uniqueString() each time this template is deployed. This is not idempotent, use with care."
        }
    },
    "trulyUniqueGuid": {
        "type": "string",
        "defaultValue": "[guid(newGuid())]",
        "metadata": {
            "description": "This will generate a new guid each time this template is deployed. The guid() function can be idempotent, used this way it is not."
        }
    }
}
```

Voilà il y a aussi d'autres nouveautés liées à ARM, je vous laisse aller voir le blog dédié à celles-ci: [https://azure.microsoft.com/en-us/updates/azure-resource-manager-template-language-additions/](https://azure.microsoft.com/en-us/updates/azure-resource-manager-template-language-additions/)
