---
layout: post
title: Intégrer Event Grid dans vos applications
date: 2018-12-13
categories: [ "Azure", "Event Grid" ]
comments_id: 156 
---

Il existe de nombreux services de messaging sur Azure, qui ont chacun leur propre cas d'utilisation. Pour ma part j'utilise de plus en plus Event Grid pour monitorer ma plateforme Azure, car il offre les avantages suivants :

- Evènement déclenché rapidement après l'action
- Intégration Azure Function
- Intégration Logic Apps
- Possibilité d'avoir des évènements personnalisés.

Le premier point pour moi est important, car si je prends le cas d'usage alerting décrit dans la documentation, il s'agit le plus souvent d'une mise en place d'alerte suite à l'analyse de données ingérées via Log Analytics, ce qui ne me convient pas toujours en terme de délai, car on peut rapidement arriver à 15 min de latence, alors que je peux être à moins d'1 minute via Event Grid.

Nous allons voir comment mettre en place le dernier point dans une application C#. Pour cela dans le portail, nous allons créer un objet de type **Event Grid Topic**

Outre les informations typiques, il vous est demandé de choisir entre **Event Grid Schema** et **Cloud Event Schema**

Event Grid est un produit made by Microsoft, avec un schéma spécifique, alors qu'un Cloud Event doit respecter une spécification qu'on peut retrouver ici : [https://github.com/cloudevents/spec/blob/master/json-format.md](https://github.com/cloudevents/spec/blob/master/json-format.md)

Voici le schéma pour **Event Grid** :

```json
[
  {
    "id": string,
    "eventType": string,
    "subject": string,
    "eventTime": string-in-date-time-format,
    "data":{
      object-unique-to-each-publisher
    },
    "dataVersion": string
  }
]
```

Ici, nous allons utiliser le schéma Event Grid en créant un object C# qui correspond à un item de ce schéma :

```csharp
public class GridEvent<T> where T : class
{
 public string Id { get; set; }
 public string EventType { get; set; }
 public string Subject { get; set; }
 public DateTime EventTime { get; set; }
 public T Data { get; set; }
 public string DataVersion { get; set; }
}
```

Sous Linqpad, j'utilise le script suivant pour envoyer un message sur mon topic Event Grid :

```csharp
private const string Key = "GnXsbgmdlfklqzrjz/ddsfj="; 
private const string Endpoint = "https://demo-eg.westeurope-1.eventgrid.azure.net/api/events";

async Task Main()
{
 HttpClient client = new HttpClient();
 client.DefaultRequestHeaders.Add("aeg-sas-key", Key);
 
 var events = new [] {
  new GridEvent<object>() {
   Id = Guid.NewGuid().ToString(),
   EventType = "CustomEventGrid.Demo",
   Subject = "Test me !",
   EventTime = DateTime.UtcNow,
   Data = null,
   DataVersion = "0.1"
  }
 };
 
 string jsonData = JsonConvert.SerializeObject(events);

 HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, Endpoint)
 {
  Content = new StringContent(jsonData, Encoding.UTF8, "application/json")
 };

 HttpResponseMessage response = await client.SendAsync(request);
}
```

J'ai mis en place une Azure Function qui lira mes messages postés sur mon topic Event Grid assez simplement comme on peut le voir ci-dessous :

```csharp
#r "Microsoft.Azure.EventGrid"
#r "Newtonsoft.Json"

using Newtonsoft.Json;
using Microsoft.Azure.EventGrid.Models;

public static void Run(EventGridEvent eventGridEvent, ILogger log)
{
    var evt = JsonConvert.SerializeObject(eventGridEvent);

    log.LogInformation(evt);
}
```

Voici un log de démo :

```bash
2018-10-29T15:59:04.485 [Information] {"id":"3a6cd1ed-a4ea-4eb5-8f4c-05a4388842df","topic":"/subscriptions/e7bd1bb5-e9af-49c7-b5aa-ac09992fdfeb/resourceGroups/eventgrid-test/providers/Microsoft.EventGrid/topics/demo-eventgrid","subject":"Test me !","data":null,"eventType":"CustomEventGrid.Demo","eventTime":"2018-10-29T15:59:06.0856579Z","metadataVersion":"1","dataVersion":"0.1"}
```

On peut donc voir ici qu'entre l'envoi du message et la lecture de celui-ci, l'opération est de moins de 2 secondes. Ce qui peut être utile quand vous souhaitez avoir un système extrêmement réactif.
