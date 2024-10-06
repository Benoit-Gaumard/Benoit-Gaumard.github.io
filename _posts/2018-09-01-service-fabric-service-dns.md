---
layout: post
title: Service Fabric - Service DNS
date: 2018-09-01
categories: [ "Azure", "Service Fabric" ]
comments_id: 145 
---

Il existe plusieurs modèles de programmation sur Service Fabric qui sont les suivants :

* Guest Executable
* Containers
* Reliable Services

Du coup il est possible de mettre tout et n'importe quoi dans Service Fabric, mais comme dans toute architecture microservices, il existe différentes problématiques dont notamment la communication entre les services.
Ceux qui ont déjà mis en place des Reliables Services, vous savez qu'il est possible d'appeler le Naming Service afin de trouver le service que l'on souhaite et communiquer avec lui. Maintenant si vous avez mis en place des Guest Exe ou des Containers, vous n'avez pas accès au naming service via le SDK, même s'il est toujours possible de le faire via les API REST de Service Fabric.

Heureusement pour vous aider, il y a les Addons Service Fabric que vous pouvez mettre en place lors de la création de votre cluster, ici il s'agit du **DNSService**

```json
 "addonFeatures": [
        "DnsService"
    ],
```

Pour le mettre en place rien de plus simple, je vais prendre un exemple simple d'une application composée de deux containers :

* Front : sfcontainerfrontsample - Une image Docker qui contient un applicatif en node.js + httpserver
* Back : sfcontainerbacksample - Une image Docker qui contient un applicatif en python + Flask

Pour le bon fonctionnement de mon application, il faut que mon application Front communique avec mon application Back. Pour réaliser cela, dans mon fichier ApplicationManifest.xml, quand je mets en place mon Service Back je lui renseigne le  DNS que je veux utiliser :

```xml
      <Service Name="sfcontainerbacksample" ServiceDnsName="pythonback">
         <StatelessService ServiceTypeName="sfcontainerbacksampleType" InstanceCount="-1">
            <SingletonPartition />
         </StatelessService>
      </Service>
```

Mon application Front peut donc maintenant appeler mon application Back comme le montre le code ci-dessous :

```js
var http = require('http')
var dns = require('dns'); 

var server = http.createServer(function (request, response) {
    var nodeName = process.env.Fabric_NodeName; 
    var ipAddress = ''; 
    var port = 8080; 
    
    dns.resolve('pythonback', function (errors, ipAddresses){
        if (errors) {
            response.end(errors.message);
        }
        else  {
            ipAddress = ipAddresses[0];

            var options = {
                host: ipAddress,
                port: port
            }; 

            callback = function(res) {
                var str = 'Python backend is running on: ';
                
                res.on('data', function (chunk) {
                    str += chunk;
                }); 

                res.on('end', function() {
                    str += "  \nNodeJs frontend is running on: ";
                    str += nodeName;
                    response.end(str);
                });
            }

            var req = http.request(options, callback); 

            req.on("error", err => {
                response.end(err.message);
            });

            req.end();
        }

    });

    request.on('error', err => {
        response.end(err.message);
    })
});
```

Voilà un service qui nous simplifie bien la vie pour la mise en place de la communication entre micro services. Il reste tout de même à mettre en place la notion de retry sur plusieurs partitions, car ici ce n'est pas ce que j'ai mis en place.
Vous verrez néanmoins à l'usage que le tableau ipAddresses n'est pas toujours trié de la même manière, donc vous n'aurez pas toujours la même instance de votre application Back qui répond.

Les sources sont ici si vous voulez faire un test chez vous, ou sur un party cluster : [https://github.com/wilfriedwoivre/meetups/tree/master/20180705/04-ServiceFabric](https://github.com/wilfriedwoivre/meetups/tree/master/20180705/04-ServiceFabric)
