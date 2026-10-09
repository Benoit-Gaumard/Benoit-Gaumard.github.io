+++
author = "Benoit G"
title = "Don't Build Your Cloud Home on Shaky Foundations"
date = "2024-11-06"
description = "A grouped Azure foundations checklist: decide ownership first, then governance, platform connectivity and ongoing operations before onboarding workloads."
tags = ["Governance"]
categories = ["Azure"]
featureImage = "/articles/images/shaky-foundations.jpeg"
featured = true
related = ["what-is-an-azure-landing-zone", "azure-policy-part-1-what-is-a-policy", "dns-in-azure-part-1-fundamentals"]
+++

Like a house, a cloud platform needs its foundations before its furnishings. The useful outcome is a set of **owned decisions and acceptance checks**, not a requirement to deploy every possible service.

## 1. Organisation

- **CAF and landing zones:** decide who owns the platform and how workload teams onboard. Use the [Cloud Adoption Framework](https://learn.microsoft.com/azure/cloud-adoption-framework/) and [landing-zone introduction](/articles/what-is-an-azure-landing-zone/).
- **Management groups:** decide which subscriptions share controls and who may change the hierarchy. Check inherited Policy/RBAC before moving subscriptions.
- **Subscription lifecycle:** record billing ownership, onboarding, suspension and decommissioning responsibilities.

## 2. Governance

- **Policy:** choose the controls, scopes and rollout approach; [understand definitions versus assignments](/articles/azure-policy-part-1-what-is-a-policy/) before enabling Deny.
- **RBAC:** decide who needs which operation at which scope; use groups and inspect [built-in roles](/azure-built-in-roles/) rather than assigning Owner by habit.
- **Naming:** agree on readable examples and actual service constraints using the [naming tool](/azure-naming-convention/).
- **Tags:** choose accountable owner, environment and cost-allocation fields; check [tag support](/azure-taggable-resources/) before enforcing a blanket rule.

## 3. Platform

- **Automation:** decide how changes are reviewed, planned and promoted; use a protected identity and [OIDC federation](/articles/connect-github-and-azure-for-deployment-using-oidc/).
- **Network and DNS:** choose address space, routing, resolver ownership and private/public access requirements. Start with [DNS fundamentals](/articles/dns-in-azure-part-1-fundamentals/) and the [subnet calculator](/subnet-calculator/).
- **Compute choices:** VMs, NAT Gateway, hub-and-spoke and other components depend on the workload. A foundation decision is required; deploying each component is not universally required.

![Cloud foundation topics](/articles/images/cloud-home.png "The foundation topics above provide the text alternative to this illustration.")

## 4. Operations

- **Monitoring and response:** agree who receives alerts, how logs are retained and how an incident is handled.
- **Recovery:** record backups, restoration ownership and actual restore-test results.
- **Cost:** establish budgets, ownership and review cadence using [the cost checklist](/articles/optimize-and-reduce-costs-in-azure/); a budget alert is not a hard spending cap.
- **Evidence:** keep decisions, approved exceptions and validation results in the platform repository.

## Copy or print the readiness checklist

The article's Share action includes Print. This record is a starting template, not evidence that a platform is compliant.

```text
Workload and accountable owner:
Subscription / management-group placement:
Identity / least-privilege role scope:
Policy baseline / rollout / exception owner:
Naming and mandatory tags:
Network / DNS / public-access decisions:
Reviewed deployment and recovery process:
Monitoring / incident / cost ownership:
Acceptance tests and actual results:
Open decisions before onboarding:
```

Optional inventory aid: [AzGovViz](https://github.com/JulianHayward/Azure-MG-Sub-Governance-Reporting) can help review hierarchy and governance; it does not make the decisions for you. No platform deployment or validation result is recorded by this checklist.
