+++
author = "Benoit G"
title = "Allow ICMP (Ping) on an Azure VM"
date = "2025-01-31"
description = "Azure VMs block ICMP (ping) by default via the Windows Firewall. Here's the firewall rule to allow it, applied through the Azure portal's run command."
tags = ["VM", "IaaS"]
categories = ["Azure"]
featureImage = "/articles/images/Virtual-Machine.svg"
+++

When you create a VM on Azure, the ICMP protocol (ping) is blocked (deny) by the Windows Firewall on the VM. This means that by default, you won't be able to ping your VM to check its connectivity. Pinging is a useful tool for diagnosing network issues and ensuring that your VM is reachable.

In this article, we will guide you through the steps to allow ICMP (ping) traffic to your Azure VM by creating a new firewall rule. This can be done either directly within the VM or through the Azure portal's run command feature.

![Ping failing before the firewall rule is applied](/articles/images/vm-icmp/vm-icmp-ko.png)

To enable ICMP (ping) on your VM, execute the following command either directly within the VM or through the Azure portal's run command feature:

![Running the command through the Azure portal's run command feature](/articles/images/vm-icmp/vm-run-command.png)

```powershell
New-NetFirewallRule -DisplayName "ICMP Allow Ping V4" -Direction Inbound -Protocol ICMPv4 -Action Allow
```

After the script execution completes, you should be able to successfully ping your VM.

![Ping succeeding after the firewall rule is applied](/articles/images/vm-icmp/vm-icmp-ok.png)

Enjoy!
