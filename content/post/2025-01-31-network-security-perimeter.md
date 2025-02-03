+++
author = "Benoit G"
title = "Network Security Perimeter (NSP)"
date = "2025-01-31"
description = ""
toc = false
draft = false
tags = [
    "Network", "Security"
]
categories = ["Azure"]
#featureImage = "/images/Network-Security-Groups.svg" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/Network-Security-Groups.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/Network-Security-Groups.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

Do you want to restrict access to your Web App to specific users or groups within your organization? (which is by default enabled for all the users in the tenant).
<!--more-->

<img src="/images/Network-Security-Groups.svg">

Network security perimeter (NSP) allows organizations to define a logical network isolation boundary for PaaS resources (for example, Azure Storage account and SQL Database server) that are deployed outside your organization’s virtual networks. It restricts public network access to PaaS resources within the perimeter; access can be exempted by using explicit access rules for public inbound and outbound.

<img src="https://learn.microsoft.com/en-us/azure/private-link/media/network-security-perimeter-concepts/network-security-perimeter-overview.png" width="100%" height="100%">

Official Microsoft documentation: https://learn.microsoft.com/en-us/azure/private-link/network-security-perimeter-concepts

## Pain points
---

- Inconsistent access controls: PaaS services have partial and inconsistent inbound access controls.
- Varied user experience: Access control mechanisms differ across services (Portal, API, CLI, etc.).
- Scalability challenges: Managing compliance and auditing is complex, requiring custom Azure Policies for each service.


## Existing patterns
---
Here are the existing patterns to avoid public endpoints and to secure access:

- **VNet Injection/Integration**: This allows service instances to run inside the customer's VNet, providing better control and security.
    - https://learn.microsoft.com/en-us/azure/virtual-network/vnet-integration-for-azure-services

- **Private Link / Private Endpoint**: These are used for services running outside the customer's VNet, ensuring secure and private access.
  - https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview

## Network Access Control features in Azure
---

Here are the features available on Azure:

- Network Security Group (NSG)
- Azure Firewall Network Rule
- Azure Virtual Network Manager (AVNM) Admin Rule
- Network Security Perimeter (Private Preview)

## Azure Network Security Perimeter (NSP)For PaaS Resources
---

- Centrally manage your ACLs
- Centralized mechanism for Access Controls (PaaS)
- During Microsoft Ignite 2024, Microsoft announced the public preview of Network Security Perimeter.
- What is a network security perimeter? | Microsoft Learn
- A game changer for the future
- PaaS services only
- Maybe one day all features will be here
- API: Microsoft.Network/networkSecurityPerimeters
- IAC: Bicep / ARM / Terraform (No provider, no module / AZ API only)

## Overview
---

- Without Network Security Perimeter: Firewall Rules On Every Resource / One firewall rule per resource
- With Network Security Perimeter: Access Rules /One access rule to secure all the resources

## Deployment
---

### Deploy from Azure portal

### Create Inbound and Outbound rules

### Associate resources

### Modify associated resource (If needed)

### Conclusion