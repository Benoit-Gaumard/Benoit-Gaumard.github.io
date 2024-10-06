---
layout: post
title: Configurer les diagnostiques sur Windows Azure
date: 2012-03-02
categories: [ "Monitoring", "Azure" ]
comments_id: 80 
---

Dans l’article précédent, nous avons pu lister les diagnostiques disponibles sur Windows Azure, vous pouvez le relire ici : [http://blog.woivre.fr/?p=713](http://blog.woivre.fr/?p=713 "http://blog.woivre.fr/?p=713")

Maintenant que nous avons réalisé le listing de chacun des diagnostiques que l’on peut récolter au sein d’un rôle Azure, maintenant si nous regardions comment implémenter chacun d’entre eux, puisque savoir ce qu’on peut récupérer comme information de diagnostics, c’est bien. Savoir comment les récupérer c’est mieux !

## Windows Azure Logs

Pour cela, il faut commencer par ajouter aux services de Diagnostics de .Net, le trace Listener Windows Azure, comme on peut le voir ci-dessous :

```xml
  <system.diagnostics>
    <trace>
      <listeners>
        <add  type="Microsoft.WindowsAzure.Diagnostics.DiagnosticMonitorTraceListener,
             Microsoft.WindowsAzure.Diagnostics,
             Version=1.0.0.0,
             Culture=neutral,
             PublicKeyToken=31bf3856ad364e35"  name="AzureDiagnostics">
          <filter  type="" />
        </add>
      </listeners>
    </trace>
  </system.diagnostics>
```

Celui-ci est déjà ajouté lorsque vous créer un projet Windows Azure auquel vous ajoutez des rôles, cependant, il faut de plus activer ces diagnostiques afin qu’ils soient utilisable dans notre application.

Pour cela, je vous conseille de faire cela dans le OnStart de votre rôle, avec une méthode comme celle ci :

```csharp
  private void StartDiagnostics()
  {
      // Get default initial configuration.
      var config = DiagnosticMonitor.GetDefaultInitialConfiguration();

      // Windows Azure Logs
      config.Logs.BufferQuotaInMB = 10;
      config.Logs.ScheduledTransferLogLevelFilter = LogLevel.Verbose;
      config.Logs.ScheduledTransferPeriod = TimeSpan.FromMinutes(5);

      // Start the diagnostic monitor with the modified configuration.
      DiagnosticMonitor.Start("Microsoft.WindowsAzure.Plugins.Diagnostics.ConnectionString", config);
  }
```

Il est possible de définir un quota et une période de transfert pour l’ajout des logs dans votre storage. De même un niveau de log est définit afin de conserver uniquement les erreurs ou tout type de trace comme dans ce cas-ci.

Je vous conseille de ne pas donner une configuration de quota et de temps de transfert trop courte afin de limiter les accès à votre storage, et ainsi réduire les couts de vos applications.

Maintenant, passons à la partie Log de vos données, voici ci dessous une méthode qui vous permet de logger dans les Windows Azure Log :

```csharp
  public void Log(LogLevel level, string message, Exception exception = null)
  {
      if (!SettingsProvider.GetSettings<bool>(IsTraceLoggerActive))
          return;

      var parameters = new object\[\] { exception };

      message = string.Format("{0} : {1}", DateTime.Now, message);
      switch (level)
      {
          case LogLevel.Other:
              Trace.WriteLine(message);
              break;
          case LogLevel.Information:
              Trace.TraceInformation(message, parameters);
              break;
         case LogLevel.Warning:
              Trace.TraceWarning(message, parameters);
              break;
          case LogLevel.Error:
              Trace.TraceError(message, parameters);
              break;
      }
  }
```

Ce que l’on peut voir, c’est que nous utilisons l’objet Trace de System.Diagnostics, ainsi il est possible d’appeler ces méthodes même dans un contexte onPremise.

Petite astuce, que je vous offre, il faut que vous pensiez toujours à la possibilité de désactiver entièrement vos logs, sans à avoir à modifier la configuration des diagnostics et donc de redéployer. Cela vous permettra de limiter les couts de production en coupant entièrement le logging, même si je ne vous conseille pas de tout couper, et de garder au moins les messages d’erreur de vos applications.

Bon maintenant on sait comment activer et utiliser les Windows Azure Logs, regardons comment les exploiter. Pour cela, prenons un outil gratuit comme Azure Storage Explorer qui vous permettra de consulter votre Table Storage.

On a donc, comme on peut le voir une table WADLogsTable qui est créé automatiquement, et qui nous permet de consulter nos logs.

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img0.png "image")

