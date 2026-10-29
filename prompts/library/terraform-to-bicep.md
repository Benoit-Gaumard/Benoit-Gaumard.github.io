---
title: Convert Terraform to Bicep
description: Translate Terraform (azurerm) code into equivalent, idiomatic Bicep and flag what does not map one to one.
category: Infrastructure as Code
tags: [terraform, bicep, migration, iac]
models: Any LLM, GitHub Copilot
date: 2026-07-01
---
Convert the following Terraform code that uses the azurerm provider into idiomatic Bicep.

```hcl
{{Terraform code}}
```

Rules:
- Map each azurerm resource to its Microsoft.* resource type and a stable API version.
- Turn variables into Bicep parameters (keep descriptions and defaults) and locals into variables.
- Use symbolic references instead of hard-coded resource IDs, and existing resources where Terraform used data sources.
- Replace count and for_each with Bicep loops.

Then add a section named "Not a 1:1 mapping" that lists anything that behaves differently (state, lifecycle blocks, provider-only features) and how to handle it.
