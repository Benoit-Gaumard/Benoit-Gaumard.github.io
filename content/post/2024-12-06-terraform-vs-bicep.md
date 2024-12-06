+++
author = "Benoit G"
title = "Terraform vs Bicep, the match"
date = "2024-12-06"
description = ""
toc = false
draft = false
tags = [
    "Terraform", "Bicep"
]
categories = ["Azure", "Tools"
]
featureImage = "/images/bicep.svg" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/bicep.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

Terraform Vs Bicep. What truly matters when working with Azure is deciding whether Terraform or Bicep is the right choice for your needs.
<!--more-->

<img src="/images/bicep.svg"> VS <img src="/images/terraform.svg">

For the past few years, my professional focus has been on developing Infrastructure-as-Code and CI/CD pipelines for various Azure customers. Through this, I've gained hands-on experience with both Terraform and Bicep.

I would like to share my perspective on the topic.

🟢 Green bullets highlight positive points.<br>
🔴 Red bullets indicate negative points.<br>
🟠 Orange bullets represent neutral or mixed points.<br>

| Feature                 | Terraform           | Bicep          |
|-------------------------|---------------------|----------------|
| Language                | 🟠 HCL              | 🟢 JSON       |
| Multi provider          | 🟢 Yes              | 🔴 No         |
| Editor                  | 🟢 Hashicorp        | 🟢 Microsoft  |
| Age                     | 🟢 2014             | 🟠2020        |
| State Management        | 🔴 Yes              | 🟢 No         |
| Native                  | 🔴 No               | 🟢 Yes        |
| Learning Curve          | 🟠 Moderate         | 🟢 Easy       |
| Modules                 | 🟢 Yes              | 🟢 Yes        |
| Logging                 | 🟠 Moderate         | 🟢 Portal     |
| Advanced features       | 🟢 Yes              | 🟠 Moderate   |
| Support outside changes | 🔴 No               | 🟢 Yes        |
| VS Code integration     | 🟢 Yes              | 🟢 Yes        |
| CI /CD                  | 🟢 Yes              | 🟢 Yes        |
| Adoption                | 🟢 High             | 🟠 Moderate   |
| Cost                    | 🟠 Free / Licence   | 🟢 Free       |

## Language
---

- Terraform: Uses its own declarative HashiCorp Configuration Language (HCL), which is cloud-agnostic.
- Bicep: Simplified syntax designed to work exclusively with Azure, serving as an abstraction over ARM JSON templates.

##  Multi provider
---

- Terraform: A multi-cloud Infrastructure as Code (IaC) tool designed for provisioning resources across various cloud platforms.
Multi-cloud support (Azure, AWS, GCP, etc.), enabling hybrid cloud deployments.
- Bicep: A domain-specific IaC tool for deploying Azure resources, designed as a simplified alternative to Azure Resource Manager (ARM) templates. Azure-only, deeply integrated with the Azure ecosystem.

##  Editors
---

- Terraform: HashiCorp in 2014
- Bicep: Microsoft in 2020

## State Management
---

- Terraform: Requires a state file to track resource changes; supports remote state storage (e.g., Azure Blob Storage, S3).
- Bicep: Stateless; relies on Azure Resource Manager's existing state, eliminating the need for a separate state file.


## Learning Curve
---

- Terraform: Slightly steeper learning curve due to HCL and the need to manage state files.
- Bicep: Easier for those already familiar with Azure, thanks to simpler syntax and Azure-specific focus.

## Modularity
---

- Terraform: Supports modules for reusable code, which can be shared across clouds. Highly extensible through custom providers and community plugins
- Bicep: Supports modules, but limited to Azure-specific scenarios. Limited to Azure-specific extensions and features.

## Maturity
---

- Terraform: Mature and widely adopted, with a large user base and community support.
- Bicep: Newer, rapidly evolving, but designed as the preferred way to manage Azure resources.

## Cost
---

- Terraform: Terraform is open-source but also offers paid enterprise features, such as Terraform Cloud, which facilitates team collaboration and advanced capabilities. Recently, HashiCorp’s licensing model changed to the Business Source License (BSL), leading to the creation of a community-driven fork called OpenTofu, which adheres to a fully open-source model to maintain its compatibility and broader accessibility.
- Bicep: Completely free, part of the Azure tooling suite.

## To conclude
---

In conclusion, there is no "IaC war"—both tools have their strengths. For many use cases, I prefer Bicep over Terraform, particularly in scenarios where no one else will manage the IaC or to sidestep chicken-and-egg challenges, such as provisioning the storage account used for Terraform’s state.

For other use cases, I’ll stick with Terraform as it keeps people aligned with a consistent, multi-cloud approach and provides robust state management, making it ideal for more complex or diverse infrastructure scenarios. Additionally, the Terraform community is currently more established and active than the Bicep community, largely due to the longer maturity of the product.

Enjoy!