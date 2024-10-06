---
layout: post
title: Azure Automation - Ajouter un package de la galerie dans vos environnements de runtime
date: 2024-06-11
categories: [ "Azure", "Automation" ]
comments_id: 191 
---

Récemment Microsoft a ajouté la fonctionnalité de Runtime d'environnement dans Azure Automation.
Cela permet entre autre de supprimer une des fortes contraintes que l'on a sur Automation aujourd'hui, à savoir la complexité de mettre à jour des modules.

Aujourd'hui il faut savoir qu'un automation account partage ses modules avec tous les runbooks donc si vous voulez passer du module Az 8 à Az 12, cela va impacter tous vos runbooks, si vous en avez beaucoup un test de non régression peut être bien long à faire.

Et bien maintenant vous pouvez utiliser les Runtime Environment pour vous aider.

Pour déployer un nouveau runtime, rien de plus simple via bicep 

```bicep
resource powershell_7_2_Az_11_2_0 'Microsoft.Automation/automationAccounts/runtimeEnvironments@2023-05-15-preview' = {
  parent: automation
  name: 'Powershell-7.2-Az-11.2.0'
  properties: {
    runtime: {
      language: 'PowerShell'
      version: '7.2'
    }
    defaultPackages: {
      Az: '11.2.0'
    }
    description: 'Powershell 7.2 with Az 11.2.0'
  }
}

resource powershell_7_2_Az_12_0_0 'Microsoft.Automation/automationAccounts/runtimeEnvironments@2023-05-15-preview' = {
  parent: automation
  name: 'Powershell-7.2-Az-12.0.0'
  properties: {
    runtime: {
      language: 'PowerShell'
      version: '7.2'
    }
    description: 'Powershell 7.2 with Az 12.0.0'
  }
}
```

Et pour déployer vos modules custom ou ceux depuis la gallerie powershell 

```bicep
resource Az_12_0_0 'Microsoft.Automation/automationAccounts/runtimeEnvironments/packages@2023-05-15-preview' = {
  name: 'Az'
  parent: powershell_7_2_Az_12_0_0
  properties: {
    contentLink: {
      uri: 'https://www.powershellgallery.com/api/v2/package/Az/12.0.0'
    }
  }
}

```

N'oubliez pas ici qu'Azure Automation ne charge pas les dépendances par lui même, il faut donc que vous rajoutiez tous les modules dont vous avez besoin (Az.Resource, Az.Storage, ....)

Et après vous pouvez choisir dans la définition de runbook sur quel environnement avec la propriété **runtimeEnvironment**, attention à bien utiliser la même version d'API que moi

```bicep
resource runbook 'Microsoft.Automation/automationAccounts/runbooks@2023-05-15-preview' = {
  name: 'demobicep'
  parent: automation
  location: location
  properties: {
    runbookType: 'PowerShell'
    runtimeEnvironment: powershell_7_2_Az_11_2_0.name
    description: 'Demo runbook'
  }
}
```

Et voilà plus d'excuse sur la non migration des automation accounts qui sont là depuis 10 ans avec des vieux modules powershell
