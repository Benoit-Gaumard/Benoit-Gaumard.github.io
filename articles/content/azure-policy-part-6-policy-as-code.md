+++
author = "Benoit G"
title = "Azure Policy, Part 6: Azure Policy as Code"
date = "2026-09-04"
description = "Part 6 of the Azure Policy series: why the portal stops working at scale, Microsoft's create-test-deploy workflow, the deployment ordering problem, drift and desired state, the managed identity permission gap, and what to put in your repository."
tags = ["Azure Policy", "Governance", "DevOps", "CI/CD", "Bicep", "Terraform"]
categories = ["Azure", "Governance", "Azure Policy"]
featureImage = "/articles/images/azure-policy-part-6.svg"
featured = false
+++

Five posts in, the model is complete: definitions, initiatives, assignments, exclusions, exemptions. All five are JSON documents with dependencies on each other, and every one of them can break a production deployment.

Now scale it. Four management group layers, sixty subscriptions, three regulatory frameworks, two clouds, a security team that owns half the controls and a platform team that owns the other half, and an auditor who wants to know why control 4.2.1 was disabled between March and June.

The portal cannot do that. Not "it is inconvenient" - it structurally cannot, because it has no diff, no review, no history, no rollback, and no way to answer "what changed and who approved it".

- **[Part 1](/articles/azure-policy-part-1-what-is-a-policy/)** - what a policy definition actually is
- **[Part 2](/articles/azure-policy-part-2-initiatives/)** - initiatives, also known as policy set definitions
- **[Part 3](/articles/azure-policy-part-3-assignments/)** - assignments, scope, and enforcement
- **[Part 4](/articles/azure-policy-part-4-exclusions-notscopes/)** - exclusions and `notScopes`
- **[Part 5](/articles/azure-policy-part-5-exemptions/)** - exemptions
- **Part 6 (this post)** - Azure Policy as code
- **[Part 7](/articles/azure-policy-part-7-epac/)** - EPAC and the alternatives

[[toc]]

## What "policy as code" actually means

It is not "we wrote the JSON in VS Code". Everyone writes the JSON somewhere.

Policy as code means **the repository is the source of truth, and Azure is a projection of it**. Concretely:

- Every definition, initiative, assignment, and exemption exists as a file in version control
- Changes reach Azure only through a pipeline, never through a human in the portal
- The pipeline can tell you what it is *about to* change before it changes it
- Anything in Azure that is not in the repository is either removed or explicitly declared out of scope
- Write access to policy objects in production belongs to the pipeline identity, not to people

That last point is the one that turns this from a nice-to-have into a control. Microsoft's own guidance says it directly: use a centralised deployment mechanism such as GitHub workflows or Azure Pipelines, and **restrict write permissions on policy resources to the deployment identity**.

## The problems it solves

### Drift

Someone adds a subscription to `notScopes` at 11 p.m. to unblock a release. It works. Nobody removes it. There is no record beyond an activity log entry that will age out, and the compliance dashboard now quietly excludes a subscription forever.

With a pipeline that reconciles desired state, that change either fails to persist or shows up as a diff on the next run. Drift becomes visible instead of cumulative.

### Review

A policy change is a production change. `Audit` to `Deny` on a broad management group has the same blast radius as a firewall rule change and receives, in most organisations, roughly none of the scrutiny.

A pull request fixes this for free. The diff shows `"effect": "Audit"` becoming `"effect": "Deny"`, a human approves it, and the approval is attached to the change permanently. My conventions for that are in [GitHub Contribution Workflow](/articles/github-contribution-workflow/) and [GitHub Branch Naming Convention](/articles/github-branch-naming-convention/).

### Evidence

"Prove that encryption-at-rest was enforced on all production subscriptions for the whole of FY26."

From the portal: you cannot. Assignments show current state. From a repository: `git log`, and every change carries an author, a timestamp, a reviewer, and a linked ticket. Auditors like this considerably more than a screenshot.

