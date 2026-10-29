---
title: GitHub Actions workflow
description: Generate a secure GitHub Actions workflow with OIDC to Azure, least-privilege permissions and caching.
category: DevOps
tags: [github-actions, ci-cd, oidc, azure]
models: Any LLM, GitHub Copilot
date: 2026-07-01
---
Write a GitHub Actions workflow (YAML) for this need: {{What the workflow should do}}

Technology stack: {{Stack (language, framework, IaC)}}
Trigger: {{Trigger (push, pull request, schedule, manual)}}

Requirements:
- Authenticate to Azure with OpenID Connect (azure/login with federated credentials), never with a client secret.
- Set top-level permissions to the minimum needed and widen them per job only when required.
- Pin third-party actions to a full commit SHA and add a comment with the version.
- Use concurrency to avoid overlapping deployments, and cache dependencies.
- Use separate build and deploy jobs, with a GitHub environment that needs approval for production.

After the YAML, list the secrets and variables to create and the Azure role assignments needed.
