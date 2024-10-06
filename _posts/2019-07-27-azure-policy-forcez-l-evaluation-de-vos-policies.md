---
layout: post
title: Azure Policy - Forcez l'évaluation de vos policies
date: 2019-07-27
categories: [ "Azure", "Policy" ]
comments_id: 166 
---
Lorsque vous créez vos propres Azure Policy, il peut être fastidieux de les tester, vu que l'évaluation est déclenchée par Azure.

Il est possible depuis un moment de forcer son exécution au scope d'un groupe de ressource ou d'une souscription. Même si dans notre cas, il s'agit plus de forcer sur un resource group de test plus que sur une souscription pour ne pas impacter vos autres policies.

Il est possible de faire cela en powershell via un simple appel REST.

Pour cela il faut utiliser les urls suivantes :

- Souscription : ***<https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation?api-version=2018-07-01-preview>***
- Resource Group : ***<https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{YourRG}/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation?api-version=2018-07-01-preview>***

```powershell
$azContext = Get-AzContext
$azProfile = [Microsoft.Azure.Commands.Common.Authentication.Abstractions.AzureRmProfileProvider]::Instance.Profile
$profileClient = New-Object -TypeName Microsoft.Azure.Commands.ResourceManager.Common.RMProfileClient -ArgumentList ($azProfile)
$token = $profileClient.AcquireAccessToken($azContext.Subscription.TenantId)
$authHeader = @{
    'Content-Type'='application/json'
    'Authorization'='Bearer ' + $token.AccessToken
}

$subscriptionId = ""
$resourceGroup = ""

$restUrl = "https://management.azure.com/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.PolicyInsights/policyStates/latest/triggerEvaluation?api-version=2018-07-01-preview"

 Invoke-WebRequest -Uri $restUrl -Method POST -Headers $authHeader
```

Et vous retrouverez cette trace dans votre Activity Log :

![image]({{ site.url }}/images/2019/07/27/azure-policy-forcez-l-evaluation-de-vos-policies-img0.png "image")

Donc plus d'excuse pour aller chercher un café en attendant que la policy se déclenche.
