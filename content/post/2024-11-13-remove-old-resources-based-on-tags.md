+++
author = "Benoit G"
title = "Remove old Azure resources based on tags"
date = "2024-11-13"
description = "Learn how to optimize and reduce costs in Azure with practical tips and strategies."
toc = true
tags = [
    "tags"
]
categories = ["Azure"
]
#featureImage = "/images/azure-cost-optimization.png" # Sets featured image on blog post.
#featureImageAlt = 'Azure Cost Optimization' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/Tags.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/azure-cost-optimization-share.png" # Designate a separate image for social media sharing.
codeMaxLines = 50 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or contribute to an existing GitHub project, you are on the right page.
<!--more-->

<img src="/images/Tags.svg">

### Introduction
---

Many companies have big infrastructures, but often overlook the organization of their resources in Azure. This oversight can make simple tasks, such as tracking, unnecessarily complicated just because resources weren't properly organized.

With Azure resource tagging, you can assign metadata to your resources, making it easy to filter and locate resources that share the same tag!

This script has been forked and updated from: Using Azure tags to improve resources organization | by Amine Charot | Charot | Medium

### What is a tag?
---

A tag is a Key/Value pair. It can be applied to the resource groups or Directly on the resources. It is searchable so it can be used to find resources or resource groups using Powershell or Azure Portal …

Microsoft official documentation is available here: Tag resources, resource groups, and subscriptions for logical organization - Azure Resource Manager | Microsoft Learn

Using the PowerShell command:

```Powershell
(Get-AzResource -Tag @{ Environment="PROD"}).Name
```

It will return all the resources that contain the PROD tag. You can separate costs based on a tag name, so the tags in Azure may be useful for billing information.

### Common tags
---

- Environment : The environment which may be sandbox, dev or prod …

- CreatedBy : The person who creates the resource.

- CreationDate : When the resource has been created.

- ime To Live : If it is a temporary resource, how much time it must live.

- Criticality : The importance of the resource.

Note : The creation date may be useful if you want to find all the resources created on the same day.

### Temporary resources use case
---

Tags can be incredibly useful for automation. For example, if you have temporary resources, you can apply a "Time To Live" (TTL) tag to them.

In this scenario, you can create a storage account and assign it a "Time To Live" tag. Once the TTL is exceeded, the storage account can be automatically deleted.

In this case, the CreationDate tag date format is: dd-MM-yy

By using a PowerShell script, you can automate the process of finding and deleting all temporary resources based on their "TTL" tag.

This script will find all the resources that contain a “TTL” tag, it will compare the current date with the creation one. If the difference between them is greater than the TTL so we remove the resource.

Using these tags, it will be easier for you to purge the old resources.

Now if we want to remove all the expired resources, we just have to run the script :

{{< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-old-resources-remover/refs/heads/main/azure-old-resources-remover.ps1" >}}

### Automatically add tag CreatedBy use case
---

Some tags (like the Time To Live, Criticality or createdDate) may be added on creation.

For untagged or legacy resources without “CreatedBy” can be added automatically using a script.

This script will get all the resources and for every untagged one, it will apply a “CreatedBy” Tag.

{{< embedgithubcode "https://raw.githubusercontent.com/Benoit-Gaumard/azure-old-resources-remover/refs/heads/main/add-createdby-tag.ps1" >}}

Enjoy!