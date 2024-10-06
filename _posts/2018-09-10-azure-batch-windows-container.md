---
layout: post
title: Azure Batch & Windows Container
date: 2018-09-10
categories: [ "Azure", "Batch", "Container" ]
comments_id: 146 
---

Récemment j'ai eu la problématique suivante : trouver un moyen de limiter la consommation mémoire d'une tâche dans Azure Batch. S'agissant à la base d'une tâche réalisée en .Net basée sur un framework pas récent, j'ai décidé de conserver au maximum l'applicatif sans pour autant écrire beaucoup de code pour mettre en place cette limitation.

J'ai  donc opté pour la mise en place de container Docker pour Windows, puisque Docker permet de mettre cela en place simplement grâce à une option lorsqu'on lance notre container.

En terme de modification, je dois donc juste m'assurer que je puisse packager mon applicatif dans un container docker et que je puisse utiliser l'option sur Batch.

Afin de tester la fonctionnalité Batch + Container Windows, j'ai donc réalisé les tâches suivantes :

- Création d'un Azure Container Registry
- Création d'un compte Azure Batch

Ma registry va me servir à créer mon image Docker et à valider l'usage d'une registry privée, et mon compte Azure Batch va me servir pour mes tests.

Commençons par mon code applicatif que je vais utiliser, il doit respecter les critères suivants :

- Utiliser de la mémoire
- Tourner avec le Framework .Net (ici je vais prendre le 4.7.2)
- Avoir une durée de vie assez longue afin de pouvoir observer les différentes métriques et retours lors d'une éxecution

J'ai pris le parti de créer un programme infini qui écrit dans un Table Storage en gardant toutes les entrées en mémoire, cela donne donc ce code :

```csharp
public static class Program
{
    private const string ConnectionString = "CLE EN DUR, C'EST UN TEST DE HAUT VOL";
    public static void Main(string[] args) 
    {
      var csa = CloudStorageAccount.Parse(ConnectionString);
      var tableClient = csa.CreateCloudTableClient();
      
      var batchTable = tableClient.GetTableReference("batch");
      batchTable.CreateIfNotExists(); 
      batchTable.Execute(TableOperation.Insert(new DynamicTableEntity("batch", (DateTime.MaxValue.Ticks - DateTime.UtcNow.Ticks).ToString()))); 
     
      List<FakeItem> items = new List<FakeItem>(); 
 
      for (int i = 0; i < int.MaxValue; i++)
      {
        items.Add(new FakeItem()
        {
          Val = i,
          Id = Guid.NewGuid()
        });


        if (i % 100 == 0)
        {
          System.Diagnostics.Process currentProcess = System.Diagnostics.Process.GetCurrentProcess();
          long memoryUsage = currentProcess.WorkingSet64;

          batchTable.Execute(TableOperation.Insert(
          new MyEntity()
          {
            PartitionKey = "batch",
            RowKey = (DateTime.MaxValue.Ticks - DateTime.UtcNow.Ticks).ToString(),
            MemoryValue = memoryUsage
          }));

        }
      }

    }

    public class MyEntity : TableEntity
    {
      public long MemoryValue { get; set;}
    }

    public class FakeItem
    {
      public Guid Id { get; set; }
      public double Val { get; set;}
    }
}
```

Il ne reste plus qu'à packager tout cela avec un DockerFile, qui est le suivant :

```docker
FROM microsoft/dotnet-framework:4.7.2-sdk-windowsservercore-ltsc2016 AS build
WORKDIR /app

COPY *.sln .
COPY sample-app/*.csproj ./sample-app/
RUN dotnet restore

COPY . .
WORKDIR /app/sample-app
RUN dotnet build

FROM build AS publish
WORKDIR /app/sample-app
RUN dotnet publish -c Release -o out


FROM microsoft/dotnet-framework:4.7.2-runtime-windowsservercore-ltsc2016 AS runtime
WORKDIR /app
COPY --from=publish /app/sample-app/out ./
```

Avec le code et ce dockerfile, je peux soit construire l'image en local et la push sur mon ACR, soit directement en faisant un ACR Build afin de gagner du temps vu que les images Docker pour Windows sont assez volumineuses.
Voici la commande pour effectuer un build distant :

