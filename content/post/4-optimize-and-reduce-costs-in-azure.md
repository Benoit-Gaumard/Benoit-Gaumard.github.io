+++
author = "Benoit G"
title = "✨ Optimize and Reduce Costs in Azure"
date = "2024-09-11"
description = "Blog Roll"
toc = true
featured = true
tags = [
    "cost optimization"
]
categories = ["Azure"
]
featureImage = "/images/cost-management.svg" # Sets featured image on blog post.
#featureImageAlt = 'Description of image' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/cost-management.svg" # Sets thumbnail image appearing inside card on homepage.
shareImage = "/images/cost-management.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

Learn how to optimize and reduce costs in Azure with practical tips and strategies.
<!--more-->

<img src="/images/cost-management.svg">

Throughout my various assignments, I have often heard: "It doesn't matter, I'm not the one paying." If you have ever taken an Azure subscription with a pay-as-you-go offer, you know that it is essential to control usage costs. Whether for personal use, an SME, or a large group, Azure cost optimization should be part of your cloud strategy.

Cloud adoption and cost reduction are not necessarily associated. The power of the cloud allows you to deploy resources quickly and benefit from the provider's datacenter capabilities to deploy large configurations rapidly.

With one click, it is very easy to inflate the bill. The interest of a cloud provider is obviously to encourage and facilitate the use of its services, but it is also advisable to guide its users to make the most of the deployed elements. A satisfied customer is a returning customer 🙂

Below are some tips to help you lower the bill:

## Use the right sizes of virtual machines according to needs
---

There are several sizes and options available for Azure virtual machines that you can deploy to run your applications and workloads. These machines are classified by families, so it is advisable to choose the configuration best suited to your needs.

- General purpose
- Compute optimized
- Memory optimized
- Storage optimized
- GPU optimized
- High-performance compute

Even though the size of the machine can be increased or decreased at any time during its lifecycle, choose the right size from the start. There is no need to provision an F-size machine to host a showcase website for an SME.

**Useful links:**

