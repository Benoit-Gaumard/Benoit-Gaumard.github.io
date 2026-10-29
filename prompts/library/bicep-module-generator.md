---
title: Bicep module generator
description: Generate a clean, parameterized and secure-by-default Bicep module for any Azure resource.
category: Infrastructure as Code
tags: [bicep, iac, azure, avm]
models: Any LLM, GitHub Copilot
date: 2026-07-01
featured: true
---
Act as an Azure infrastructure-as-code expert. Write a production-ready Bicep module that deploys {{Azure resource}}.

Requirements:
- Target API version: the latest stable one you know of. Say which one you used.
- Parameters with @description, sensible defaults and @allowed values where relevant.
- Secure by default: private networking when the service supports it, TLS 1.2 minimum, managed identity, public network access disabled, diagnostic settings sent to a Log Analytics workspace passed as a parameter.
- Naming follows this convention: {{Naming convention}}
- Tags passed as an object parameter.
- Outputs: resource ID, name and any endpoint a consumer would need.

Follow the Azure Verified Modules (AVM) style. After the code, give a short example of how to call the module from a main.bicep file, and list the security choices you made.
