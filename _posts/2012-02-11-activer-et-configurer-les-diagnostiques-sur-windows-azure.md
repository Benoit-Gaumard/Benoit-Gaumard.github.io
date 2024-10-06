---
layout: post
title: Activer et configurer les diagnostiques sur Windows Azure
date: 2012-02-11
categories: [ "Monitoring", "Azure" ]
comments_id: 78 
---

Comme vous le savez sur Windows Azure, il est possible d’activer des diagnostiques afin que les erreurs ou les informations relatives à l’application soit conservées quelques part. Si par hasard vous avez déjà effectué une recherche sur comment mettre en place les diagnostiques dans Windows Azure, vous allez rapidement vous trouvez demande une multitude de résultat qui sont très fournis, mais qui selon moi sont justement trop fournis, ce qui entraine dans bien des cas un abandon de l’utilisation de cette API et la mise en place d’un développement spécifique afin de logguer les informations que l’on souhaite. Après tout, faire un peu de code spécialisé pour écrire dans une Table du Table Storage ce n’est pas insurmontable, et c’est relativement rapide à implémenter.

## Activation des diagnostiques pour Windows Azure

Dans Visual Studio, il vous suffit d’aller dans la configuration de votre rôle, dans mon cas un Web Role et d’activer les diagnostics :

![image]({{ site.url }}/images/2012/02/11/activer-et-configurer-les-diagnostiques-sur-windows-azure-img0.png "image")

Et là pour commencer, deux questions se posent : Qu’est ce que cela me logge comme diagnostics ? Où je sauvegarde mes données, dans quel Table Storage ?

Alors commençons par la deuxième question, ici je stocke le tout dans mon storage local (il est assez difficile de faire des tests sur Windows Azure dans le train …), mais on est en droit de se poser la question afin de savoir s’il vaut mieux que j’utilise le même storage que celui de mon application, un à part ou alors un commun à tous mes projets Windows Azure.

