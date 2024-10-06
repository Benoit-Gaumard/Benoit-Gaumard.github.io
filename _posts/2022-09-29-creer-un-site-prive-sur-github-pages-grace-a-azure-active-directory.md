---
layout: post
title: Créer un site privé sur Github Pages grâce à Azure Active Directory
date: 2022-09-29
categories: [ "Azure", "Azure Active Directory", "Github Actions" ]
comments_id: 175 
---

Github Pages est un moyen efficace et gratuit d'exposer des sites web statiques via votre repository Github.
C'est un outil très puissant et très facile à prendre en main, la preuve mes blogs sont hébergés via cette méthode.

Afin de dynamiser un peu votre site, il est compatible avec des sites web jekyll afin de faciliter l'édition de votre. Et il est bien entendu possible d'y ajouter un peu de Javascript pour toute autre action, c'est d'ailleurs comme cela que j'affiche les commentaires sur mes articles.

Maintenant selon la documentation officielle, il n'est pas possible de créer un site Web privé uniquement accessible par les membres de votre organisation, sauf si vous avez souscrit à une offre entreprise, et encore la fonctionnalité est en preview.

On va voir ici qu'il est quand même possible de faire cela simplement et gratuitement grâce à Azure Active Directory.

Pour commencer, nous allons sur notre repository Github de notre choix activer les Github Pages comme suit :

![image]({{ site.url }}/images/2022/09/29/creer-un-site-prive-sur-github-pages-grace-a-azure-active-directory-img0.png "image")

Il est préférable maintenant d'utiliser une Github Action, et non plus la manière précédente, car vous avez l'avantage de pouvoir mieux configurer notre pipeline, même si ici ce ne sera pas le cas, hormis pour déployer uniquement une sous partie de mon repository.

Voici le workflow Github Action qui sera utilisé

```yaml
# Simple workflow for deploying static content to GitHub Pages
name: Deploy static content to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["master"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow one concurrent deployment
concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  # Single deploy job since we're just deploying
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Setup Pages
        uses: actions/configure-pages@v2
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          # Upload entire repository
          path: './Github/private-website/'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

Mon site web va contenir uniquement 2 pages, une page index.html, et une page login.html, et bien entendu la première sera inaccessible tant que je ne suis pas connecté avec mon compte.

Commençons par les éléments basiques de notre page Login.html, on ajouter une balise html pour gérer les cas où javascript est désactivée

```html
<noscript>
    <meta http-equiv="refresh" content="0; URL=https://demo.woivre.com/login.html" />
</noscript>
```

On va commencer par créer une application dans notre tenant Azure Active Directory afin de gérer l'authentification à notre site.

On va bien penser à ajouter une url de redirection vers notre site.

![image]({{ site.url }}/images/2022/09/29/creer-un-site-prive-sur-github-pages-grace-a-azure-active-directory-img1.png "image")

Maintenant on va utiliser les mêmes javascript fournis par MS pour créer une SPA, à savoir ceux-ci

```js
const siteUrl = window.location.origin

