+++
author = "Benoit G"
title = "DNS in Azure, Part 8: The Resolution Decision Tree"
date = "2026-09-03"
description = "Part 8 of the DNS in Azure series: an interactive decision tree that takes you from a client asking for a name to the exact Azure architecture that answers it - Azure DNS, private zones, privatelink, forwarding rulesets, or on-premises."
tags = ["DNS", "Networking", "Architecture", "Private Endpoint"]
categories = ["Featured", "Azure", "DNS"]
featureImage = "/articles/images/dns-in-azure-part-8.svg"
featured = true
+++

Seven posts of theory. This one is the lookup table.

A VM in Azure asks for a name. Where does the answer come from - the internet, Azure DNS, a private DNS zone, a `privatelink` zone, or a DNS server sitting in a datacentre three hundred kilometres away? And what exactly do you have to configure to make that happen?

Answer three or four questions below and you get the architecture, the steps, and the mistakes to avoid.

- **[Part 1](/articles/dns-in-azure-part-1-fundamentals/)** - fundamentals and Azure-provided name resolution
- **[Part 2](/articles/dns-in-azure-part-2-private-dns-zones/)** - private DNS zones and virtual network links
- **[Part 3](/articles/dns-in-azure-part-3-private-resolver/)** - Azure DNS Private Resolver
- **[Part 4](/articles/dns-in-azure-part-4-private-endpoints/)** - Private Link and Private Endpoints
- **[Part 5](/articles/dns-in-azure-part-5-private-endpoint-dns/)** - Private Endpoints and private DNS
- **[Part 6](/articles/dns-in-azure-part-6-private-dns-fallback/)** - private DNS fallback to internet
- **[Part 7](/articles/dns-in-azure-part-7-dns-security-policies/)** - DNS security policies
- **Part 8 (this post)** - the resolution decision tree

[[toc]]

## The decision tree

:::html
<div class="dtree" id="dns-decision-tree">
  <div class="dtree-head">
    <div class="dtree-head-text">
      <p class="dtree-eyebrow">Interactive</p>
      <p class="dtree-title">Azure DNS resolution decision tree</p>
    </div>
    <button type="button" class="dtree-restart" data-dtree-restart hidden>Start over</button>
  </div>
  <ol class="dtree-trail" data-dtree-trail hidden></ol>
  <div class="dtree-panel" data-dtree-panel aria-live="polite"></div>
</div>

