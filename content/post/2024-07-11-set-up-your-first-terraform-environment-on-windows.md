+++
author = "Benoit G"
title = "Set Up your first Terraform environment on Windows"
date = "2024-09-11"
description = "Learn how to optimize and reduce costs in Azure with practical tips and strategies."
toc = true
tags = [
    "cloud", "azure", "cost optimization"
]
categories = ["Terraform"
]
#featureImage = "/images/azure-cost-optimization.png" # Sets featured image on blog post.
#featureImageAlt = 'Azure Cost Optimization' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/azure-cost-optimization.png" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/azure-cost-optimization-share.png" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or contribute to an existing GitHub project, you are on the right page.
<!--more-->

<img src="/images/azure-cost-optimization.png" width="50%" height="50%">

## Prerequisites​
---

IDE (Vscode): Download Visual Studio Code – Mac, Linux, Windows
TF executable: Releases · hashicorp/terraform (github.com) or here https://releases.hashicorp.com/terraform/
Azure Subscription
Azure CLI: How to install the Azure CLI | Microsoft Learn

Go​
## Prerequisites

Create a storager account and container

Define the subscription to store the state

Install Terraform

Add it to the path

Type to test: terraform –version

```Bash
terraform --version
```
Create a new SPN or MI

Test connection

AZ login

```Bash
az login --use-device-code --tenant <your_tenant_id>
```

Set sub if you have multiple subscriptions

```Bash
az account set --subscription <your_subscription_id>
```
Create a container to store the tfstate

Store Terraform state in Azure Storage Microsoft Learn

```Bash
$RESOURCE_GROUP_NAME='<your_rg_name>'
$STORAGE_ACCOUNT_NAME='<your_sta_name>'
$CONTAINER_NAME='tfstate'
$LOCATION =  "westeurope"

# Create resource group
az group create --name $RESOURCE_GROUP_NAME --location $LOCATION

# Create storage account
az storage account create --resource-group $RESOURCE_GROUP_NAME --name $STORAGE_ACCOUNT_NAME --sku Standard_LRS --encryption-services blob
```

Create the container

Add storage blobh data contributor right

Create a backend file

```Bash
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform"
    storage_account_name = "<your_sta_name>"
    container_name       = "tfstate"
    key                  = "mystatefile.terraform.tfstate"
  }
}
```
Run the following command to run the configuration:

```Bash
terraform init
```

A new state file will be created in the storage account.

Create your terraform code

Validate the code

```Bash
terraform validate
```

Format the code

```Bash
terraform fmt -recursive
```

Plan or apply

```Bash
terraform apply -auto-approve
```