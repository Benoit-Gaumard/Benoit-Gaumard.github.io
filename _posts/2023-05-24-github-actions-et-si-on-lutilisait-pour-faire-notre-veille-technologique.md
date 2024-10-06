---
layout: post
title: Github Actions - Et si on l'utilisait pour faire notre veille technologique
date: 2023-05-24
categories: [ "Divers", "Github Actions" ]
comments_id: 176 
---

De nos jours faire sa veille technologique peut être compliqué, il y a plein de sources d'informations, de blogs, de sites, de réseaux sociaux, de newsletters, de podcasts, de vidéos, etc. Et il faut faire le tri, trouver les informations pertinentes, les lire, les comprendre, les analyser, etc. Et tout cela prend du temps, beaucoup de temps.

Et si en plus vous souhaitez partager votre veille sur Twitter ou tout autre réseau social, cela vous prendra encore plus de temps.

Et si on automatisait tout cela ?

Alors oui, mon but est bien de partager sur Twitter les articles que je lis, cependant je ne veux pas partager tous les articles des flux RSS que je suis.

Pour cela j'avais fait une première version grâce à Azure. Celle ci était basé sur des composants Serverless tel que Azure Functions, Azure Logic Apps, et un Azure Table Storage pour stocker les informations que j'avais besoin.

Le workflow était le suivant :

- **Azure Functions** : Quotidiennement, une fonction se déclenche et va lire tous les flux RSS que je suis, et qui va stocker les nouveaux articles dans un Azure Table Storage.
- **Azure Logic Apps** : Tous les matins, je reçois un mail avec tous les articles, et pour chacun un lien pour *Publier* ou *ignorer* l'article.
- **Azure Function** : Régulièrement en semaine, je publie un article sur Twitter parmi ceux que je souhaite. Bien entendu le plus vieux en premier.
- **Azure Function**: Toutes les semaines, une purge des vieux articles est effectuée afin de ne pas dépenser de l'argent pour rien.

Cette solution était très bien, cependant elle avait un coût, et je ne pouvais pas la partager à tout le monde sans le prérequis d'avoir un compte Azure.

J'ai donc décidé d'utiliser Github Action pour faire la même chose, et de partager le code sur Github.

Vous pouvez le retrouver [ici même](https://github.com/wilfriedwoivre/feedly)

Le workflow est le suivant :

- **Github Actions** : Quotidiennement, une action se déclenche et va lire tous les flux RSS que je suis, et qui va stocker les nouveaux articles dans un fichier CSV. Et pour chaque article je vais créer une issue sur mon repository.
- **Github Actions** : Tous les matins, je regarde les issues ouvertes et je les tag pour les publier au cours de la journée.
- **Github Actions** : Régulièrement en semaine, je publie un article sur Twitter parmi ceux que je souhaite. Bien entendu le plus vieux en premier.

Pour réaliser tout cela, j'ai créé un certains nombre d'actions custom en python. Commençons par la plus importante, la construction de la matrice pour lire tous mes flux RSS sans pour autant changer la définition de mes workflows.

Voici la définition dans mon worflow :

```yaml
    - name: matrix-builder
      id: matrix-builder
      uses: ./.github/actions/build-matrix
```

Et comment je construis ma matrice en python :

```python
    matrixOutput =  "matrix={\"include\":["
    
    for item in sources:
        if (to_bool(item.isActive)):
            matrixOutput += "{\"FeedName\":\""+item.siteName+"\", \"FeedLink\":\""+item.link+"\", \"FeedType\":\""+item.type+"\", \"Prefix\":\""+item.prefix+"\", \"Suffix\":\""+item.suffix+"\"},"

    matrixOutput = matrixOutput[:-1]
    matrixOutput += "]}"
    
    with open(os.environ["GITHUB_OUTPUT"], "a") as output:
        output.write(f"{matrixOutput}\n")
```

Après je peux l'utiliser à mon gré dans mon worflow commee cela

{% raw %}

```yaml
  read-rss:
    needs:
      - generate-matrix
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      max-parallel: 1
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}

    steps:
    - uses: actions/checkout@v3

    - name: read-rss
      id: read-rss
      uses: ./.github/actions/readrss
      env:
        FeedName: ${{ matrix.FeedName }}
        FeedLink: ${{ matrix.FeedLink }}
        FeedType: ${{ matrix.FeedType }}
        AutoPublish: ${{ matrix.AutoPublish }}
        FeedPrefix: ${{ matrix.Prefix }}
        FeedSuffix: ${{ matrix.Suffix }}
        GithubRepository: ${{ github.repository }}
        GithubToken: ${{ secrets.GITHUB_TOKEN }}
```

{% endraw %}

Et voici le résultat dans mon workflow :

![image]({{ site.url }}/images/2023/05/24/github-actions-et-si-on-lutilisait-pour-faire-notre-veille-technologique-img0.png "image")

Et voilà comment j'ai utiliser un outil tel que Github Action pour pouvoir faire ma veille technologique et la partager sur Twitter, et aussi vous partager comment je fais cela.
