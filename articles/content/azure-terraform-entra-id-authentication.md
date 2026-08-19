+++
author = "Benoit G"
title = "Terraform and Entra ID Authentication"
date = "2024-09-11"
description = "How to disable storage account key-based authentication and use Entra ID authentication for the Terraform azurerm remote backend."
tags = ["Entra ID", "Terraform"]
categories = ["Azure"]
featureImage = "/articles/images/terraform.svg"
+++

The `azurerm` provider and the remote backend require authentication. The best practice is to disable the storage account access key and enable Entra ID (Azure AD) authentication instead.

![Storage account configuration disabling key-based authentication](/articles/images/terraform-entra-id/image1.png)

This storage account configuration will cause the following error during the `terraform init` phase:

```bash
Status=403 Code="KeyBasedAuthenticationNotPermitted" Message="Key based authentication is not permitted on this storage account.
```

To use Entra ID authentication, here is the configuration to apply to your Terraform configuration.

On the `backend.tf` file, add the `use_azuread_auth = true` parameter:

```bash
terraform {
  backend "azurerm" {
    resource_group_name  = "<YOUR_BACKEND_STORAGE_RESOURCE_GROUP_NAME>"
    storage_account_name = "<YOUR_BACKEND_STORAGE_ACCOUNT_NAME>"
    container_name       = "<YOUR_BACKEND_CONTAINER_NAME>"
    key                  = "<YOUR_BACKEND_KEY_.tfstate>"
    use_azuread_auth     = true
  }
}
```

On the `provider.tf` file, add the `storage_use_azuread = true` parameter:

```bash
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "4.1.0"
    }
  }
}

provider "azurerm" {
  storage_use_azuread         = true
  skip_provider_registration  = true
  features {}
}
```

If you look at the storage account activity log, the "List Storage Account Keys" operations happened before `use_azuread_auth = true` was enabled, and Terraform listed the keys when accessing the state file. After switching to Entra ID authentication, the keys are no longer listed.

![Storage account activity log after enabling Entra ID authentication](/articles/images/terraform-entra-id/image2.png)

If using this access method on the remote backend, your user or service principal needs the **Storage Blob Data Owner** role on the container scope.

Using Entra ID authentication for the remote backend is a best practice aligned with RBAC and least privilege.
