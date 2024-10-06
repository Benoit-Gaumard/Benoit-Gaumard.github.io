---
layout: post
title: Azure Policy - L'effet DenyAction
date: 2023-04-15
categories: ["Azure", "Policy"]
comments_id: 188 
---

Un nouvel effet est disponible sur les Azure Policy, il s'agit du _DenyAction_, comme son nom l'indique il vous permet de faire un Deny lorsque vous tentez de faire une action. Mais la subtilité c'est que si l'action est faite via cascade, du type suppression d'un ResourceGroup, vous pouvez l'autoriser.

A quoi cela peut bien servir, me direz vous?

Et bien moi l'intérêt que je vois c'est surtout les ressources imbriquées comme les iprules des bases postgresql, ou des keyvault, mais aussi des diagnosticssettings sur vos ressources:

Voici un exemple de policy our la partie DiagnosticsSettings:

```json
{
  "if": {
    "field": "type",
    "equals": "Microsoft.Insights/diagnosticSettings"
  },
  "then": {
    "effect": "denyAction",
    "details": {
      "actionNames": ["delete"]
    }
  }
}
```
