+++
author = "Benoit G"
title = "Network Security Perimeter (NSP)"
date = "2025-01-31"
description = "An overview of Azure Network Security Perimeter: the pain points it solves for PaaS resource access control, how it compares to existing patterns, and its current limitations."
tags = ["Network", "Security"]
categories = ["Azure"]
featureImage = "/articles/images/Network-Security-Groups.svg"
+++

Network Security Perimeter (NSP) allows organizations to define a logical network isolation boundary for PaaS resources (for example, Azure Storage accounts and SQL Database servers) that are deployed outside your organization's virtual networks. It restricts public network access to PaaS resources within the perimeter; access can be exempted using explicit access rules for public inbound and outbound traffic.

![Network Security Perimeter overview](https://learn.microsoft.com/en-us/azure/private-link/media/network-security-perimeter-concepts/network-security-perimeter-overview.png)

Official Microsoft documentation: [Network security perimeter concepts](https://learn.microsoft.com/en-us/azure/private-link/network-security-perimeter-concepts)

[[toc]]

## Pain points

- **Inconsistent access controls**: PaaS services have partial and inconsistent inbound access controls.
- **Varied user experience**: access control mechanisms differ across services (portal, API, CLI, etc.).
- **Scalability challenges**: managing compliance and auditing is complex, requiring custom Azure Policies for each service.

## Existing patterns

Here are the existing patterns to avoid public endpoints and secure access:

- **VNet injection/integration**: allows service instances to run inside the customer's VNet, providing better control and security. See [VNet integration for Azure services](https://learn.microsoft.com/en-us/azure/virtual-network/vnet-integration-for-azure-services).
- **Private Link / Private Endpoint**: used for services running outside the customer's VNet, ensuring secure and private access. See [Private Link service overview](https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview).

## Network access control features in Azure

- Network Security Group (NSG)
- Azure Firewall network rules
- Azure Virtual Network Manager (AVNM) admin rules
- Network Security Perimeter (public preview)

## Azure Network Security Perimeter for PaaS resources

- Centrally manages your ACLs and access controls for PaaS resources.
- Announced in public preview at Microsoft Ignite 2024. See [What is a network security perimeter?](https://learn.microsoft.com/en-us/azure/private-link/network-security-perimeter-concepts)
- Today, PaaS services only - more services are expected to be onboarded over time.
- API: `Microsoft.Network/networkSecurityPerimeters`.
- IaC: Bicep / ARM / Terraform via the raw Azure API only - no dedicated Terraform provider resource or AzAPI module yet.

## Overview

- **Without Network Security Perimeter**: one firewall rule per resource.
- **With Network Security Perimeter**: one access rule to secure all the resources in the perimeter.

## Deployment

The main steps are: deploy the perimeter from the Azure portal, create inbound and outbound access rules, associate resources to the perimeter, and adjust the associated resources' access modes as needed.
