---
layout: post
title: Azure Private Endpoint - Et si on jetait un oeil à la résolution DNS
date: 2024-03-12
categories: [ "Azure", "Network", "Private Endpoint" ]
comments_id: 179 
---

Cela fait un moment que je me dis que la gestion des private Endpoints sur Azure ce n'est pas si trivial que cela. Selon moi la documentation Azure peut vous induire en erreur en vous faisant croire que cela va résoudre tous vos problèmes d'accès à vos ressources, de sécurité, et j'en passe, et le tout avec quelques clics de Azure.

Je me suis donc décidé à vous écrire plusieurs articles pour vous aider à utiliser les private endpoint sur Azure de la manière la plus sereine possible.
On va donc voir dans ces articles les sujets suivants :

- Les différents use cases pour accéder à vos Private Endpoints
- La sécurisation de vos Private Link via Azure Policy

Et si bien entendu vous pensez qu'un autre sujet mérite d'être creusé il y a les commentaires pour cela.

Avant de commencer, j'ai partagé tous les scripts que j'utilise dans ce [repository Github](https://github.com/wilfriedwoivre/LabPrivateLink), n'hésitez pas à contribuer, et n'oublier pas de bien supprimer vos ressources dès que vous avez fini vos tests.

On va commencer par les basiques à savoir la résolution DNS de votre Private Endpoint depuis votre compute lorsque est dans une architecture très basique. Il nous faut donc :

- 1 virtual network
- 1 private DNS Zone pour votre private endpoint (ici: privatelink.blob.core.windows.net)
- 1 storage
- 1 Virtual Machine

Cela nous donne donc le schéma suivant :

![image]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img0.png)

Ici en terme de configuration, on va garder les éléments le plus standard possible, à savoir la configuration DNS de notre Virtual Network à **Default (Azure Provided)**, comme ci-dessous :

![alt text]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img1.png)

La mise en place de cette configuration indique qu'on va utiliser le DNS Azure pour résoudre toutes nos routes, y compris celle pour résoudre l'adresse de mon blog [https://woivre.fr](https://woivre.fr) ou celle pour résoudre à votre private endpoint.

![alt text]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img2.png)

Donc en terme de flux lorsqu'on veut résoudre notre private endpoint on fait donc les étapes suivantes :

![alt text]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img3.png)

- 1 - Requête DNS pour le blob storage **mystorage.blob.core.windows.net**
- 2 - Réponse DNS : **CNAME mystorage.privatelink.blob.core.windows.net**
- 3 - Requête DNS pour l'adresse **mystorage.privatelink.blob.windows.net**
- 4 - Réponse DNS : **A 10.0.0.4 mystorage.privatelink.blob.windows.net**
- 5 - Connexion à notre blob storage via son private endpoint

Lorsqu'on fait notre nslookup, nous avons donc le résultat suivant :

```bash
[Run cmd]
nslookup labprivatelinkgi7jjcx.blob.core.windows.net
Enable succeeded: 
[stdout]
Server:		127.0.0.53
Address:	127.0.0.53#53

Non-authoritative answer:
labprivatelinkgi7jjcx.blob.core.windows.net	canonical name = labprivatelinkgi7jjcx.privatelink.blob.core.windows.net.
Name:	labprivatelinkgi7jjcx.privatelink.blob.core.windows.net
Address: 10.0.0.4
```

Cependant tout est une question de DNS ici, si l'on passe par un DNS autre, on obtient un tout autre résultat

```bash
[Run cmd]
nslookup labprivatelinkgi7jjcx.blob.core.windows.net 8.8.8.8
Enable succeeded: 
[stdout]
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
labprivatelinkgi7jjcx.blob.core.windows.net	canonical name = labprivatelinkgi7jjcx.privatelink.blob.core.windows.net.
labprivatelinkgi7jjcx.privatelink.blob.core.windows.net	canonical name = blob.ams09prdstr13a.store.core.windows.net.
Name:	blob.ams09prdstr13a.store.core.windows.net
Address: 20.60.222.129
```

