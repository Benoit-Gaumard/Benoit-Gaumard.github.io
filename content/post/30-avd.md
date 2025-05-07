Azure Virtual Desktop is a service in Azure, that can help you to provide virtual desktops or remote applications
to your employees or external people of the organization.

Official documentation is avaiulable here: https://docs.microsoft.com/en-us/azure/virtual-desktop/overview

## Prequisites
Vnet
Active directory or ENtra AD ?


Create a rg

rg-poc-avd

Create a Vnet for host pool Vms
vnet-avd-host-pool


## Install

Search for Azure Virtual Desktop in the list of Azure services.

Create host pool :it is a collection of one or more identical virtual machines

hp-poc-avd

After you can choose between Personal (dedicated VM per user) or pooled (Shared VMs).
For personal, you can choose an automatic assignment, or a direct assignment, depending on what you want. For pooled, you need to provide the maximum number of users in a host and the load balancing algorithm

After select the asignment type


Automatic assignment – The service will select an available host and assign it to an user
Direct assignment – Admin selects a specific host to assign to an user

Create the Host Pool


After the host pool creation

Go to application groups

This application group contains only the SessionDesktop application, to allow the user to connect to the desktop

--> Assign a user to this application group to be able to use applications part of this group

## Workspace
create the workspace. A workspace is a suite of one or more applications groups:


## Add virtual machines to the host pool

Click Sessions Host on the host pool menu

Click Add --> Add virtual machines to a host pool

Configure the VM size

avd-admin

Vms are now available

## Scaling plan
Autoscale enables your Azure Virtual Desktop workloads to be performant and cost effective by starting and stopping session host virtual machines based on schedule and demand

## Connect to your Azure Virtual Desktop

Using this app
https://docs.microsoft.com/en-us/windows-server/remote/remote-desktop-services/clients/remote-desktop-clients

Windows App or RDP Client

Web client
https://rdweb.wvd.microsoft.com/arm/webclient/index.html
https://rdweb.wvd.microsoft.com/webclient/index.html


## Publish an application




articles:

https://adamtheautomator.com/azure-virtual-desktop/


https://www.starwindsoftware.com/blog/how-to-start-with-azure-virtual-desktop/
https://www.starwindsoftware.com/blog/publish-an-application-with-azure-virtual-desktop/


https://www.starwindsoftware.com/blog/start-azure-virtual-desktop-vm-on-connect/
https://www.starwindsoftware.com/blog/deploy-windows-virtual-desktop-session-hosts-from-a-template/