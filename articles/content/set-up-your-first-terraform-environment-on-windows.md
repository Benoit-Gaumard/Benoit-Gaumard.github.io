+++
author = "Benoit G"
title = "Set Up Your First Terraform Environment on Windows"
date = "2024-09-11"
description = "Step-by-step guide to setting up your first Terraform environment on Windows: install the CLI, configure a remote state backend in Azure Storage, and run your first plan and apply."
tags = ["Terraform"]
categories = ["Azure", "Tools"]
featureImage = "/articles/images/terraform.svg"
+++

If you want to create your own or contribute to an existing GitHub project using Terraform, here is how to get your first environment up and running on Windows.

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

## Create a service principal or managed identity

Create a new service principal (or use a managed identity) that Terraform will use to authenticate against Azure, then test the connection.

```bash
az login --use-device-code --tenant <your_tenant_id>
```

Set the subscription if you have multiple subscriptions:

```bash
az account set --subscription <your_subscription_id>
```

## Create a container to store the Terraform state

Store the Terraform state in an Azure Storage account container. See [Store Terraform state in Azure Storage](https://learn.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage) for more details.

```bash
$RESOURCE_GROUP_NAME='<your_rg_name>'
$STORAGE_ACCOUNT_NAME='<your_sta_name>'
$CONTAINER_NAME='tfstate'
$LOCATION = "westeurope"

# Create resource group
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# Create storage account
az storage account create --resource-group $RESOURCE_GROUP_NAME --name $STORAGE_ACCOUNT_NAME --sku Standard_LRS --encryption-services blob
```

Create the container, then grant your identity the **Storage Blob Data Contributor** role on it.

## Create a backend file

```bash
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform"
    storage_account_name = "<your_sta_name>"
    container_name       = "tfstate"
    key                  = "mystatefile.terraform.tfstate"
  }
}
```

Run the following command to initialize the configuration:

```bash
terraform init
```

A new state file will be created in the storage account.

## Write, validate, format, and apply

Create your Terraform code, then validate it:

```bash
terraform validate
```

Format the code:

```bash
terraform fmt -recursive
```

Plan or apply:

```bash
terraform apply -auto-approve
```
