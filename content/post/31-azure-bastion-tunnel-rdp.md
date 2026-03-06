+++
author = "Benoit G"
title = "Search Azure policy aliases and sends output to an interactive table"
date = "2024-11-13"
description = "Search Azure policy aliases and sends output to an interactive table"
toc = false
tags = [
    "policies"
]
categories = ["Azure"
]
#featureImage = "/images/githubtest.png" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/Policy.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/bicep.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

If you want to create your own or to contribute to an existing GitHub project you are on the right page.
<!--more-->

<img src="/images/Policy.svg">

Azure Bastion is a fully managed PaaS service that provides secure and seamless RDP/SSH connectivity to your virtual machines directly over TLS from the Azure portal, or via the native SSH or RDP client already installed on your local computer.

Official documentation is available here: https://learn.microsoft.com/en-us/azure/bastion/bastion-overview

## Introduction

Native client support is a feature in Azure Bastion, which allows users to use native SSH and RDP programs to connect to Bastion instead of using the Azure Bastion web interface.

## Prequisites
Bastion

{{% notice note "Note " %}}
Native client support must be enabled on Bastion to create the tunnel.
{{% /notice %}}

## Azure Bastion Native Client Support
Instead of logging in through the Azure Portal, Azure Bastion now allows users to connect using their native RDP or SSH clients.

Go to **Bastion** --> **Settings** --> **Configuration** --> **Native client support**.

<img src="/images/bastion/native-client-support.png" width="50%" height="50%">

<img src="/images/policy-alias-search/policy-alias-search-1.png" width="50%" height="50%">


## Create the RDP tunnel

Open a terminal:

```Bash
az login --tenant <your_tenant_id> --use-device-code
az account set --subscription <your_subscription_id>
```

Define your variables to target the VM to connect to:

```Bash
$BastionName = "bstitwodgwc01"
$BastionRG = "rg-itwo-d-gwc-network"
$TargetVmResourceId = "/subscriptions/xxx-xxx-xxx-xxx/resourceGroups/rg-vm/providers/Microsoft.Compute/virtualMachines/vmapp001"
```

{{% notice note "Note " %}}
To get the VM resoure Id go to:
**Virtual machines** --> **Select Your VM** --> **Overview** --> **JSON View** --> **Copy the Resource ID**.

<img src="/images/bastion/resource-json.png" width="50%" height="50%">

{{% /notice %}}

Create the tunnel:

```Bash
az network bastion tunnel --name $BastionName `
    --resource-group $BastionRG `
    --target-resource-id $TargetVmResourceId `
    --resource-port "3389" `
    --port "50022" `
    --subscription xxx-xxx-xxx-xxx
```

<img src="/images/bastion/bastion-tunnel.png" width="50%" height="50%">

Open RDP connection to the VM

```Bash
mstsc /v:127.0.0.1:50022
```

<img src="/images/bastion/mstsc.png" width="50%" height="50%">

You should now be connected to the target VM through the Azure Bastion tunnel. You can use this connection to manage the VM as needed.

Don't forget to close the tunnel when done with Ctrl + C in the terminal where you started the tunnel.

Enjoy!