<style>
  .dtree {
    margin: 0 0 2rem;
    border: 1px solid var(--cp-border);
    border-radius: 12px;
    background: var(--cp-surface);
    box-shadow: var(--cp-shadow);
    overflow: hidden;
  }
  .dtree-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem 1.25rem;
    background: var(--cp-surface-soft);
    border-bottom: 1px solid var(--cp-border);
  }
  .dtree-head-text { min-width: 0; }
  .dtree-eyebrow {
    margin: 0 0 .2rem;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--cp-accent);
  }
  .dtree-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--cp-text); }
  .dtree-restart {
    border: 1px solid var(--cp-border-strong);
    background: transparent;
    color: var(--cp-text);
    padding: .4rem .85rem;
    border-radius: 8px;
    font-size: .82rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
  }
  .dtree-restart:hover { background: var(--cp-accent-soft); color: var(--cp-accent); }
  .dtree-trail {
    display: flex;
    flex-wrap: wrap;
    gap: .4rem;
    margin: 0;
    padding: .8rem 1.25rem;
    list-style: none;
    border-bottom: 1px solid var(--cp-border);
    background: var(--cp-bg);
  }
  .dtree-trail li { margin: 0; }
  .dtree-crumb {
    border: 1px solid var(--cp-border);
    background: var(--cp-surface);
    color: var(--cp-text-muted);
    padding: .25rem .6rem;
    border-radius: 999px;
    font-size: .78rem;
    font-family: inherit;
    cursor: pointer;
  }
  .dtree-crumb:hover { border-color: var(--cp-accent); color: var(--cp-accent); }
  .dtree-panel { padding: 1.25rem; }
  .dtree-question { margin: 0 0 .4rem; font-size: 1.15rem; font-weight: 700; color: var(--cp-text); }
  .dtree-help { margin: 0 0 1.1rem; font-size: .9rem; color: var(--cp-text-muted); }
  .dtree-options { display: grid; gap: .6rem; }
  .dtree-option {
    display: block;
    width: 100%;
    text-align: left;
    border: 1px solid var(--cp-border);
    border-radius: 10px;
    background: var(--cp-surface);
    padding: .8rem 1rem;
    font-family: inherit;
    color: var(--cp-text);
    cursor: pointer;
    transition: border-color .15s ease, background .15s ease;
  }
  .dtree-option:hover { border-color: var(--cp-accent); background: var(--cp-accent-soft); }
  .dtree-option:focus-visible { outline: 2px solid var(--cp-accent); outline-offset: 2px; }
  .dtree-option-label { display: block; font-weight: 600; font-size: .95rem; }
  .dtree-option-hint { display: block; margin-top: .2rem; font-size: .82rem; color: var(--cp-text-muted); }
  .dtree-badge {
    display: inline-block;
    margin-bottom: .55rem;
    padding: .2rem .6rem;
    border-radius: 999px;
    background: var(--cp-success-bg);
    color: var(--cp-success);
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
  }
  .dtree-outcome-title { margin: 0 0 .5rem; font-size: 1.2rem; font-weight: 700; color: var(--cp-text); }
  .dtree-summary { margin: 0 0 1.1rem; font-size: .95rem; color: var(--cp-text); }
  .dtree-section-title {
    margin: 1.1rem 0 .5rem;
    font-size: .76rem;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--cp-text-muted);
  }
  .dtree-list { margin: 0; padding-left: 1.15rem; }
  .dtree-list li { margin: 0 0 .4rem; font-size: .92rem; line-height: 1.55; }
  .dtree-watch li { color: var(--cp-text); }
  .dtree-watch li::marker { color: var(--cp-warning); }
  .dtree-links { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1.1rem; }
  .dtree-links a {
    border: 1px solid var(--cp-border);
    border-radius: 999px;
    padding: .3rem .75rem;
    font-size: .82rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--cp-link);
  }
  .dtree-links a:hover { border-color: var(--cp-accent); background: var(--cp-accent-soft); }
  .dtree-back {
    margin-top: 1.2rem;
    border: 0;
    background: transparent;
    color: var(--cp-accent);
    font-family: inherit;
    font-size: .88rem;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
  }
  .dtree-back:hover { color: var(--cp-accent-hover); text-decoration: underline; }
  @media (max-width: 32rem) {
    .dtree-panel { padding: 1rem; }
    .dtree-head { padding: .85rem 1rem; }
    .dtree-trail { padding: .7rem 1rem; }
  }
</style>

