---
layout: post
title: Intégrer des images via RIA Services
date: 2010-04-02
categories: [ "Divers" ]
comments_id: 43 
---

Il m’est récemment arrivé lors d’une démonstration de vouloir sortir les images de NorthWind pour les inclure dans un composant Silverlight.

Donc naïvement, je me suis dis qu’un simple “converter” binaire suffira pour afficher mon image. “Converter” que voici :

```csharp
public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)  
{  
    BitmapImage image = new BitmapImage();  
  
    using(MemoryStream stream = new MemoryStream(value as byte\[\]))  
    {  
        image.SetSource(stream);  
    }  
  
    return image;  
}
```

Et bien entendu lors de l’exécution on a donc une petite erreur qui n’aide pas trop en fait ….

![image]({{ site.url }}/images/2010/04/02/integrer-des-images-via-ria-services-img0.png "image")

Bon après quelques réflexions, on se dit que le format de l’image n’est pas correct, où alors qu’il y a un problème avec le flux de données.

La solution que j’ai trouvé est d’enregistrer l’image sur un serveur de medias, et de passer l’url de celle-ci à Silverlight. Comme ça on gagne au niveau du Converter, et de plus on m’a toujours déconseillé de stocker mes images en bases de données pour la place qu’elles utilisent.

Le plus simplement possible, en faisant cela directement dans mon fichier DomainService,

```csharp
private IQueryable<Category> CategoryWithPictureUrl(IQueryable<Category> categories)  
{  
    foreach (var category in categories)  
    {  
        if (category.Picture != null)  
        {  
            TypeConverter tc = TypeDescriptor.GetConverter(typeof(System.Drawing.Bitmap));  
            System.Drawing.Bitmap b = (System.Drawing.Bitmap)tc.ConvertFrom(category.Picture);  
            if (b != null)  
            {  
                String path = String.Format(@"D:\\Medias\\Category{0}.jpg", category.CategoryID);  
                if (!File.Exists(path))  
                {  
                    b.Save(path, System.Drawing.Imaging.ImageFormat.Jpeg);  
                    b.Dispose();  
                }  
                category.PictureUrl = String.Format("http://localhost/Media/Category{0}.jpg", category.CategoryID);  
            }  
        }  
    }  
    return categories.AsQueryable();  
}
```

La propriété PictureUrl est ajouté dans une classe partielle de l’entité Category de la façon suivante :

```csharp
public partial class Category  
{  
    [DataMemberAttribute]  
    public string PictureUrl { get; set; }  
}
```

Et voilà, comme ça on peut voir nos images directement depuis Silverlight !

Pensez aussi à ne pas envoyer votre binaire histoire d’alléger un peu votre service.

Bien entendu, ce fonctionnement marche très bien sans RIA Services !
