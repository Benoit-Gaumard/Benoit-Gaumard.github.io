+++
author = "Benoit G"
title = "✨ KQL query collection"
date = "2024-11-06"
description = ""
toc = true
featured = true
tags = [
    "kql"
]
categories = ["Azure"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/kql-query.jpeg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/kql-query.jpeg" width="50%" height="50%">

# Kusto Query Language (KQL) Query Collection

Kusto Query Language (KQL) is the language used across Azure Resource Graph, Azure Monitor, Azure Data Explorer, and Azure Log Analytics.


Here is a collection of queries: Resource Graph Queries

## ⭐✨ Azure Advisor

### Service retirement

```kql
Kustoadvisorresources
| project id, properties.impact, properties.shortDescription.problem
```

## ⭐ AKS

### List node pools

```kql
KustoResources
| where type == "microsoft.containerservice/managedclusters"
| extend nodepools = properties.agentPoolProfiles
| mv-expand nodepools
| project name, nodepools.name, nodepools.vmSize, nodepools.minCount, nodepools.maxCount, nodepools.powerState.code, nodeCount = tostring(nodepools['count'])
| sort by name
```

### List nodes pools2

```kql
KustoResources
| where type == "microsoft.containerservice/managedclusters"
| extend properties.agentPoolProfiles
| project subscriptionId, name, pool = (properties.agentPoolProfiles)
| mv-expand pool
| project subscription = subscriptionId, cluster = name, size = pool.vmSize, count = pool.['count']
```

### Get Node pools information

```kql
Kustoresources
| where type == "microsoft.containerservice/managedclusters"
| extend properties.agentPoolProfiles
| project subscriptionId, name, nodePool = properties.agentPoolProfiles
| mv-expand nodePool
| project subscriptionId, name, sku = nodePool.vmSize, count = nodePool.['count'], powerState = nodePool.powerState.code
```

## ⭐ Disks

### Get Premium Disks

```kql
Kustoresources
| where type =~ 'microsoft.compute/disks'
| extend skuName=tostring(sku.name)
| extend accountType=case(skuName =~ 'Standard_LRS', 'Standard HDD LRS',
                          skuName =~ 'StandardSSD_LRS', 'Standard SSD LRS',
                          skuName =~ 'UltraSSD_LRS', 'Ultra disk LRS',
                          skuName =~ 'Premium_LRS', 'Premium SSD LRS',
                          skuName =~ 'Standard_ZRS', 'Zone-redundant',
                          skuName =~ 'Premium_ZRS', 'Premium SSD ZRS',
                          skuName =~ 'StandardSSD_ZRS', 'Standard SSD ZRS',
                          skuName)
| where accountType contains "Premium"
```

### Get SSD Disks

```kql
Kustoresources
| where type =~ 'microsoft.compute/disks'
| extend skuName=tostring(sku.name)
| extend accountType=case(skuName =~ 'Standard_LRS', 'Standard HDD LRS',
                          skuName =~ 'StandardSSD_LRS', 'Standard SSD LRS',
                          skuName =~ 'UltraSSD_LRS', 'Ultra disk LRS',
                          skuName =~ 'Premium_LRS', 'Premium SSD LRS',
                          skuName =~ 'Standard_ZRS', 'Zone-redundant',
                          skuName =~ 'Premium_ZRS', 'Premium SSD ZRS',
                          skuName =~ 'StandardSSD_ZRS', 'Standard SSD ZRS',
                          skuName)
| where accountType contains "SSD"
```

### Get ZRS Disks

```kql
Kustoresources
| where type =~ 'microsoft.compute/disks'
| extend skuName=tostring(sku.name)
| extend accountType=case(skuName =~ 'Standard_LRS', 'Standard HDD LRS',
                          skuName =~ 'StandardSSD_LRS', 'Standard SSD LRS',
                          skuName =~ 'UltraSSD_LRS', 'Ultra disk LRS',
                          skuName =~ 'Premium_LRS', 'Premium SSD LRS',
                          skuName =~ 'Standard_ZRS', 'Zone-redundant',
                          skuName =~ 'Premium_ZRS', 'Premium SSD ZRS',
                          skuName =~ 'StandardSSD_ZRS', 'Standard SSD ZRS',
                          skuName)
| where accountType contains "ZRS"
```

### Sort Disks By Size IOPS

```kql
Kustoresources
| where type == "microsoft.compute/disks"
| project Disk_name=name, SKU=sku.name, Size=strcat(properties['diskSizeGB'],"GB"), IOPS=tolong(properties['diskIOPSReadWrite'])
| sort by Size
```

## ⭐ Frontdoor

### Routing rules and accepted protocols

```kql
Kustoresources
| where type == "microsoft.network/frontdoors"
| project subscriptionId, frontDoorName=name, routingRules = (properties.routingRules)
| mv-expand routingRules
| project subscriptionId, frontDoorName, routingRuleName=routingRules.name, protocols = routingRules.properties
```

## ⭐ Network

### List all subnets with delegation

```kql
Kustoresources
| where type == "microsoft.network/virtualnetworks"
| project vnetName = name, subnets = (properties.subnets)
| mvexpand subnets
| extend subnetName = (subnets.name)
| extend isDelegated = isnotnull(subnets.properties.delegations) and array_length(subnets.properties.delegations) != 0
| where isDelegated == 1
| project vnetName, subnetName
```

### List subnets without NSG

```kql
Kustoresources
| where type == "microsoft.network/virtualnetworks"
| project vnetName = name, subnets = (properties.subnets)
| mvexpand subnets
| extend subnetName = (subnets.name)
| extend hasNSG = isnotnull(subnets.properties.networkSecurityGroup)
| where hasNSG == 0
| project vnetName, subnetName
```

### List subnets with service endpoint

```kql
Kustoresources
| where type == "microsoft.network/virtualnetworks"
| project vnetName = name, subnets = (properties.subnets)
| mvexpand subnets
| extend subnetName = (subnets.name)
| extend hasServiceEndpoints = isnotnull(subnets.properties.serviceEndpoints) and array_length(subnets.properties.serviceEndpoints) != 0
| where hasServiceEndpoints == 1
| project vnetName, subnetName
```

### List subnet with UDR

```kql
Kustoresources
| where type == "microsoft.network/virtualnetworks"
| project vnetName = name, subnets = (properties.subnets)
| mvexpand subnets
| extend subnetName = (subnets.name)
| extend hasRouteTable = isnotnull(subnets.properties.routeTable)
| where hasRouteTable == 1
| project vnetName, subnetName
```

### Subnet IP usage

```kql
Kustoresources
| where type == "microsoft.network/virtualnetworks"
| project vnetName = name, subnets = (properties.subnets)
| mvexpand subnets
| extend subnetName = (subnets.name)
| extend mask = split(subnets.properties.addressPrefix, '/', 1)[0]
| extend usedIp = array_length(subnets.properties.ipConfigurations)
| extend totalIp = case(mask == 29, 3,
                        mask == 28, 11,
                        mask == 27, 27,
                        mask == 26, 59,
                        mask == 25, 123,
                        mask == 24, 251,
                        mask == 23, 507,
                        mask == 22, 1019,
                        mask == 21, 2043,
                        mask == 20, 4091,
                        mask == 19, 8187,
                        mask == 18, 16379,
                        mask == 17, 32763,
                        mask == 16, 65531,
                        mask == 15, 131067,
                        mask == 14, 262139,
                        mask == 13, 524283,
                        mask == 12, 1048571,
                        mask == 11, 2097147,
                        mask == 10, 4194299,
                        mask == 9, 8388603,
                        mask == 8, 16777211,
                        -1)
| extend availableIp = totalIp - usedIp
| project vnetName, subnetName, mask, usedIp, totalIp, availableIp, subnets
| order by toint(mask) desc
```

## ⭐ Resources

### Display last resources changes since the last week

```kql
Kustoresourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp),
targetResourceId = tostring(properties.targetResourceId),
changeType = tostring(properties.changeType), changedBy = tostring(properties.changeAttributes.changedBy),
changedByType = properties.changeAttributes.changedByType,
clientType = tostring(properties.changeAttributes.clientType)
| where changeTime > ago(7d)
| project changeType, changedBy, changedByType, clientType
| summarize count() by changedBy, changeType, clientType
| order by count_ desc
```

## ⭐ Resources Groups

### Display Empty Resource Groups

```kql
KustoResourceContainers
| where type == 'microsoft.resources/subscriptions/resourcegroups'
| extend rgAndSub = strcat(resourceGroup, '--', subscriptionId)
| join kind=leftouter (
    Resources
    | extend rgAndSub = strcat(resourceGroup, '--', subscriptionId)
    | summarize count() by rgAndSub
) on rgAndSub
| where isnull(count_)
```

## ⭐ Policies

### Find unused custom policies

```kql
Kustopolicyresources
| where type == "microsoft.authorization/policydefinitions"
| extend policyType = tostring(properties.policyType)
| where policyType == "Custom"
| join kind=leftouter (
    policyresources
    | where type == "microsoft.authorization/policysetdefinitions"
    | extend policyType = tostring(properties.policyType)
    | extend  policyDefinitions = properties.policyDefinitions
    | where policyType == "Custom"
    | mv-expand policyDefinitions
    | extend policyDefinitionId = tostring(policyDefinitions.policyDefinitionId)
    | project associedIdToInitiative=policyDefinitionId
    | distinct associedIdToInitiative) on $left.id == $right.associedIdToInitiative
| where associedIdToInitiative == ""
| join kind=leftouter(
    policyresources
    | where type == "microsoft.authorization/policyassignments"
    | extend policyDefinitionId = tostring(properties.policyDefinitionId)
    | project associatedDefinitionId=policyDefinitionId
    | distinct associatedDefinitionId
) on $left.id == $right.associatedDefinitionId
| where associatedDefinitionId == ""
| extend displayName = tostring(properties.displayName)
| project id, displayName
```

### Count policies assignment by scope

```kql
Kustopolicyresources
| where type == "microsoft.authorization/policyassignments"
| extend scope = tostring(properties.scope)
| summarize count() by scope
| order by count_ desc
```

### Count custom policies assignments by scope

```kql
Kustopolicyresources
| where type == "microsoft.authorization/policydefinitions"
| extend policyType = tostring(properties.policyType)
| where policyType == "Custom"
| project id
| extend scope = tostring(split(id, "/providers/Microsoft.Authorization/policyDefinitions/", 0)[0])
| summarize count() by scope
| order by count_ desc
```

## ⭐ RBAC

### List user direct assignment at management group level

```kql
Kustoauthorizationresources
| extend scope = tostring(properties.scope)
| join kind = inner (
    resourcecontainers
    | where type == "microsoft.management/managementgroups"
    | project  managementGroupId=id, managementGroupName=properties.displayName
) on $right.managementGroupId == $left.scope
| where properties.principaltype == "User"
| project properties.createdOn, managementGroupName, scope, managementGroupId
```

### List user assignment at subscription level

```kql
Kustoauthorizationresources
| join kind = inner (
    resourcecontainers
    | where type == "microsoft.resources/subscriptions"
    | project  subscriptionName=name, subscriptionId) on subscriptionId
| where type == "microsoft.authorization/roleassignments"
| where properties.principalType == "User"
| project properties.createdOn, properties.scope, properties.principalId, subscriptionId
```

### All RBAC Assignments

```kql
Kustoauthorizationresources
| where type =~ 'microsoft.authorization/roleassignments'
| extend roleDefinitionId= tolower(tostring(properties.roleDefinitionId))
| extend principalType = properties.principalType
| extend principalId = properties.principalId
| extend description = properties.description
| extend scope = properties.scope
| extend createdBy  = properties.createdBy
| join kind = inner (
authorizationresources
| where type =~ 'microsoft.authorization/roledefinitions'
| extend roleDefinitionId = tolower(id)
| extend roleName = tostring(properties.roleName)
| extend roleType = tostring(properties.type)
| project roleDefinitionId,roleName,roleType
) on roleDefinitionId
| project principalId,principalType,createdBy,description,roleName,roleType,scope,roleDefinitionId
```

## ⭐ Resource Groups

### Display Empty Resource Groups

```kql
KustoResourceContainers
| where type == 'microsoft.resources/subscriptions/resourcegroups'
| extend rgAndSub = strcat(resourceGroup, '--', subscriptionId)
| join kind=leftouter (
    Resources
    | extend rgAndSub = strcat(resourceGroup, '--', subscriptionId)
    | summarize count() by rgAndSub
) on rgAndSub
| where isnull(count_)
```

## ⭐ Resource changes

### Display last resources changes since the last week

```kql
Kustoresourcechanges
| extend changeTime = todatetime(properties.changeAttributes.timestamp),
targetResourceId = tostring(properties.targetResourceId),
changeType = tostring(properties.changeType), changedBy = tostring(properties.changeAttributes.changedBy),
changedByType = properties.changeAttributes.changedByType,
clientType = tostring(properties.changeAttributes.clientType)
| where changeTime > ago(7d)
| project changeType, changedBy, changedByType, clientType
| summarize count() by changedBy, changeType, clientType
| order by count_ desc
```

## ⭐ Storage Accounts

### Count Storage accounts by sku

```kql
Kustoresources
| where type == "microsoft.storage/storageaccounts"
| extend sku = sku.name
| summarize count(name) by tostring(sku)
```

## ⭐ Subscriptions

### List subscriptions part of an EA

```kql
Kustoresourcecontainers
| where type == "microsoft.resources/subscriptions"
| where properties.state == "Enabled"
| mv-expand subscriptionPolicies = properties.subscriptionPolicies
| where name !contains "Visual Studio" and subscriptionPolicies.quotaId startswith "MSDNDevTest" or subscriptionPolicies.quotaId startswith "EnterpriseAgreement"
```

### List subscriptions by MG

```kql
KustoResourceContainers
| where type =~ 'microsoft.resources/subscriptions'
| extend  mgParent = properties.managementGroupAncestorsChain
| mv-expand with_itemindex=MGHierarchy mgParent
| project subscriptionId, name, mgParent, MGHierarchy, mgParent.name
```

### Count subscriptions by MG

```kql
KustoResourceContainers
| where type =~ 'microsoft.management/managementgroups'
| project mgname = name
| join kind=leftouter (resourcecontainers | where type=~ 'microsoft.resources/subscriptions'
| extend  mgParent = properties.managementGroupAncestorsChain | project id, mgname = tostring(mgParent[0].name)) on mgname
| summarize count() by mgname
```

### Count all subscriptions by tenant

```kql
KustoResourceContainers
| where type =~ 'microsoft.resources/subscriptions'
| project SubscriptionName=name, subscriptionId, tenantId
| summarize count() by tenantId
| order by ['count_'] desc
```

### List resources part of a list of subscriptions

```kql
Kustoresources
| where subscriptionId in ("subid1-xxx-xxx-xxx-xxx", "subid2-xxx-xxx-xxx-xxx", "subid3-xxx-xxx-xxx-xxx", "subid4-xxx-xxx-xxx-xxx")
```

### Check subscription naming convention

```kql
Kustoresourcecontainers
| where type == "microsoft.resources/subscriptions"
| where properties.state == 'Enabled'
| extend NamingCheck = iff((name startswith 'sub-'),"Naming is OK","Naming is not OK")
| summarize count() by NamingCheck
```

### Check subscription naming convention on a specific management group

```kql
Kustoresourcecontainers
| where type == "microsoft.resources/subscriptions"
| where properties.state == 'Enabled'
| where properties.managementGroupAncestorsChain contains 'Production'
| extend NamingCheck = iff((name startswith 'sub-'),"Naming is OK","Naming is not OK")
| summarize count() by NamingCheck
```

### List subscriptions in a specific management group

```kql
Kustoresourcecontainers
 | where type == "microsoft.resources/subscriptions"
 | where (properties.managementGroupAncestorsChain) contains "Sandbox"
```

### Count resources type in a subscription

```kql
Kustoresources
| join kind=leftouter
   (resourcecontainers
   | where type == 'microsoft.resources/subscriptions'
   | project subscriptionName=name, subscriptionId) on subscriptionId
| where subscriptionName  == "<your-sub-name-here>"
| summarize count() by type, subscriptionName
```

### Count subscriptions by management groups

```kql
Kustoresourcecontainers
| where type == 'microsoft.resources/subscriptions'
| project subscriptionName = name, managementgroups = (properties.managementGroupAncestorsChain)
| mv-expand managementgroups
| summarize count() by tostring(managementgroups.displayName)
| order by count_ desc
```

## ⭐ Tags

### Resources without tag
```kql
resourcecontainers
| where type != "microsoft.management/managementgroups"
| mv-expand bagexpansion=array tags
| where isempty(tags)
```

### Resources with specific tags and expand tag names/values to individual rows
```kql
resourcecontainers
| where type != "microsoft.management/managementgroups"
| mvexpand parsejson(tags)
| extend tagname = tostring(bag_keys(tags)[0])
| extend tagvalue = tostring(tags[tagname])
| project  name,id,type,location,subscriptionId,tagname,tagvalue
| union (resources
| mvexpand parsejson(tags)
| extend tagname = tostring(bag_keys(tags)[0])
| extend tagvalue = tostring(tags[tagname])
| project name,id,type,location,subscriptionId,tagname,tagvalue)
| where tagname == "Environment" or tagname == "Owner"
```

### Resources not containing a specific tag
```kql
resourcecontainers
| where tags !contains 'Environment'
```

### Resources not containing a tag and count
```kql
resourcecontainers
| where tags !contains 'Environment'
| project name, resourceGroup, subscriptionId, location, tags
| summarize count () by subscriptionId
```

### All tags for resources
```kql
resourcecontainers
| project  name,type,location,subscriptionId,tags
| union (resources | project name,type,location,subscriptionId,tags)
```

### Count for a specific tag key
```kql
ResourceContainers
| where type =~ 'microsoft.resources/subscriptions/resourcegroups'
| mvexpand tags
| extend tagKey = tostring(bag_keys(tags)[0])
| extend tagValue = tostring(tags[tagKey])
| where tagKey == "Environment"
| summarize count() by tagValue
| order by ['count_'] desc
```

### TEST
```kql
resources
| where type =~ 'Microsoft.Compute/virtualMachines'
| mvexpand tags
| extend tagKey = tostring(bag_keys(tags)[0])
| extend tagValue = tostring(tags[tagKey])
| where tagKey hasprefix "creat"  and tagKey hasprefix "cr"
| project name, tags, tagKey, tagValue
```