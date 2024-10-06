---
layout: post
title: Windows Azure - Savoir si on se trouve sur l’émulateur ou dans le Cloud
date: 2011-10-18
categories: [ "Azure", "Cloud Services" ]
comments_id: 72 
---

Lorsqu’on développe une application pour Windows Azure, il est souvent utile de savoir si on se trouve sur une instance Azure ou si on se trouve sur notre émulateur fraichement refait.

Depuis l’Azure Toolkit 1.5, il est possible de savoir si on se trouve sur l’émulateur grâce à la propriété RoleEnvironment.IsEmulator.

```csharp
if (RoleEnvironment.IsAvailable)
{
    // Cloud or Emulator }
if (RoleEnvironment.IsEmulated)
{
    // Only in Emulator }
```

[Steve Marx](http://blog.smarx.com/posts/skipping-windows-azure-startup-tasks-when-running-in-the-emulator) en parle sur son blog, c’est en anglais, mais si vous voulez des infos sur Azure, c’est ce blog qu’il faut lire (en plus du mien, et celui de [ZeCloud](http://zecloud.fr)). Il montre de plus comment l’utiliser avec les Start Up Task, si ce n’est pas utile ça !
