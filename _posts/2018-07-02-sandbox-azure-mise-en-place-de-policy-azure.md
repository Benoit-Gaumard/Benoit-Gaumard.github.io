---
layout: post
title: Sandbox Azure - Mise en place de policy Azure
date: 2018-07-02
categories: [ "Azure" ]
comments_id: 138 
---


Dans le cadre de la sandbox Azure dont je vous ai parlé dans les articles précédents:

* Introduction : [http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory](http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory)
* Provisionnement des utilisateurs : [http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs](http://blog.woivre.fr/blog/2018/04/sandbox-azure-provisionnement-des-utilisateurs)
* Gestion des groupes de ressources : [http://blog.woivre.fr/blog/2018/06/sandbox-azure-gestion-des-groupes-de-ressources](http://blog.woivre.fr/blog/2018/06/sandbox-azure-gestion-des-groupes-de-ressources)

Maintenant que les utilisateurs peuvent créer un compte et créer des ressources groups, je souhaite contrôler certaines de leurs actions afin que ce ne soit pas l’anarchie au bout de 2 semaines. Je souhaite donc contrôler les éléments suivants :

* La localisation des ressources : afin de m’assurer que tout soit situé en Europe
* Le niveau de SKU des ressources : afin de m’assurer d’avoir encore du crédit à la fin de la semaine

Pour effectuer cela, j’ai plusieurs solutions qui s’offrent à moi.

* Soit je contrôle ces éléments lors de la création des ressources.

* Soit je le fais a posteriori, ce qui demande d’analyser les différents objets et de mettre en place du développement spécifique basé sur EventGrid afin de valider les différentes ressources qui ont été créées, et effectuer les opérations nécessaires par la suite.

* Soit encore je le fais à la création des ressources, pour cela il est possible de mettre en place une surcouche applicative qui prend tous les templates ARM et qui les valide avant les exécuter, mais du coup cela oblige tous les utilisateurs à passer par un système tiers et de ce fait ne pas pouvoir avoir une expérience totale via le portail Azure. Et par ailleurs en cas de changement de règle les ressources existantes ne sont pas prises en compte.

Afin d’allier les deux, une fonctionnalité existe sur Azure, il s’agit de la fonctionnalité “Policy – Compliance” que l’on peut retrouver sur le portail ou via les API REST / Azure Powershell / Azure CLI

Il existe par défaut un certain nombre de policy qu’il est possible d’exploiter, comme par exemple les suivantes :

* Allowed Locations : Elle permet de limiter l’utilisation de différentes régions sur Azure, utile si par exemple vous ne souhaitez avoir que des ressources en Europe
* Allowed Resource types : Elle permet de limiter l’usage des ressources avec un filtre plus fin que l’utilisation ou non d’un provider. Par exemple pour autoriser l’utilisation de Service Fabric, et en refusant celle des edgeclusters
* Enforce tag and its value : Comme son nom l’indique elle permet de forcer l’usage d’un tag, ce qui peut être pratique pour des gestions de coûts par exemple
* Allowed virtual machine SKUs : Permet de garder uniquement les tailles de machines virtuelles que l’on souhaite utiliser, par exemple en n’autorisant pas celle avec des GPUs

Il est possible d’assigner ces règles à des scopes Azure , un peu comme le système RBAC, sauf qu'ici on est limité à la souscription ou à un groupe de ressource, ce qui est déjà en soit bien suffisant.

Ci-dessous voici un json d’un exemple de politique associé à ma souscription :

```json
{
  "Name": "686a94bb904447afb201f2cf",
  "ResourceId": "/subscriptions/subscription_id/providers/Microsoft.Authorization/policyAssignments/686a94bb904447afb201f2cf",
  "ResourceName": "686a94bb904447afb201f2cf",
  "ResourceType": "Microsoft.Authorization/policyAssignments",
  "SubscriptionId": "subscription_id",
  "Properties": {
    "displayName": "Allowed locations",
    "policyDefinitionId": "/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c",
    "scope": "/subscriptions/subscription_id",
    "notScopes": [

    ],
    "parameters": {
      "listOfAllowedLocations": {
        "value": [
          "francecentral",
          "francesouth",
          "northeurope",
          "westeurope"
        ]
      }
    },
    "description": "Only specific locations are available for CloudSandbox",
    "metadata": {
      "assignedBy": "Admin Admin",
      "parameterScopes": {
        "listOfAllowedLocations": "/subscriptions/subscription_id"
      }
    }
  },
  "Sku": {
    "name": "A0",
    "tier": "Free"
  },
  "PolicyAssignmentId": "/subscriptions/subscription_id/providers/Microsoft.Authorization/policyAssignments/686a94bb904447afb201f2cf"
}
```

Cependant vu que rien n'est parfait, il n'y a pas plétore de policy "build-in", et donc pas toujours celles que l'on souhaite. Bonne nouvelle cependant, tout comme les rôles RBAC, il est possible d'en créer des personnalisables.

Par exemple, si je souhaite limiter le type de SKU d'une instance SQL Database, je peux écrire le JSON suivant :

```json
{
 "if": {
  "allOf": [
   {
    "field": "type",
    "equals": "Microsoft.Sql/servers/databases"
   },
   {
    "not": {
                    "field": "Microsoft.Sql/servers/databases/requestedServiceObjectiveName",
                    "in": "[parameters('listOfSKUId')]"
    }
   }
  ]
 },
 "then": {
  "effect": "deny"
 }
}
```

Il est possible par la suite de l'associer à notre souscription via cette commande Powershell

```powershell
New-AzureRmPolicyDefinition -Name 'SqlDBSkus' -DisplayName 'My custom policy for SQL DB SKUs' -Policy 'SQLDbsSKUsPolicy.json'
```

Après, la mise en place de votre policy se fait soit via le portail Azure, soit via cette commande powershell.

```powershell
$rg = Get-AzureRmResourceGroup -Name 'rg-demo'
$policy = Get-AzureRmPolicyDefinition -Name 'SqlDBSkus'
New-AzureRmPolicyAssignment -Name 'limit-sql-db-skus' -DisplayName 'Custom policy for SQL DB SKUs' -Scope $rg.ResourceId -PolicyDefinition $definition -PolicyParameter .\AllowedSqlDBSkus.json
```

Les policy Azure vous offrent de ce fait la possibilité de mieux gérer et organiser votre souscription Azure que ce soit pour valider des règles de naming ou mieux maitriser le coût comme ici.