On a donc comme information par défaut, en plus du message, la date du log, le rôle et son instance, et la criticité de celui-ci.

Comme on peut le voir, c’est un peu brut de fonderie, et il est très difficile de pouvoir lire et analyser des centaines de logs avec ce logiciel, cependant avec un outil comme [Azure Diagnostics Manager](http://www.cerebrata.com/Products/AzureDiagnosticsManager/), c’est beaucoup plus simple.

## Windows Azure Diagnostics Infrastructure Logs

Pour ceux-là, il y a beaucoup moins de configuration à réaliser par rapport au précédent, en effet, il n’y a juste qu’à l’activer comme ceci :

```csharp
  // Windows Azure Diagnostics Infrastructure Logs
  config.DiagnosticInfrastructureLogs.BufferQuotaInMB = 20;
  config.DiagnosticInfrastructureLogs.ScheduledTransferLogLevelFilter = LogLevel.Verbose;
  config.DiagnosticInfrastructureLogs.ScheduledTransferPeriod = TimeSpan.FromMinutes(10);
```

La mise en place de celui-ci en mode verbeux est très bien pour les démonstrations ou pour les blogs, néanmoins je vous le déconseille pour de la production, car celui-ci est très verbeux (279 entrées en 1min)

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img1.png "image")

Celui-ci donc va nous créer une table WADDiagnosticInfrastructure qui va contenir les différentes informations autour de l’infrastructure de vos rôles, tel que le lancement des services, initialisation des configurations …  Et vous avez aussi l’information triée par rôle et instance !

Bon et à 279 logs en 1 min … vous comprenez l’utilité d’un outil comme Azure Diagnostics Manager (en passant, je n’ai pas d’actions chez Cerebrata ….)

## Performance Counters

Avec ce compteur, il est possible de logguer presque tout, on va donc dans notre exemple récupérer uniquement le temps processeur

```csharp
  config.PerformanceCounters.BufferQuotaInMB = 5;
  config.PerformanceCounters.DataSources.Add(
      new PerformanceCounterConfiguration()
          {
              CounterSpecifier = @"\\Processor(_Total)\\% Processor Time",
              SampleRate = TimeSpan.FromSeconds(10)
          });
  config.PerformanceCounters.ScheduledTransferPeriod = TimeSpan.FromMinutes(1);
```

Petit bémol avec ce compteur, il est impossible de voir le contenu de la table dans Azure Storage Explorer à cause d’une erreur interne. Vous pouvez utiliser AzureXplorer, une extension de Visual Studio bien pratique.

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img2.png "image")

On voit donc que l’on récupère les informations, et il est facilement possible de trier par type de compteur. Si vous voulez connaitre les différents compteurs de performance, en voici une liste : [http://blogs.msdn.com/b/avkashchauhan/archive/2011/04/01/list-of-performance-counters-for-windows-azure-web-roles.aspx](http://blogs.msdn.com/b/avkashchauhan/archive/2011/04/01/list-of-performance-counters-for-windows-azure-web-roles.aspx)

## Windows Event Logs

Passons maintenant au journal des évènements de vos machines hébergeant vos rôles, car il est aussi possible de les récupérer. Lorsque l’on parle des journaux d’évènement de votre rôle, il faut bien entendu se rappeler que votre rôle se trouvant sur une machine tournant avec un système d’exploitation équivalent à Windows Serveur 2008 R2 à ce jour. Il est donc possible de le consulter en Remote, et d’avoir une interface similaire à celle-ci

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img3.png "image")

Commençons par l’implémentation de ce dernier, on peut voir ci dessous que nous avons une déclaration classique de diagnostics Azure.

```csharp
  config.WindowsEventLog.BufferQuotaInMB = 10;
  config.WindowsEventLog.DataSources.Add("Application!*");
  config.WindowsEventLog.ScheduledTransferLogLevelFilter = LogLevel.Verbose;
  config.WindowsEventLog.ScheduledTransferPeriod = TimeSpan.FromMinutes(1);
```

Concernant les sources  de données disponibles, c’est tout simplement le nom de vos Event Logs suivis de “!*”, dans notre exemple nous avons utilisé celui de l’application qui est le plus représentatif à mon sens.

Bon et maintenant que nous savons logguer, regardons où cela se trouve dans notre storage Windows Azure, alors une fois n’est pas coutume, on retrouve ces informations dans une Table, on va donc prendre Azure Storage Explorer pour regarder le contenu de notre table WADWindowsEventLogsTable

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img4.png "image")

