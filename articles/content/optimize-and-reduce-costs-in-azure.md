+++
author = "Benoit G"
title = "Optimize and Reduce Costs in Azure"
date = "2024-09-11"
description = "Practical tips to control and reduce your Azure spending: VM sizing, autoshutdown, reservations, hybrid benefit, storage tiers, tagging, and more."
tags = ["Cost Optimization"]
categories = ["Azure"]
featureImage = "/articles/images/cost-management.svg"
featured = true
+++

Throughout my various assignments, I have often heard: "It doesn't matter, I'm not the one paying." If you have ever taken an Azure subscription with a pay-as-you-go offer, you know that it is essential to control usage costs. Whether for personal use, an SME, or a large group, Azure cost optimization should be part of your cloud strategy.

[[toc]]

Cloud adoption and cost reduction are not necessarily associated. The power of the cloud allows you to deploy resources quickly and benefit from the provider's datacenter capabilities to deploy large configurations rapidly.

With one click, it is very easy to inflate the bill. The interest of a cloud provider is obviously to encourage and facilitate the use of its services, but it is also advisable to guide its users to make the most of the deployed elements. A satisfied customer is a returning customer.

Below are some tips to help you lower the bill.

## Use the right sizes of virtual machines according to needs

There are several sizes and options available for Azure virtual machines that you can deploy to run your applications and workloads. These machines are classified by families, so it is advisable to choose the configuration best suited to your needs.

- General purpose
- Compute optimized
- Memory optimized
- Storage optimized
- GPU optimized
- High-performance compute

Even though the size of the machine can be increased or decreased at any time during its lifecycle, choose the right size from the start. There is no need to provision an F-size machine to host a showcase website for an SME.

