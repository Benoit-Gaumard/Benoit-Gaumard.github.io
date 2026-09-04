+++
author = "Benoit G"
title = "Azure Policy, Part 3: What Is a Policy Assignment?"
date = "2026-09-04"
description = "Part 3 of the Azure Policy series: assignments are where governance becomes real. Scope and inheritance, enforcementMode, managed identities and remediation permissions, resourceSelectors and overrides for safe rollout, and non-compliance messages."
tags = ["Azure Policy", "Governance", "RBAC", "Remediation"]
categories = ["Azure", "Governance", "Azure Policy"]
featureImage = "/articles/images/azure-policy-part-3.svg"
featured = false
+++

Definitions and initiatives are documents. They describe rules. They enforce nothing, evaluate nothing, and appear nowhere in your compliance score.

The **assignment** is the object that binds a definition or initiative to a piece of your resource hierarchy and says: *from now on, here, this applies*.

It is the only object in Azure Policy that can break production. It deserves more respect than it usually gets.

- **[Part 1](/articles/azure-policy-part-1-what-is-a-policy/)** - what a policy definition actually is
- **[Part 2](/articles/azure-policy-part-2-initiatives/)** - initiatives, also known as policy set definitions
- **Part 3 (this post)** - assignments, scope, and enforcement
- **[Part 4](/articles/azure-policy-part-4-exclusions-notscopes/)** - exclusions and `notScopes`
- **[Part 5](/articles/azure-policy-part-5-exemptions/)** - exemptions
- **[Part 6](/articles/azure-policy-part-6-policy-as-code/)** - Azure Policy as code
- **[Part 7](/articles/azure-policy-part-7-epac/)** - EPAC and the alternatives

[[toc]]

## What an assignment actually is

An assignment is a Resource Manager object of type `Microsoft.Authorization/policyAssignments`. It carries:

- **A pointer** to one definition or one initiative, optionally pinned to a version
- **A scope** - where it applies
- **Parameter values** - filling in what the definition left open
- **An enforcement mode** - whether the effect actually blocks anything
- **Optionally a managed identity** - required for `deployIfNotExists` and `modify`
- **Optionally exclusions, selectors, overrides, and messages**

Here is a full one:

```json
{
  "properties": {
    "displayName": "Storage security baseline - Production",
    "description": "Storage baseline enforced across the production landing zone.",
    "policyDefinitionId": "/providers/Microsoft.Management/managementGroups/mg-platform/providers/Microsoft.Authorization/policySetDefinitions/storage-security-baseline",
    "definitionVersion": "1.*.*",
    "scope": "/providers/Microsoft.Management/managementGroups/mg-corp-prod",
    "notScopes": [],
    "enforcementMode": "Default",
    "parameters": {
      "effect": { "value": "Deny" },
      "allowedLocations": { "value": [ "westeurope", "northeurope" ] }
    },
    "nonComplianceMessages": [
      {
        "message": "Storage accounts in production must meet the storage security baseline. See the platform wiki before requesting an exception."
      }
    ],
    "metadata": {
      "assignedBy": "Cloud Centre of Excellence"
    },
    "identity": {
      "identityType": "SystemAssigned"
    },
    "location": "westeurope"
  }
}
```

## Scope and inheritance

Scope is the single most consequential field. An assignment can target:

| Scope | Typical use |
|---|---|
| Management group | Platform baselines applied to a whole landing zone type |
| Subscription | Workload-specific controls, or a per-subscription exception to a group standard |
| Resource group | Narrow, tactical controls - usually a smell if you have many |
| Individual resource | Rare, but supported |

**Assignments inherit downwards, always, and cannot be turned off from below.** An assignment on `mg-corp-prod` applies to every subscription, every resource group, and every resource beneath it. A subscription owner cannot delete or override it. That is the entire point - it is what makes a management group hierarchy a governance tool rather than a folder structure.