D'un point de vue de la résolution DNS, notre Storage est bien toujours présent lorsqu'on fait des DNS lookup, cela n'influe en rien si notre storage est accessible depuis l'extérieur ou non.
Pour bloquer l'accès depuis l'extérieur, il faudra bien penser à choisir la bonne option dans la partie networking de votre Storage.

Maintenant que la partie simple est abordée, regardons comment exposer notre storage account à un client extérieur, qui peut être sur Azure ou sur toute autre infrastructure. On aura donc le schéma suivant :

![alt text]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img4.png)

En terme de résolution DNS on aura donc quelque chose de très simple depuis notre client B qui est la même que lorsque nous avons tenté de résoudre notre domaine depuis le DNS de Google. Je ne vais pas donc détailler plus ce point là.

Notre dernier use case que nous allons aborder est le cas où vos deux clients ont un setup de private dns zone qui lui est propre, mais que le customer B a besoin d'appeler le customer A via son adresse publique comme on peut le voir sur le schéma ci-dessous.

![alt text]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img5.png)

Si on retente les mêmes commandes de nslookup, nous allons voir qu'il y a un soucis lorsqu'on utilise le DNS fourni par Microsoft:

```bash

[VM]
vm
[Run cmd]
nslookup labprivatelink7ev3eoy.blob.core.windows.net
Enable succeeded: 
[stdout]
Server:		127.0.0.53
Address:	127.0.0.53#53

** server can't find labprivatelink7ev3eoy.blob.core.windows.net: NXDOMAIN


[stderr]

------------------------------------------
[VM]
vm
[Run cmd]
nslookup labprivatelink7ev3eoy.blob.core.windows.net 8.8.8.8
Enable succeeded: 
[stdout]
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
labprivatelink7ev3eoy.blob.core.windows.net	canonical name = labprivatelink7ev3eoy.privatelink.blob.core.windows.net.
labprivatelink7ev3eoy.privatelink.blob.core.windows.net	canonical name = blob.ams09prdstr07a.store.core.windows.net.
Name:	blob.ams09prdstr07a.store.core.windows.net
Address: 20.60.223.100


[stderr]

------------------------------------------
```

Depuis les DNS de Google, nous n'avons pas de soucis, mais depuis le Azure Recursive Resolver cela ne fonctionne pas, car si l'on reprend le schéma suivant:

![alt text]({{ site.url }}/images/2024/03/12/azure-private-endpoint-et-si-on-jetait-un-oeil-a-la-resolution-dns-img3.png)

Lors de l'étape 2, Azure nous renvoie un CNAME vers le private link que mon client B n'a pas. Ce scénario est valable que vous soyez dans la même souscription, le même tenant, ou le même environnement Azure, donc dans 99% des cas. La seule exception est si un de vos deux clients utilisent Azure China par exemple.

Pour résoudre cela, il existe plusieurs moyens:

- Ajouter un private endpoint depuis votre client B vers le storage de votre client A et de renseigner l'ip de son private endpoint dans votre private dns zone.
- Utiliser un DNS resolver personnalisé, sur des VMs par exemple pour résoudre ce DNS explicitement via Google, et le reste via le Azure Recursive Resolver.
- Mettre en place un Azure DNS resolver chez votre client B pour résoudre ce DNS via Google.
- Dans la série des mauvaises idées, vous pouvez toujours mettre à jour les fichiers hosts de tous les assets du client B qui ont besoin d'utiliser le storage et mettre l'ip public du storage (mais elle peut changer)

Si on choisit l'option Azure DNS resolver, notre client B doit mettre en place un ruleset pour accéder au storage de notre client A.
Ce ruleset aura la configuration suivante

