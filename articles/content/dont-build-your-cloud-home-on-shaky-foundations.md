+++
author = "Benoit G"
title = "Don't Build Your Cloud Home on Shaky Foundations"
date = "2024-11-06"
description = "Why cloud governance and security foundations — landing zones, management groups, policies, RBAC, naming, tagging, and networking — must come before any real workload."
tags = ["Governance"]
categories = ["Azure"]
featureImage = "/articles/images/shaky-foundations.jpeg"
featured = true
+++

You probably wouldn't furnish a house you're building with a state-of-the-art entertainment system without first installing doors and an alarm system. Similarly, it isn't advisable to put valuable applications and data used to run your business in the cloud without ensuring the proper foundational security and governance controls are in place.

Many organizations struggle with how they want their cloud home to look, often so anxious to move that proper planning is ignored. Whether adopting PaaS, IaaS, or SaaS, properly planned governance and security foundations are key to ensuring a protected and controlled environment.

[[toc]]

## Cloud home

![Cloud home](/articles/images/cloud-home.png)

## Critical design areas

The foundational decisions that are hardest to change later: identity, network topology, management group hierarchy, and policy.

## Key components

The building blocks every landing zone needs: management groups, identity, networking, policy, and a consistent naming/tagging strategy.

## Cloud Adoption Framework (CAF)

Microsoft's [Cloud Adoption Framework](https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/) provides prescriptive guidance and reference architectures for exactly this kind of foundational planning.

## Landing zone

A landing zone is the environment where you deploy and operate your applications — subscriptions, networking, identity, policy, and management tooling designed to scale as you onboard more teams.

## Management groups

Management groups let you organize subscriptions hierarchically and apply policy and RBAC at scale, above the subscription level.

## Policies

- Built-in vs. custom policies
- Effects: Audit / Deny / DeployIfNotExists

## Automation

- Azure DevOps vs. GitHub for your pipelines and repositories

## RBAC

- Apply least privilege
- Assign roles to groups instead of individual users

## Naming convention

- Define a naming convention before any deployment
- Document examples of the convention
- Implement a naming policy to enforce it, preventing deviations or poor practices

## Tagging

- Define your main tags (Environment, CreationDate, Owner, ...)
- Implement a tagging policy to enforce consistent tagging

## Network

- Hub-and-spoke topology
- IP address plan and IPAM
- VNet peering

## Virtual machines

- NAT gateways for predictable outbound connectivity

## Extra tools

- [AzGovViz](https://github.com/JulianHayward/Azure-MG-Sub-Governance-Reporting) for visualizing your management group and policy hierarchy
- A naming convention generator/validator tool
