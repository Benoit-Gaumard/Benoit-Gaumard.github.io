---
layout: post
title: Azure Function - Moi développeur C#, je commence comment ?
date: 2019-04-04
categories: [ "Azure", "Function" ]
comments_id: 162 
---

Il est l'heure de ce mettre au Serverless, et sur Azure il y en a 2 principaux qui sont Azure Function et Logic Apps. Ce dernier est très orienté Workflow, donc on ne va pas l'aborder ici. Par contre, on va faire un rapide tour des possibilités qu'on a pour Azure Function.

Il existe plusieurs manières de créer ces fonctions dans Azure Functions, qui sont les suivantes :

- Via le portail Azure
- Via l'intégration d'un repository Git
- Via l'intégration d'un zip
- Via un binaire généré via Visual Studio par exemple

Chacune de ces méthodes a ses avantages et ces inconvénients selon moi.

**Génération d'un binaire** :

- Avantages :
  - Utilisation d'un éditeur de code complet comme Visual Studio (oui ce n'est pas toujours simple d'éditer des solutions C# via VSCode)
- Inconvénients :
  - On risque facilement de dériver vers un binaire trop lourd qui a un *Cold Start* pas vraiment acceptable pour vos clients
  - On ne voit pas nos fonctions dans le portail, enfin on ne voit pas leurs codes, juste la référence à un binaire. Ce qui avouons le n'est pas l'idéal pour du debug.
  
**Le portail Azure** :

- Avantages :
  - Rapide à dévélopper, et à tester.
  - Pas besoin d'outil, un simple navigateur Web, une connexion internet et de l'immagination suffit.
  - On voit le rendu dans le portail Azure
- Inconvénients :
  - Il faut bien connaitre son langage, car c'est d'un niveau spartiate l'outillage Web
  - Qu'est-ce que le portail peut être lent dans cette partie là.

**Depuis Git ou via un zip** :

- Avantages :
  - Intégration native de déploiement continu dans Azure Function.
  - Utilisation d'un IDE de qualité pro, comme VSCode
  - On voit nos fonctions dans le portail en ReadOnly
- Inconvénients :
  - Il faut faire des csx si vous faites du C#, et ce n'est clairement pas évident

Pour ma part, j'utilise principalement les deux derniers, car j'utilise Azure Function principalement pour automatiser des actions de management. Par contre, si je devais travailler sur un projet globallement serverless, je me ferais une joie de rouvrir Visual Studio.

De ce fait je vais vous montrer comment faire pour créer vos premières fonctions en csx via VSCode.

**Etape 1: Installer la moitié d'Internet sur votre PC** :

- Une ou plusieurs versions de dotnet core.
- Nodejs

Pour ma part, j'utilise chocolatey pour installer ce genre d'outil sur mon PC.

**Etape 2: Lancer VSCode** :

Pas besoin de le télécharger normalement, car comme tout bon dev, vous l'avez déjà, mais au cas où, voici le lien: [https://code.visualstudio.com/Download](https://code.visualstudio.com/Download)

**Etape 3: Installer tout pleins d'extensions** :

Des extensions, il y en a pleins sur VSCode, notamment celles ci :

- Azure Functions : [https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)
- C# : [https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp)

Et il y en a bien d'autres très utiles (dont la mienne).

**Etape 4: Les outils pour Azure & Azure Function** :

Commençons par installer la CLI ou Powershell pour Azure. Où les deux si votre coeur balance

- Azure CLI : [https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows?view=azure-cli-latest](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows?view=azure-cli-latest)
- Azure Powershell : Dans une console powershell

```powershell
Install-Module Az -AllowClobber -Scope CurrentUser
```

Les outils Azure Function, il suffit d'aller dans VSCode et faire View > Command Palette (CTRL+SHIFT+P ou F1) et de lancer la tâche **Azure Functions : Install or Update Azure Functions Core Tools** et de bien choisir la V2.

**Etape 5: On code ?** :

Ouvrez VSCode dans un dossier vide et lancer les commandes suivantes :

```bash
func init --csx
func new --csx
```

Il faudra choisir un nom pour votre fonction, et surtout un trigger, à ce jour il existe les suivants :

- Azure Blob Storage trigger
- Azure Cosmos DB trigger
- Durable Functions activity
- Durable Functions HTTP starter
- Durable Functions orchestrator
- Azure Event Grid trigger
- Azure Event Hub trigger
- HTTP trigger
- IoT Hub (Event Hub)
- Outlook message webhook creator
- Outlook message webhook deleter
- Outlook message webhook handler
- Outlook message webhook refresher
- Microsoft Graph profile photo API
- Azure Queue Storage trigger
- SendGrid
- Azure Service Bus Queue trigger
- Azure Service Bus Topic trigger
- Timer trigger

Normalement il y a de quoi trouver votre bonheur avec ces différents triggers.

Après la création de votre fonction, vous devriez avoir un VSCode qui ressemble à ça :

![image]({{ site.url }}/images/2019/04/04/azure-function-moi-developpeur-c-je-commence-comment-img0.png "image")

**Etape 7: on rajoute des paquets NuGet** :

Faire du C# sans utiliser NuGet, ça devient vite laborieux.
Il est possible de rajouter des paquets Nuget en ajoutant un fichier **function.proj** dans le dossier de votre fonction, ce fichier contient par exemple le code suivant :

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
    <AzureFunctionsVersion>v2</AzureFunctionsVersion>
    <AutoGenerateBindingRedirects>true</AutoGenerateBindingRedirects>
    <GenerateBindingRedirectsOutputType>true</GenerateBindingRedirectsOutputType>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Services.AppAuthentication" Version="1.2.0-preview2" />
  </ItemGroup>
</Project>
```

**Etape 8: On lance en local et on debug si on le souhaite**:

Pour lancer en local, il vous suffit de taper la commande suivante :

```bash
func host start
```

Et si vous voulez lancer en mode debug, le plus simple est de configurer votre environnement pour utiliser VSCode via la  tâche **Azure Functions : Initialize Project for Use with VS Code...** puis de faire F5

**Etape 9: On publie** :

Et maintenant il ne reste plus qu'à publier votre fonction via la commande suivante :

```bash
func azure functionapp publish 'nom de votre Azure Function'
```

Et voilà c'est aussi simple que cela, il ne reste plus qu'à vous lancer.
