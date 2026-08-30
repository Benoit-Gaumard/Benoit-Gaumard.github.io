+++
author = "Benoit G"
title = "How to Delegate a Domain to Azure DNS"
date = "2025-12-16"
description = "Step-by-step guide to delegating a domain purchased from a third-party registrar (OVH) to Azure DNS, and recreating the DNS records once delegation is complete."
tags = ["DNS"]
categories = ["Azure"]
featureImage = "/articles/images/azure-dns-zone.png"
+++

Azure DNS allows you to host a DNS domain and manage the DNS zone records. To host your domain in Azure, the zone must be created in Azure and delegated to Azure's authoritative DNS servers with a domain registrar.

:::note
Azure DNS isn't a domain registrar - you must buy your domain name first from a registrar like GoDaddy, OVH, Cloudflare, etc.
:::

The official documentation is available here:

- [What is DNS delegation](https://learn.microsoft.com/en-us/azure/dns/dns-domain-delegation)
- [Host your domain in Azure DNS](https://learn.microsoft.com/en-us/azure/dns/dns-delegate-domain-azure-dns)

[[toc]]

## Context

I own a domain name, **quickquotemaker.io**, which is used to display a website, **www.quickquotemaker.io**, that you can visit.

The DNS zone management for this domain is handled by the registrar **OVH**, where I purchased the domain name.

![OVH domain names list](/articles/images/dns-delegation/domain-names.png)

From the OVH interface, I can manage my DNS zone and add any type of record as needed (A, CNAME, NS, MX, TXT, etc.).

![OVH DNS entries](/articles/images/dns-delegation/dns-entries.png)

For various applications hosted in Azure, I regularly need to create new DNS entries so that my applications can be accessed using domain names such as `myapp1.quickquotemaker.io`, `myapp2.quickquotemaker.io`, or `www.quickquotemaker.io`.

To do this, I currently have to configure DNS settings in two different places: the [Azure portal](https://portal.azure.com) and the [OVH portal](https://www.ovh.com/manager). The goal of this article is to show how to centralize DNS zone management in Azure by delegating the zone currently hosted by OVH.

## Creating a new public DNS zone in Azure

Azure DNS allows you to host a DNS zone and manage DNS records for a domain directly in Azure. For DNS queries for a domain to reach Azure DNS, the domain must be delegated to Azure DNS from the parent domain.

:::note
Keep in mind, Azure DNS is not the domain registrar - OVH remains the registrar.
:::

Steps:

1. Sign in to the Azure portal and search for **DNS Zone** in the Marketplace.

   ![Search for DNS Zone in the Azure Marketplace](/articles/images/dns-delegation/azure-dns-zone.png)

2. Click **Create**.

   ![Create a DNS zone](/articles/images/dns-delegation/create-dns-zone.png)

3. Select an existing resource group or create a new one, enter the DNS zone name, choose a location (e.g., West Europe), add tags if necessary, then click **Create**.

   ![New DNS zone form](/articles/images/dns-delegation/new-dns-zone.png)

:::note
Azure allows you to create a DNS zone with any name (e.g., microsoft.com, google.fr, toto.local), even if you are not the owner. However, to actually manage the zone and add records, you must be the domain owner.
:::

To manage the zone, Azure provides four name servers (NS) by default to ensure redundancy in case of failure.

![Azure DNS name servers](/articles/images/dns-delegation/azure-ns-servers.png)

:::note
Copy the NS server names and keep them handy - they will be required to configure the delegation in the OVH portal.
:::

## Delegate the domain

Now that the DNS zone is created and we have the name servers, we need to update the parent domain with the Azure DNS name servers. Each registrar has its own tools for managing DNS and modifying name server records.

Steps in OVH:

1. Go back to the OVH portal and navigate to the **DNS Servers** menu.
2. Click **Modify DNS Servers**.

   ![Modify DNS servers in OVH](/articles/images/dns-delegation/modify-dns-servers.png)

3. Select **Use my own DNS** and add the four Azure DNS name servers (remove the trailing dot).

   ![Add Azure DNS name servers](/articles/images/dns-delegation/add-azure-dns.png)

4. Delete the existing OVH NS entries.

   ![Remove OVH NS entries](/articles/images/dns-delegation/remove-ovh-ns.png)

5. Click **Apply Configuration**.

   ![Apply OVH DNS configuration](/articles/images/dns-delegation/apply-ovh-dns-config.png)

6. The DNS servers for the zone are now the Azure DNS servers.

   ![Custom DNS servers configured](/articles/images/dns-delegation/custom-dns-servers.png)

:::warning
Be careful - your websites and services associated with the domain (mail, FTP, etc.) will be temporarily unavailable during this operation.
:::

## Create DNS records

:::note
Now that Azure DNS is responsible for managing the zone, all administrative tasks should be done in Azure. Do nothing on the OVH portal.
:::

First, you need to recreate the appropriate DNS records (A, CNAME, NS, MX, TXT, etc.) so that services return to normal and your website displays correctly.

To display my website, the first record to create in Azure DNS is an **A** record pointing to the public IP address of my website provided by OVH.

1. In Azure DNS, click **Add Record Set**.
2. Leave the Name field empty or enter `@` (this corresponds to the root of the domain).
3. Select record type **A**, leave the default TTL, and add the public IP address of the website.

   ![Add an A record set](/articles/images/dns-delegation/add-record-set.png)

4. Once the record is created, you should see the corresponding entry.

   ![New record set created](/articles/images/dns-delegation/new-record-set.png)

5. Next, create a `www` record of type **CNAME** pointing to the root domain.

   ![CNAME record pointing to root domain](/articles/images/dns-delegation/cname-record.png)

## Test the delegation

Once the delegation is complete, you can verify it works using a tool such as `nslookup` or [zonemaster.net](https://www.zonemaster.net/). You may need to wait 10 minutes or more after delegation before verification - DNS propagation can take some time.

There is no need to explicitly specify the Azure DNS name servers. If the delegation is configured correctly, the standard DNS resolution process will automatically detect the Azure name servers.

Clear the DNS cache first:

```bash
ipconfig /flushdns
```

![Flush the local DNS cache](/articles/images/dns-delegation/flush-dns.png)

Then check the SOA record:

```bash
nslookup -type=SOA quickquotemaker.io
```

![nslookup SOA output](/articles/images/dns-delegation/soa-command.png)

Verify that the response looks like the expected `nslookup` output. To display the name servers, run:

```bash
nslookup -type=NS quickquotemaker.io
```

![nslookup NS output](/articles/images/dns-delegation/ns-command.png)

Verify that the response matches the Azure DNS name servers. The site is now accessible via both URLs, and DNS record management is performed directly from the Azure portal.

:::note
All DNS management actions (add / delete / modify records) should be done from Azure only. Add a **Delete lock** on your DNS resource group to prevent accidental deletion.
:::

Enjoy!
