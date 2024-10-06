---
layout: post
title: Trouvez vos Azure Policies non utilisées
date: 2022-08-18
categories: [ "Azure", "Policy" ]
comments_id: 174 
---

Créer des Azure policies est une chose très facile, cependant il peut être pratique de savoir si toutes vos Azure policies sont utilisées dans votre environnement.

Pour cela j'ai créé une query Resource Graph très pratique

```kql
policyresources
| where type == "microsoft.authorization/policydefinitions"
| extend policyType = tostring(properties.policyType)
| where policyType == "Custom"
| join kind=leftouter (
    policyresources
    | where type == "microsoft.authorization/policysetdefinitions"
    | extend policyType = tostring(properties.policyType)
    | extend  policyDefinitions = properties.policyDefinitions
    | where policyType == "Custom"
    | mv-expand policyDefinitions
    | extend policyDefinitionId = tostring(policyDefinitions.policyDefinitionId)
    | project associedIdToInitiative=policyDefinitionId 
    | distinct associedIdToInitiative) on $left.id == $right.associedIdToInitiative
| where associedIdToInitiative == ""
| join kind=leftouter(
    policyresources
    | where type == "microsoft.authorization/policyassignments"
    | extend policyDefinitionId = tostring(properties.policyDefinitionId)
    | project associatedDefinitionId=policyDefinitionId 
    | distinct associatedDefinitionId
) on $left.id == $right.associatedDefinitionId
| where associatedDefinitionId == ""
| extend displayName = tostring(properties.displayName)
| project id, displayName
```

Vous pouvez retrouver la requête resource graph sur mon [github](https://github.com/wilfriedwoivre/azure-resource-graph-queries/tree/master/queries/policies/list-unused-policies).

Dans cette requête Resource Graph, on commence par lister toutes les Azure Policy qui sont définies dans votre environnement, et on va filtrer uniquement sur celles qui sont *Custom*.

Et ensuite on va regarder si elles ne sont pas assignées dans une Initiative, ou en direct sur un scope Azure, et récupérer notre liste de Policy inutiles.

Charge à vous après à les supprimer si elles ne vous servent vraiment à rien.

Cette nouveauté dans Azure Resource Graph est très pratique, et l'outil est vraiment utile pour tout ce qui est gouvernance, et il est en constante évolution chez Microsoft, ce qui est une bonne chose selon moi. Vivement qu'on puisse requêter les Azure Role Assignments, et les objets Azure AD (oui c'est ma liste de souhait pour les nouvelles fonctionnalités).