```bash
az acr build --registry <azureregistryname> --file .\DockerFile --image <appname> --os windows .
```

Le fonctionnement d'Azure Batch s'articule autour de 3 notions :

- Pool : Ensemble de serveur qui seront utilisés. Un compte Azure Batch peut contenir plusieurs types de pool
- Job : Elément logique qui permet de regrouper nos différentes tâches
- Task : Exécution de nos tâches de calcul, ici il s'agira de l'exécution de notre container

Commençons donc par créer notre pool pour nos tests, il est possible de faire ceci via le portail Azure, ou via du code comme ci-dessous :

```csharp
ImageReference imageReference = new ImageReference(
  publisher: "MicrosoftWindowsServer",
  offer: "WindowsServer",
  sku: "2016-Datacenter-with-Containers",
  version: "latest");

// Specify a container registry
ContainerRegistry containerRegistry = new ContainerRegistry(
  registryServer: $"{AcrName}.azurecr.io",
  userName: AcrName,
  password: AcrKey);

// Create container configuration, prefetching Docker images from the container registry
ContainerConfiguration containerConfig = new ContainerConfiguration();
 containerConfig.ContainerImageNames = new List<string> {
  // Prefetch images. Unusable node if error
    $"{AcrName}.azurecr.io/{ContainerName}:{ContainerVersion}"
 };
 containerConfig.ContainerRegistries = new[] { containerRegistry };

VirtualMachineConfiguration virtualMachineConfiguration = new VirtualMachineConfiguration(
  imageReference: imageReference,
  nodeAgentSkuId: "batch.node.windows amd64");
 virtualMachineConfiguration.ContainerConfiguration = containerConfig;

// Create pool
CloudPool pool = batchClient.PoolOperations.CreatePool(
  poolId: BatchPoolId,
  virtualMachineSize: "Standard_D2_V2",
  targetDedicatedComputeNodes: 1,
  virtualMachineConfiguration: virtualMachineConfiguration);

pool.UserAccounts = new List<UserAccount>() { new UserAccount("God", "pwdtopsecure", ElevationLevel.Admin) }; 

pool.Commit();
```

Par ailleurs, pour les tests je ne recommande pas de mettre en place le préchargement des images car en cas d'erreur, Azure Batch indique que votre pool est inutilisable, il faudra donc le recréer, ce qui peut vous faire perdre beaucoup de temps.

Maintenant il faut créer un job et y ajouter une tâche, pour cela encore en CSharp :

```csharp
string cmdLine = @"C:\app\sample-app.exe";
ContainerRegistry containerRegistry = new ContainerRegistry(
  registryServer: $"{AcrName}.azurecr.io",
  userName: AcrName,
  password: AcrKey);

TaskContainerSettings cmdContainerSettings = new TaskContainerSettings(
  imageName: $"{AcrName}.azurecr.io/{ContainerName}:{ContainerVersion}",
  containerRunOptions: "--memory 64m",
  registry: containerRegistry
  );

CloudTask containerTask = new CloudTask(Guid.NewGuid().ToString("N"), cmdLine);

containerTask.ContainerSettings = cmdContainerSettings;
containerTask.UserIdentity = new UserIdentity(new AutoUserSpecification(elevationLevel: ElevationLevel.Admin, scope: AutoUserScope.Pool));

batchClient.JobOperations.AddTask(job.Id, containerTask);
```

Le point important à savoir ici c'est pour la ligne de commande qui est exécutée, par défault elle se lance dans le répertoire dédié à votre tâche, et l'application dans votre container se trouve le plus souvent sur le C:

Pour le reste, on peut voir que j'ai la main sur les différentes options pour lancer mon container. Ici je peux donc limiter la mémoire maximale pour mon application. En cas de dépassement de celle-ci, mon code me renvoit une exception de type OutOfMemoryException

Lors de vos tests vous pouvez vous connecter sur les noeuds Batch afin de voir l'utilisation CPU / RAM de vos containers via la commande :

```bash
docker stats
```
