+++
author = "Benoit G"
title = "Azure Terraform Entra Id Authentication"
date = "2024-09-11"
description = "Learn how to optimize and reduce costs in Azure with practical tips and strategies."
toc = true
tags = [
]
categories = ["Terraform"
]
#featureImage = "/images/azure-cost-optimization.png" # Sets featured image on blog post.
#featureImageAlt = 'Azure Cost Optimization' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/terraform.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/azure-cost-optimization-share.png" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or contribute to an existing GitHub project, you are on the right page.
<!--more-->

<img src="/images/terraform.svg">

AzureRM provider and the remote backend require authentication. The best practice is to disable storage account access key and enable Entra Id (Azure AD) authentication.

<img src="/images/terraform-entra-id/image1.png" width="50%" height="50%">

This storage account configuration will cause the following issue during the terraform init phase

```Bash
Status=403 Code="KeyBasedAuthenticationNotPermitted" Message="Key based authentication is not permitted on this storage account.
```

To use Entra Id authentication , here is the configuration to apply on your Terraform configuration.

On the backend.tf file, add the use_azuread_auth = true parameter.

```Bash
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

On the provider.tf file, add the storage_use_azuread = true parameter.

```Bash
terraform {
  required_providers {
    azurerm = {
    source  = "hashicorp/azurerm"
    version = "4.1.0"
    }
  }
}
provider "azurerm" {
  storage_use_azuread = true
  skip_provider_registration = true
  features {}
}
```

If you look at the storage account activity log. The “List Storage Account Keys” operations are from before use_azuread_auth = true was enabled, and Terraform listed the keys when accessing the state file. After started using Entra ID authentication, the keys were not listed anymore.

<img src="/images/terraform-entra-id/image2.png" width="50%" height="50%">

If using this access method on the Remote backend, your user or service principal needs Storage Data Blob Owner permission on the container scope.

Using Entra Id authentication for remote backend is a best practice align with RBAC and least privilege.

Please don’t hesitate to comment if there is anything wrong or inaccurate.