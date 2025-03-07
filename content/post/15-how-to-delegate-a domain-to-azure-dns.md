+++
author = "Benoit G"
title = "How to delegate a domain to Azure DNS"
date = "2024-11-06"
description = ""
toc = true
tags = [
    "DNS"
]
categories = ["Azure"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/rest-api.jpeg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

## 1. Contexte
---

Je possède un nom de domaine benoitgaumard.fr qui permet d’afficher le site que vous visitez 🙂

La gestion de la zone DNS pour ce domaine est effectuée par le registrar chez qui j’ai acheté le nom de domaine, en l’occurrence OVH.

Si je me connecte à l’interface OVH, je peux gérer ma zone DNS et y ajouter n’importe quel type d’enregistrement (A, CNAME, NS, MX, TXT, etc) en cas de besoin.

Pour différentes applications hébergées dans Azure, j’ai régulièrement besoin de créer de nouvelles entrées, afin que mes applications puissent s’afficher avec un nom de domaine de type : http://monapp1.benoitgaumard.fr, http://monapp2.benoitgaumard.fr, etc


Pour cela je dois donc effectuer la configuration en allant dans deux interfaces différentes (Portails), celui d’Azure : https://portal.azure.com et celui d’OVH : https://www.ovh.com/manager

Le but de cet article est de montrer comment centraliser la gestion de cette zone dans Azure DNS en faisant une délégation de zone.

## 2. Création d’une nouvelle zone DNS publique dans Azure
---

Azure DNS vous permet d’héberger une zone DNS et de gérer les enregistrements DNS pour un domaine dans Azure. Pour que les requêtes DNS d’un domaine atteignent Azure DNS, le domaine doit être délégué à Azure DNS à partir du domaine parent. Azure DNS n’est pas le bureau d’enregistrement (Registrar) de ce domaine.

Se connecter au portail Azure et rechercher DNS Zone dans le Marketplace.
Cliquer Sur Create.
Spécifier un resource group existant ou en créer un nouveau.
Dans le champs Name indiquer le nom de la zone DNS à créer.
Choisir l’emplacement du groupe de resource (West Europe)
Ajouter des Tags si nécéssaire
Cliquer sur Create

Note: Pour information Azure vous autorise à créer n’importe quel nom de zone (Ex : Microsoft.com, Google.fr, toto.local) même si vous n’êtes pas le propriétaire. Cependant pour la gérer et ajouter de nouveaux enregistrements il faut en être le propriétaire.

Pour gérer la zone, Azure met à disposition par défaut 4 Name Server (NS) afin d’assurer une redondance en cas de panne.

Note: Copier les noms des serveurs NS dans un coin, ils serviront pour effectuer la délégation dans le portail OVH.

## 3. Déléguer le domaine
---

Maintenant que la zone DNS est créée et que nous disposons des serveurs de noms, il faut mettre à jour le domaine parent avec les serveurs de noms Azure DNS. Chaque bureau d’enregistrement (registrar) a ses propres outils (Portail, etc) de gestion DNS pour modifier les enregistrements de serveur de noms pour un domaine.

- Retourner dans le portail OVH.
- Aller dans le menu DNS Servers.
- Supprimer les entrées de type NS OVH.
- Ajouter les 4 serveurs NS Azure (Supprimer le point final).
- Cliquer sur Apply Configuration.

Note: Attention vos sites et services associés à votre nom de domaine (mail, ftp,etc) ne seront plus accessibles le temps de la manipulation.

## 4. Créer les enregistrements DNS
---

Maintenant Azure DNS est en charge de gérer cette zone, il va donc falloir recréer les enregistrement adéquats (A, CNAME, NS, MX, TXT, etc) afin que le service revienne à la normale et que votre si web s’affiche par exemple.

Pour que mon site s’affiche, le premier enregistrement à créer dans Azure DNS est un enregistrement de type A pointant vers l’IP publique de mon site web fournie par OVH.

Dans Azure DNS, cliquer sur Record set.

- Laisser le champs Name vide ou taper @ (Correspond à la racine du site).
- Sélectionner un enregistrement de type A.
- Laisser le TTL par défaut.
- Ajouter l’adresse IP publique du site web.

Une fois l’entrée nous obtenons ceci :


Nous allons maintenant crée une entrée www de type CNAME qui pointe vers la racine du site.

## 5. Tester la délégation
---

Une fois la délégation effectuée, vous pouvez vérifier qu’elle fonctionne à l’aide d’un outil tel que nslookup pour interroger la zone. Vous devrez peut-être patienter 10 minutes ou plus une fois la délégation effectuée avant de pouvoir vérifier qu’elle fonctionne. La propagation des modifications dans le système DNS peut prendre du temps.

Il est inutile de spécifier les serveurs de noms Azure DNS. Si la délégation est correctement configurée, le processus de résolution DNS normal détecte automatiquement les serveurs de noms Azure.


À partir d’une invite de commandes, saisir la commande nslookup comme dans l’exemple suivant :

nslookup -type=SOA benoitgaumard.fr
Vérifier que la réponse ressemble à la sortie nslookup suivante :


Pour afficher les serveurs de noms, taper la commande suivante :

nslookup -type=NS benoitgaumard.fr
Vérifier que la réponse ressemble à la sortie nslookup suivante :

Autre test avec un enregistrement de type www :

Le site est maintenant joignable via les 2 urls et la gestion des entrées DNS s’effectue directement dans le portail Azure.

Note: Conseil ajoutez un lock de type Delete sur votre resource group DNS afin déviter que celui-ci ne soit supprimé accidentellement.

Enjoy !