+++
author = "Benoit G"
title = "Terraform vs Bicep, the Match"
date = "2024-12-06"
description = "A side-by-side comparison of Terraform and Bicep across language, state management, learning curve, cost, and more, based on hands-on experience with both."
tags = ["Terraform", "Bicep"]
categories = ["Azure"]
featureImage = "/articles/images/bicep.svg"
+++

What truly matters when working with Azure is deciding whether Terraform or Bicep is the right choice for your needs.

For the past few years, my professional focus has been on developing Infrastructure-as-Code and CI/CD pipelines for various Azure customers. Through this, I've gained hands-on experience with both Terraform and Bicep. I'd like to share my perspective on the topic.

🟢 Green highlights positive points. 🔴 Red indicates negative points. 🟠 Orange represents neutral or mixed points.

| Feature | Terraform | Bicep |
|---|---|---|
| Language | 🟠 HCL | 🟢 JSON-like |
| Multi provider | 🟢 Yes | 🔴 No |
| Editor/owner | 🟢 HashiCorp | 🟢 Microsoft |
| Age | 🟢 2014 | 🟠 2020 |
| State management | 🔴 Required | 🟢 Stateless |
| Native to Azure | 🔴 No | 🟢 Yes |
| Learning curve | 🟠 Moderate | 🟢 Easy |
| Modules | 🟢 Yes | 🟢 Yes |
| Logging | 🟠 Moderate | 🟢 Portal |
| Advanced features | 🟢 Yes | 🟠 Moderate |
| Support outside changes | 🔴 No | 🟢 Yes |
| VS Code integration | 🟢 Yes | 🟢 Yes |
| CI/CD | 🟢 Yes | 🟢 Yes |
| Adoption | 🟢 High | 🟠 Moderate |
| Cost | 🟠 Free / licence | 🟢 Free |

[[toc]]

## Language

- **Terraform**: uses its own declarative HashiCorp Configuration Language (HCL), which is cloud-agnostic.
- **Bicep**: simplified syntax designed to work exclusively with Azure, serving as an abstraction over ARM JSON templates.

## Multi provider

- **Terraform**: a multi-cloud Infrastructure as Code (IaC) tool designed for provisioning resources across various cloud platforms - multi-cloud support (Azure, AWS, GCP, etc.), enabling hybrid cloud deployments.
- **Bicep**: a domain-specific IaC tool for deploying Azure resources, designed as a simplified alternative to Azure Resource Manager (ARM) templates - Azure-only, deeply integrated with the Azure ecosystem.

## Editors

- **Terraform**: created by HashiCorp in 2014.
- **Bicep**: created by Microsoft in 2020.

## State management

- **Terraform**: requires a state file to track resource changes; supports remote state storage (e.g., Azure Blob Storage, S3).
- **Bicep**: stateless - relies on Azure Resource Manager's existing state, eliminating the need for a separate state file.

## Learning curve

- **Terraform**: slightly steeper learning curve due to HCL and the need to manage state files.
- **Bicep**: easier for those already familiar with Azure, thanks to simpler syntax and Azure-specific focus.

## Modularity

- **Terraform**: supports modules for reusable code, which can be shared across clouds. Highly extensible through custom providers and community plugins.
- **Bicep**: supports modules, but limited to Azure-specific scenarios and extensions.

## Maturity

- **Terraform**: mature and widely adopted, with a large user base and community support.
- **Bicep**: newer, rapidly evolving, but designed as the preferred way to manage Azure resources.

## Cost

- **Terraform**: open source, but also offers paid enterprise features such as Terraform Cloud for team collaboration and advanced capabilities. HashiCorp's licensing model changed to the Business Source License (BSL), leading to the community-driven fork OpenTofu, which adheres to a fully open-source model.
- **Bicep**: completely free, part of the Azure tooling suite.

## To conclude

In conclusion, there is no "IaC war" - both tools have their strengths. For many use cases, I prefer Bicep over Terraform, particularly in scenarios where no one else will manage the IaC, or to sidestep chicken-and-egg challenges such as provisioning the storage account used for Terraform's own state.

For other use cases, I'll stick with Terraform, as it keeps people aligned with a consistent, multi-cloud approach and provides robust state management, making it ideal for more complex or diverse infrastructure scenarios. The Terraform community is also currently more established and active than the Bicep community, largely due to the longer maturity of the product.

Enjoy!