J’ai personnellement opté pour la troisième solution, premièrement parce que je ne veux pas que mon storage utilisé par mon application soit pollué par des logs qui font alourdir mon storage et qui vont m’obliger à les récupérer afin de pouvoir les exclure par la suite, effectivement avec la sortie du [SDK 1.5, avec le support partiel de la projection](http://blog.woivre.fr/?p=587), je continue de mettre mes diagnostics à part afin d’avoir un storage dédié à cette partie. De plus l’avantage de cela, c’est qu’il est assez simple de se créer un simple Worker Role permettant de nettoyer les logs devenus obsolète. De plus, je ne souhaitais pas créer deux storages différents pour chaque création d’application, puisqu’effectivement j’utilise très souvent le Table Storage pour la création de mes applications dans Windows Azure.

La deuxième question, je propose de lancer mon application de test afin de voir ce que cela nous créer dans notre Table Storage. Alors, il nous crée un container, ainsi qu’un blob comme on peut le voir via un outil comme Azure Storage Explorer

![image]({{ site.url }}/images/2012/02/11/activer-et-configurer-les-diagnostiques-sur-windows-azure-img1.png "image")

Si on regarde le contenu du fichier XML de déploiement, on peut apercevoir ceci :

```xml
  <?xml  version="1.0"?>
  <ConfigRequest  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"  xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <DataSources>
      <OverallQuotaInMB>4080</OverallQuotaInMB>
      <Logs>
        <BufferQuotaInMB>0</BufferQuotaInMB>
        <ScheduledTransferPeriodInMinutes>0</ScheduledTransferPeriodInMinutes>
        <ScheduledTransferLogLevelFilter>Undefined</ScheduledTransferLogLevelFilter>
      </Logs>
      <DiagnosticInfrastructureLogs>
        <BufferQuotaInMB>0</BufferQuotaInMB>
        <ScheduledTransferPeriodInMinutes>0</ScheduledTransferPeriodInMinutes>
        <ScheduledTransferLogLevelFilter>Undefined</ScheduledTransferLogLevelFilter>
      </DiagnosticInfrastructureLogs>
      <PerformanceCounters>
        <BufferQuotaInMB>0</BufferQuotaInMB>
        <ScheduledTransferPeriodInMinutes>0</ScheduledTransferPeriodInMinutes>
        <Subscriptions />
      </PerformanceCounters>
      <WindowsEventLog>
        <BufferQuotaInMB>0</BufferQuotaInMB>
        <ScheduledTransferPeriodInMinutes>0</ScheduledTransferPeriodInMinutes>
        <Subscriptions />
        <ScheduledTransferLogLevelFilter>Undefined</ScheduledTransferLogLevelFilter>
      </WindowsEventLog>
      <Directories>
        <BufferQuotaInMB>0</BufferQuotaInMB>
        <ScheduledTransferPeriodInMinutes>0</ScheduledTransferPeriodInMinutes>
        <Subscriptions>
          <DirectoryConfiguration>            <Path>C:\\Users\\Will\\AppData\\Local\\dftmp\\Resources\\e00c8958-9ea1-4547-93eb-b00ce051e354\\directory\\DiagnosticStore\\FailedReqLogFiles</Path>
           <Container>wad-iis-failedreqlogfiles</Container>
            <DirectoryQuotaInMB>1024</DirectoryQuotaInMB>
          </DirectoryConfiguration>
          <DirectoryConfiguration>            <Path>C:\\Users\\Will\\AppData\\Local\\dftmp\\Resources\\e00c8958-9ea1-4547-93eb-b00ce051e354\\directory\\DiagnosticStore\\LogFiles</Path>
            <Container>wad-iis-logfiles</Container>
            <DirectoryQuotaInMB>1024</DirectoryQuotaInMB>
          </DirectoryConfiguration>
          <DirectoryConfiguration>            <Path>C:\\Users\\Will\\AppData\\Local\\dftmp\\Resources\\e00c8958-9ea1-4547-93eb-b00ce051e354\\directory\\DiagnosticStore\\CrashDumps</Path>
            <Container>wad-crash-dumps</Container>
            <DirectoryQuotaInMB>1024</DirectoryQuotaInMB>
          </DirectoryConfiguration>
        </Subscriptions>
      </Directories>
    </DataSources>
    <IsDefault>true</IsDefault>
  </ConfigRequest>
```

Ce fichier correspond donc à la configuration des diagnostiques activées, c’est donc celle par défaut lorsqu’on les active. On peut voir que ça ne logge absolument rien d’intéressant, cependant on peut voir les différentes informations que l’on peut récolter qui sont les suivantes :

* Windows Azure Logs (Logs)
  * Collecté par défaut, stocke les informations du Trace Listener.
  * Web Role, Worker Role
* Windows Azure Diagnostics Infrastructure Logs (DiagnosticInfrastructureLogs)
  * Collecté par défaut, stocke les informations liés à l’infrastructure de Windows Azure, donc les informations liés aux connexions à distance par exemple
  * Web Role, Worker Role
* Performance Counters (PerformanceCounter)
  * Collecte les informations liés aux performances du système, tel que la quantité de RAM utilisé, l’espace de stockage restant …
  * Web Role, Worker Role
* Windows Event Logs (WindowsEventeLog)
  * Collecte les informations contenus dans l’observateur d’évènement du Windows hébergeant votre rôle
  * Web Role, Worker Role
* Failed Request Logs IIS (Directories\\Subscriptions\\DirectoryConfiguration\\Container \[wad-iis-failedreqlogfiles\])
  * Collecte les logs de vos applications IIS, il contient notamment les informations autour des requêtes émises par votre site web (par exemple, si vous essayer d’atteindre une url qui ne pointe vers aucune page
  * Web Role
* IIS Logs (Directories\\Subscriptions\\DirectoryConfiguration\\Container \[wad-iis-logfiles\])
  * Collecte les logs IIS, il contient notamment les informations sur les requêtes vers votre site qui échouent en erreur 404, car la page voulue n’existe pas
  * Web Role
* Crash Dumps (Directories\\Subscriptions\\DirectoryConfiguration\\Container \[crash-dumps\])
  * Collecte les informations sur l’état du système, tel que les plantages
  * Web Role, Worker Role

il y a de plus une section personnalisable qui n’apparait pas dans la configuration par défaut.

* Custom Error Logs
  * Utilise le local storage pour collectionner les données personnalisées par l’utilisateur.
  * Web Role, Worker Role

A noter, qu’il est aussi possible de collecter ces informations sur des VM Roles, mais la configuration est différente que celle que nous allons voir ci dessous, c’est donc pour cela que je ne l’ai pas évoqué ci-dessus.

Nous verrons dans un article suivant, comment les implémenter dans une application de type Web Role.
