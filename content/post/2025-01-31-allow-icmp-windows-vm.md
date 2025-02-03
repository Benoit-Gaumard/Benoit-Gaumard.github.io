+++
author = "Benoit G"
title = "Allow ICMP (Ping) on Azure VM"
date = "2025-01-31"
description = ""
toc = false
draft = false
tags = [
    "vm", "iaas"
]
categories = ["Azure"]
#featureImage = "/images/Virtual-Machine.svg" # Sets featured image on blog post.
#featureImageAlt = 'Draw.io VSCode Extension' # Alternative text for featured image.
#featureImageCap = 'This is the featured image.' # Caption (optional).
thumbnail = "/images/Virtual-Machine.svg" # Sets thumbnail image appearing inside card on homepage.
#shareImage = "/images/Virtual-Machine.svg" # Designate a separate image for social media sharing.
codeMaxLines = 10 # Override global value for how many lines within a code block before auto-collapsing.
codeLineNumbers = false # Override global value for showing of line numbers within code block.
figurePositionShow = true # Override global value for showing the figure label.
+++

When you create a VM on Azure, the ICMP protocol (Ping) is blocked (Deny) by the Windows Firewall on the VM. This means that by default, you won't be able to ping your VM to check its connectivity. Pinging is a useful tool for diagnosing network issues and ensuring that your VM is reachable.
<!--more-->

<img src="/images/Virtual-Machine.svg">

In this article, we will guide you through the steps to allow ICMP (Ping) traffic to your Azure VM by creating a new firewall rule. This can be done either directly within the VM or through the Azure portal's run command feature. Follow the instructions below to enable ICMP (Ping) on your Azure VM.

<img src="/images/vm-icmp/vm-icmp-ko.png">

To enable ICMP (Ping) on your VM, execute the following command either directly within the VM or through the Azure portal's run command feature:

<img src="/images/vm-icmp/vm-run-command.png">


```Powershell
New-NetFirewallRule -DisplayName "ICMP Allow Ping V4" -Direction Inbound -Protocol ICMPv4 -Action Allow
```

After the script execution completes, you should be able to successfully ping your VM.

<img src="/images/vm-icmp/vm-icmp-ok.png">

Enjoy!