<script>
(function () {
  var root = document.getElementById("dns-decision-tree");
  if (!root) return;

  var P1 = "/articles/dns-in-azure-part-1-fundamentals/";
  var P2 = "/articles/dns-in-azure-part-2-private-dns-zones/";
  var P3 = "/articles/dns-in-azure-part-3-private-resolver/";
  var P4 = "/articles/dns-in-azure-part-4-private-endpoints/";
  var P5 = "/articles/dns-in-azure-part-5-private-endpoint-dns/";
  var P6 = "/articles/dns-in-azure-part-6-private-dns-fallback/";
  var P7 = "/articles/dns-in-azure-part-7-dns-security-policies/";

  var NODES = {
    start: {
      question: "Who is asking the question?",
      help: "Start with the client, not the record. Where the query originates decides everything that follows.",
      options: [
        { label: "A workload inside an Azure virtual network", hint: "VM, scale set, AKS node, App Service with VNet integration", next: "azure-what" },
        { label: "A machine on-premises or in another cloud", hint: "Reaching Azure over ExpressRoute or a VPN", next: "onprem-what" }
      ]
    },

    "azure-what": {
      question: "What kind of name is it resolving?",
      help: "The suffix tells you which of the five resolution paths you are on.",
      options: [
        { label: "A public internet name", hint: "www.microsoft.com, api.github.com, login.microsoftonline.com", next: "az-public-dns" },
        { label: "Another VM in the same VNet, by short hostname", hint: "web01, db02", next: "out-azure-provided" },
        { label: "A private name you own in Azure", hint: "vm1.corp.internal, api.prod.contoso.com", next: "az-private-scope" },
        { label: "An Azure PaaS service behind a Private Endpoint", hint: "sa1.blob.core.windows.net, kv1.vault.azure.net", next: "az-pe-owner" },
        { label: "A name hosted by an on-premises DNS server", hint: "svc.onprem.local, dc01.ad.contoso.com", next: "az-onprem-priority" }
      ]
    },

    "az-public-dns": {
      question: "Does the virtual network use custom DNS servers?",
      help: "Check the VNet's DNS servers setting, then confirm on the VM itself - a stale DHCP lease is the usual culprit.",
      options: [
        { label: "No - Default (Azure-provided)", hint: "The DNS servers setting is left on Default", next: "out-public-default" },
        { label: "Yes - custom DNS servers", hint: "Domain controllers, a BIND pair, a firewall proxy", next: "out-public-custom" }
      ]
    },

    "az-private-scope": {
      question: "How many virtual networks need to resolve this name?",
      options: [
        { label: "One virtual network", hint: "A standalone workload", next: "out-private-single" },
        { label: "Several, in a hub-and-spoke topology", hint: "The normal landing zone shape", next: "out-private-hub" },
        { label: "A virtual network with no peering at all", hint: "Compliance boundary, third-party landing area", next: "out-private-isolated" }
      ]
    },

    "az-pe-owner": {
      question: "Who owns the resource behind the private endpoint?",
      help: "This decides whether your privatelink zone contains the record or shadows somebody else's.",
      options: [
        { label: "We do - it is in our own tenant", hint: "Our storage account, our Key Vault, our SQL server", next: "az-pe-topology" },
        { label: "A partner, vendor, or another tenant", hint: "A SaaS product or a cross-tenant Private Link resource", next: "out-pe-crosstenant" }
      ]
    },

    "az-pe-topology": {
      question: "How is your network laid out?",
      options: [
        { label: "A single virtual network", hint: "One VNet, a handful of endpoints", next: "out-pe-single" },
        { label: "Hub and spoke, many teams", hint: "Endpoints created by application teams across subscriptions", next: "out-pe-hub" }
      ]
    },

    "az-onprem-priority": {
      question: "What matters most for this workload?",
      options: [
        { label: "Simple central management", hint: "Normal query volumes. Most estates land here", next: "out-onprem-central" },
        { label: "Maximum throughput", hint: "VDI fleets, large container platforms, chatty resolvers", next: "out-onprem-distributed" },
        { label: "A VNet with no peering to the hub", hint: "Still needs central DNS control", next: "out-onprem-isolated" }
      ]
    },

    "onprem-what": {
      question: "What is the on-premises client trying to resolve?",
      options: [
        { label: "A record in an Azure private DNS zone", hint: "vm1.corp.internal", next: "out-onprem-to-zone" },
        { label: "An Azure PaaS service behind a Private Endpoint", hint: "sa1.blob.core.windows.net", next: "out-onprem-to-pe" },
        { label: "A public Azure or internet name", hint: "No private endpoint involved", next: "out-onprem-public" }
      ]
    },

    "out-public-default": {
      outcome: true,
      title: "Azure DNS recursive resolution. Nothing to configure.",
      summary: "The query goes to the platform virtual IP 168.63.129.16, which performs a full recursive lookup and caches the answer. This is the default and it works out of the box.",
      steps: [
        "Leave the VNet DNS servers setting on Default.",
        "No route to the internet is needed for DNS itself - 168.63.129.16 is reachable from inside every VNet regardless of NSGs and UDRs.",
        "If you want visibility or filtering over these queries, link the VNet to a DNS resolver policy."
      ],
      watch: [
        "Reserved Microsoft namespaces are always resolved by Azure DNS, even when a wildcard forwarding rule exists. That is deliberate - without it, managed identity and half the platform would break.",
        "Blocking or intercepting 168.63.129.16 is not supported. The address also carries DHCP and platform health."
      ],
      links: [{ href: P1, label: "Part 1: Fundamentals" }, { href: P7, label: "Part 7: DNS security policies" }]
    },

    "out-public-custom": {
      outcome: true,
      title: "Your DNS servers own this. Give them a path out.",
      summary: "Once a VNet points at custom DNS servers, the platform resolver is out of the loop entirely - including for private DNS zones you have linked.",
      steps: [
        "Your servers must resolve recursively themselves, or forward to 168.63.129.16.",
        "Forwarding to 168.63.129.16 is the usual answer: it keeps linked private zones and privatelink resolution working.",
        "Changing the VNet DNS setting needs a DHCP lease renewal or a reboot on every VM."
      ],
      watch: [
        "Linked private DNS zones are NOT consulted when a custom DNS server answers, unless that server forwards to 168.63.129.16.",
        "Consider replacing the DNS VMs with a DNS Private Resolver. It removes the patching, sizing and availability burden."
      ],
      links: [{ href: P1, label: "Part 1: Fundamentals" }, { href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-azure-provided": {
      outcome: true,
      title: "Azure-provided name resolution. It already works.",
      summary: "Every virtual network gets a platform-managed internal.cloudapp.net namespace with an A record per VM. Short-name resolution inside one VNet needs no configuration at all.",
      steps: [
        "Nothing. Keep the DNS servers setting on Default.",
        "If you need the same names across peered VNets, the default namespace will not do it - create a private DNS zone.",
        "For a namespace you control, create a private DNS zone and enable autoregistration on the virtual network link."
      ],
      watch: [
        "The default namespace does not cross virtual networks, cannot hold manual records, and its name is not yours to choose.",
        "A virtual network can be linked to exactly one zone with autoregistration enabled."
      ],
      links: [{ href: P1, label: "Part 1: Fundamentals" }, { href: P2, label: "Part 2: Private DNS zones" }]
    },

    "out-private-single": {
      outcome: true,
      title: "One private DNS zone, one virtual network link.",
      summary: "The simplest shape in the whole series, and the one people still get wrong by forgetting the link.",
      steps: [
        "Create a private DNS zone with the name you want. The zone is global - it has no region.",
        "Create a virtual network link to the VNet. A zone with no link resolves nothing.",
        "Set registrationEnabled = true if you want the platform to maintain A records for your VMs.",
        "Create by hand, or by pipeline, every record the platform will not create for you - private endpoints, App Service, containers."
      ],
      watch: [
        "Autoregistered records carry a 10 second TTL and cannot be edited by hand.",
        "A linked private zone always beats a forwarding rule for the same suffix."
      ],
      links: [{ href: P2, label: "Part 2: Private DNS zones" }]
    },

    "out-private-hub": {
      outcome: true,
      title: "One zone - linked to every spoke, or to the hub with a resolver.",
      summary: "Two supported shapes. Pick based on how many links you are willing to manage and how much you value a single source of truth.",
      steps: [
        "Create exactly one zone for the namespace, in a resource group the platform team owns.",
        "Option A: link the zone to every spoke VNet. Simple and explicit, up to 1,000 links per zone.",
        "Option B: link the zone only to the hub, deploy a DNS Private Resolver there, and point each spoke's DNS servers setting at the inbound endpoint's static IP.",
        "Beyond a handful of virtual networks I recommend Option B - one place holds the truth, and you get a natural chokepoint for logging."
      ],
      watch: [
        "Never create two zones with the same name. Each VNet sees one of them and gets NXDOMAIN for the other's records - and it fails partially, so nobody notices for months.",
        "Option B sends every query through the inbound endpoint, which is capped at 10,000 queries per second."
      ],
      links: [{ href: P2, label: "Part 2: Private DNS zones" }, { href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-private-isolated": {
      outcome: true,
      title: "Link the zone anyway - links do not need peering.",
      summary: "A virtual network link is a control-plane relationship. The isolated VNet resolves the zone with no network path to the hub whatsoever.",
      steps: [
        "Link the private DNS zone directly to the isolated virtual network.",
        "If that VNet also needs an on-premises namespace, link a forwarding ruleset to it. The query egresses through the outbound endpoint in the hub, again with no peering.",
        "Keep the DNS servers setting on Default so the platform resolver is used."
      ],
      watch: [
        "Resolving a name is not reaching it. You still need routing for the data plane.",
        "Cross-tenant zone links are supported through CLI, PowerShell and ARM. Cross-tenant ruleset links are not."
      ],
      links: [{ href: P2, label: "Part 2: Private DNS zones" }, { href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-pe-single": {
      outcome: true,
      title: "privatelink zone plus a zone group. No records by hand.",
      summary: "The client asks for the public name, public Azure DNS CNAMEs it into the privatelink namespace, and your linked private zone answers with the endpoint's private IP.",
      steps: [
        "Create the private DNS zone using the exact published name for that service and sub-resource - for example privatelink.blob.core.windows.net.",
        "Link the zone to the virtual network.",
        "Attach a private DNS zone group to the private endpoint so the platform creates and maintains the A record.",
        "One private endpoint and one zone per sub-resource. Blob and File are two of everything.",
        "Separately set publicNetworkAccess to Disabled on the resource - the private endpoint does not close the public door for you."
      ],
      watch: [
        "Key Vault's zone is privatelink.vaultcore.azure.net, not privatelink.vault.azure.net.",
        "Azure Monitor needs a Private Link Scope and six zones, not one.",
        "Never put records for different services into the same zone."
      ],
      links: [{ href: P4, label: "Part 4: Private Endpoints" }, { href: P5, label: "Part 5: Private Endpoint DNS" }]
    },

    "out-pe-hub": {
      outcome: true,
      title: "Zones in the hub, zone groups on the endpoints, enforced by policy.",
      summary: "At scale you cannot rely on application teams knowing what a privatelink zone is. Make the platform do it for them.",
      steps: [
        "Create one zone per namespace in a platform-owned resource group. Exactly one, tenant-wide.",
        "Link the zones to the hub, and either to every spoke or to the hub only with spokes pointing at a resolver inbound endpoint.",
        "Assign the built-in DeployIfNotExists policies - 'Configure Azure X to use private DNS zones' - at management-group scope, parameterised with the hub zone resource IDs.",
        "Run a remediation task to cover the endpoints that already exist. The policy only fires on create or update by itself.",
        "Pair them with the matching Deny policies for public network access, so the guardrail is complete."
      ],
      watch: [
        "Two private endpoints for the same resource in the same zone produce two A records and a coin flip at resolution time.",
        "The policy's managed identity needs permissions on the zone resource group.",
        "Audit for duplicate zone names with Resource Graph before and after the rollout."
      ],
      links: [{ href: P4, label: "Part 4: Private Endpoints" }, { href: P5, label: "Part 5: Private Endpoint DNS" }]
    },

    "out-pe-crosstenant": {
      outcome: true,
      title: "You need fallback to internet, or a private endpoint of your own.",
      summary: "Your privatelink zone is authoritative for the whole namespace, including the partner's account. Their name is not in your zone, so you get NXDOMAIN - not a public answer.",
      steps: [
        "Set resolutionPolicy = NxDomainRedirect on the virtual network link for that privatelink zone. API version 2024-06-01 or later.",
        "In the portal it is the 'Enable fallback to internet' checkbox on the virtual network link.",
        "If the partner exposes a Private Link service, the better answer is your own private endpoint against it - a real record beats a public fallback.",
        "Either way, audit the result: alert on privatelink names that resolve to public addresses."
      ],
      watch: [
        "Fallback converts a loud failure into a silent public connection. In a regulated environment that can be the worse outcome.",
        "Negative answers are cached. Flush the client resolver before concluding the change did not work.",
        "The policy only exists on privatelink zones - you cannot use it on corp.internal."
      ],
      links: [{ href: P5, label: "Part 5: Private Endpoint DNS" }, { href: P6, label: "Part 6: Private DNS fallback" }, { href: P7, label: "Part 7: DNS security policies" }]
    },

    "out-onprem-central": {
      outcome: true,
      title: "Centralized: spokes point at the inbound endpoint.",
      summary: "The default recommendation. One ruleset holds all the routing logic, and adding an on-premises namespace is a one-object change.",
      steps: [
        "Deploy a DNS Private Resolver in the hub VNet with an inbound and an outbound endpoint, each in its own delegated subnet between /28 and /24.",
        "Give the inbound endpoint a static private IP. It ends up in on-premises configuration and must not move.",
        "Create a forwarding ruleset attached to the outbound endpoint, with a rule per on-premises suffix - written with a trailing dot - and up to six target servers.",
        "Link the ruleset to the hub virtual network.",
        "Set each spoke VNet's DNS servers setting to the inbound endpoint IP, then renew the lease or reboot.",
        "Open UDP and TCP 53 in both directions across the ExpressRoute or VPN."
      ],
      watch: [
        "A linked private zone always beats a forwarding rule for the same suffix. This is the single most common misconfiguration in the whole service.",
        "Every query in the estate crosses the inbound endpoint, capped at 10,000 queries per second.",
        "The resolver uses your existing connectivity - it does not create any."
      ],
      links: [{ href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-onprem-distributed": {
      outcome: true,
      title: "Distributed: link the ruleset to each spoke.",
      summary: "The inbound endpoint is removed from the path entirely, which is the point - you trade operational simplicity for throughput headroom.",
      steps: [
        "Keep every spoke's DNS servers setting on Default (168.63.129.16).",
        "Link the forwarding ruleset directly to each spoke virtual network.",
        "Matching queries go straight from the platform resolver to the outbound endpoint in the hub.",
        "The outbound endpoint still lives in the hub - only the ruleset links are distributed."
      ],
      watch: [
        "More objects to manage: one ruleset link per spoke, and 500 links per ruleset.",
        "Troubleshooting is harder, because the routing logic is no longer in one place.",
        "Rules match on longest suffix, and the rule state has to be Enabled."
      ],
      links: [{ href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-onprem-isolated": {
      outcome: true,
      title: "Link a ruleset to the isolated VNet. No peering required.",
      summary: "Ruleset links are control-plane objects, so an unpeered virtual network can still have its DNS centrally controlled and logged.",
      steps: [
        "Create a ruleset with a wildcard rule for '.' pointing at your central DNS servers, or one rule per namespace if you want to be precise.",
        "Link the ruleset directly to the isolated virtual network.",
        "Keep the DNS servers setting on Default.",
        "The query egresses through the outbound endpoint in the hub."
      ],
      watch: [
        "A '.' rule does NOT capture Microsoft's reserved namespaces - they always resolve through Azure DNS. Do not build a compliance claim that assumes 100% coverage.",
        "Cross-tenant ruleset links are not supported.",
        "Deleting an outbound endpoint requires deleting its ruleset and links first."
      ],
      links: [{ href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-onprem-to-zone": {
      outcome: true,
      title: "Inbound endpoint plus a conditional forwarder for the zone name.",
      summary: "The simplest hybrid direction. No forwarding rules are involved at all - rules are for the other way round.",
      steps: [
        "Deploy a DNS Private Resolver with an inbound endpoint in a virtual network the zones are linked to. Use a static IP.",
        "Link the private DNS zone to that virtual network.",
        "On your on-premises DNS servers, add a conditional forwarder for the zone suffix pointing at the inbound endpoint IP.",
        "You need ExpressRoute or VPN connectivity - the resolver does not create it."
      ],
      watch: [
        "The zone must be linked to the resolver's virtual network, not just to the spokes.",
        "ExpressRoute FastPath is not supported with the resolver.",
        "Virtual networks with encryption enabled do not support the resolver."
      ],
      links: [{ href: P2, label: "Part 2: Private DNS zones" }, { href: P3, label: "Part 3: Private Resolver" }]
    },

    "out-onprem-to-pe": {
      outcome: true,
      title: "Forward the PUBLIC suffix, never the privatelink one.",
      summary: "The client asks for the public name and the CNAME into privatelink happens inside Azure. A conditional forwarder for privatelink.* is never consulted, because nobody ever asks for that name directly.",
      steps: [
        "Conditional-forward blob.core.windows.net - not privatelink.blob.core.windows.net - to the inbound endpoint IP.",
        "Repeat for every service suffix you consume: database.windows.net, vaultcore.azure.net, azurewebsites.net, azurecr.io, and so on.",
        "Link the privatelink zones to the resolver's virtual network.",
        "A DNS forwarder VM in a linked VNet is the pre-2022 equivalent and still works, at the cost of running it."
      ],
      watch: [
        "Do not create a zone named blob.core.windows.net on your on-premises servers. You would become authoritative for a Microsoft namespace and break every name in it you did not create by hand.",
        "Without the forwarder, on-premises clients get the public IP and the firewall drops the connection - which looks like a network fault, not a DNS one."
      ],
      links: [{ href: P4, label: "Part 4: Private Endpoints" }, { href: P5, label: "Part 5: Private Endpoint DNS" }]
    },

    "out-onprem-public": {
      outcome: true,
      title: "Nothing to do in Azure.",
      summary: "A public name with no private endpoint in front of it resolves through your normal internet-facing path. Azure is not involved.",
      steps: [
        "Leave it alone.",
        "If you later add a private endpoint for that service, come back to the Private Endpoint branch - resolution changes for every client, including this one."
      ],
      watch: [
        "Once a privatelink zone exists and is linked, VNet clients stop getting the public answer. On-premises clients keep getting it unless you forward - which is usually the bug report you receive first."
      ],
      links: [{ href: P4, label: "Part 4: Private Endpoints" }, { href: P5, label: "Part 5: Private Endpoint DNS" }]
    }
  };

  var panel = root.querySelector("[data-dtree-panel]");
  var trail = root.querySelector("[data-dtree-trail]");
  var restart = root.querySelector("[data-dtree-restart]");
  var stack = ["start"];
  var picks = [];

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function list(items, className) {
    var ul = el("ul", "dtree-list " + (className || ""));
    items.forEach(function (item) { ul.appendChild(el("li", null, item)); });
    return ul;
  }

  function goTo(id, label) {
    stack.push(id);
    if (label) picks.push(label);
    render();
    var top = root.getBoundingClientRect().top + window.pageYOffset - 24;
    if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: "smooth" });
  }

  function back() {
    if (stack.length < 2) return;
    stack.pop();
    picks.pop();
    render();
  }

  function truncate(text) {
    return text.length > 44 ? text.slice(0, 42) + "\u2026" : text;
  }

  function renderTrail() {
    trail.textContent = "";
    if (!picks.length) { trail.hidden = true; return; }
    trail.hidden = false;
    picks.forEach(function (label, index) {
      var li = el("li");
      var btn = el("button", "dtree-crumb", truncate(label));
      btn.type = "button";
      btn.title = "Go back to this step";
      btn.addEventListener("click", function () {
        stack = stack.slice(0, index + 1);
        picks = picks.slice(0, index);
        render();
      });
      li.appendChild(btn);
      trail.appendChild(li);
    });
  }

  function renderQuestion(node) {
    panel.appendChild(el("p", "dtree-question", node.question));
    if (node.help) panel.appendChild(el("p", "dtree-help", node.help));
    var wrap = el("div", "dtree-options");
    node.options.forEach(function (option) {
      var btn = el("button", "dtree-option");
      btn.type = "button";
      btn.appendChild(el("span", "dtree-option-label", option.label));
      if (option.hint) btn.appendChild(el("span", "dtree-option-hint", option.hint));
      btn.addEventListener("click", function () { goTo(option.next, option.label); });
      wrap.appendChild(btn);
    });
    panel.appendChild(wrap);
  }

  function renderOutcome(node) {
    panel.appendChild(el("span", "dtree-badge", "Recommended setup"));
    panel.appendChild(el("p", "dtree-outcome-title", node.title));
    if (node.summary) panel.appendChild(el("p", "dtree-summary", node.summary));
    if (node.steps && node.steps.length) {
      panel.appendChild(el("p", "dtree-section-title", "What to configure"));
      panel.appendChild(list(node.steps));
    }
    if (node.watch && node.watch.length) {
      panel.appendChild(el("p", "dtree-section-title", "Watch out for"));
      panel.appendChild(list(node.watch, "dtree-watch"));
    }
    if (node.links && node.links.length) {
      var links = el("div", "dtree-links");
      node.links.forEach(function (link) {
        var a = el("a", null, link.label);
        a.href = link.href;
        links.appendChild(a);
      });
      panel.appendChild(links);
    }
  }

  function render() {
    var node = NODES[stack[stack.length - 1]];
    panel.textContent = "";
    if (!node) return;
    if (node.outcome) renderOutcome(node); else renderQuestion(node);
    if (stack.length > 1) {
      var backBtn = el("button", "dtree-back", "\u2190 Back one step");
      backBtn.type = "button";
      backBtn.addEventListener("click", back);
      panel.appendChild(backBtn);
    }
    restart.hidden = stack.length < 2;
    renderTrail();
  }

  restart.addEventListener("click", function () {
    stack = ["start"];
    picks = [];
    render();
  });

  render();
})();
</script>
:::

:::note
The tree above needs JavaScript. Everything it can tell you is also written out in the tables and the checklist below, so nothing is lost if you have it disabled or you are reading a printed copy.
:::

## The four questions behind it

Strip away the branches and the whole thing is four questions, asked in this order. Learning the order is more useful than memorising the outcomes.

1. **Where is the client?** In a virtual network, or outside one. This decides whether the platform resolver is even in the path.
2. **What does the VNet's DNS servers setting say?** Default means `168.63.129.16` and everything the platform can do. Custom means your servers own the answer and linked private zones are invisible unless you forward.
3. **What kind of name is it?** Public, Azure private, `privatelink`, or on-premises. Each has exactly one mechanism.
4. **Who owns the record?** You, Microsoft, or somebody else's tenant. This is the question that produces the `NxDomainRedirect` conversation.

## Every path at a glance

The same tree, flattened, for when you already know where you are going.

| Client | Name being resolved | Mechanism | What you configure |
|---|---|---|---|
| Azure VM | Public internet name | Azure DNS recursion | Nothing - keep DNS servers on Default |
| Azure VM | Public name, custom DNS servers | Your resolvers | Forward to `168.63.129.16` |
| Azure VM | VM in the same VNet | Azure-provided (`internal.cloudapp.net`) | Nothing |
| Azure VM | Private name, one VNet | Private DNS zone | Zone + virtual network link |
| Azure VM | Private name, hub and spoke | Private DNS zone | One zone, links to all spokes, or hub + resolver |
| Azure VM | Private name, isolated VNet | Private DNS zone | Zone link (no peering needed) |
| Azure VM | Own Private Endpoint, one VNet | `privatelink` zone | Zone + link + zone group + disable public access |
| Azure VM | Own Private Endpoint, at scale | `privatelink` zone | Hub zones + DeployIfNotExists policy |
| Azure VM | Partner's Private Link resource | Fallback | `resolutionPolicy = NxDomainRedirect` on the link |
| Azure VM | On-premises name, normal volume | Forwarding ruleset | Resolver in hub, spokes point at inbound endpoint |
| Azure VM | On-premises name, very high QPS | Forwarding ruleset | Ruleset linked per spoke, DNS setting stays Default |
| Azure VM | On-premises name, isolated VNet | Forwarding ruleset | Wildcard ruleset linked to that VNet |
| On-premises | Azure private zone record | Inbound endpoint | Conditional forwarder for the zone suffix |
| On-premises | Azure Private Endpoint | Inbound endpoint | Conditional forwarder for the **public** suffix |
| On-premises | Public Azure name | Normal public DNS | Nothing |

## The evaluation order, one more time

Every outcome above is a consequence of this sequence. When something resolves to the wrong address, walk it from the top and you will find the cause before you reach the bottom.

```diagram
  Query from a VM
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │ 1. VNet DNS servers = custom?               │──yes──▶ your servers answer.
  └─────────────────────────────────────────────┘         Azure is out of the loop.
        │ no (Default)
        ▼
  ┌─────────────────────────────────────────────┐
  │ 2. Linked private DNS zone matches?         │──yes──▶ answered from the zone
  └─────────────────────────────────────────────┘         (or NXDOMAIN, unless
        │ no                                               NxDomainRedirect)
        ▼
  ┌─────────────────────────────────────────────┐
  │ 3. Forwarding ruleset linked to this VNet?  │──match─▶ out via outbound endpoint
  └─────────────────────────────────────────────┘          longest suffix wins
        │ no match
        ▼
  ┌─────────────────────────────────────────────┐
  │ 4. Azure DNS recursive lookup               │──────▶ public answer
  └─────────────────────────────────────────────┘
```

Two rules worth repeating because they cause most incidents:

- **Zones beat rules.** A linked private zone for `corp.internal` always wins over a forwarding rule for `corp.internal`. The rule never fires.
- **A wildcard rule does not catch everything.** Microsoft's reserved namespaces always resolve through Azure DNS, by design.

## Troubleshooting, in the order that finds it fastest

1. What is the VM **actually** using as a resolver? `Get-DnsClientServerAddress` or `resolvectl status`. If it disagrees with the VNet setting, the DHCP lease is stale.
2. Run `dig` or `nslookup` against `168.63.129.16` directly. If that works and the normal lookup does not, the problem is client-side.
3. Follow the **CNAME chain**. Does the public name redirect into `privatelink`? Does `privatelink` resolve to a private IP?
4. Is the zone name **exactly** the published one, and is it linked to **this** virtual network?
5. Is there **more than one zone** with that name in the tenant? Check with Resource Graph.
6. Is a private zone **shadowing** a forwarding rule for the same suffix?
7. Is the private endpoint connection **Approved**? Perfect DNS and a Pending connection look identical from the client.
8. Is there a route and a firewall opening for UDP **and** TCP 53, in both directions?
9. Are you near the **10,000 QPS** ceiling on an endpoint? Check Azure Monitor metrics before your users tell you.
10. Turn on **DNS query logging** and stop guessing.

## Closing the series

Eight posts, and it comes down to a handful of durable ideas:

- Every private query in a virtual network ends at `168.63.129.16`, and the VNet's DNS servers setting decides who is asked first.
- A private DNS zone only exists for the virtual networks you explicitly link, and it always beats a forwarding rule.
- The DNS Private Resolver adds the two hybrid directions the platform cannot do alone, driven by rulesets with a documented evaluation order.
- A Private Endpoint is a NIC. It does not close the public door, and it does nothing for you until DNS points at it.
- The `privatelink` CNAME chain means on-premises forwarders target the **public** suffix.
- Fallback to internet fixes cross-tenant Private Link and quietly weakens your isolation story - choose it deliberately.
- DNS resolver policies finally give you logs and filtering without running a single VM.

If I had to compress all eight posts into one sentence: **centralize DNS, and be able to draw the query path on a whiteboard.** The architecture you can explain in thirty seconds is the one you will still be able to debug at 2 a.m.

Enjoy!
