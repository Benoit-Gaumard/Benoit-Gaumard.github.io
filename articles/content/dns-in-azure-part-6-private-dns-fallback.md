+++
author = "Benoit G"
title = "DNS in Azure, Part 6: Private DNS Fallback to Internet"
date = "2026-09-03"
description = "Part 6 of the DNS in Azure series: why a privatelink zone returns NXDOMAIN for names you do not own, how the NxDomainRedirect resolution policy fixes cross-tenant Private Link, and when you should deliberately leave it off."
tags = ["DNS", "Networking", "Private Endpoint", "Private Link"]
categories = ["Featured", "Azure", "DNS"]
featureImage = "/articles/images/dns-in-azure-part-6.svg"
featured = true
+++

[Part 5](/articles/dns-in-azure-part-5-private-endpoint-dns/) ended on a specific sentence: if the `privatelink` zone is linked but has no record for the name you asked for, you get **NXDOMAIN**, not a public answer.

For years that was simply how it worked, and it produced one of the most frustrating failure modes in Azure networking - an application that could reach *your* storage accounts privately and could not reach *anybody else's* at all, publicly or otherwise. This post is about why that happens and about `resolutionPolicy`, the setting that finally fixed it.

- **[Part 1](/articles/dns-in-azure-part-1-fundamentals/)** - fundamentals and Azure-provided name resolution
- **[Part 2](/articles/dns-in-azure-part-2-private-dns-zones/)** - private DNS zones and virtual network links
- **[Part 3](/articles/dns-in-azure-part-3-private-resolver/)** - Azure DNS Private Resolver
- **[Part 4](/articles/dns-in-azure-part-4-private-endpoints/)** - Private Link and Private Endpoints
- **[Part 5](/articles/dns-in-azure-part-5-private-endpoint-dns/)** - Private Endpoints and private DNS
- **Part 6 (this post)** - private DNS fallback to internet
- **[Part 7](/articles/dns-in-azure-part-7-dns-security-policies/)** - DNS security policies
- **[Part 8](/articles/dns-in-azure-part-8-decision-tree/)** - the resolution decision tree

[[toc]]

## A zone is authoritative for everything under it

The behaviour is not a bug. It is what "authoritative" means.

When you link `privatelink.blob.core.windows.net` to a virtual network, you have told the platform: *for this VNet, I own that entire namespace and every name under it.* A query for `whatever.privatelink.blob.core.windows.net` is answered by your zone or by nobody.

If the record exists, you get the private IP. If it does not, the zone answers **NXDOMAIN (RCODE 3)** - "this name does not exist" - and the resolver stops. It does not go looking on the internet, because an authoritative negative answer is a real answer. That is standard DNS, and every resolver in the world honours it.

```diagram
  Query: partner-sa.blob.core.windows.net
          │
          ▼  public Azure DNS
  CNAME → partner-sa.privatelink.blob.core.windows.net
          │
          ▼  zone privatelink.blob.core.windows.net is linked to my VNet
  ┌───────────────────────────────────────────┐
  │  my zone contains:                        │
  │    sa1   A  10.0.1.4                      │
  │    sa2   A  10.0.1.5                      │
  │    partner-sa   ← not here                │
  └───────────────────────────────────────────┘
          │
          ▼
     NXDOMAIN  ✕     ← not "try the internet". Just: no.
```

Worse, the negative answer is **cached**. Until the negative TTL expires, the client will not retry, so the failure is sticky and does not correlate with anything you changed.

## Who this actually hurts

Three scenarios, all common, all with the same shape.

| Scenario | What breaks |
|---|---|
| **Cross-tenant Private Link** | A partner or SaaS vendor exposes a Private Link resource. You have your own `privatelink.blob...` zone. Their name is not in it, so you cannot reach them privately *or* publicly |
| **Two resource groups, two zones** | Somebody created a second zone with the same name. Each VNet sees one of them, and gets NXDOMAIN for everything in the other |
| **Mixed private and public consumption** | You use private endpoints for your own storage, and a public SaaS product that happens to be built on Azure Storage. The zone shadows it |

The third one is the one that surprises people, because nothing in their architecture is "cross-tenant". They just consume a vendor's product that happens to live under `blob.core.windows.net`, and by linking the `privatelink` zone they made themselves authoritative for the vendor's account too.

The pre-2024 workarounds were all bad:

- Manually add a **CNAME** in your private zone pointing at the partner's public name. Works, and now you maintain a copy of somebody else's DNS.
- Run a **DNS forwarder VM** with a carefully ordered set of conditional forwarders. Cost, patching, and a single point of failure for name resolution.
- Do not link the zone at all, and lose private endpoint resolution. Not really an option.

:::info
Microsoft's own framing in the documentation is blunt about it: "VM-based workarounds exist to address this issue, but these solutions increase operational complexity and are associated with security risks and higher costs."
:::

## The fix: resolutionPolicy = NxDomainRedirect

The `resolutionPolicy` property lives on the **virtual network link**, not on the zone. That placement is the clever part - the same zone can behave differently for different virtual networks.

| Value | Behaviour |
|---|---|
| `Default` | Authoritative NXDOMAIN. The historical behaviour, and still the default |
| `NxDomainRedirect` | On an authoritative NXDOMAIN from the private zone, Azure's recursive resolver retries the query publicly using the original public name |

