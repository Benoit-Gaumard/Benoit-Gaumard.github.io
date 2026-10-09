+++
author = "Benoit G"
title = "Connect GitHub and Azure for Deployment Using OIDC"
date = "2026-08-14"
description = "Stop storing long-lived Azure credentials in GitHub secrets. Set up OpenID Connect federation so GitHub Actions can authenticate to Azure with short-lived tokens."
tags = ["GitHub Actions", "OIDC", "Security"]
categories = ["Azure", "GitHub"]
featureImage = "/articles/images/github-azure-oidc.svg"
featured = true
related = ["display-github-secrets-for-debug", "what-is-an-azure-landing-zone"]
+++

OIDC removes the need to store a long-lived Azure client secret in GitHub. It does not remove the need to protect workflow code, environments, roles and trust conditions.

## Choose identity and trust context first

The commands here use an **app registration and its service principal** named `gh-actions-deploy`. A user-assigned managed identity is a separate alternative with different creation commands; do not mix its object IDs with the app example.

Textual trust path: **my-org/my-repo, main branch → GitHub OIDC issuer → gh-actions-deploy federated credential → service principal → role at my-rg**. The workflow's client ID must identify this app; its tenant and subscription must match the target.

| GitHub context | Credential subject | Workflow requirement |
|---|---|---|
| Main branch (example below) | `repo:my-org/my-repo:ref:refs/heads/main` | A run on `main` without an environment claim |
| Protected environment (alternative) | `repo:my-org/my-repo:environment:production` | Job uses `environment: production`; configure environment protections |
| Pull request (separate trust decision) | `repo:my-org/my-repo:pull_request` | Never grant deployment access to untrusted PR code merely to fix login |

Preflight: permission to create the app/federation, permission to assign the selected Azure role at the exact scope, and repository administration for variables/environment protections. Replace `my-org`, `my-repo`, subscription and resource group before use. Technical execution validation and CLI/action test versions: **not recorded**; action versions below are example pins, not a current recommendation.

[[toc]]

:::info
This works because Microsoft Entra ID supports **federated identity credentials** on an app registration or user-assigned managed identity. Entra ID validates the token GitHub presents against the federation's issuer, subject, and audience - if it matches, Azure AD issues a real access token back to the workflow.
:::

## 1. Create an app registration (or reuse a managed identity)

```bash
az ad app create --display-name "gh-actions-deploy"
appId=$(az ad app list --display-name "gh-actions-deploy" --query "[0].appId" -o tsv)
az ad sp create --id "$appId"
```

## 2. Add a federated credential for your repository

The `subject` claim must match the exact repository and branch (or environment) that is allowed to authenticate.

```bash
az ad app federated-credential create \
  --id "$appId" \
  --parameters '{
    "name": "gh-actions-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:my-org/my-repo:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

Common `subject` patterns:

- `repo:ORG/REPO:ref:refs/heads/main` - a specific branch
- `repo:ORG/REPO:environment:production` - a specific GitHub environment (recommended for anything that touches production, since environments support required reviewers)
- `repo:ORG/REPO:pull_request` - pull request runs

## 3. Grant the app an Azure role

```bash
az role assignment create \
  --assignee "$appId" \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/<resource-group>"
```

:::warning
Scope the role assignment as narrowly as possible. A landing zone deployment pipeline needs far more permission than a workflow that only updates one app service - don't reuse the same identity for both.
:::

## 4. Configure the GitHub Actions workflow

The workflow needs `id-token: write` permission so it can request the OIDC token, and no client secret at all.

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Azure login (OIDC)
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Verify login without deployment
        run: az account show --query "{subscription:id,tenant:tenantId}" -o json
```

Note that `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` are **not secret values** - they're identifiers, not credentials. You can store them as repository variables instead of secrets if you prefer.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `AADSTS70021: No matching federated identity record found` | The `subject` claim doesn't match - check branch name, environment name, and organization/repo spelling exactly |
| Login succeeds locally but fails in CI | The workflow is missing `permissions: id-token: write` |
| Works on `main` but fails on pull requests | Branch-only trust is expected to reject other contexts; review the security model rather than adding PR trust automatically |

## Further reading

The final workflow intentionally stops at a read-only context check. Expect the intended subscription and tenant IDs, with no client secret and no resource creation. Add deployment steps only after role/scope and protected workflow reviews.

- [Configure a federated identity credential on an app](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust) - Microsoft Learn
- [`azure/login` GitHub Action](https://github.com/Azure/login) - official documentation and examples
- [What Is an Azure Landing Zone?](/articles/what-is-an-azure-landing-zone/) - if you're wiring this up for a full landing zone pipeline
