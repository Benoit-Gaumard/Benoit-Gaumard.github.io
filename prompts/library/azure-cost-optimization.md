---
title: Azure cost optimization plan
description: Analyze an Azure cost export and get a prioritized FinOps action plan with estimated savings.
category: Azure
tags: [finops, cost, azure, optimization]
models: Any LLM
date: 2026-07-01
---
Act as an Azure FinOps practitioner. Here is a summary of my monthly Azure spend (service, resource, SKU, cost, usage):

{{Cost data}}

Environment context: {{Context (production or not, working hours, growth)}}

Produce:
1. The top cost drivers and whether each looks normal.
2. Quick wins (rightsizing, shutting down idle resources, deleting orphaned disks and IPs, cheaper storage tiers).
3. Commitment options (Reservations, Savings Plan, Azure Hybrid Benefit) with the break-even reasoning.
4. Architecture changes worth considering for the long term.
5. A table of actions with estimated monthly savings, effort and risk.

State your assumptions clearly. Do not recommend anything that would reduce production reliability without flagging it.
