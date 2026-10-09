+++
author = "Benoit G"
title = "Debug GitHub Actions Secret Configuration Without Revealing Values"
date = "2024-12-02"
description = "Check whether a GitHub Actions secret is available without printing it, review repository and environment scope, and use OIDC for Azure instead of long-lived credentials."
related = ["connect-github-and-azure-for-deployment-using-oidc"]
tags = ["GitHub"]
categories = ["GitHub"]
featureImage = "/articles/images/github-actions.svg"
+++

:::warning
Never print, encode, split or add spaces to a secret to bypass log masking. Spacing characters does not make a value confidential: the original value is trivially recoverable. If a value has already appeared in logs, revoke or rotate it, remove exposed logs and review access. Deleting the log alone does not invalidate the credential.
:::

## 1. Check configuration before running a workflow

Confirm the exact secret name in **Repository Settings → Secrets and variables → Actions**. Check organization repository access policies and, for environment secrets, the job's `environment` and any required approvals. Secret availability differs for fork pull requests, Dependabot and reusable workflows; do not weaken trust boundaries to make a test pass.

## 2. Test presence, never the value

This manually triggered Ubuntu example reports only whether the value is empty. It does not validate the credential or reveal its length, hash or contents. Do not enable shell tracing or dump the environment.

```yaml
name: Check secret configuration
on: workflow_dispatch
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check availability without displaying the value
        shell: bash
        env:
          CONFIGURED_SECRET: ${{ secrets.MYSECRET }}
        run: |
          if [ -z "$CONFIGURED_SECRET" ]; then
            echo "::error::Required secret is unavailable or empty in this context."
            exit 1
          fi
          echo "Required secret is available; value not displayed."
```

## 3. Verify the intended operation

Once availability is confirmed, use a narrowly scoped, non-destructive authenticated operation against the intended service. Record success or a sanitised error category, not tokens, headers or response bodies containing credentials.

For Azure deployments, prefer [OIDC federation](/articles/connect-github-and-azure-for-deployment-using-oidc/) so there is no long-lived client secret to debug.

Technical execution validation: **not recorded**. Consult [GitHub's guidance on using secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) for context restrictions and [security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) before changing workflow trust.
