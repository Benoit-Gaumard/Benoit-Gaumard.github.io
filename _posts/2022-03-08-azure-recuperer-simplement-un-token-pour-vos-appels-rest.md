---
layout: post
title: Azure - Récupérer simplement un token pour vos appels REST
date: 2022-03-08
categories: [ "Azure", "Powershell" ]
comments_id: 122 
---

L'utilisation des REST API sur Azure est bien entendu un savoir faire essentiel pour tous les utilisateurs du Cloud qu'ils soient développeurs ou administrateurs.

Dans un script il est souvent pratique de switcher sur une REST API à la place d'une cmdlet Powershell, pour différentes raisons comme les suivantes :

- Utilisation d'une propriété pas disponible sur notre version de module Powershell
- Mise à jour d'une propriété d'un objet pas simple à faire en powershell

Et bien entendu pour pouvoir appeler les API REST d'Azure il faut un token d'accès, et pour cela il y a plusieurs moyen d'en récupérer un.

Si vous avez une vieille version des modules powershell, vous pouvez toujours utiliser ce bout de script là :

```powershell
$azContext = Get-AzContext
$azProfile = [Microsoft.Azure.Commands.Common.Authentication.Abstractions.AzureRmProfileProvider]::Instance.Profile
$profileClient = New-Object -TypeName Microsoft.Azure.Commands.ResourceManager.Common.RMProfileClient -ArgumentList ($azProfile)
$token = $profileClient.AcquireAccessToken($azContext.Subscription.TenantId)
$authHeader = @{
    'Content-Type'='application/json'
    'Authorization'='Bearer ' + $token.AccessToken
}
```

Où plus simplement si vous avez oublié ce bout de code, je vous conseille d'aller sur le site de la documentation [Azure](https://docs.microsoft.com/en-us/rest/api/resources/resource-groups/list) et de tester une API, vous aurez la possibilité de récupérer un token d'accès.

Et si vous avez un module assez récent, vous pouvez utiliser la méthode suivante :

```powershell
$token = Get-AzAccessToken
$authHeader = @{
    'Content-Type'='application/json'
    'Authorization'='Bearer ' + $token.Token
}
```

Et voilà vous pouvez appeler des API REST Azure grâce à votre token comme suit :

```powershell
$restUrl = "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups?api-version=2022-01-01"
Invoke-WebRequest -Uri $restUrl -Method GET -Headers $authHeader
```

On est d'accord que c'est beaucoup plus simple à retenir.
