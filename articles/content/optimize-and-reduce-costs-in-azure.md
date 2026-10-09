+++
author = "Benoit G"
title = "Optimize and Reduce Costs in Azure"
date = "2024-09-11"
description = "Prioritise Azure cost work by effort, reversibility and commitment: establish a baseline, review usage, improve governance, then evaluate financial commitments."
tags = ["Cost Optimization"]
categories = ["Azure"]
featureImage = "/articles/images/cost-management.svg"
featured = true
collapsible = ["Operational changes", "Governance and ongoing ownership", "Financial commitments", "Architecture and commercial decisions"]
related = ["remove-old-azure-resources-based-on-tags", "dont-build-your-cloud-home-on-shaky-foundations"]
+++

## Three first checks

1. **Find the baseline:** in Cost Management, choose the correct billing scope/date range and identify the largest services, subscriptions and unexplained changes. Record actual spend, not an assumed saving.
2. **Find the owner and usage:** compare Advisor recommendations with workload metrics, peak demand and service-level requirements. An idle-looking disk or VM may be a recovery dependency.
3. **Review a reversible change:** agree on a small rightsizing or scheduling trial with its owner and rollback. Delete only after retention/recovery checks; buy commitments only after stable usage is understood.

No saving percentage or Azure execution result is demonstrated by this article. Price, eligibility and contract reviews are **not recorded**; consult [Cost Management](https://learn.microsoft.com/azure/cost-management-billing/costs/overview-cost-management) and your actual agreement.

## Prioritise the work

| Family | Typical effort | Reversibility | Prerequisite |
|---|---|---|---|
| Usage review and Advisor triage | Low to moderate | Read-only | Correct scope and representative metrics |
| Scheduling and rightsizing | Moderate | Often reversible, but downtime/capacity may matter | Owner approval, performance baseline, rollback |
| Data/resource cleanup | Moderate | Potentially irreversible | Dependency inventory, retention and restore evidence |
| Tags, policy and budget ownership | Moderate | Policy enforcement needs controlled rollout | Named owners and valid service constraints |
| Reservations/savings plans/licence benefits | Commercial review | Contract-dependent, not equivalent to stopping a VM | Stable eligible usage, terms and licence evidence |
| Region, platform and agreement changes | High | Migration/contract-dependent | Architecture, residency, reliability and finance approval |

## Operational changes

**VM sizing:** compare CPU, memory, disk and network demand across representative periods, not just averages. [VM selector](https://azure.microsoft.com/pricing/virtual-machines/) and Advisor help narrow choices; a resize can require restart or encounter capacity constraints.

**Start/stop schedules:** agree on working hours and dependencies. Verify **Stopped (deallocated)** for compute-allocation savings; stopping the guest OS alone is not equivalent. Disks, reserved IPs and other resources can still be billed. Check current [VM state and billing guidance](https://learn.microsoft.com/azure/virtual-machines/states-billing).

**Disks and blob tiers:** choose measured IOPS/throughput/redundancy needs and data access patterns. Lower storage prices can add retrieval, transaction, rehydration or early-deletion costs. Check current [blob tiers](https://learn.microsoft.com/azure/storage/blobs/access-tiers-overview); do not archive data that must be immediately available.

**Orphan/data cleanup:** inventory unattached resources and obsolete data, obtain owner/retention approval, then follow the [preview-first TTL review](/articles/remove-old-azure-resources-based-on-tags/). "Unattached" is not proof of "safe to delete".

## Governance and ongoing ownership

**Allowed VM sizes:** use policy only after selecting supported SKUs for the actual region/workload. Test Audit before Deny and maintain an exception path; copying old `Basic_A` examples is not a current capacity recommendation.

**Tags and policies:** agree on Owner, Environment and cost-allocation tags. Verify [tag support](/azure-taggable-resources/) and review missing ownership before enforcing. The [Policies catalogue](/azure-policies/) is a starting point, not a complete cost control.

**Cost Management and training:** assign budget alerts and anomaly reviews to people who will act. Budgets are alerts, not hard caps. Train workload owners using [Microsoft Learn](https://learn.microsoft.com/training/) and review spend continuously after changes.

## Financial commitments

**Reservations:** exchange an eligible usage commitment for contractual pricing. Compare utilisation, scope, term, region/family flexibility and current exchange/refund rules before buying. A reservation does not stop or resize a resource. See [reservation guidance](https://learn.microsoft.com/azure/cost-management-billing/reservations/save-compute-costs-reservations).

**Savings plans:** evaluate eligible hourly compute spend, term and scope against a stable baseline. Unused commitment and workloads outside eligibility affect the outcome. Review [savings plan documentation](https://learn.microsoft.com/azure/cost-management-billing/savings-plan/).

**Azure Hybrid Benefit:** confirm actual eligible licences, Software Assurance/subscription rights and permitted reuse before enabling it. A policy setting is not proof of entitlement. Keep evidence with finance/licensing owners; see [Hybrid Benefit](https://azure.microsoft.com/pricing/hybrid-benefit/).

## Architecture and commercial decisions

**Regions:** compare total costs including latency, egress, replication, availability and data-residency requirements. Use [Azure Regions](/azure-regions/) for orientation and verify current service pricing.

**Agreements:** enterprise/commercial discounts depend on your agreement and procurement terms; no universal discount or multi-year saving is promised here.

**Workload choices:** evaluate Spot eviction tolerance, burstable CPU behaviour, Dev/Test eligibility, autoscaling, containers and alternative compute services. Choose based on [workload requirements](https://learn.microsoft.com/azure/architecture/guide/technology-choices/compute-decision-tree), not a universal cheapest architecture.

**Continuous review:** use a [Well-Architected Review](https://learn.microsoft.com/assessments/) and FinOps ownership. Optional inventory/automation tools such as [Azure Optimization Engine](https://github.com/helderpinto/AzureOptimizationEngine) still need scoped permissions and review.

## Copy or print a cost review

```text
Billing scope and baseline period:
Service/resource and accountable owner:
Observed usage and reliability requirements:
Proposed change and expected cost mechanism:
Commitment / licence / retention conditions:
Approval and rollback or restore plan:
Actual before/after measurement:
Next review:
```
