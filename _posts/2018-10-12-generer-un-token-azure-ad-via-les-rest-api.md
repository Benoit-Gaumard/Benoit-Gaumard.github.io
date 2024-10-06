---
layout: post
title: Générer un token Azure AD via les REST API
date: 2018-10-12
categories: [ "Azure", "Powershell", "Azure Active Directory" ]
comments_id: 150 
---

Dernièrement j'ai eu le besoin d'accéder à un compte de stockage via un compte applicatif, j'ai donc mis en plac un SPN avec un droit RBAC sur mon compte de stockage, comme je le montre dans cet article : [http://blog.woivre.fr/blog/2018/09/connectez-vous-a-vos-comptes-de-stockage-via-azure-active-directory](http://blog.woivre.fr/blog/2018/09/connectez-vous-a-vos-comptes-de-stockage-via-azure-active-directory)

Maintenant il faut que je génère mon token d'accès, chose qui est assez simple avec les différentes librairies ADAL, cependant pour mon besoin j'avais les contraintes suivantes :

* Compte applicatif avec une authentification par certificat
* Pas de librairies supplémentaires (adieu ADAL)
* Powershell

Première étape, il faut générer un token JWT. Pour rappel un token JWT répond à la structure suivante : **base64(header).base64(payload).base64(signature)**

Commençons par la construction de notre header, pour cela il nous faut le hash de notre certificat, que l'on peut récupérer de la manière suivante :

```powershell
$cert = Get-Item Cert:\CurrentUser\My\$ThumbprintValue

$hash = $cert.GetCertHash()
$hashValue = [System.Convert]::ToBase64String($hash)  -replace '\+','-' -replace '/','_' -replace '='
```

Il est maintenant possible de constuire notre header de la manière suivante, ainsi que notre payload :

```powershell
[hashtable]$header = @{alg = 'RS256'; typ= "JWT"; x5t = $thumprintValue}
[hashtable]$payload = @{aud = "https://login.microsoftonline.com/$TenantUrl/oauth2/token"; iss = $applicationId; sub=$applicationId; jti = "22b3bb26-e046-42df-9c96-65dbd72c1c81"; exp = $exp; nbf= 1536160449}
```

Maintenant qu'on a toutes les informations, il faut générer notre signature, et construire notre token

```powershell
$headerjson = $header | ConvertTo-Json -Compress
$payloadjson = $payload | ConvertTo-Json -Compress

$headerjsonbase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($headerjson)) -replace '\+','-' -replace '/','_' -replace '='
$payloadjsonbase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($payloadjson)) -replace '\+','-' -replace '/','_' -replace '='

$jwt = $headerjsonbase64 + "." + $payloadjsonbase64
$toSign = [System.Text.Encoding]::UTF8.GetBytes($jwt)

$Signature = [Convert]::ToBase64String($rsa.SignData($toSign,[Security.Cryptography.HashAlgorithmName]::SHA256,[Security.Cryptography.RSASignaturePadding]::Pkcs1)) -replace '\+','-' -replace '/','_' -replace '='

$token = "$headerjsonbase64.$payloadjsonbase64.$Signature"
```

A noter qu'il est possible de valider la création de votre jeton JWT sur des sites comme celui-ci : [https://jwt.io/](https://jwt.io/)

Et voilà nous avons notre token JWT qui nous servira à avoir notre access Token qu'on va pouvoir récupérer de la manière suivante:

```powershell

$url = "https://login.microsoftonline.com/$TenantUrl/oauth2/token"
$body = "resource=https%3A%2F%2F$storageAccountName.blob.core.windows.net%2F&client_id=$applicationId&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&client_assertion=$token&grant_type=client_credentials"
$responseToken = Invoke-WebRequest -Method POST -ContentType "application/x-www-form-urlencoded"  -Headers @{"accept"="application/json"} -Body $body $url -Verbose

$accessToken = ($responseToken.Content | ConvertFrom-Json).access_token
```

Après avoir générer notre token, il est possible de l'utiliser dans nos headers pour appeler les REST API de notre storage.

```powershell
$headerSMA =  @{"Authorization" = "Bearer " + $accessToken; "x-ms-version" = "2017-11-09"}
Invoke-WebRequest -Headers $headerSMA -Method GET "https://$storageAccountName.blob.core.windows.net/$containerName/$blobName"  -OutFile $outFile
```

Et voilà comment appeler des API Azure tout en s'affranchissant d'ADAL. Même si on est d'accord créer notre Token avec ADAL c'est beaucoup plus simple. Et surtout moins long à lire.
