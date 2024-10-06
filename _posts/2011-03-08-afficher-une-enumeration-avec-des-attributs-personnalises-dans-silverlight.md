---
layout: post
title: Afficher une énumération avec des attributs personnalisés dans Silverlight
date: 2011-03-08
categories: [ "Divers" ]
comments_id: 60 
---

Dans différents projets, il est souvent utile d’utiliser des énumérations pour gérer des choix qui sont fixés à l’avance et qui sont voués à ne jamais changer. Par exemple, le choix Masculin/Féminin pour un formulaire d’inscription.

Pour commencer, on va utilisé une énumération simple, on lui rajoutera un attribut personnalisé par la suite, on va donc créer dans notre application une énumération de ce type :

```csharp
public enum EnumValue {
    EnumValue1 = 0, 
    EnumValue2 = 1,
    EnumValue3 = 2,
    EnumValue4 = 3
}
```

Maintenant si voyons comment afficher cette liste dans une ListBox Silverlight, commençons par le code behind de notre page.

```csharp
private readonly ObservableCollection<EnumValue> _values = new ObservableCollection<EnumValue>();
public ObservableCollection<EnumValue> Values
{
    get { return _values; }
}

private EnumValue _selectedValue;
public EnumValue SelectedValue
{
    get { return _selectedValue; }
    set {
        _selectedValue = value;
        OnPropertyChanged("SelectedValue");
    }
}

public MainPage()
{
    InitializeComponent();
    this.Loaded += MainPage_Loaded;   
}

void MainPage_Loaded(object sender, RoutedEventArgs e)
{
    Values.Add(EnumValue.EnumValue1);
    Values.Add(EnumValue.EnumValue2);
    Values.Add(EnumValue.EnumValue3);
    Values.Add(EnumValue.EnumValue4);
    this.DataContext = this;
}

public event PropertyChangedEventHandler PropertyChanged;

public void OnPropertyChanged(string propertyName)
{
    if (String.IsNullOrWhiteSpace(propertyName))
        return;

    if (PropertyChanged != null)
        PropertyChanged(this, new PropertyChangedEventArgs(propertyName));
}
```

On remarque qu’on est obligé d’ajouter toutes nos valeurs à la main vu que la méthode GetValues() n’existe pas pour les enums dans Silverlight.

On a donc une interface de ce type, à gauche notre ListBox, et à notre droite, notre item sélectionné.

![image]({{ site.url }}/images/2011/03/08/afficher-une-enumeration-avec-des-attributs-personnalises-dans-silverlight-img0.png "image")

Bon on peut voir avec cette première version que ça marche, cependant ceci demande de rajouter tous les champs à la main, et de déclarer à la fois une liste pour les différentes valeurs, et un champ pour l’item sélectionné.

Commençons donc par nous affranchir de l’ajout des champs à la main, pour cela on va utiliser la réflexion, cela nous donne donc ceci :

```csharp
var list = from item in typeof (EnumValue).GetFields()
           where item.IsLiteral
           select (EnumValue)Enum.Parse(typeof(EnumValue), item.Name, true);

foreach (var enumValue in list)
{
    Values.Add(enumValue);
}
```

Bon c’est déjà pas mal, on a évité l’ajout de code, lors de l’ajout d’une valeur. Cependant, cette opération va être effectuer à chaque appel de notre méthode Load, et la liste n’a aucune pertinence à se trouver ici, puisque finalement ce n’est qu’une source de données comme une autre, elle est juste liée à notre type d’énumération.

On va donc extraire nos données dans un cache de ce type.

```csharp
public class EnumCache {
    private static readonly IDictionary<Type, Object[]\> Cache = new Dictionary<Type, Object[]>();

    public static Object[] GetValues(Type type)
    {
        if (!type.IsEnum)
            throw new ArgumentException("Type '" + type.Name + "' is not an enum");

        Object[] values;
        if (!Cache.TryGetValue(type, out values))
        {
            values = (from item in type.GetFields()
                      where item.IsLiteral
                      select Enum.Parse(type, item.Name, true)).ToArray();
            Cache[type] = values;
        }
        return values;
    }
}
```

On modifie ainsi notre remplissage de liste :

```csharp
var list = EnumCache.GetValues(typeof (EnumValue));

foreach (var enumValue in list)
{
    Values.Add((EnumValue)Enum.Parse(typeof(EnumValue), enumValue.ToString(), true));
}
```

L’avantage de ce cache, est que l’on peut stocker n’importe quel type d’énumération, et le traitement est fait une seule fois à l’appel de notre méthode GetValues(), puis est stocké en cache pour de futures utilisations.

Maintenant qu’on a fait cela, le but serait de s’affranchir de notre déclaration de liste, pour cela on peut utiliser un Converter sur notre Listbox, vu qu’on a uniquement besoin du type de notre enum.

Notre converter est donc le suivant

```csharp
public class MyEnumListConverter : IValueConverter 
{

    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value is EnumValue)
            return EnumCache.GetValues(typeof(EnumValue));

        return value;
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
```

Et la déclaration de notre ListBox est donc la suivante !

```xml
        <ListBox ItemsSource="{Binding SelectedValue, Converter={StaticResource myEnumValueConverter}}" SelectedItem="{Binding SelectedValue, Mode=TwoWay}" Margin="0,0,221,0" /> 
```

Ainsi on peut totalement s’affranchir de notre déclaration de notre ObservableCollection, et uniquement se basé sur notre champ sélectionné.

