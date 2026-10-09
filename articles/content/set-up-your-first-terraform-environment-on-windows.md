+++
author = "Benoit G"
title = "Set Up Your First Terraform Environment on Windows"
date = "2024-09-11"
description = "Step-by-step guide to setting up your first Terraform environment on Windows: install the CLI, configure a remote state backend in Azure Storage, and run your first plan and apply."
tags = ["Terraform"]
categories = ["Azure", "Tools"]
featureImage = "/articles/images/terraform.svg"
related = ["azure-terraform-entra-id-authentication", "terraform-vs-bicep-the-match"]
+++

Read this on any device; execute on a Windows workstation. Reading time is **not installation time**. Before starting, have permission to use a sandbox subscription, an approved state-storage location and a recovery plan. Pin tool/provider versions in your own project; tested versions and execution validation are **not recorded** here.

[[toc]]

## Prerequisites

- IDE: [Visual Studio Code](https://code.visualstudio.com/)
- Terraform executable: [Releases · hashicorp/terraform](https://github.com/hashicorp/terraform/releases) or the [official downloads page](https://releases.hashicorp.com/terraform/)
- An Azure subscription
- Azure CLI: [How to install the Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)

## Install Terraform

Download the Terraform executable and add it to your `PATH`. Verify the install with:

```bash
terraform --version
```

Checkpoint: a version prints in a **new** terminal. If the command is not found, reopen the terminal and check `PATH`. Also verify `az version` before the next step.

## Select an identity

For local interactive development, the example uses your Azure CLI login. A managed identity is for an Azure-hosted runner with that identity available, not a normal personal Windows terminal. For CI, use [OIDC federation](/articles/connect-github-and-azure-for-deployment-using-oidc/) rather than creating a long-lived secret solely to follow this guide.

```bash
az login --use-device-code --tenant <your_tenant_id>
```

Set the subscription if you have multiple subscriptions:

```bash
az account set --subscription <your_subscription_id>
```

Checkpoint: `az account show --query "{subscription:id,tenant:tenantId}"` matches your intended sandbox. Do not continue on an unexpected subscription.

## Create a container to store the Terraform state

Store the Terraform state in an Azure Storage account container. See [Store Terraform state in Azure Storage](https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage) for more details.

```powershell
$RESOURCE_GROUP_NAME='<your_rg_name>'
$STORAGE_ACCOUNT_NAME='<your_sta_name>'
$CONTAINER_NAME='tfstate'
$LOCATION = "westeurope"

# Create resource group
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# Create storage account
az storage account create --resource-group $RESOURCE_GROUP_NAME --name $STORAGE_ACCOUNT_NAME --sku Standard_LRS --encryption-services blob
```

These two commands create billable Azure resources; review the target names/region first. A storage **account** contains the private blob **container**, and the backend `key` identifies the state blob inside it.

Create the container using Entra authentication after the necessary data-plane role assignment has propagated:

```powershell
az storage container create --name $CONTAINER_NAME --account-name $STORAGE_ACCOUNT_NAME --auth-mode login
```

Grant the intended Terraform identity **Storage Blob Data Contributor** at the narrowest suitable scope. Checkpoint: it can reach and access this container without an account key.

## Create a backend file

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform"
    storage_account_name = "<your_sta_name>"
    container_name       = "tfstate"
    key                  = "mystatefile.terraform.tfstate"
    use_azuread_auth     = true
  }
}
```

Run the following command to initialize the configuration:

```bash
terraform init
```

Checkpoint: initialization reports the configured backend and installs the selected providers. A populated remote state blob may not exist until state is first written; `init` alone is not proof that resources were deployed.

## Write, validate, format, and apply

Create your Terraform code, then validate it:

```bash
terraform validate
```

Format the code:

```bash
terraform fmt -recursive
```

Generate and review a saved plan before applying:

```bash
terraform plan -out=reviewed.tfplan
terraform show reviewed.tfplan
```

Checkpoint: every planned creation, update and deletion is expected. The plan can contain sensitive data; do not commit it. Only after approval, deliberately run `terraform apply reviewed.tfplan`. Applying can create costs and modify or destroy resources.

## Three startup failures

| Symptom | Check |
|---|---|
| Terraform not found | Installed executable, PATH and a reopened terminal |
| Backend 403 | Correct tenant/identity, container data-plane role, role propagation and network access |
| Subscription/provider error | Azure CLI context, provider-required subscription configuration and registered resource providers |

Next: [Backend Entra ID authentication](/articles/azure-terraform-entra-id-authentication/).
