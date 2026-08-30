+++
author = "Benoit G"
title = "Connect GitHub and Azure for Deployment Using OIDC"
date = "2026-08-14"
description = "Stop storing long-lived Azure credentials in GitHub secrets. Set up OpenID Connect federation so GitHub Actions can authenticate to Azure with short-lived tokens."
tags = ["GitHub Actions", "OIDC", "Security"]
categories = ["Azure", "GitHub"]
featureImage = "/articles/images/github-azure-oidc.svg"
featured = true
+++

Storing a service principal's client secret (or worse, a certificate password) in GitHub secrets works, but it means you now have a long-lived credential that can authenticate to Azure sitting in your repository settings. OpenID Connect (OIDC) federation removes that risk entirely: GitHub issues a short-lived token for each workflow run, and Azure trusts it directly - no stored secret required.

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

      - name: Deploy
        run: az deployment group create --resource-group my-rg --template-file main.bicep
```

Note that `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` are **not secret values** - they're identifiers, not credentials. You can store them as repository variables instead of secrets if you prefer.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `AADSTS70021: No matching federated identity record found` | The `subject` claim doesn't match - check branch name, environment name, and organization/repo spelling exactly |
| Login succeeds locally but fails in CI | The workflow is missing `permissions: id-token: write` |
| Works on `main` but fails on pull requests | You federated `ref:refs/heads/main` only - add a `pull_request` subject too if PR workflows need Azure access |

## Further reading

- [Configure a federated identity credential on an app](https://learn.microsoft.com/entra/workload-id/workload-identity-federation-create-trust) - Microsoft Learn
- [`azure/login` GitHub Action](https://github.com/Azure/login) - official documentation and examples
- [What Is an Azure Landing Zone?](/articles/what-is-an-azure-landing-zone/) - if you're wiring this up for a full landing zone pipeline
