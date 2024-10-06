---
layout: post
title: Bicep - Créer des objets Entra depuis vos templates
date: 2024-05-31
categories: [ "Azure", "Bicep", "Entra ID" ]
comments_id: 190 
---

Depuis peu on peut créer des objets Entra Id via nos templates bicep.
Cela ne concerne pas tous les types d'objets à ce jour, mais on ne peut qu'espérer.

Pour faire cela, il vous faut une version de bicep > 0.27.1, et déployer depuis AzCli ou AzPowershell, ce n'est pas possible depuis VSCode aujourd'hui (mais bientôt)

Commençons par éditer notre fichier de config pour ajouter cette configuration

```json
"experimentalFeaturesEnabled": {
    "extensibility": true
  }
```

Et maintenant voici notre bicep file :

```bicep
provider microsoftGraph 

resource groupTest 'Microsoft.Graph/groups@v1.0' = { 
  displayName: 'groupTestbicep' 
  mailEnabled: false 
  mailNickname: 'groupTest' 
  securityEnabled: true 
  description: 'groupTest' 
  uniqueName: 'groupTestbicep'
}
```

Il ne faut pas oublier d'ajouter le provider dans notre template.

Après le déploiement, on peut bien entendu voir le template ARM qui est utilisé

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
    "languageVersion": "2.1-experimental",
    "contentVersion": "1.0.0.0",
    "imports": {
        "microsoftGraph": {
            "provider": "MicrosoftGraph",
            "version": "1.0.0"
        }
    },
    "resources": {
        "groupTest": {
            "import": "microsoftGraph",
            "type": "Microsoft.Graph/groups@v1.0",
            "properties": {
                "displayName": "groupTestbicep",
                "mailEnabled": false,
                "mailNickname": "groupTest",
                "securityEnabled": true,
                "description": "groupTest",
                "uniqueName": "groupTestbicep"
            }
        }
    }
}
```

Donc ça y est après plus de 10 ans d'existence, on peut enfin manipuler l'Entra ID via nos déploiements, et donc plus besoin d'avoir des scripts spécifiques pour faire cela.
Ce n'est aujourd'hui qu'un début, mais on peut espérer que Microsoft continue dans ce sens, car cela est très pratique de mon point de vue.