Bon maintenant, c’est bien, mais bon le soucis c’est que les valeurs affichées sont uniquement les différentes résultats des méthodes ToString() de chaque élément de l’énumération.

Ce qu’on peut envisager de faire, c’est d’ajouter pour chaque valeur de l’énumération une image et un texte associé. Pour cela on va donc créer un attribut de type custom.

Commençons donc par définir notre attribut personnalisé, on aurait pu utiliser un Attribut pré-existant dans le framework :

```csharp
public class EnumValueAttribute : Attribute {
    public string Text { get; set; }
    public Uri ImageUrl { get; set; }

    public EnumValueAttribute(string text)
    {
        this.Text = text;
    }

    public EnumValueAttribute(string text, string imageUrl)
    {
        this.Text = text;
        this.ImageUrl = new Uri(imageUrl, UriKind.Relative);
    }
}
```

Maintenant que nous l’avons créé, il faut l’utiliser dans notre énumération :

```csharp
public enum EnumValue {
    [EnumValue("Item 1")]
    EnumValue1 = 0, 
    [EnumValue("Item 2")]
    EnumValue2 = 1,
    [EnumValue("Item 3")]
    EnumValue3 = 2,
    [EnumValue("Item 4", "/VS.jpg")]
    EnumValue4 = 3
}
```

Il faut noter que pour cette syntaxe, il faut que l’image soit en mode “Content” et “Copy if never” !

Bon maintenant il va nous falloir notre méthode de Cache, vu qu’on veut récupérer l’attribut et non la valeur de notre champ.

```csharp
public class EnumCache {
    private static readonly IDictionary<Type, Object[]> Cache = new Dictionary<Type, Object[]>();

    public static Object[] GetValues(Type type)
    {
        if (!type.IsEnum)
            throw new ArgumentException("Type '" + type.Name + "' is not an enum");

        Object[] values;
        if (!Cache.TryGetValue(type, out values))
        {
            **values = (from item in type.GetFields()
                      where item.IsLiteral
                      select ((EnumValueAttribute)item.GetCustomAttributes(typeof(EnumValueAttribute), false).First())).ToArray();**
            Cache[type] = values;
        }
        return values;
    }
}
```

On va ensuite créer un converter pour notre item sélectionné, ainsi que pour la définition via le code behind. On aura donc en suivant le même principe le code suivant

```csharp
public class MyEnumValueConverter : IValueConverter {
    public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value == null)
            return value;
        if (value is EnumValue)
        {
            var enumValueAttribute = from e in typeof(EnumValue).GetFields()
                                     where e.IsLiteral && e.Name == ((EnumValue)value).ToString()
                                     select ((EnumValueAttribute)e.GetCustomAttributes(typeof(EnumValueAttribute), false).First());

            return enumValueAttribute.FirstOrDefault();
        }

        return value;
    }

    public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
    {
        if (value == null)
            return value;

        var valueAttribute = value as EnumValueAttribute;

        var elt = (from f in typeof (EnumValue).GetFields()
                   let attribute =
                       ((EnumValueAttribute) f.GetCustomAttributes(typeof (EnumValueAttribute), false).FirstOrDefault())
                   where f.IsLiteral
                         && attribute.Text == valueAttribute.Text
                         && attribute.ImageUrl == valueAttribute.ImageUrl
                   select (EnumValue) Enum.Parse(typeof (EnumValue), f.Name, false)).FirstOrDefault();

        return elt;
    }
}
```

On peut noter que j’aurais pu redéfinir le GetHashCode, et le Equals de mon attribut afin d’éviter de faire la vérification dans la requête Linq !

Et il nous suffit d’ajuster notre code XAML en adéquation avec nos modifications.

```xml
        <ListBox ItemsSource="{Binding SelectedValue, Converter={StaticResource myEnumListConverter}}" SelectedItem="{Binding SelectedValue, Mode=TwoWay, Converter={StaticResource myEnumValueConverter}}" Margin="0,0,221,0">
            <ListBox.ItemTemplate>
                <DataTemplate>
                    <StackPanel Orientation="Horizontal" Height="40">
                        <Image Source="{Binding ImageUrl}" Margin="5" Height="30"/>
                        <TextBlock Text="{Binding Text}" />
                    </StackPanel>
                </DataTemplate>
            </ListBox.ItemTemplate>
        </ListBox>
        
        <TextBlock Height="23" HorizontalAlignment="Left" Margin="200,96,0,0" Text="Selected Item" VerticalAlignment="Top" />
        <ContentControl Height="40" HorizontalAlignment="Left" Margin="200,125,0,0" DataContext="{Binding SelectedValue, Converter={StaticResource myEnumValueConverter}}" VerticalAlignment="Top" Width="152">
            <StackPanel Orientation="Horizontal" Height="40">
                <Image Source="{Binding ImageUrl}" Margin="5" Height="30"/>
                <TextBlock Text="{Binding Text}" />
            </StackPanel>
        </ContentControl> 
```

Donc rien de bien compliqué dans notre vue, uniquement un template pour notre listbox.

Et pour finir, ça nous donne donc un rendu de ce type :

![image]({{ site.url }}/images/2011/03/08/afficher-une-enumeration-avec-des-attributs-personnalises-dans-silverlight-img1.png "image")

Voilà en tout cas, ça peut être pratique pour plein de développement avec des enums, et des données un peu customisables, comme de la localisation (DisplayAttribute) ou des images.

Bon, bien entendu, comme je pense à vous, je vous fournis le code source final [ici](http://cid-27033cda87e10205.office.live.com/self.aspx/Blog/Demo.SLEnum.zip).