In the portal it is a checkbox on the virtual network link: **Enable fallback to internet**.

```bash
az network private-dns link vnet update \
  --resource-group rg-dns-hub \
  --zone-name privatelink.blob.core.windows.net \
  --name link-vnet-spoke-a \
  --set resolutionPolicy=NxDomainRedirect
```

In Bicep:

```bicep
resource link 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  name: '${zoneName}/link-vnet-spoke-a'
  location: 'global'
  properties: {
    registrationEnabled: false
    resolutionPolicy: 'NxDomainRedirect'
    virtualNetwork: {
      id: vnetId
    }
  }
}
```

:::note
The property requires API version **2024-06-01 or later**. If your Bicep or Terraform provider silently ignores it, you are on an older API version - check the deployed resource, not the template.
:::

## What the query looks like afterwards

The behaviour is visible in the CNAME chain. Before, with `Default`, the chain dead-ends:

```bash
dig partner-sa.privatelink.blob.core.windows.net +short
# (nothing)
```

After enabling `NxDomainRedirect` on the link, the resolver retries with the public label and follows the public chain to the end:

```bash
nslookup partner-sa.blob.core.windows.net
# Server:  UnKnown
# Address: 168.63.129.16
#
# Non-authoritative answer:
# Name:    blob.mwh20prdstr02e.store.core.windows.net
# Address: 203.0.113.33
# Aliases: partner-sa.blob.core.windows.net
#          partner-sa.privatelink.blob.core.windows.net
```

Your own accounts are unaffected - they still match a record in the zone and still return the private IP. Only the names that would have failed now go public.

:::warning
Negative caching still applies. If a client cached the NXDOMAIN before you changed the link, it will keep failing until that cache entry expires. Flush the client resolver before you conclude the change did not work.
:::

## Limits worth knowing

- The policy is **only available on private DNS zones associated with Private Link resources** - the `privatelink.*` namespaces. You cannot use it to make `corp.internal` fall through to the internet, and you would not want to.
- `resolutionPolicy` accepts exactly two values: `Default` and `NxDomainRedirect`.
- It is set **per virtual network link**, so rolling it out across a large estate means touching every link, not one zone.

## Finding what you have today

Because the setting is per link, an estate-wide answer needs Resource Graph.

```kusto
resources
| where type == 'microsoft.network/privatednszones/virtualnetworklinks'
| extend policy = tostring(properties.resolutionPolicy)
| extend zone = extract('/privateDnsZones/([^/]+)', 1, id)
| where zone startswith 'privatelink.'
| project zone, linkName = name, resourceGroup,
          policy = iff(isempty(policy), 'Default', policy)
| order by zone asc, linkName asc
```

Same thing from the CLI, if you would rather not open the portal:

```bash
az graph query -q "
resources
| where tostring(properties.resolutionPolicy) contains 'NxDomainRedirect'
| extend privateDnsZone = extract('/privateDnsZones/([^/]+)/', 1, id)
| project privateDnsZone, resourceGroup, properties.resolutionPolicy" \
  --output table
```

Run the first query before you start. In most estates it returns a long list of links with no policy set at all, which is your inventory of future cross-tenant incidents.

## Should you enable it?

This is a genuine trade-off, not a best practice with a single answer.

**The case for:** it removes an entire class of outage, it replaces a DNS VM with a platform feature, and it makes the failure mode *degraded* rather than *broken*. A name that cannot be reached privately is reached publicly, over TLS, with the service's own authentication still in front of it.

**The case against:** it makes the failure mode **silent**. Before, a missing record produced a loud, immediate NXDOMAIN and somebody fixed the zone. Now the application connects successfully - to a public IP, over the internet, from a network you built specifically so that would not happen. If your compliance story is "no data leaves the backbone", fallback quietly breaks it.

| Environment | Recommendation |
|---|---|
| Consuming third-party or cross-tenant Private Link resources | **Enable.** This is precisely the scenario it was built for |
| Development and test subscriptions | **Enable.** The convenience is worth more than the strictness |
| Production with a hard "no public egress" requirement | **Leave off**, and manage records deliberately |
| Regulated workloads with data-residency commitments | **Leave off.** A silent public fallback is not something you want to explain after the fact |
| Anything where egress is blocked at the firewall anyway | Either - the connection fails regardless, but the DNS answer is misleading |

:::warning
If you enable fallback, pair it with the query logging from [Part 7](/articles/dns-in-azure-part-7-dns-security-policies/) and alert on `privatelink` names that resolve publicly. Otherwise you have traded a visible failure for an invisible one, which is a bad trade even when the outcome is better.
:::

My own default: enable it on the links serving VNets that consume external Private Link resources, leave it off everywhere else, and treat any use of it in production as something that appears in a design document rather than in a fix-forward change at 5 p.m.

## Coming next

Two posts ago the recurring theme was visibility - you cannot see what your resolvers are being asked. Fallback makes that worse, because it converts a failure into a quiet redirect.

**[Part 7](/articles/dns-in-azure-part-7-dns-security-policies/)** covers DNS resolver policies: filtering, threat intelligence, and finally getting full query logs out of the platform resolver without running a single VM.

Enjoy!