- [Azure VM Comparison (azureprice.net)](https://azureprice.net)
- [Microsoft Azure VM Selector](https://azure.microsoft.com/en-us/pricing/virtual-machines/)

## Block the deployment of certain machine sizes
---

There is a built-in Azure policy called Allowed virtual machine SKUs that allows you to authorize the deployment of certain machine sizes only and thus block the deployment of unauthorized machines. This way, it is easier to control VM deployment costs.

In this example, only Basic_A1, Basic_A2, and Basic_A3 size machines are allowed to be deployed. If you try to deploy an unauthorized machine size, the Azure API will send an error message.

## Start/stop machines automatically
---

With the cloud, things have changed; resources are billed on a usage basis. It is therefore necessary to schedule the stop/start of your VMs when they are not in use to save money. By analogy, at home, when you leave a room, you turn off the light; the principle is the same 😉

There are several solutions to do this automatically:

- Use the native Azure Auto-shutdown function on each VM
- Use the Azure Start-Stop VM solution with Azure automation
    [Azure Start-Stop VM](https://docs.microsoft.com/en-us/azure/automation/automation-solution-vm-management)
- Use a custom PowerShell script executed by Azure automation.
    There are many custom scripts to stop/start your VMs in Azure based on tags. I found an excellent script here: [Scheduled Virtual Machine Shutdown Startup](https://automys.com/library/asset/scheduled-virtual-machine-shutdown-startup-microsoft-azure) that I am reworking and adapting, which will be made available in a future article.

**Note:** Never stop a virtual machine from the OS by doing Start -> Stop because the VM will still be allocated on the hypervisor in Azure, and you will be billed for the machine even if it is turned off. The best practice is to do a Stop from the Azure portal. Only the Stopped (deallocated) status ensures that the VM is properly turned off and that the VM resource is no longer allocated, thus no longer billed.

## Use Azure Advisor
---

As its name suggests, Azure Advisor is an "advisor" that describes best practices to follow to optimize your Azure deployments. It analyzes your configuration and resource usage, then recommends solutions that can help you improve profitability, performance, high availability, and security.

Recommendations are divided into 5 categories:

- **High availability:** Helps ensure and improve the continuity of your critical applications. For more information, see [High availability advisor recommendations](https://docs.microsoft.com/en-us/azure/advisor/advisor-high-availability-recommendations).
- **Security:** Helps detect threats and vulnerabilities that could lead to security breaches. For more information, see [Security advisor recommendations](https://docs.microsoft.com/en-us/azure/advisor/advisor-security-recommendations).
- **Performance:** To improve the speed of your applications. For more information, see [Performance advisor recommendations](https://docs.microsoft.com/en-us/azure/advisor/advisor-performance-recommendations).
- **Cost:** To optimize and reduce your overall Azure spending. For more information, see [Cost advisor recommendations](https://docs.microsoft.com/en-us/azure/advisor/advisor-cost-recommendations).
- **Operational excellence:** For process and workflow efficiency, resource management, and deployment. For more information, see [Operational excellence advisor recommendations](https://docs.microsoft.com/en-us/azure/advisor/advisor-operational-excellence-recommendations).

## Use reserved instances (RI)
---

Azure reservations allow you to save money by committing to a one or three-year plan for virtual machines, Azure Blob storage, or Azure Data Lake Storage Gen2, SQL Database compute capacity, Azure Cosmos DB throughput, or other Azure resources. The commitment allows you to get a discount on the resources you use. Reservations can significantly reduce resource costs, up to 72% off pay-as-you-go prices. Reservations provide a billing discount and have no impact on the runtime state of your resources.

You commit to consuming x% of Azure resources for 1 or 3 years and you will get a discount. More information available here: [Save Compute Costs with Reservations](https://docs.microsoft.com/en-us/azure/cost-management-billing/reservations/save-compute-costs-reservations)

## Use saving plans
---

Azure feature currently in private preview.

## Use Hybrid benefits
---

The Azure Hybrid Benefit program offers a pricing advantage to customers who already have Microsoft licenses under a Software Assurance (SA) agreement. As a result, these already acquired licenses can be used in Azure. Eligible customers can save up to 40%* on Azure virtual machines (IaaS) and 55% on Azure SQL Database (PaaS) and SQL Server on Azure virtual machines (IaaS) with Azure Hybrid Benefit, or even 80% when combined with Azure reserved instances.

All information on Hybrid Benefit is available here: [Azure Hybrid Benefit](https://azure.microsoft.com/en-us/pricing/hybrid-benefit/)

All information on combining reserved instances (RI) + Hybrid benefits is available here: [Azure RI + Hybrid Benefits](https://docs.microsoft.com/en-us/partner-center/azure-ri-server-subscriptions)

**Note:** It is possible to enforce the use of Hybrid Benefit via an Azure policy available here: [Enforce Hybrid Use Benefit](https://github.com/Azure/azure-policy/tree/master/samples/Compute/enforce-hybrid-use-benefit)

## Implement policies and tags
---

Implementing tags and policies is fundamental before opening the Azure service to users.

Using tags in Azure will allow you to know who a resource is assigned to and to contact the person directly if needed (maintenance, billing, patching, etc.). Implementing policies will allow you to audit or constrain users to control the deployment of expensive resources.

## Choose the right type of disk
---

When creating a virtual machine in Azure, several types of disks are offered.

- Ultra disk
- Premium SSD
- Standard SSD
- Standard HDD

Each type is intended for specific scenarios. Logically, if your application does not require high performance, the storage space of your application is small, or it is only for testing purposes, prefer an HDD disk as it is the cheapest.

**Note:** When creating a VM, the Premium SSD type is selected by default. Don't forget to change it to save money.

## Choose the right storage tier for blobs
---

Azure storage offers different access tiers that allow you to store your blob objects in the most cost-effective way.

The available access tiers are:

- **Hot:** Optimized for storing frequently accessed data.
- **Cool:** Optimized for storing infrequently accessed data and stored for at least 30 days.
- **Archive:** Optimized for storing infrequently accessed data and stored for at least 180 days, under flexible latency conditions (a few hours).

**Note:** The hot access tier, offered by default, remains the cheapest.

## Purge unused data/resources (Orphaned resources)
---

When you delete Azure resources, such as a virtual machine, some associated components are not automatically deleted (public IP, disk, vnet, subnet, etc.). Some resources become "orphaned" and potentially billed.

Files in a storage account are billed based on the stored volume (GB). It is therefore necessary to regularly clean up to delete certain types of files (obsolete logs, ISO images, etc.).

**Note:** It is important to regularly check these resources via a script, for example, to avoid "unnecessary" billing.

**Useful links:**

- [Azure Orphan Resources](https://github.com/dolevshor/azure-orphan-resources)

## Support and train users
---

To avoid any deviations, especially in terms of cost management, supporting and training users is essential.

Microsoft offers free courses from its Microsoft Learn platform: [Microsoft Learn](https://docs.microsoft.com/en-us/learn/)

If you want to train for free on Azure fundamentals, a free training (AZ-900) is available here: [Azure Fundamentals](https://docs.microsoft.com/en-us/learn/paths/azure-fundamentals/)

Certification on Azure technologies is also a plus, as it validates skills and provides recognition in the job market.

Paid training, depending on your role type (Administrator, Developer, Security, etc.), can be provided directly by Microsoft or accredited organizations.

Below is a link to the official Microsoft poster presenting the list of currently available certifications: [Microsoft Certification Poster](http://aka.ms/TrainCertPoster)

## Use Azure Cost Management
---

Take advantage of the tools included in your Azure subscription to better leverage the cloud and implement financial governance in your organization.

Track resource usage and manage costs with a single, unified view.

More information at the following link: [Azure Cost Management](https://azure.microsoft.com/en-us/services/cost-management/)

## Select the right Azure region to deploy your resources
---

As of today, Microsoft Azure offers 56 Azure regions worldwide. This allows you to deploy resources wherever you need them. But it can also help you reduce costs. Not all Azure services are available in all Azure regions, and not all Azure services cost the same in each region. Azure resource prices can depend on operating costs and other factors in the specific region. Generally, you want to deploy your virtual machines as close as possible to where you need them and place them in specific Azure regions.

This is why deploying and using the same Windows virtual machine in France will not cost the same as in Australia, for example.

## Sign an enterprise agreement
---

For large organizations, signing an enterprise agreement (EA) with Microsoft will allow you to consolidate all your Azure subscriptions into a single contract. Generating volume will allow you to negotiate discounts and rebates with Microsoft.

## Other cost optimization topics, in progress:
---

- Organize resources with management groups, for example (Test, prod, dev)
- Committing to long-term consumption (3 to 5 years) can lower the price
- Select the right region to store data
- Use Dev/test subscriptions
- Azure Low Priority VM
- Choose the right type of workload for your application (VM, container, App Service, etc.): [Choose an Azure compute service](https://docs.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree)
- Use containers
- Use the pricing calculator
- Monitor and downsize resources
- Configure autoscaling
- Stay informed about new features
- Use PaaS and SaaS
- Azure Dev test
- Set up budgets
- Use burstable VMs
- Use Azure spot VMs
- Management groups
- Azure policies and initiatives
- Train cloud operators
- Conduct regular reviews
- Understand and review your Azure bill
- Use third-party tools for FinOps: Cloudyn, etc.
- Conduct architecture reviews: [Azure Well-Architected Review](https://docs.microsoft.com/en-us/assessments/)
- Develop FinOps practices within your company
- [Azure Optimization Engine](https://github.com/helderpinto/AzureOptimizationEngine): The Azure Optimization Engine is an extensible solution designed to generate optimization recommendations for your Azure environment. See it like a fully customizable Azure Advisor.
- Naming convention
- RBAC