### Multi-environment consistency

The same baseline, `Audit` in the sandbox tenant and `Deny` in production, differing only by a parameter value. Building that twice by hand guarantees the two drift apart.

### Recovery

A deleted management group takes its assignments with it. A deleted resource group takes its exemptions with it. If the repository is the source of truth, recovery is a pipeline run. If it is not, recovery is archaeology.

## Microsoft's workflow: create, test, deploy

Microsoft's guidance page, *Design Azure Policy as Code workflows*, is short and worth reading. The recommended loop:

1. **Get everything into source control.** Export what already exists before writing anything new.
2. **Create or update definitions** as JSON in the repository.
3. **Create or update initiatives** - after their member definitions exist.
4. **Test and validate** by assigning in the environment furthest from production, with `enforcementMode` disabled, scoped to a dedicated validation resource group or subscription.
5. **Enable remediation tasks** - grant the managed identity its `roleDefinitionIds`, trigger remediation, then verify three things: the task completed, compliance updated, and *the resource properties actually changed*.
6. **Promote to enforced assignments**, ring by ring.

Microsoft's own diagram of that loop, which is worth pinning somewhere your team will see it:

![Create, test and deploy workflow for Azure Policy as Code](https://learn.microsoft.com/en-us/azure/governance/policy/media/policy-as-code/policy-as-code-workflow.png "Create definitions, create the initiative, assign with enforcement disabled, check compliance, grant the managed identity permissions and remediate, then enable enforcement")

*Source: [Design Azure Policy as Code workflows](https://learn.microsoft.com/en-us/azure/governance/policy/concepts/policy-as-code) - © Microsoft, Microsoft Learn.*

Step 4 has a caveat Microsoft states explicitly and people ignore: `enforcementMode` is not a substitute for real testing. A definition should be tested with both `PUT` and `PATCH` requests, against compliant and non-compliant resources, and against edge cases like a property being absent entirely. A rule that assumes a property exists behaves very differently on a `PATCH` that does not include it.

## The four hard problems

Any tool you choose - or build - has to solve these. This is the checklist to judge Part 7's options against.

### 1. Ordering

Policy objects have hard dependencies:

```diagram
  policyDefinitions
         │
         ▼
  policySetDefinitions   (reference definitions by resource ID)
         │
         ▼
  policyAssignments      (reference a definition or a set)
         │
         ├──────────────► role assignments for the managed identity
         │
         ▼
  policyExemptions       (reference an assignment)
```

Deploy them out of order and you get resolution failures. Delete them out of order and you get orphans: an initiative referencing a definition that no longer exists, or an exemption pointing at a deleted assignment.

Deletion order is the reverse of creation order, which naive tooling almost never gets right.

### 2. Scope spread

A single logical change touches multiple scopes: definitions at a management group, assignments at several child management groups, exemptions at resource groups, role assignments wherever the identity needs rights.

ARM deployments are scoped. A tool has to orchestrate deployments at management group, subscription, and resource group scope in one coherent operation - and know which scope each object belongs at.

### 3. The managed identity permission gap

Covered in [Part 3](/articles/azure-policy-part-3-assignments/), and it is the number one reason policy-as-code projects stall.

When you create a `deployIfNotExists` or `modify` assignment **anywhere other than the portal**, the role assignments its managed identity needs are **not created for you**. Your pipeline must create them, which means the pipeline identity needs rights to assign RBAC - a materially more privileged thing than deploying policy.

Good tooling separates these into two stages with two identities: one that can deploy policy, and one that can assign roles, with an approval gate between them. That is not paranoia; it is the difference between a compromised policy pipeline being annoying and being catastrophic.

### 4. Desired state and deletion

Creating and updating is easy. Deleting is where the design decisions are.

If a definition is removed from the repository, should the pipeline delete it from Azure? Say yes and you have true desired state - plus the ability to delete something a different team owns. Say no and Azure slowly accumulates objects nobody remembers creating.

Neither answer is universally right, which is why serious tools make it a configurable strategy and add an ownership marker so that "not in my repository" can be distinguished from "not in *any* repository". Part 7 shows how EPAC does this with `pacOwnerId` and a `full` versus `ownedOnly` strategy.

## Getting what you already have out of Azure

Before the pipeline, the export. Most estates already have dozens of assignments, some created by Microsoft Defender for Cloud automatically.

:::warning
The portal feature that exported policy definitions to GitHub was **deprecated in April 2023**. If you are following an older blog post that tells you to click *Export definitions*, stop - it is gone.
:::

What works today:

```powershell
# Custom definitions in a subscription
Get-AzPolicyDefinition -SubscriptionId $subId |
  Where-Object { $_.Properties.policyType -eq 'Custom' } |
  ForEach-Object { $_ | ConvertTo-Json -Depth 100 |
    Out-File "./policyDefinitions/$($_.Name).json" }

# Assignments at a management group and below
Get-AzPolicyAssignment -Scope "/providers/Microsoft.Management/managementGroups/mg-corp" |
  ConvertTo-Json -Depth 100 | Out-File "./assignments.json"
```

```bash
az policy definition list --query "[?policyType=='Custom']" -o json
az policy set-definition list --query "[?policyType=='Custom']" -o json
az policy assignment list --scope "/providers/Microsoft.Management/managementGroups/mg-corp" -o json
```

For a whole-estate inventory, Azure Resource Graph is faster than iterating scopes:

```kusto
policyresources
| where type in~ (
    "microsoft.authorization/policydefinitions",
    "microsoft.authorization/policysetdefinitions",
    "microsoft.authorization/policyassignments",
    "microsoft.authorization/policyexemptions")
| project type, name, id,
          displayName = tostring(properties.displayName),
          policyType  = tostring(properties.policyType)
| order by type asc, displayName asc
```

Raw exports are not repository-ready. They carry read-only fields - `id`, `type`, `createdBy`, `createdOn`, system-assigned `principalId` values - that must be stripped before the file can be redeployed. This tedium is exactly what EPAC's `Export-AzPolicyResources` automates, and it is a large part of why people adopt it rather than roll their own.

## What goes in the repository

Microsoft suggests a versioned file convention:

| File | Contents |
|---|---|
| `policy-v#.json` | The full policy definition for that version |
| `policyset-v#.json` | The full initiative definition for that version |
| `policy-v#.parameters.json` | Just `properties.parameters` |
| `policy-v#.rules.json` | Just `properties.policyRule` |
| `exemptionName.json` | An exemption |

That structure is fine and almost nobody uses it verbatim, because the tools have their own layouts. What matters is the principle underneath: **one object per file, versioned, in a predictable place**.

The layout I would actually recommend for a hand-rolled repository:

```diagram
  policy/
  ├── definitions/
  │   ├── storage/
  │   └── network/
  ├── initiatives/
  ├── assignments/
  │   ├── mg-corp-prod/
  │   └── mg-corp-nonprod/
  ├── exemptions/
  │   └── <subscription-name>/
  └── environments/
      ├── dev.parameters.json
      └── prod.parameters.json
```

Assignments grouped by the scope they target, exemptions grouped by who owns them, and environment differences isolated in parameter files rather than duplicated assignment files.

## Which deployment technology?

Four realistic options for the deployment layer itself.

| Approach | Strengths | Weaknesses |
|---|---|---|
| **Native JSON + PowerShell/CLI** | Files are exactly what the API expects; no translation | You write all the orchestration, ordering, and deletion logic |
| **Bicep / ARM** | First-class resource types, `what-if`, no state file | Policy JSON must be embedded or loaded; multi-scope work is awkward |
| **Terraform** | Mature `azurerm` policy resources, real plan output, state | The state file becomes a governance dependency; policy JSON lives inside HCL |
| **Purpose-built tool (EPAC)** | Solves all four hard problems out of the box | Another framework to learn and keep current |

Bicep and ARM use `Microsoft.Authorization/policyDefinitions`, `policySetDefinitions`, `policyAssignments`, and `policyExemptions` - the same shapes as the raw JSON, which keeps portal exports usable.

Terraform's `azurerm` provider covers the ground properly: `azurerm_policy_definition`, `azurerm_policy_set_definition`, per-scope assignment resources (`azurerm_management_group_policy_assignment`, `azurerm_subscription_policy_assignment`, `azurerm_resource_group_policy_assignment`, `azurerm_resource_policy_assignment`), matching exemption and remediation resources, and `azurerm_management_group_policy_set_definition`. Note there is **no** `azurerm_policy_definition_version` resource, and the newer preview objects such as policy enrollments need the AzAPI provider instead.

If you are weighing the two IaC languages generally, I compared them here: [Terraform vs Bicep: The Match](/articles/terraform-vs-bicep-the-match/).

:::warning
Do not build on the `Azure/manage-azure-policy` GitHub Action. It is **archived**. It appears in a lot of blog posts and it is no longer maintained.
:::

## Pipeline shape

Whatever the technology, the pipeline should look like this:

```diagram
  PR opened
     │
     ├─► lint / schema validation
     ├─► build a PLAN, post it as a PR comment
     └─► human review + approval
              │
         merge to main
              │
     ┌────────┴──────────────┐
     │ Stage 1: PLAN         │  identity: Reader
     └────────┬──────────────┘
              │  (approval gate)
     ┌────────┴──────────────┐
     │ Stage 2: DEPLOY POLICY│  identity: Resource Policy Contributor
     └────────┬──────────────┘
              │  (approval gate)
     ┌────────┴──────────────┐
     │ Stage 3: DEPLOY ROLES │  identity: RBAC Administrator
     └───────────────────────┘
```

Three properties make this work:

**The plan is an artefact, not a log line.** The thing reviewed and the thing deployed must be the same object, or the approval means nothing.

**The stages have different identities.** Reading policy, writing policy, and assigning RBAC are three different privilege levels and should not share a credential.

**No secrets.** Use workload identity federation - OIDC - so the pipeline holds no long-lived credential at all. I wrote that setup up here: [Connect GitHub and Azure for Deployment Using OIDC](/articles/connect-github-and-azure-for-deployment-using-oidc/).

Add a scheduled run on top - nightly or weekly - so drift is detected even when nobody has opened a pull request.

## Testing policy for real

Policy is code, and untested code that can return `403` to your entire production estate is a bad idea.

- **Schema validation** in the pull request. Definitions have a published JSON schema; catching a malformed rule at lint time is free.
- **A dedicated test scope.** A subscription or resource group that exists only to have deliberately non-compliant resources deployed into it.
- **Deploy compliant and non-compliant resources.** A rule that never fires is indistinguishable from a rule that works, if you only ever test the happy path.
- **Test `PATCH` as well as `PUT`.** Updates behave differently, particularly with `count` expressions and absent properties.
- **Check for the implicit deny.** Remember from Part 1: a template function that throws makes evaluation fail, and a failed evaluation behaves like a deny. Test with unexpected values - a short name, a missing tag, a null property.
- **Verify remediation end to end.** The task succeeded, compliance updated, and the resource genuinely changed.

## Where next

You now have the shape of a policy-as-code practice: repository as source of truth, ordering respected, scopes orchestrated, identities separated, desired state reconciled, drift detected on a schedule.

Building all of that yourself is a project measured in months, and it is a project several thousand organisations have already funded. **[Part 7](/articles/azure-policy-part-7-epac/)** looks at the tooling: EPAC in detail - folder structure, `pacEnvironments`, desired state strategies, the three-stage pipeline, ALZ integration - and the honest cases for choosing Azure Landing Zones, Terraform, or something simpler instead.

Enjoy!