Je rappelle que je suis sur mon émulateur pour écrire cet article, et donc j’ai de la pollution au sein de mon Event Log, comme on peut le voir sur la capture ci-dessus.

On remarquera qu’il stocke l’entrée du log dans un XML, ainsi il est facilement possible de le récupérer pour le réutiliser dans vos lecteurs de logs que vous utilisez actuellement !

## Failed Request Logs IIS

Passons maintenant aux requêtes IIS qui échouent sur notre application Web, pour cela, on va définir ce que l’on considère comme une requête échouée pour notre application. Pour cela, rien de plus simple, c’est exactement comme dans une application OnPremise, il suffit d’ajouter dans la configuration ceci :

```xml
  <tracing>
    <traceFailedRequests>
      <add  path="*">
        <traceAreas>
                      <add  provider="ASP"  verbosity="Verbose" />
                      <add  provider="ASPNET"  areas="Infrastructure,
                           Module,
                           Page,
                           AppServices"  verbosity="Verbose" />
                      <add  provider="ISAPI Extension"  verbosity="Verbose" />
                      <add  provider="WWW Server"  areas="Authentication,
                           Security,
                           Filter,
                           StaticFile,
                           CGI,
                           Compression,
                           Cache,
                           RequestNotifications,
                          Module"  verbosity="Verbose" />
        </traceAreas>
        <failureDefinitions  timeTaken="00:00:30"  statusCodes="400-599" />
      </add>
    </traceFailedRequests>
  </tracing>
```

Ici, nous avons un ajout de trace très complet, il faut bien entendu le définir juste selon vos besoins pour votre application. Vous pouvez voir aussi une définition de requête échouée si l’affichage d’une page prend plus de 30 secondes dans mon cas, bien entendu 10 sec c’est très peu, mais pour notre test cela suffit amplement. L’avantage d’ajouter un time comme celui-ci est que vous pouvez rapidement voir vos pages “lentes” sans pour autant obtenir des pages d’erreur pour l’utilisateur.

Notez par ailleurs qu’il est possible de configurer cette trace via votre IIS, grâce à cette option :

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img5.png "image")

Bon bien entendu, cela ne suffit pas pour logger, il faut aussi activer l’option de remonter des logs dans notre Storage, pour cela rien de plus simple, il suffit d’ajouter ce code dans la déclaration des diagnostics.

```csharp
  config.Directories.BufferQuotaInMB = 20;
  config.Directories.ScheduledTransferPeriod = TimeSpan.FromMinutes(5);
```

On va contrairement aux autres logs, voir ceux-ci ajouter dans le Blob Storage, comme on peut le voir ci dessous  :

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img6.png "image")

On peut voir qu’il s’agit de fichier XML, lorsque nous les téléchargeons et les ouvrons dans un navigateur Web, nous pouvons voir une interface connu par tous les développeurs Web ASP.Net :

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img7.png "image")

Il est donc possible de récupérer des informations sur les requêtes échouées, afin de les analyser par la suite.

## IIS Log Files

Passons maintenant aux Logs IIS, qui récupère les Logs IIS de vos Web Role, par défaut elles sont récupérés par les diagnostics, à partir d’un moment où l’on a activé le log des dossiers, que l’on a activé lors de l’explication des Log-Failed-Request.

Il est possible de voir ces logs, dans le Blob Storage, comme on peut le voir ci-dessous.

![image]({{ site.url }}/images/2012/03/02/configurer-les-diagnostiques-sur-windows-azure-img8.png "image")

## Crash Dumps

Pour activer les Crash Dumps, il vous suffit d’ajouter le code suivant lors de votre déclaration de diagnostics :

```csharp
  // Crash Dump
  CrashDumps.EnableCollection(true);
```

Ainsi, vous allez pouvoir récupérer vos différents Crash via ce logs. Celui-ci est très peu utile pour ce qui concerne les Web Roles, car en effet, le serveur IIS est déjà couvert par l’ensemble des autres logs. Donc son implémentation pour une application Web n’est pas nécessaire, par contre je vous la conseille pour un Worker Role.

Voilà donc un petit tour des différents diagnostics disponibles sur Windows Azure, je vais tâcher de vous donner d’autres astuces avec les diagnostiques comme créer des compteurs de performances customisables, ou ajouter des dossiers dans le Blob Storage afin de récupérer des logs