If you do not have a deliberate management group design yet, policy will not save you. That comes first: [What Is an Azure Landing Zone?](/articles/what-is-an-azure-landing-zone/) and [Don't Build Your Cloud Home on Shaky Foundations](/articles/dont-build-your-cloud-home-on-shaky-foundations/).

:::info
A policy can be assigned at a management group, but **only resources at subscription and resource group level are evaluated**. The management group is a distribution point, not an evaluation target.
:::

Assignments also stack. Three assignments of the same definition at three levels of the hierarchy all apply, and the result is **cumulative and most restrictive**. A `Deny` inherited from the tenant root cannot be relaxed by an `Audit` assignment further down. If you need something relaxed, the mechanisms are `notScopes` (Part 4) and exemptions (Part 5) - never a second, gentler assignment.

## enforcementMode: the setting that prevents outages

This is the field that separates a controlled rollout from an incident.

| Mode | JSON value | Effect enforced on create/update | Compliance still reported | Manual remediation |
|---|---|---|---|---|
| Enabled | `Default` | Yes | Yes | Yes |
| Disabled | `DoNotEnforce` | No | Yes | Yes |
| Enroll | `Enroll` | Only for enrolled resources | Yes | Yes |

`DoNotEnforce` is the mode every new assignment should start in. You get full compliance data - exactly which resources would have been blocked, and how many - with zero risk of blocking a deployment. You find out that 340 storage accounts fail your new rule *before* the change freeze, not during it.

:::note
Remediation tasks for `deployIfNotExists` can still be started while `enforcementMode` is `DoNotEnforce`. So you can even test the fix, not just the finding, before you turn enforcement on.
:::

`Enroll` is newer and pairs with a preview resource type, `Microsoft.Authorization/policyEnrollments`. It inverts the model: instead of applying to everything in scope minus exclusions, the effect only applies to resources that have been explicitly enrolled in the assignment. That is an opt-in rollout rather than an opt-out one - useful when you want application teams to adopt a control on their own timeline while you still measure everyone.

## Managed identity and remediation

`deployIfNotExists` and `modify` do not just report - they act. Acting requires an identity.

An assignment carrying either effect **must** have an `identity`, either system-assigned or user-assigned, and exactly one of them. A system-assigned identity also requires a top-level `location`, which cannot be `global` and cannot be changed afterwards.

The identity then needs Azure RBAC roles. The definition declares which ones in `roleDefinitionIds`:

```json
"details": {
  "roleDefinitionIds": [
    "/providers/Microsoft.Authorization/roleDefinitions/749f88d5-cbae-40b8-bcfc-e573ddc772fa"
  ]
}
```

Note those are full role **IDs**, not role names. Built-in definitions come with the correct list already populated; custom definitions are your responsibility.

### The four things that go wrong

This is where most Azure Policy projects lose a week. In order of frequency:

**1. Permissions are only granted automatically in the portal.** Create the same assignment through Bicep, Terraform, the REST API, or any CLI, and the role assignments for the managed identity are **not** created for you. You must create them yourself. Every policy-as-code approach in Part 6 has to solve this explicitly - which is precisely why EPAC has a separate "deploy roles" pipeline stage.

**2. Granting those roles needs elevated rights.** You need **User Access Administrator**, or **Role Based Access Control Administrator**, on top of **Resource Policy Contributor**. A pipeline identity with only policy rights will create the assignment and then fail every remediation silently.

**3. Changing the definition does not update the assignment's identity.** If you edit `roleDefinitionIds` on a definition that is already assigned, the new permissions are **not** granted - not even in the portal. You must grant them manually.

**4. The requester's permissions matter too.** For a `deployIfNotExists` policy, the assignment identity performs the ARM deployment, but **the identity of whoever created or updated the resource is used for the evaluation**. The classic symptom: a diagnostic-settings policy where the assignment identity has `Microsoft.Insights/diagnosticSettings/write`, but the deploying service principal lacks the corresponding `read` - and the policy quietly evaluates as compliant when it should not.

:::warning
Remediation is not automatic for resources that already exist. Assigning a `deployIfNotExists` policy fixes resources created *after* the assignment. Existing ones need a **remediation task**, which you create explicitly. One task can cover up to 50,000 resources. For a management group assignment, the task must be created after evaluation has run - you cannot bundle it into assignment creation the way you can for a subscription.
:::

## Parameters

Assignment parameters fill in what the definition or initiative left open. Two properties do most of the work:

- **Values must satisfy `allowedValues`** if the parameter declared them - the assignment fails to create otherwise, which is a feature
- **Parameters without a value fall back to `defaultValue`**, and if there is no default, the assignment cannot be created

This is why Part 2 insisted on defaults. A parameter with a default can be added to a live initiative. One without cannot.

The `metadata.parameterScopes` property appears automatically when you use `strongType` parameters - it records which scope the portal picker was browsing. It is informational; do not hand-craft it.

## resourceSelectors and overrides: safe rollout without new assignments

These two are how you do a staged rollout properly, and they are underused.

### resourceSelectors

`resourceSelectors` narrows *which resources in scope* the assignment applies to, without changing the scope itself.

```json
"resourceSelectors": [
  {
    "name": "PilotRegions",
    "selectors": [
      {
        "kind": "resourceLocation",
        "in": [ "northeurope" ]
      }
    ]
  }
]
```

Selector kinds are `resourceLocation`, `resourceType`, and `resourceWithoutLocation`. Up to 50 values per `in`/`notIn` list, and up to 10 selectors per assignment. A resource must satisfy *all* selectors within one selector block, and is in scope if it satisfies *any* one block.

The pattern: assign at the management group with a selector limiting evaluation to one region, verify, then widen the region list. One assignment, one identity, one compliance history - progressively more resources. Far cleaner than creating and deleting a series of narrow assignments.

### overrides

`overrides` changes the *effect* for part of an assignment without touching the definition.

```json
"overrides": [
  {
    "kind": "policyEffect",
    "value": "Audit",
    "selectors": [
      {
        "kind": "policyDefinitionReferenceId",
        "in": [ "storageAllowedLocations" ]
      }
    ]
  }
]
```

That is: assign the whole baseline as `Deny`, but keep this one member at `Audit` until the estate catches up. No fork of the initiative, no second assignment, and the exception is visible in the assignment JSON where a reviewer will find it.

Up to 10 overrides per assignment, up to 50 reference IDs each, evaluated in order. Overrides can also target `resourceLocation`, and there is a `policyVersion` override kind for rolling a new built-in version out region by region.

:::note
`overrides` needs `policyDefinitionReferenceId` values you can actually read. This is the payoff for the Part 2 advice about naming them yourself instead of accepting the portal's twenty-digit numbers.
:::

## Non-compliance messages

By default, a denied deployment returns a message containing a policy definition GUID. Nobody has ever found that helpful.

```json
"nonComplianceMessages": [
  {
    "message": "Production storage accounts must disable public blob access. Raise a platform exception request if you believe this does not apply."
  },
  {
    "message": "This resource must carry a costCentre tag. See the tagging standard on the wiki.",
    "policyDefinitionReferenceId": "requireCostCentreTag"
  }
]
```

One default message, plus specific messages per initiative member. The message appears in the error returned to whoever tried the deployment, and in the compliance blade.

This is the highest-value, lowest-effort thing you can do for your internal customers. A deny with a sentence explaining what to do instead converts a support ticket into a self-service fix.

:::info
Custom non-compliance messages are only supported on definitions and initiatives using **Resource Manager modes** (`all` and `indexed`). They do not work with resource provider modes such as `Microsoft.Kubernetes.Data`.
:::

## RBAC: who can do what

| Role | Read policy | Create definitions and assignments | Trigger remediation | Grant identity roles |
|---|---|---|---|---|
| Reader | Yes | No | No | No |
| Contributor | Yes | No | Yes | No |
| Resource Policy Contributor | Yes | Yes | Yes | No |
| User Access Administrator | Yes | No | No | Yes |
| Owner | Yes | Yes | Yes | Yes |

The one that catches teams out: **Contributor cannot create policy definitions or assignments**. It can trigger remediation, but it cannot govern. A platform team needs Resource Policy Contributor plus a role that can assign RBAC.

All policy objects are readable by any role that can read the scope. There is no such thing as a confidential policy assignment.

## A rollout sequence that will not page you

1. **Assign at the target scope with `enforcementMode: DoNotEnforce`** and the effect parameter set to `Audit`.
2. **Wait for a full evaluation cycle** - up to 24 hours, or trigger a scan.
3. **Read the compliance results as a work item list.** Every non-compliant resource is either something to fix, something to exempt (Part 5), or evidence your rule is wrong.
4. **Narrow with `resourceSelectors`** to a pilot region or resource type if the blast radius is large.
5. **Fix the estate.** Remediation tasks for `modify` and `deployIfNotExists`; tickets for everything else.
6. **Flip the effect parameter to `Deny`, still with enforcement disabled.** Compliance data now reflects what would be blocked.
7. **Set `enforcementMode: Default`.** One landing zone at a time. Never everything at once.
8. **Keep the audit-only overrides** on members the estate has not caught up with, and burn that list down deliberately.

The step people skip is 2. Assignments take up to 30 minutes to take effect and up to 24 hours for a full compliance picture. Checking five minutes later and concluding "it works" is how a deny reaches production untested.

## What an assignment cannot do

It cannot make a rule *less* strict than something above it. It cannot apply to a scope outside its own subtree. And it cannot be selectively disabled by the teams it governs.

Which raises the obvious operational question: the payments subscription genuinely cannot meet one control this quarter. Now what?

There are exactly two answers in Azure Policy, they behave very differently, and choosing the wrong one is how governance estates rot. **[Part 4](/articles/azure-policy-part-4-exclusions-notscopes/)** covers the blunt one - exclusions and `notScopes`.

Enjoy!