```bicep
resource rule 'Microsoft.Network/dnsForwardingRulesets/forwardingRules@2022-07-01' = {
  parent: ruleset
  name: '${deployment().name}-google-rule'
  properties: {
    domainName: '${storageDomainName}.'
    targetDnsServers: [
      {
        ipAddress: '8.8.8.8'
      }
    ]
  }
}
```

Ce qui nous donnera au final le template ARM suivant

```json
{
    "type": "Microsoft.Network/dnsForwardingRulesets/forwardingRules",
    "apiVersion": "2022-07-01",
    "name": "dnsresolver-04-dnsresolver-customerB-ruleset/dnsresolver-04-dnsresolver-customerB-google-rule",
    "dependsOn": [
        "[resourceId('Microsoft.Network/dnsForwardingRulesets', 'dnsresolver-04-dnsresolver-customerB-ruleset')]"
    ],
    "properties": {
        "domainName": "labprivatelinkawdaptz.blob.core.windows.net.",
        "targetDnsServers": [
            {
                "ipAddress": "8.8.8.8",
                "port": 53
            }
        ],
        "forwardingRuleState": "Enabled"
    }
}
```

Et nous voyons dans notre test que la magie opère, et que nous pouvons bien résoudre l'ip de notre blob storage via Google. Mais pas celui du deuxième storage créé

```bash

[VM]
vm
[Run cmd]
nslookup labprivatelinkawdaptz.blob.core.windows.net
Enable succeeded: 
[stdout]
Server:		127.0.0.53
Address:	127.0.0.53#53

Non-authoritative answer:
labprivatelinkawdaptz.blob.core.windows.net	canonical name = labprivatelinkawdaptz.privatelink.blob.core.windows.net.
labprivatelinkawdaptz.privatelink.blob.core.windows.net	canonical name = blob.ams09prdstr13c.store.core.windows.net.
Name:	blob.ams09prdstr13c.store.core.windows.net
Address: 20.209.10.97


[stderr]

------------------------------------------
[VM]
vm
[Run cmd]
nslookup labprivatelinkawdaptz.blob.core.windows.net 8.8.8.8
Enable succeeded: 
[stdout]
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
labprivatelinkawdaptz.blob.core.windows.net	canonical name = labprivatelinkawdaptz.privatelink.blob.core.windows.net.
labprivatelinkawdaptz.privatelink.blob.core.windows.net	canonical name = blob.ams09prdstr13c.store.core.windows.net.
Name:	blob.ams09prdstr13c.store.core.windows.net
Address: 20.209.10.97


[stderr]

------------------------------------------
[VM]
vm
[Run cmd]
nslookup labprivatelinkr6lcrfw.blob.core.windows.net
Enable succeeded: 
[stdout]
Server:		127.0.0.53
Address:	127.0.0.53#53

** server can't find labprivatelinkr6lcrfw.blob.core.windows.net: NXDOMAIN


[stderr]

------------------------------------------
[VM]
vm
[Run cmd]
nslookup labprivatelinkr6lcrfw.blob.core.windows.net 8.8.8.8
Enable succeeded: 
[stdout]
Server:		8.8.8.8
Address:	8.8.8.8#53

Non-authoritative answer:
labprivatelinkr6lcrfw.blob.core.windows.net	canonical name = labprivatelinkr6lcrfw.privatelink.blob.core.windows.net.
labprivatelinkr6lcrfw.privatelink.blob.core.windows.net	canonical name = blob.ams20prdstr15a.store.core.windows.net.
Name:	blob.ams20prdstr15a.store.core.windows.net
Address: 20.209.108.75


[stderr]

------------------------------------------
```

A savoir que ce genre de problème ne se pose pas qu'avec différents clients. Au sein d'une même souscription, si vous avez un storage publique et que vous le connectez via un Managed Private Endpoint à une instance de Synapse vous aurez le même comportement, et il faudra jouer sur les DNS ou passer sur une solution de private endpoints.
