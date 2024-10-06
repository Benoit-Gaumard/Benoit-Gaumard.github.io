---
layout: post
title: Azure Functions - Utiliser Azurite en HTTPS pour vos tests Unitaires
date: 2023-06-06
categories: [ "Azure", "Function" ]
comments_id: 177 
---

Précedemment, le développement était mon coeur de métier, beaucoup moins à ce jour, mais j'ai toujours un grand plaisir à développer des applications. La plupart de celles ci sont basés sur du serverless. Mon langage de prédilection est le C# donc tout naturellement j'utilise Azure Functions pour mes développements.

Pour mon dernier projet, j'ai décidé de faire cela dans les règles de l'art, enfin du moins j'essaye, et donc j'ai mis en place des tests unitaires pour mon Azure Function. Vu que de mon point de vue faire des mocks pour les accès en base sont inutiles à ce jour, vu la simplicité d'avoir des bases ou émulateurs locals et jetable pour faire les tests, autant les utliser, et ne pas à avoir reproduire tout le mock liés aux accès.

Ici mon besoin est très simple, utiliser une Azure Function qui va insérer des données dans un Table Storage.

Mon code C# pour me connecter à mon storage account est donc le suivant :

```csharp
var client = new TableClient(new Uri(this._options.Uri), tableName, new DefaultAzureCredential());
```

Cela me permet d'uniquement de donner l'accès ma table Client, et d'utiliser le DefaultAzureCredential qui me permettra à terme d'utiliser une Managed Identity dans Azure.

Si l'on suit la documentation Azure, ils expliquent qu'il faut mettre comme url pour notre Table Storage quelque chose comme ceci : *<http://127.0.0.1:10002/>*. C'est donc à ce moment que je me suis dit mais pourquoi pas https. Si l'on regarde la suite de la documentation ils expliquent comment faire, mais mettons cela sur le compte de la fatigue, ça ne fonctionne pas, donc on va le faire ici pas à pas.

## Installation

### Azurite

Simplement dans les extensions de Visual Studio Code, chercher Azurite et l'installer.
Ou via le lien du [Marketplace](https://marketplace.visualstudio.com/items?itemName=Azurite.azurite)

### Storage Explorer

Via la documentation Microsoft : [Storage Explorer](https://azure.microsoft.com/en-us/products/storage/storage-explorer/)

### mkcert

Via Winget

```powershell
winget install mkcert
```

Mais tout autre outil pour générer un certificat pem avec sa clé fera l'affaire.

## Configuration d'Azurite

On va créer notre certificat pour notre Azurite local pour commencer, pour cela on va utlisier mkcert.

```powershell
mkcert -install
mkcert 127.0.0.1
```

On a donc deux fichiers qui ont été créés suite à cette commande.
Après cela, on va modifier les paramètres de votre VS Code pour configurer notre Azurite de la manière suivante :

```json
"azurite.location": ".azurite",
"azurite.cert": "D:\\Community\\ipam\\.azurite\\127.0.0.1.pem",
"azurite.key": "D:\\Community\\ipam\\.azurite\\127.0.0.1-key.pem",
"azurite.oauth": "basic"
```

Pour ma part, j'utilise les configurations de mon Workspace, et pas celle globale, car ceci est lié qu'à ce projet. Donc les configurations suivantes servent donc à ceci :

- azurite.location : C'est le dossier où Azurite va stocker les données
- azurite.cert : C'est le chemin vers le certificat pem
- azurite.key : C'est le chemin vers la clé du certificat pem
- azurite.oauth : C'est le type d'authentification, ici basic, car c'est le seul qui fonctionne avec le HTTPS, et qui me permet d'utiliser le DefaultAzureCredential.

Il ne reste plus qu'à lancer Azurite, et à lancer notre test.

## Configuration de Storage Explorer

Tester depuis VSCode c'est bien, on a un beau message qui nous X tests réussis. Mais bon je suis curieux et je veux quand même voir le contenu de mon storage.

Pour cela, je réouvre mkcert et j'effectue la commande suivante :

```powershell
mkcert -CAROOT
```

Ici je récupère le chemin vers un dossier qui contient pour CAROOT. J'importe celui-ci et celui qui s'appelle 127.0.0.1.pem dans Storage Explorer via l'option "Edit" -> "SSL Certificates" -> "Import Certificate". Un reboot, et on peut après importer notre Storage Local, et le parcourir comme s'il était sur Azure.
