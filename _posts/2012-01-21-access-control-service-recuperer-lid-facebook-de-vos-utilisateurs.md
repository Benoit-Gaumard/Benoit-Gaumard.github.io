---
layout: post
title: Access Control Service - Récupérer l’ID Facebook de vos utilisateurs
date: 2012-01-21
categories: [ "Azure", "Access Control Service" ]
comments_id: 77 
---

Récupérer le Facebook Id de ces membres est extrêmement utile pour tout site, ou application, en effet, grâce à celui ci on peut facilement identifier un membre sur nos différentes applications ou sites, et faire des recoupements avec ces amis ! Bref c’est utile !

Donc voici, une petite méthode d’extension qui vous permettra de récupérer le Facebook Id de vos membres, s’ils se sont connectés via Access Control Service avec un provider Facebook :

```csharp
 public static class FacebookIdentityProviderUtils
 {
     private const string Facebook = "Facebook";
     private const string Federation = "Federation";
     private const string IdentityProviderClaimType = "http://schemas.microsoft.com/accesscontrolservice/2010/07/claims/identityprovider";
     private const string NameIdentifierClaimType = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

     public static int GetFacebookId(this IPrincipal principal)
     {
          if (principal == null)
              throw new ArgumentNullException("principal");

          if (principal.Identity.AuthenticationType == Federation && principal.Identity.IsAuthenticated)
          {
              var identity = principal.Identity as ClaimsIdentity;

              // Check Facebook
              if (identity != null && identity.Claims.First(c => c.ClaimType == IdentityProviderClaimType).Value.StartsWith(Facebook))
              {
                  // Get Id
                  return Convert.ToInt32(identity.Claims.First(c => c.ClaimType == NameIdentifierClaimType).Value);
              }
          }

          throw new Exception("Error, you don't use a federation with Facebook provider");
      }
  }
```

Bien entendu n’oubliez pas de référencer l’assembly Microsoft.IdentityModel afin de pouvoir accéder à ces informations ! Après cela vous pouvez facilement l’utiliser dans vos applications, comme par exemple ci dessous, avec un peu de Razor

```xml
  @using WindowsAzure.AccessControlService.Extensions
  @if(Request.IsAuthenticated) {
      <img src="https://graph.facebook.com/@HttpContext.Current.User.GetFacebookId()/picture"/>
      <text>Welcome <strong>@User.Identity.Name</strong>!
      [ @Html.ActionLink("Log Off", "LogOff", "Account") ]</text>
  }
  else {
      @:[ @Html.ActionLink("Log On", "LogOn", "Account") ]
  }
```

Cela vous donnera un rendu de ce type :

![image]({{ site.url }}/images/2012/01/21/access-control-service-recuperer-lid-facebook-de-vos-utilisateurs-img0.png "image")
