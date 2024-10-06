---
layout: post
title: Sandbox Azure - Provisionnement des utilisateurs
date: 2018-04-24
categories: [ "Azure", "Azure Active Directory" ]
comments_id: 134 
---

Dans le cadre de la sandbox Azure que je vous ai introduit dans un de mes précédents articles : [http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory](http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory "http://blog.woivre.fr/blog/2018/03/sandbox-azure-contexte-et-configuration-azure-active-directory")

J’ai besoin que les utilisateurs créent un compte dans cette souscription Azure afin qu’ils puissent réaliser des tests dans Azure.

Je pourrais bien entendu mettre en place une synchronisation entre l’AD SOAT et un AD Azure, mais dans mon cas je souhaite donner la plus grande liberté sur Azure possible et faire en sorte que le tout soit jetable sans me poser trop de question. J’ai donc décidé de créer un compte pour chaque utilisateur souhaitant se connecter à la sandbox.

Afin de ne pas faire cela à la main, je vais utiliser les nouvelles Graph API de Microsoft et les “Converged Applications”.

Commençons donc par créer notre application, pour cela il faut aller sur le portail suivant : [https://apps.dev.microsoft.com/#/appList](https://apps.dev.microsoft.com/#/appList "https://apps.dev.microsoft.com/#/appList"), vous remarquerez qu’il ne s’agit pas du portail Azure, mais il est possible de trouver un lien vers ce portail dans la blade Azure Active Directory / App Registration

On va donc créer une nouvelle application que je vais appeler ici “demoblog-app”.

Afin de pouvoir utiliser cette application, je dois pouvoir m’authentifier avec, pour cela j’ai plusieurs solutions possibles qui sont les suivantes :

* Générer un nouveau mot de passe
* Générer un certificat afin de résoudre l’authentification

Dans mon cas, je vais mettre en place une authentification par mot de passe, puisque je ne veux pas avoir à gérer l’expiration des différents certificats à l’avenir.

Attention : Conservez bien le mot de passe qui est généré, il est impossible de le retrouver par la suite.

Je vais par la suite choisir une plateforme pour m’authentifier, ici encore j’ai plusieurs choix qui sont les suivants :

* Web
* Native Application
* Web API

Ici, je vais créer une application Web, sans pour autant activer l'autorisation Implicit Flow, j’utilise ici l’url du code de mon application Azure Function que j’ai sur mon poste de développement, mais je peux mettre n’importe quelle url, car je n’ai aucune interaction avec un utilisateur. Pour des questions de simplicité, je mets cependant le plus souvent l’url où mon service est disponible, ainsi qu’une url pour le développement.

![image]({{ site.url }}/images/2018/04/24/sandbox-azure-provisionnement-des-utilisateurs-img0.png "image")

J’ai créé mon application, si je fais le test, je pourrais me connecter à mon service, mais je ne pourrais rien faire tant que je ne lui aurais pas octroyé de droit.

Dans mon cas, il faut que je puisse faire les tâches suivantes :

* Lister les utilisateurs
* Créer des utilisateurs
* Supprimer des utilisateurs
* Lister les groupes
* Ajouter un utilisateur à un groupe
* Réinitialiser le mot de passe d’un utilisateur

Pour cela, je vais avoir besoin des droits suivants :

* Group.ReadWrite.All (Admin Only)
* User.ReadWrite.All (Admin Only)

Si vous testez à ce moment là, vous aurez une erreur lors de vos requêtes, par manque de droits. Pour ceux qui ont déjà mis en place des applications via Azure AD, vous avez déjà vu le bouton “Grant Permission”, et bien là c’est la même chose, sauf que vous n’avez pas le bouton à ce jour.

Il vous faut donc appeler l’url suivante :

<https://login.microsoftonline.com/{tenant}/adminconsent?client_id={id}&state={state}&redirect_uri={redirectUri>}

Les paramètres sont les suivants :

* Tenant : Identifiant de votre tenant, soit sous la forme d’un GUID ou sous la forme : montenant.onmicrosoft.com
* Id : Application id que vous pouvez retrouver quand vous créez votre application
* state (Recommandé, mais non requis) : clé utilisée pour encrypter vos token qui seront générés par la suite
* RedirectUri : Url de redirection qui est la même que celle que vous avez renseigné plus haut

Une fois que vous aurez validé les différents droits via cette url, vous pourrez voir votre application dans le portail Azure, dans la blade Azure Active Directory > Enterprise applications, comme on peut le voir ci dessous :

[![image]({{ site.url }}/images/2018/04/24/sandbox-azure-provisionnement-des-utilisateurs-img1.png "image")]({{ site.url }}/images/2018/04/24/sandbox-azure-provisionnement-des-utilisateurs-img1.png)

Une fois que votre application est créée, configurée, et approuvée, on peut passer au code applicatif afin de créer notre utilisateur.

Il nous faut donc commencer par référencer les packages NuGet suivants :

* Microsoft.Graph : Sert à manipuler la Microsoft Graph API
* Microsoft.Identity.Client (en preview à ce jour) : Sert à générer le token correspondant à notre application

Commençons par voir comment générer notre token, le code est le suivant :

```csharp
public async Task<string> GetTokenAsync()  
{  
    const string baseAuthorityUrl = "https://login.microsoftonline.com/";  
    string[] scopes = new[] { "https://graph.microsoft.com/.default" };  
    var app = new ConfidentialClientApplication(applicationId, $"{baseAuthorityUrl}{tenantId}", redirectUrl, new ClientCredential(applicationSecret), null, new TokenCache());  
    AuthenticationResult authenticationResult = await app.AcquireTokenForClientAsync(scopes);  
  
    return authenticationResult.AccessToken;  
}
```

Le code est assez simple, bien qu’il diffère de ce qu’on pouvait utiliser avec ADAL auparavant, mais on retrouve la même philosophie, sauf que maintenant on a une meilleure gestion du cache et des scopes que l’on veut appliquer à notre token.

Créons maintenant notre objet pour appeler la Graph API de Microsoft :

```csharp
return  new GraphServiceClient(new DelegateAuthenticationProvider(  
 async (request) =>  
    {  
request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await helper.GetTokenAsync());  
    }));
```

On lui passe ainsi la méthode pour qu’il puisse gérer son token, et faire ainsi les appels qu’il a besoin en cas d’expiration de celui-ci.

Maintenant passons à la création de notre utilisateur, dans notre cas, il s’agira de ce code-ci :

```csharp
var parts = soatEmail.Split(new[] { '.', '@' });  
  
var password = Membership.GeneratePassword(16, 4);  
User user = await graphServiceClient.Value.Users.Request().AddAsync(new User  
{  
    AccountEnabled = true,  
    DisplayName = soatEmail,  
    MailNickname = $"{parts[0]}.{parts[1]}",  
    UserPrincipalName = $"{parts[0]}.{parts[1]}@{tenant}",  
    PasswordProfile = new PasswordProfile  
    {  
        Password = password,  
        ForceChangePasswordNextSignIn = true  
    },  
    PasswordPolicies = "DisablePasswordExpiration"  
});  
  
await graphServiceClient.Value.Groups[userGroupId].Members.References.Request().AddAsync(user);
```

Je génère ici un mot de passe aléatoire que l’utilisateur doit changer à sa première utilisation. Je désactive par ailleurs les contraintes sur le mot de passe pour des soucis de maintenance. On peut d’ailleurs voir sur la dernière ligne que j’ajoute par la suite mon utilisateur dans le groupe “All Users” que j’utilise pour les services communs.

Le prochain article autour de cette sandbox aura pour sujet la création de ressource sur Azure via mon Azure Function. Stay tuned !
