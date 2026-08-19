+++
author = "Benoit G"
title = "What Is an Azure Landing Zone?"
date = "2026-08-10"
description = "A practical introduction to Azure landing zones: what they are, why they matter, and the building blocks every platform team should know."
tags = ["Azure", "Landing Zone", "Governance"]
categories = ["Azure", "Governance"]
featureImage = "/articles/images/azure-landing-zone.svg"
featured = true
+++

An Azure landing zone is the environment where you deploy and operate your applications and workloads. It is not a single resource — it is a combination of subscriptions, networking, identity, policy, and management tooling designed to scale safely as you onboard more teams and workloads.

[[toc]]

## Why landing zones matter

Most organizations don't start with a landing zone. They start with one subscription, a handful of resources, and no real governance. That works fine until a second team joins, then a third, and suddenly nobody can answer simple questions like *"who can create a public IP address?"* or *"which subscription does this cost belong to?"*

A landing zone gives you:

- A consistent way to provision new subscriptions for teams and workloads
- Centralized identity and access management
- Guardrails enforced through Azure Policy rather than tribal knowledge
- A hub-and-spoke (or Virtual WAN) network topology with shared connectivity
- Centralized logging, monitoring, and cost management

:::note
You don't need to build all of this yourself. The [Cloud Adoption Framework](https://learn.microsoft.com/azure/cloud-adoption-framework/) publishes a reference architecture and a set of Azure Landing Zone Bicep/Terraform modules that already implement these patterns.
:::

## The core building blocks

| Building block | Purpose |
|---|---|
| Management groups | Organize subscriptions hierarchically and apply policy/RBAC at scale |
| Identity | Centralize Microsoft Entra ID, conditional access, and privileged access |
| Connectivity | Hub network, firewall, ExpressRoute/VPN, DNS |
| Management | Centralized logging, monitoring, backup, and update management |
| Security | Defender for Cloud, Key Vault, encryption standards |
| Platform automation | Infrastructure as Code pipelines that provision new landing zones on demand |

### A minimal management group hierarchy

A typical starting hierarchy looks like this:

```text
Tenant Root Group
└── Contoso
    ├── Platform
    │   ├── Management
    │   ├── Connectivity
    │   └── Identity
    ├── Landing Zones
    │   ├── Corp
    │   └── Online
    ├── Sandbox
    └── Decommissioned
```

Each management group carries its own set of Azure Policy assignments. For example, the `Corp` landing zones might deny public IP addresses entirely, while `Sandbox` subscriptions allow more experimentation with a hard spending cap.

## Deploying a landing zone with Terraform

Most teams provision landing zones with Infrastructure as Code so every new subscription is consistent and repeatable.

```hcl
module "landing_zone" {
  source  = "Azure/lz-vending/azurerm"
  version = "~> 4.0"

  subscription_alias_enabled = true
  subscription_display_name  = "sub-contoso-corp-001"
  subscription_alias_name    = "sub-contoso-corp-001"
  subscription_billing_scope = var.billing_scope

  subscription_management_group_association_enabled = true
  subscription_management_group_id                   = "corp"
}
```

:::warning
Landing zone deployments usually run with highly privileged credentials at the tenant or management-group scope. Keep this pipeline separate from your application pipelines, protect it with required reviewers, and use OIDC federated credentials instead of long-lived secrets — see [Connect GitHub and Azure for deployment using OIDC](/articles/connect-github-and-azure-for-deployment-using-oidc/) for a full walkthrough.
:::

---

## Landing zone vs. subscription vesting

A landing zone is not the same thing as "a subscription." A single landing zone (say, `Corp`) can contain many subscriptions, and a single subscription usually hosts many workloads. The landing zone defines the *guardrails* that every subscription underneath it inherits automatically — new subscriptions don't require manual policy configuration.

## Where to go next

1. Read the [Azure Landing Zone conceptual architecture](https://learn.microsoft.com/azure/cloud-adoption-framework/ready/landing-zone/) on Microsoft Learn.
2. Decide whether you need the full enterprise-scale architecture or a lighter-weight starter landing zone.
3. Pick an Infrastructure as Code tool (Bicep or Terraform) and automate subscription vending from day one.

Landing zones are a journey, not a one-time setup — expect to revisit policy assignments and network design as your platform grows.