- [Azure VM comparison (azureprice.net)](https://azureprice.net)
- [Microsoft Azure VM selector](https://azure.microsoft.com/en-us/pricing/virtual-machines/)

## Block the deployment of certain machine sizes

There is a built-in Azure policy called *Allowed virtual machine SKUs* that allows you to authorize the deployment of certain machine sizes only and thus block the deployment of unauthorized machines. This way, it is easier to control VM deployment costs.

In this example, only `Basic_A1`, `Basic_A2`, and `Basic_A3` size machines are allowed to be deployed. If you try to deploy an unauthorized machine size, the Azure API will send an error message.

## Start/stop machines automatically

With the cloud, things have changed; resources are billed on a usage basis. It is therefore necessary to schedule the stop/start of your VMs when they are not in use to save money. By analogy, at home, when you leave a room, you turn off the light — the principle is the same.

There are several solutions to do this automatically:

- Use the native Azure auto-shutdown function on each VM.
- Use the [Azure Start/Stop VM](https://learn.microsoft.com/en-us/azure/automation/automation-solution-vm-management) solution with Azure Automation.
- Use a custom PowerShell script executed by Azure Automation, such as [Scheduled Virtual Machine Shutdown Startup](https://automys.com/library/asset/scheduled-virtual-machine-shutdown-startup-microsoft-azure).

:::warning
Never stop a virtual machine from the OS by doing Start → Stop, because the VM will still be allocated on the hypervisor in Azure, and you will be billed for the machine even if it is turned off. The best practice is to do a Stop from the Azure portal. Only the **Stopped (deallocated)** status ensures that the VM is properly turned off and no longer billed.
:::

## Use Azure Advisor

As its name suggests, Azure Advisor is an "advisor" that describes best practices to follow to optimize your Azure deployments. It analyzes your configuration and resource usage, then recommends solutions that can help you improve profitability, performance, high availability, and security.

Recommendations are divided into five categories:

- **High availability** — helps ensure and improve the continuity of your critical applications.
- **Security** — helps detect threats and vulnerabilities that could lead to security breaches.
- **Performance** — to improve the speed of your applications.
- **Cost** — to optimize and reduce your overall Azure spending.
- **Operational excellence** — for process and workflow efficiency, resource management, and deployment.

## Use reserved instances (RI)

Azure reservations allow you to save money by committing to a one- or three-year plan for virtual machines, Azure Blob Storage, Azure Data Lake Storage Gen2, SQL Database compute capacity, Azure Cosmos DB throughput, or other Azure resources. Reservations can significantly reduce resource costs, up to 72% off pay-as-you-go prices, and have no impact on the runtime state of your resources. More information: [Save compute costs with reservations](https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations).

## Use savings plans

An Azure feature that complements reservations with a flexible, spend-based commitment across compute services.

## Use Hybrid Benefit

The Azure Hybrid Benefit program offers a pricing advantage to customers who already have Microsoft licenses under a Software Assurance (SA) agreement, allowing those licenses to be reused in Azure. Eligible customers can save up to 40% on Azure virtual machines (IaaS) and 55% on Azure SQL Database (PaaS) and SQL Server on Azure VMs (IaaS), or even more when combined with reserved instances. More information: [Azure Hybrid Benefit](https://azure.microsoft.com/en-us/pricing/hybrid-benefit/).

:::note
It is possible to enforce the use of Hybrid Benefit via an Azure policy, available in the [enforce-hybrid-use-benefit](https://github.com/Azure/azure-policy/tree/master/samples/Compute/enforce-hybrid-use-benefit) sample.
:::

## Implement policies and tags

Implementing tags and policies is fundamental before opening the Azure service to users. Tags let you know who a resource is assigned to and let you contact the right person directly if needed (maintenance, billing, patching, etc.). Policies let you audit or constrain users to control the deployment of expensive resources.

## Choose the right type of disk

When creating a virtual machine in Azure, several types of disks are offered: Ultra disk, Premium SSD, Standard SSD, and Standard HDD. Each type is intended for specific scenarios — if your application doesn't require high performance or is only for testing purposes, prefer an HDD disk as it is the cheapest.

:::note
When creating a VM, the Premium SSD type is selected by default. Don't forget to change it to save money.
:::

## Choose the right storage tier for blobs

Azure Storage offers different access tiers that allow you to store your blob objects in the most cost-effective way:

- **Hot** — optimized for storing frequently accessed data.
- **Cool** — optimized for storing infrequently accessed data, stored for at least 30 days.
- **Archive** — optimized for storing infrequently accessed data, stored for at least 180 days, under flexible latency conditions (a few hours).

## Purge unused data and resources (orphaned resources)

When you delete Azure resources, such as a virtual machine, some associated components are not automatically deleted (public IP, disk, VNet, subnet, etc.). Some resources become "orphaned" and potentially billed. Files in a storage account are billed based on the stored volume (GB), so it is necessary to regularly clean up obsolete logs, ISO images, and other stale data.

- [Azure Orphan Resources](https://github.com/dolevshor/azure-orphan-resources)

## Support and train users

To avoid deviations, especially in cost management, supporting and training users is essential. Microsoft offers free courses on [Microsoft Learn](https://learn.microsoft.com/en-us/training/), including the free [Azure Fundamentals (AZ-900)](https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/) learning path. Certification also validates skills and provides recognition in the job market.

## Use Azure Cost Management

Take advantage of the tools included in your Azure subscription to track resource usage and manage costs with a single, unified view. More information: [Azure Cost Management](https://azure.microsoft.com/en-us/products/cost-management/).

## Select the right Azure region to deploy your resources

Microsoft Azure offers dozens of regions worldwide. Not all Azure services are available in all regions, and not all Azure services cost the same in every region — prices can depend on operating costs and other regional factors. Deploying the same Windows virtual machine in France will not cost the same as in Australia, for example.

## Sign an enterprise agreement

For large organizations, signing an Enterprise Agreement (EA) with Microsoft consolidates all your Azure subscriptions into a single contract. Generating volume allows you to negotiate discounts and rebates.

## Other cost optimization topics

- Organize resources with management groups (e.g., Test, Prod, Dev)
- Commit to long-term consumption (3 to 5 years) to lower the price
- Use Dev/Test subscriptions
- Use Azure Spot VMs and burstable VMs
- Choose the right compute service for your workload: [Choose an Azure compute service](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree)
- Use containers, autoscaling, and the pricing calculator
- Conduct architecture reviews: [Azure Well-Architected Review](https://learn.microsoft.com/en-us/assessments/)
- Develop FinOps practices within your company
- [Azure Optimization Engine](https://github.com/helderpinto/AzureOptimizationEngine) — an extensible, fully customizable Azure Advisor alternative
- Enforce a naming convention and RBAC least privilege
