---
layout: post
title: Générer de l'ASP.Net grâce à des fichiers XML et XSLT
date: 2009-04-10
categories: [ "Divers" ]
comments_id: 12 
---

Lors de mon dernier stage, j'ai du trouver un moyen de générer des pages ASP.Net depuis des fichiers XML et XSLT, bon à part que le fait que ce fut une expérience enrichissante pour l'utilisation du XSLT, cette génération fut utile du fait que l'on générait des pages entières de statistiques selon des critères situés à distance. (Enfin bon, bref, c'est du vieux travail ....)

Pour ceux qui ne connaissent pas les fichiers XSLT, ce type de fichier est utilisé pour convertir un fichier XML dans un autre fichier de n'importe quel type. Ce type de fichiers contient des "template" et des boucles principalement, dont voici un exemple ci dessous :

```xml
<xsl:for-each select="./LISTITEMS/LISTITEM">  
    <asp:ListItem value="{@value}">  
        <xsl:value-of  select="current()"></xsl:value-of>  
    </asp:ListItem>  
</xsl:for-each>  
```

Cette boucle permet donc pour chaque élément de cet extrait de XML :

```xml
<LISTITEMS>  
    <LISTITEM value="">Select One</LISTITEM>  
    <LISTITEM value="1">Architector</LISTITEM>  
    <LISTITEM value="2">Sr. Developer</LISTITEM>  
    <LISTITEM value="3">Programmer</LISTITEM>  
    <LISTITEM value="4">Web Designer</LISTITEM>  
</LISTITEMS>  
```

On obtiendrait un résultat de ce type :

```xml
<asp:ListItem value="">Select One</asp:ListItem>  
<asp:ListItem value="1">Architector</asp:ListItem>  
<asp:ListItem value="2">Sr. Developer</asp:ListItem> 
<asp:ListItem value="3">Programmer</asp:ListItem>  
<asp:ListItem value="4">Designer</asp:ListItem>  
```

Donc voici une démonstration de comment faire en C#

```csharp  
private readonly string XslFile = "TestXML/default.xslt";  
private readonly string XmlFile = "TestXML/page.xml";
public Panel ControlHolder;

protected void Page_Load(object sender, EventArgs e) 
{  
    XmlDocument xdoc = new XmlDocument();  
    xdoc.Load(XmlFile);  
    
    XslTransform xsl = new XslTransform();  
    xsl.Load(XslFile);  

    XsltArgumentList xslarg = new XsltArgumentList();
  
    StringWriter sw = new StringWriter();  
    xsl.Transform(xdoc, xslarg, sw);  
    
    string result = sw.ToString().Replace("xmlns:asp=\\"remove\\"", "").Replace("&lt;", "<").Replace("&gt;", ">");  
    sw.Close();  

    ControlHolder = new Panel();  
    form1.Controls.Add(ControlHolder);  
  
    Control ctrl = new Control();  
    ctrl = ControlHolder.Page.ParseControl(result);  
    ControlHolder.Controls.Add(ctrl);  
}  
```

Lors du déroulement de cette génération, on peut voir dans la variable "result" cet extrait :

```xml
<td valign="top">Title:</td>
    <td>
        <asp:DropDownList runat="server" ID="TITLE">
            <asp:ListItem value="">Select One</asp:ListItem>
            <asp:ListItem value="1">Architector</asp:ListItem>
            <asp:ListItem value="2">Sr. Developer</asp:ListItem>
            <asp:ListItem value="3">Programmer</asp:ListItem>
            <asp:ListItem value="4">Web Designer</asp:ListItem>
        </asp:DropDownList>
</td>
```

Et à la fin de la génération on obtient une page de ce type :

![alt]({{ site.url }}/images/2009/04/10/generer-de-laspnet-grace-a-des-fichiers-xml-et-xslt-img0.png)

Pour des informations sur le XSLT je vous renvoie à de très bons sites, cet article était surtout pour vous montrer très rapidement qu'avec du XML et du XSLT, on peut facilement générer des contrôles serveurs !!

Liens XSLT : [XSLT et XSL/FO](http://www.commentcamarche.net/contents/xml/xmlxslt.php3) et [Cours XSLT](http://www.grappa.univ-lille3.fr/~jousse/enseignement/XML_XSLT/xslt.html)

Voici la solution complète de cet article !

[![alt]({{ site.url }}/images/2009/04/10/generer-de-laspnet-grace-a-des-fichiers-xml-et-xslt-img1.png)](http://cid-27033cda87e10205.skydrive.live.com/self.aspx/Blog/TestXML.zip)
