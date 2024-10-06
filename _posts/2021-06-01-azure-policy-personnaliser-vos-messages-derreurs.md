---
layout: post
title: Azure Policy - Personnaliser vos messages d'erreurs
date: 2021-06-01
categories: ["Azure", "Policy"]
comments_id: 117 
---

Azure Policy est en constante évolution, et bien entendu Microsoft apporte son lot de nouveautés à ce service, et la dernière en date que je trouve vraiment pas mal consiste à ajouter un message d'erreur personnalisé lors de l'assignement de votre Azure Policy.

Imaginons une policy pour vos storage accounts pour valider qu'ils seront tous accessible qu'en https, nous aurons donc une policy de ce type :

```json
"if": {
    "allOf": [
        {
            "field": "type",
            "equals": "Microsoft.Storage/storageAccounts"
        },
        {
            "field": "Microsoft.Storage/storageAccounts/supportsHttpsTrafficOnly",
            "equals": false
        }
    ]
},
"then": {
    "effect": "deny"
}
```

Lors de l'assignation de celle ci, vous allez vouloir lui attribuer un nom, à ce moment là vous avez plusieurs choix :

- Mettre un nom qui parle à tous ceux qui auront le message d'erreur tel que *AllowOnlyStorageAccountWithOnlyHttpsSupport*
- Mettre un identifiant unique tel que *4cd4c48a-9a10-4386-ae0e-45ee0205231b*, puisqu'on est d'accord qu'il n'y a rien de mieux qu'un Guid, ou pas ...
- Avoir une nomenclature sur vos différentes Azure Policy afin de les retrouver facilement et éviter les erreurs de typos ou d'anglais approximatif, sauf que là on risque de se retrouver avec un code pas toujours clair tel que STG-SPEC-NWK-RSK0 (Storage-Specific-Network-Risque_0)
- La réponse D

Bon pour pas vous le cachez je préfère le 3ème choix, parce qu'une nomenclature ça se décline et qu'il n'y a pas besoin d'inventer un nom pour tout. Le vrai inconvénient toutefois c'est qu'il arrive que vos policy se déclenchent et que vos utilisateurs vous demandent légitiment "Sinon Wilfried, ce code d'erreur il veut dire quoi ?"
Et bien sachez que maintenant tous ces soucis de support sont finis, car Microsoft a fourni la possibilité de mettre des messages d'erreurs personnalisé comme celui-ci :

![]({{ site.url }}/images/2021/02/01/azure-policy-personnaliser-vos-messages-derreurs-img1.png)

De ce fait lorsque vous allez créer votre Storage Account, par exemple en powershell vous aurez ce message :

```powershell
PS C:\Users\wilfr> New-AzStorageAccount -Name policytestwwo -ResourceGroupName policy-test-2 -Kind StorageV2 -SkuName Standard_LRS -Location westeurope -AccessTier Hot -EnableHttpsTrafficOnly $false
New-AzStorageAccount : Resource 'policytestwwo' was disallowed by policy. Reasons: 'Allow only storage account with
only https support enabled'. See error details for policy resource IDs.
At line:1 char:1
+ New-AzStorageAccount -Name policytestwwo -ResourceGroupName policy-te ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : CloseError: (:) [New-AzStorageAccount], CloudException
    + FullyQualifiedErrorId : Microsoft.Azure.Commands.Management.Storage.NewAzureStorageAccountCommand
```

Et voilà votre message custom est présent ! Bon bien entendu, vous pouvez mettre ce que vous voulez comme un lien vers votre documentation interne pour cette Policy.
