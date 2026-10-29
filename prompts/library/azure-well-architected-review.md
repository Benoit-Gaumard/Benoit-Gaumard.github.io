---
title: Azure Well-Architected review
description: Get a structured review of an Azure architecture against the five Well-Architected pillars, with prioritized fixes.
category: Azure
tags: [architecture, waf, review, reliability, security]
models: Any LLM
date: 2026-07-01
featured: true
---
You are a senior Microsoft Azure solutions architect. Review the architecture below against the five pillars of the Azure Well-Architected Framework: Reliability, Security, Cost Optimization, Operational Excellence and Performance Efficiency.

Context:
- Workload: {{Workload description}}
- Business criticality and SLA target: {{SLA target}}
- Architecture (services, regions, network, identity): {{Architecture details}}

For each pillar:
1. List what is already good.
2. List the risks, each with a severity (High, Medium, Low) and the reason.
3. Recommend concrete fixes that name the Azure service, SKU or feature to use.

Finish with a table of the top 5 actions, ranked by impact versus effort. Ask me questions first if a critical piece of information is missing. Do not invent services that do not exist.
