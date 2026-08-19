+++
author = "Benoit G"
title = "Remove Old Azure Resources Based on Tags"
date = "2024-11-13"
description = "Automate the cleanup of temporary Azure resources using a Time-To-Live tag, plus a script to auto-tag untagged resources with their creator."
tags = ["Tags"]
categories = ["Azure"]
featureImage = "/articles/images/Tags.svg"
+++

Many companies have big infrastructures, but often overlook the organization of their resources in Azure. This oversight can make simple tasks, such as tracking, unnecessarily complicated just because resources weren't properly organized.

With Azure resource tagging, you can assign metadata to your resources, making it easy to filter and locate resources that share the same tag.

This script has been forked and updated from [Using Azure tags to improve resources organization](https://medium.com/@aminecharot).

[[toc]]

## What is a tag?

A tag is a key/value pair. It can be applied to resource groups or directly on resources. It is searchable, so it can be used to find resources or resource groups using PowerShell or the Azure portal. See the [official documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources) for details.

Using the PowerShell command:

```powershell
(Get-AzResource -Tag @{ Environment = "PROD" }).Name
```

This returns all the resources that contain the `PROD` tag. You can separate costs based on a tag name, so tags in Azure may also be useful for billing information.

## Common tags

- **Environment** — the environment, which may be sandbox, dev, or prod.
- **CreatedBy** — the person who created the resource.
- **CreationDate** — when the resource was created.
- **TimeToLive** — if it is a temporary resource, how long it must live.
- **Criticality** — the importance of the resource.

The `CreationDate` tag may be useful if you want to find all the resources created on the same day.

## Temporary resources use case

Tags can be incredibly useful for automation. For example, if you have temporary resources, you can apply a **Time To Live** (TTL) tag to them.

In this scenario, you assign a storage account a `TTL` tag with the `CreationDate` tag formatted as `dd-MM-yy`. By using a PowerShell script, you can automate the process of finding and deleting all temporary resources based on their TTL tag.

This script finds all resources that contain a `TTL` tag, compares the current date with the creation date, and removes the resource if the difference is greater than the TTL.

```powershell
$resources = Get-AzResource | Where-Object { $_.tags.keys -match "TTL" }
$currentDate = Get-Date -Format "dd-MM-yy"

$resources.foreach{
    $creationDate = Get-Date $PSItem.tags["CreationDate"]
    $days = (New-TimeSpan -Start $creationDate -End $currentDate).days
    $difDays = $PSItem.tags["TTL"] - $days

    if ($difDays -le 0) {
        $resourceName = $PSItem.Name
        Write-Output "Remove the resource $resourceName"
        Remove-AzResource -ResourceId $PSItem.ResourceId -Force
    }
}
```

## Automatically add the CreatedBy tag

Some tags (like Time To Live, Criticality, or CreationDate) may be added on creation. For untagged or legacy resources without a `CreatedBy` tag, it can be added automatically using a script.

This script gets all the resources and, for every untagged one, looks up who last wrote to it in the activity log and applies a `CreatedBy` tag:

```powershell
$resources = Get-AzResource

$currentTime = Get-Date
$endTime = $currentTime.AddDays(-7 * $cnt)
$startTime = $endTime.AddDays(-7)

$resources.foreach{
    $untaggedResources = $PSItem.tags["CreatedBy"]
    if ($null -eq $untaggedResources) {
        $owner = Get-AzLog -ResourceId $PSItem.ResourceId -StartTime $startTime -EndTime $endTime |
            Where-Object { $_.Authorization.Action -like "*/write*" } |
            Select-Object -ExpandProperty Caller |
            Group-Object |
            Sort-Object |
            Select-Object -ExpandProperty Name

        $PSItem.Tags.Add("CreatedBy", $owner)
        $PSItem | Set-AzResource -Force
    }
}
```

Using these tags, it will be easier for you to purge old resources and know who created the untagged ones.

Enjoy!
