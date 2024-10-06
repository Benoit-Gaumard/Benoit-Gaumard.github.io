---
layout: post
title: Azure Policy - PostgreSQL Flexible Server - Enforcer l'usage du TLS
date: 2023-09-14
categories: ["Azure", "Policy"]
comments_id: 186 
---

Un petit article rapide pour vous montrer comment enforcer le TLS pour les bases PostgreSQL Flexible Server. Si vous regardez dans les options du control plan Azure vous n'allez pas trouver d'option comme sur les bases PostgreSQL Single Server.

Cependant en fouillant bien vous allez trouver l'option dans les paramètres du data plane de la base elle même.

Bonne nouvelle par défault, l'option _require_secure_transport_ est à _ON_ et la propriété _minimum_tls_version_ est à _TLSV1.2_.
Maintenant la première action se désactive via le portail Azure, quand à la deuxième les seuls options sont TLS 1.2 ou TLS 1.3, mais vous pourrez utiliser la même procédure pour bloquer.

On va donc ajouter deux policies ici, la première pour regarder si la propriété existe

```json
{
  "if": {
    "field": "type",
    "equals": "Microsoft.DBforPostgreSQL/flexibleServers"
  },
  "then": {
    "effect": "auditIfNotExists",
    "details": {
      "type": "Microsoft.DBforPostgreSQL/flexibleServers/configurations",
      "name": "require_secure_transport",
      "existenceCondition": {
        "field": "Microsoft.DBForPostgreSql/flexibleServers/configurations/value",
        "equals": "ON"
      }
    }
  }
}
```

Et maintenant on peut aussi faire un _Deny_ en cas de changement:

```json
{
  "if": {
    "allOf": [
      {
        "field": "name",
        "equals": "require_secure_transport"
      },
      {
        "field": "type",
        "equals": "Microsoft.DBforPostgreSQL/flexibleServers/configurations"
      },
      {
        "field": "Microsoft.DBForPostgreSql/flexibleServers/configurations/value",
        "equals": "OFF"
      }
    ]
  },
  "then": {
    "effect": "deny"
  }
}
```

Vous pouvez bien entendu appliquer quelque chose de similaire si vous ne voulez que du TLS 1.3