const msalConfig = {
  auth: {
    clientId: "# TO BE COMPLETED #",
    authority: "https://login.microsoftonline.com/# TO BE COMPLETED #",
    redirectUri:  siteUrl + "/login.html",
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  }
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
const loginRequest = {
  scopes: ["openid", "profile", "User.Read"]
};

const myMSALObj = new Msal.UserAgentApplication(msalConfig);

function signIn() {
  myMSALObj.loginPopup(loginRequest)
    .then(loginResponse => {
      console.log('id_token acquired at: ' + new Date().toString());
      console.log(loginResponse);
      window.location.href = siteUrl;
    }).catch(error => {
      console.log(error);
    });
}
```

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login</title>
    <script type="text/javascript" src="https://alcdn.msauth.net/lib/1.2.1/js/msal.js"
        integrity="sha384-9TV1245fz+BaI+VvCjMYL0YDMElLBwNS84v3mY57pXNOt6xcUYch2QLImaTahcOP"
        crossorigin="anonymous"></script>
    <script type="text/javascript">
        if (typeof Msal === 'undefined') document.write(unescape("%3Cscript src='https://alcdn.msftauth.net/lib/1.2.1/js/msal.js' type='text/javascript' integrity='sha384-m/3NDUcz4krpIIiHgpeO0O8uxSghb+lfBTngquAo2Zuy2fEF+YgFeP08PWFo5FiJ' crossorigin='anonymous'%3E%3C/script%3E"));
    </script>

    <script type="text/javascript" src="./auth.js"></script>
</head>

<body>
    <h1>Login</h1>

    <a class="btn btn-primary btn-lg" href="#" id="signIn" role="button" onclick="signIn()">Se
        connecter au
        site</a>
</body>

</html>
```

Et maintenant sur notre page d'index, on va juste vérifier notre token

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Index</title>
    <script type="text/javascript" src="https://alcdn.msauth.net/lib/1.2.1/js/msal.js"
        integrity="sha384-9TV1245fz+BaI+VvCjMYL0YDMElLBwNS84v3mY57pXNOt6xcUYch2QLImaTahcOP"
        crossorigin="anonymous"></script>
    <script type="text/javascript">
        if (typeof Msal === 'undefined') document.write(unescape("%3Cscript src='https://alcdn.msftauth.net/lib/1.2.1/js/msal.js' type='text/javascript' integrity='sha384-m/3NDUcz4krpIIiHgpeO0O8uxSghb+lfBTngquAo2Zuy2fEF+YgFeP08PWFo5FiJ' crossorigin='anonymous'%3E%3C/script%3E"));
    </script>

    <script type="text/javascript" src="./auth.js"></script>
</head>
<body onload="checkToken()">
    <h1>Index</h1>
    <noscript>
        <meta http-equiv="refresh" content="0; URL=https://demo.woivre.com/login.html" />
    </noscript>
</body>
</html>
```

Le script de vérification de token, on va ici faire simple et uniquement vérifier qu'il s'agit bien de notre application, et ensuite on va faire un appel graph pour valider que le token est valide, je n'ai pas trouvé de meilleure solution à ce jour. Voici ce qu'on ajoutera donc à notre fichier script.

```js
const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

function checkToken() {

  const idToken = window.sessionStorage.getItem('msal.idtoken')
  if (idToken === null) {
    window.location.replace(siteUrl + "/login.html");
  }

  if (myMSALObj.clientId !== clientId) {
    window.location.replace(siteUrl + "/login.html");
  }
  getTokenPopup(loginRequest).then(response => {
    callMSGraph(graphConfig.graphMeEndpoint, response.accessToken, updateSignInAccount);
  });

}

function getTokenPopup(request) {
  return myMSALObj.acquireTokenSilent(request)
    .catch(error => {
      console.log(error);
      console.log("silent token acquisition fails. acquiring token using popup");

      // fallback to interaction when silent call fails
      return myMSALObj.acquireTokenPopup(request)
        .then(tokenResponse => {
          return tokenResponse;
        }).catch(error => {
          console.log(error);
        });
    });
}

function callMSGraph(endpoint, token, callback) {
  const headers = new Headers();
  const bearer = `Bearer ${token}`;

  headers.append("Authorization", bearer);

  const options = {
    method: "GET",
    headers: headers
  };

  console.log('request made to Graph API at: ' + new Date().toString());

  fetch(endpoint, options)
    .then(response => response.json())
    .then(response => callback(response, endpoint))
    .catch(error => console.log(error))
}

function updateSignInAccount() {
  
}
```

Et voilà comment avoir un site privé via Github Pages, alors évidemment ce n'est pas parfait, mais c'est un moyen simple d'avoir un projet privé de manière purement gratuite.
