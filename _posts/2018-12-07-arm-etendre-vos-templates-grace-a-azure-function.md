---
layout: post
title: ARM - Etendre vos templates grâce à Azure Function
date: 2018-12-07
categories: [ "Azure", "ARM", "Function" ]
comments_id: 155 
---

Pour construire une infrastructure sur Azure, il y a plusieurs moyens qui s'offrent à vous, notamment les suivants :

- Le portail Azure et votre souris (ou votre trackpad)
- Les REST API pour les courageux
- Azure CLI
- Azure Powershell
- Terraform
- Template ARM

Ici, on va plutôt parler du dernier, car c'est celui que je préfère, je n'ai pas encore été rattrapé par la hype qui touche Terraform.

Bien que l'on puisse faire beaucoup de choses avec les templates ARM, je trouve qu'on est limité en terme de fonction built in.

Dans ma liste de souhait pour Noël, j'aimerais entre autres les fonctions suivantes :

- Calcul de dates : Date du jour, date dans 1 an, dans 1 heure ...
- Calcul de timespan : Utile dans les templates ARM créant des secrets dans des KeyVaults par exemple.

J'ai trouvé une solution pour m'offrir ces fonctionnalités dans mes templates ARM qui se base sur Azure Function et le compilateur Roslyn.

J'ai donc créé une Azure Function qui référence le package Nuget suivant : **Microsoft.CodeAnalysis.Scripting** en version **2.3.0**

Cette fonction basée sur un trigger HTTP exécute le code suivant :

```csharp
string script = req.Query["script"];
string result = await Microsoft.CodeAnalysis.CSharp.Scripting.CSharpScript.EvaluateAsync<string>(script);

StringBuilder template = new StringBuilder();  
template.AppendLine("{");
template.AppendLine("    \"$schema\": \"https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#\",");
template.AppendLine("    \"contentVersion\": \"1.0.0.0\",");
template.AppendLine("    \"parameters\": {},");
template.AppendLine("    \"variables\": {},");
template.AppendLine("    \"resources\": [],");
template.AppendLine("    \"outputs\": {");
template.AppendLine("        \"eval\": {");
template.AppendLine("           \"type\": \"string\",");
template.AppendLine("           \"value\": \""+ result +"\"");
template.AppendLine("        }");
template.AppendLine("    }");
template.AppendLine("}");

return (ActionResult)new OkObjectResult(template.ToString());
```

Je récupère via ma querystring une chaine de caractère que j'évalue grâce à Roslyn pour ensuite la passer dans l'output d'un template ARM que je contruis dans mon code.

Il est possible d'appeler cette fonction via un template ARM, grâce à la méthode des linkedTemplate comme on peut le voir ci dessous :

```json
{
    "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
    "contentVersion": "1.0.0.0",
    "parameters": {},
    "variables": {
        "functionUrl": "https://myfunc.azurewebsites.net/api/executecsharp",
        "script": "System.DateTime.UtcNow.AddYears(10).ToString()"
    },
    "resources": [
        {
            "type": "Microsoft.Resources/deployments",
            "apiVersion": "2015-01-01",
            "name": "arm-dep",
            "properties": {
                "mode": "Incremental",
                "templateLink": {
                    "uri": "[concat(variables('functionUrl'), '?script=', variables('script'))]",
                    "contentVersion": "1.0.0.0"
                }
            }
        }
    ],
    "outputs": {
        "fromLinked": {
           "type": "string",
           "value": "[reference('arm-dep').outputs.eval.value]"
        }
    }
}
```

Grâce à cette méthode j'arrive à récupérer dans ce cas la date du jour dans 10 ans, il est bien entendu possible de réutiliser la sortie de mon template dans d'autres ressources comme c'est le cas pour des templates linkés.

On peut utiliser ce trick dans plusieurs scénarios plus ou moins legit. Cependant bien que cela soit possible, je ne vous conseille pas cette astuce en premier choix d'implémentation.
