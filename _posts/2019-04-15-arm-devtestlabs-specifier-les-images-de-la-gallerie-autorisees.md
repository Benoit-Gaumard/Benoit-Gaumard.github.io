---
layout: post
title: ARM - DevTestLabs - Spécifier les images de la gallerie autorisées
date: 2019-04-15
categories: [ "Azure", "ARM", "DevTestLabs" ]
comments_id: 163 
---

Lorsque vous mettez en place DevTestLabs en entreprise il est souhaitable d'avoir un moyen d'automatiser la création de celui-ci.
Si on regarde du côté des templates ARM fournis par Microsoft : [https://github.com/Azure/azure-devtestlab/tree/master/samples/DevTestLabs/QuickStartTemplates](https://github.com/Azure/azure-devtestlab/tree/master/samples/DevTestLabs/QuickStartTemplates)
Il est possible d'automatiser la création de la plupart des policies.

Maintenant si on regarde le détail pour limiter les images utilisables de la gallerie, nous avons ce template :

```json
{
  "$schema": "http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "newLabName": {
      "type": "string",
      "metadata": {
        "description": "The name of the new lab instance to be created."
      }
    }
  },
  "variables": {
    "allowedImages": "\"{\\\"offer\\\":\\\"CentOS\\\",\\\"publisher\\\":\\\"OpenLogic\\\",\\\"sku\\\":\\\"7.2\\\",\\\"osType\\\":\\\"Linux\\\",\\\"version\\\":\\\"latest\\\"}\",\"{\\\"offer\\\":\\\"Oracle-Linux\\\",\\\"publisher\\\":\\\"Oracle\\\",\\\"sku\\\":\\\"7.2\\\",\\\"osType\\\":\\\"Linux\\\",\\\"version\\\":\\\"latest\\\"}\",\"{\\\"offer\\\":\\\"SQL2016-WS2012R2\\\",\\\"publisher\\\":\\\"MicrosoftSQLServer\\\",\\\"sku\\\":\\\"Enterprise\\\",\\\"osType\\\":\\\"Windows\\\",\\\"version\\\":\\\"latest\\\"}\""
  },
  "resources": [
    {
      "apiVersion": "2018-10-15-preview",
      "name": "[trim(parameters('newLabName'))]",
      "type": "Microsoft.DevTestLab/labs",
      "location": "[resourceGroup().location]",
      "resources": [
```

Première chose qui choque, c'est que la variable qui liste les images est juste illisible.
Quand on creuse un peu, on s'aperçoit que l'API de microsoft attend quelque chose de ce type en entrée:

```json
"allowedImages": "['ImageReference', 'ImageReference']"
```

Donc une chaine de caractère contenant un tableau de chaine de caractère au format JSON, et cette chaine correspond à l'objet ImageReference des VM dans Azure.

Partant de cela, je décide de créer un fichier paramètre ARM contenant un tableau d'ImageReference comme suit :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {
        "imageReferences": {
            "value": [
                {
                    "offer": "Windows-10",
                    "publisher": "MicrosoftWindowsDesktop",
                    "sku": "rs4-pro",
                    "osType": "Windows",
                    "version": "latest"
                },
                {
                    "offer": "Windows-10",
                    "publisher": "MicrosoftWindowsDesktop",
                    "sku": "rs4-pron",
                    "osType": "Windows",
                    "version": "latest"
                },
                {
                    "offer": "Windows-10",
                    "publisher": "MicrosoftWindowsDesktop",
                    "sku": "rs5-pro",
                    "osType": "Windows",
                    "version": "latest"
                }
            ]
        }
    }
}
```

Enfin quelque chose de lisible, qui liste 3 machines Windows 10 dans ce cas précis.
Maintenant il ne me reste plus qu'à produire ma chaine de caractère, donc dans mon template ARM, j'ai le code suivant:

```json
"variables": {
    "thresholdName": "threshold",
    "copy": [
        {
            "name": "[variables('thresholdName')]",
            "count": "[length(parameters('imageReferences'))]",
            "input": "[string(parameters('imageReferences')[copyIndex(variables('thresholdName'))])]"
        }
    ],
    "thresholdValue": "[string(variables(variables('thresholdName')))]"
}
```

Dans la propriété input, je transforme chaque ImageReference en chaine de caractère, puis dans la propriété thresholdValue, je transforme mon tableau en chaine de caractère.

Et voilà je peux assigner ce threshold à ma policies comme suit :

```json
{
    "apiVersion": "2018-10-15-preview",
    "name": "[concat('default','/GalleryImage')]",
    "type": "policySets/policies",
    "condition": "[parameters('canDeploy')]",
    "dependsOn": [
        "[resourceId('Microsoft.DevTestLab/labs', parameters('newLabName'))]"
    ],
    "properties": {
        "description": "",
        "factName": "GalleryImage",
        "evaluatorType": "AllowedValuesPolicy",
        "status": "enabled",
        "threshold": "[variables('thresholdValue')]"
    }
}
```

Et voilà, comme quoi on peut rendre des templates ARM lisibles.
