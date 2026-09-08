// Adds a static "about this page" section to the tool and listing pages whose
// visible HTML was almost empty for a crawler: their content is injected by
// JavaScript, so Googlebot saw a shell with a heading and little else.
//
// The section is plain HTML in the initial response, so it is visible without
// JavaScript, and it is idempotent: re-running only patches missing pages.
//
// Run: node build-tool-notes.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MARKER = 'class="page-notes"';

const NOTES_CSS = `    .page-notes { margin-top: 2.5rem; padding-top: 1.75rem; border-top: 1px solid var(--cp-border); max-width: 72ch; }
    .page-notes h2 { margin: 0 0 .75rem; font-size: 1.3rem; color: var(--cp-text); }
    .page-notes h3 { margin: 1.6rem 0 .5rem; font-size: 1.02rem; color: var(--cp-text); }
    .page-notes p { margin: 0 0 .9rem; color: var(--cp-text-muted); line-height: 1.65; }
    .page-notes ul { margin: 0 0 .9rem; padding-left: 1.25rem; color: var(--cp-text-muted); line-height: 1.65; }
    .page-notes li { margin-bottom: .35rem; }
    .page-notes a { color: var(--cp-link); }
  </style>`;

// Each entry: heading, then blocks of paragraphs (p) and lists (h3 + ul).
const NOTES = {
  "guid-generator": {
    h: "About the GUID generator",
    b: `<p>A GUID (Globally Unique Identifier), called a UUID outside the Microsoft world, is a 128-bit value written as 32 hexadecimal characters in five hyphen-separated groups. This page generates version 4 identifiers, which are derived from random data rather than from a timestamp or a MAC address. That makes them safe to generate offline, in bulk, and without coordinating with anything else.</p>
      <h3>How to use it</h3>
      <ul>
        <li>Set <strong>Quantity</strong> to generate a single identifier or up to 500 at once.</li>
        <li><strong>Uppercase</strong> matches the convention used by many Microsoft tools and .NET output.</li>
        <li><strong>Hyphens</strong> can be turned off for the compact 32-character form used in some APIs and URLs.</li>
        <li><strong>Braces</strong> wrap the value in <code>{}</code>, the registry and COM style on Windows.</li>
        <li><strong>Quotes</strong> and <strong>Comma-separated</strong> produce a list you can paste straight into JSON, Bicep, Terraform, or a SQL insert.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Generation happens entirely in your browser using <code>crypto.randomUUID()</code> when available, with a fallback for older browsers. Nothing is sent to a server, so the values are yours alone. A version 4 GUID has 122 random bits, which makes an accidental collision effectively impossible in practice — but it is random, not secret, so never use one as a password, an API key, or a bearer token.</p>`,
  },
  "subnet-calculator": {
    h: "About the subnet calculator",
    b: `<p>Subnetting turns one IPv4 network into several smaller ones. This calculator takes an address plus a CIDR prefix or a dotted-decimal mask and returns the network address, broadcast address, usable host range, host count, and wildcard mask — then splits that network into equal-sized subnets when you need to carve it up.</p>
      <h3>How to use it</h3>
      <ul>
        <li>Enter any address in the network, such as <code>10.20.0.37</code>; the network address is derived for you.</li>
        <li>Give the size as a prefix (<code>/24</code>) or as a mask (<code>255.255.255.0</code>) — the two are interchangeable.</li>
        <li>Use the split option to divide the block into equal subnets and read off each range.</li>
      </ul>
      <h3>Planning an Azure virtual network</h3>
      <p>Azure reserves five addresses in every subnet: the network address, the broadcast address, and three more for the default gateway and DNS mapping. A <code>/24</code> therefore offers 251 usable addresses rather than 254. Several services also require a dedicated subnet with a minimum size — Azure Bastion, Azure Firewall, and gateway subnets are the common ones — so leave room for them before you allocate the whole range to workloads.</p>
      <p>Prefer a contiguous, non-overlapping plan across environments. Overlapping ranges are the single most common cause of failed VNet peering and site-to-site VPN connections, and they are painful to renumber once workloads are running.</p>`,
  },
  "sla-calculator": {
    h: "About the SLA calculator",
    b: `<p>A service level agreement expressed as a percentage is easier to reason about when you convert it into time. This page does that in three directions: allowed downtime for a given SLA, the SLA implied by an observed amount of downtime, and the composite figure you get when several services have to work together.</p>
      <h3>What the percentages mean</h3>
      <ul>
        <li><strong>99.9%</strong> — about 43 minutes of downtime per month.</li>
        <li><strong>99.95%</strong> — about 21 minutes per month.</li>
        <li><strong>99.99%</strong> — about 4 minutes per month.</li>
        <li><strong>99.999%</strong> — about 26 seconds per month.</li>
      </ul>
      <h3>Why composite SLAs matter</h3>
      <p>When a request has to pass through several components in sequence, their availabilities multiply. An application gateway, a web app, and a database each at 99.95% give roughly 99.85% together — noticeably worse than any single component. Adding dependencies always lowers the ceiling, which is why redundancy inside a tier is worth more than another nine on paper.</p>
      <p>Remember that a cloud provider's SLA is a financial commitment, not a prediction. Credits are paid when a target is missed; they do not restore your service or your data, and most SLAs exclude planned maintenance and customer misconfiguration.</p>`,
  },
  "percentage-calculator": {
    h: "About the percentage calculator",
    b: `<p>Four everyday percentage questions, each with its own field so you do not have to remember which way the formula runs.</p>
      <h3>The four modes</h3>
      <ul>
        <li><strong>What is X% of Y</strong> — the share of a total, for example 20% of a 1,450 € invoice.</li>
        <li><strong>X is what percent of Y</strong> — a proportion, for example how much of a monthly cloud budget one subscription consumed.</li>
        <li><strong>Percentage change</strong> — the difference between two values, positive for an increase and negative for a decrease.</li>
        <li><strong>Add or subtract a percentage</strong> — applying VAT, a discount, or a forecast growth rate to a figure.</li>
      </ul>
      <h3>A common trap</h3>
      <p>Percentage increases and decreases are not symmetrical. A value that falls by 50% needs to rise by 100% to get back where it started, because each step is measured against a different base. The same applies to cloud spend: a 30% cut followed by a 30% rise leaves you 9% below the original figure, not level with it.</p>`,
  },
  "units-converter": {
    h: "About the units converter",
    b: `<p>Conversions across the categories that come up most often in day-to-day technical work: length, weight, temperature, volume, speed, area, data, and time. Pick a category, type a value, and every equivalent unit updates at once.</p>
      <h3>How to use it</h3>
      <ul>
        <li>Choose the category first — the unit lists change to match it.</li>
        <li>Type in either field; conversion runs in both directions.</li>
        <li>The result updates as you type, so you can compare several magnitudes quickly.</li>
      </ul>
      <h3>Data units, decimal and binary</h3>
      <p>Storage and memory are the classic source of confusion. Decimal units count in powers of ten — a kilobyte is 1,000 bytes — while binary units count in powers of two, so a kibibyte (KiB) is 1,024 bytes. Drive manufacturers advertise decimal capacity while operating systems often report binary, which is why a "1 TB" disk shows up as roughly 931 GiB. Cloud providers bill storage and egress in decimal units.</p>
      <p>Temperature is the other special case: it is the only category here with an offset rather than a simple ratio, so 0 °C is 32 °F and not zero.</p>`,
  },
  "world-clock": {
    h: "About the world clock",
    b: `<p>Local time in Paris alongside a set of common working timezones, so you can see at a glance who is at their desk before you send a meeting invitation.</p>
      <h3>Working across timezones</h3>
      <ul>
        <li>Offsets are not fixed: daylight saving changes on different dates in Europe, North America, and the southern hemisphere, so the gap between two cities shifts several times a year.</li>
        <li>India is offset by 30 minutes and parts of Australia by 45, so "round hour" assumptions break.</li>
        <li>Store timestamps in UTC and convert for display. Storing local time is the root cause of duplicated or missing records around the twice-yearly clock change.</li>
      </ul>
      <h3>Good to know</h3>
      <p>The clock reads your device's own time and timezone database, so accuracy depends on your machine being in sync. Azure resources, GitHub Actions schedules, and most CI cron expressions run in UTC unless you explicitly say otherwise — a frequent surprise when a nightly job fires an hour early after a daylight saving change.</p>`,
  },
  "random-wheel": {
    h: "About the random wheel",
    b: `<p>A spinning wheel that draws a random letter from A to Z or a random number from 0 to 100. Values already drawn are removed from the pool until you reset, so a full run gives you a shuffled sequence rather than repeats.</p>
      <h3>What it is useful for</h3>
      <ul>
        <li>Picking who speaks next in a stand-up or a retrospective.</li>
        <li>Choosing a random order for demos, reviews, or on-call rotation drafts.</li>
        <li>Running a quick draw during a workshop or a team session.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Draws happen in your browser and nothing is recorded, so closing the tab clears the history of what has already been picked. The randomness is fine for games and team rituals; it is not suitable for anything requiring cryptographic guarantees, such as generating secrets or running a regulated prize draw.</p>`,
  },
  "emoji-sheet": {
    h: "About the emoji sheet",
    b: `<p>A searchable reference of emoji together with their shortcodes — the <code>:rocket:</code> style aliases understood by GitHub, Slack, Teams, Discord, and most Markdown editors. Click any entry to copy it.</p>
      <h3>Where shortcodes work</h3>
      <ul>
        <li>GitHub issues, pull requests, comments, and README files.</li>
        <li>Commit messages, which is where the Gitmoji convention comes from.</li>
        <li>Slack and Discord messages, and most chat tools that accept Markdown.</li>
      </ul>
      <h3>Good to know</h3>
      <p>An emoji is a Unicode character, so it renders differently depending on the operating system and font: the same code point can look quite different on Windows, macOS, Android, and iOS. Some entries are sequences joined by a zero-width joiner, which older platforms may split into their component symbols. Screen readers announce emoji by their Unicode name, so a decorative emoji in a heading or a link label is read aloud — worth keeping in mind for documentation and interface copy.</p>`,
  },
  "azure-ip-ranges": {
    h: "About Azure IP ranges and service tags",
    b: `<p>Azure publishes the public IP ranges behind its services as a weekly JSON download, grouped into service tags such as <code>Storage</code>, <code>AzureCloud</code>, <code>Sql</code>, and their regional variants. This page reads that published data so you can search a tag or look up which service an address belongs to.</p>
      <h3>How to use it</h3>
      <ul>
        <li>Search by service tag name to list every prefix it currently covers.</li>
        <li>Search by region to narrow a tag down to a single location.</li>
        <li>Use the results when a firewall or an on-premises appliance cannot resolve service tags natively.</li>
      </ul>
      <h3>Prefer service tags to hardcoded ranges</h3>
      <p>Inside Azure, reference the tag itself in network security groups, Azure Firewall rules, and user-defined routes. Microsoft updates the membership of a tag automatically, so a rule written against <code>Storage.westeurope</code> keeps working as prefixes are added or retired. Copying literal ranges into a rule set means owning the maintenance of that list forever.</p>
      <p>The published file changes regularly and new ranges are announced roughly a week before they go live, so a firewall built on static copies needs a scheduled refresh to avoid silent breakage.</p>`,
  },
  "github-ip-ranges": {
    h: "About GitHub IP ranges",
    b: `<p>GitHub exposes the address ranges used by its services through the public Meta API. This page presents that data grouped by service: the website, the API, Git operations, GitHub Actions runners, GitHub Pages, Copilot, packages, webhooks, and importer traffic.</p>
      <h3>Typical uses</h3>
      <ul>
        <li>Allowing outbound access to <code>github.com</code> and Git endpoints from a locked-down network.</li>
        <li>Accepting inbound webhook deliveries on a self-hosted service.</li>
        <li>Allowing hosted Actions runners to reach an internal artifact feed or a deployment target.</li>
      </ul>
      <h3>Good to know</h3>
      <p>These ranges change without individual notice, so treat the Meta API as the source of truth and refresh any firewall list on a schedule rather than copying it once. The <code>actions</code> range in particular is very large and shared across all of GitHub's hosted runners, so allowing it is not equivalent to allowing only your own workflows — if that distinction matters, self-hosted runners with a fixed egress address are the stronger control.</p>`,
  },
  "azure-regions": {
    h: "About Azure regions",
    b: `<p>Every Azure region, with its physical location, the geography it belongs to, its paired region, and whether it supports availability zones.</p>
      <h3>Choosing a region</h3>
      <ul>
        <li><strong>Data residency</strong> — a geography is the boundary most compliance requirements are written against.</li>
        <li><strong>Latency</strong> — the closest region to your users usually matters more than any other factor.</li>
        <li><strong>Service availability</strong> — not every service or VM family exists in every region, and previews are typically limited to a handful.</li>
        <li><strong>Price</strong> — the same resource can differ noticeably in cost between regions.</li>
        <li><strong>Capacity</strong> — popular regions can refuse specific VM sizes at times, which is worth testing before committing.</li>
      </ul>
      <h3>Pairs and zones are not the same thing</h3>
      <p>Availability zones protect against a datacenter failure inside one region; a regional pair supports recovery from the loss of an entire region, and governs how some platform-managed replication and sequenced updates behave. A resilient design usually needs both, and a pair is not automatically the region you would choose for disaster recovery — check latency and service parity first.</p>`,
  },
  "azure-naming-convention": {
    h: "About Azure naming conventions",
    b: `<p>Generate resource names that follow the Microsoft Cloud Adoption Framework pattern, and browse the recommended abbreviation for each resource type.</p>
      <h3>The usual pattern</h3>
      <p>The framework suggests composing a name from a resource type abbreviation, a workload or application name, an environment, a region, and an instance number — for example <code>vm-payments-prod-weu-01</code>. The order matters less than applying it consistently: names that sort predictably are far easier to filter, script against, and audit.</p>
      <h3>Constraints to respect</h3>
      <ul>
        <li>Length limits vary widely; storage accounts allow 24 characters, lowercase letters and digits only, with no hyphens.</li>
        <li>Some names must be globally unique because they become part of a DNS name — storage accounts, key vaults, and web apps among them.</li>
        <li>Most resources cannot be renamed after creation, so the cost of getting it wrong is a redeployment.</li>
      </ul>
      <p>Keep genuinely variable information — owner, cost centre, criticality — in tags rather than in the name. Tags can be changed, queried, and used in cost reports; names cannot.</p>`,
  },
  "azure-policies": {
    h: "About Azure Policy definitions",
    b: `<p>Every built-in Azure Policy definition and initiative, refreshed from Azure. Use it to find an existing policy before writing a custom one — the built-in library already covers most common governance requirements.</p>
      <h3>Effects you will meet most often</h3>
      <ul>
        <li><strong>Audit</strong> — records non-compliance without blocking anything; the safe way to start.</li>
        <li><strong>Deny</strong> — rejects a deployment that breaks the rule.</li>
        <li><strong>DeployIfNotExists</strong> — provisions the missing configuration, and needs a managed identity with the right permissions.</li>
        <li><strong>Modify</strong> — adds or updates properties such as tags on creation.</li>
      </ul>
      <h3>How to roll one out</h3>
      <p>Assign in audit mode first, look at the compliance results over a full deployment cycle, then tighten to deny once you know what would have broken. Initiatives group related definitions so a whole standard can be assigned and reported as one unit, which is how the regulatory compliance baselines are packaged.</p>
      <p>Evaluation is not instantaneous: compliance state refreshes roughly every 24 hours, or after a scan is triggered manually, so an empty result immediately after assignment usually means the scan has not run yet.</p>`,
  },
  "azure-policy-aliases": {
    h: "About Azure Policy aliases",
    b: `<p>An alias exposes a specific property of a resource type to Azure Policy, so a rule can inspect it. Writing a custom policy means finding the right alias first, and this page lets you search the full published list.</p>
      <h3>How aliases work</h3>
      <ul>
        <li>An alias looks like <code>Microsoft.Storage/storageAccounts/allowBlobPublicAccess</code> and maps to a property in the resource provider's API.</li>
        <li>Aliases are versioned against API versions, and a property only becomes usable once an alias exists for it.</li>
        <li>Array properties use <code>[*]</code> and are evaluated with <code>count</code> expressions rather than a direct comparison.</li>
      </ul>
      <h3>Good to know</h3>
      <p>If a property has no alias, no policy can evaluate it — that is the usual reason a rule that looks correct never matches anything. The same list is available from the CLI with <code>az provider show</code>, but searching it here is faster when you only need to confirm that an alias exists and how it is spelled.</p>`,
  },
  "azure-built-in-roles": {
    h: "About Azure built-in roles",
    b: `<p>Azure role-based access control grants permissions through role definitions. A role definition is a list of allowed control-plane operations (<code>Actions</code>), operations carved back out of them (<code>NotActions</code>), and the equivalent pair for operations on the data inside a resource (<code>DataActions</code> and <code>NotDataActions</code>). Built-in roles are the ones Microsoft ships and maintains; their definition IDs are the same GUID in every tenant, which is why they can be referenced safely from templates and pipelines.</p>
      <h3>Reading a role definition</h3>
      <ul>
        <li><code>Actions</code> are management operations - creating, reading, updating or deleting the resource itself.</li>
        <li><code>DataActions</code> reach the data a resource holds: the blobs in a storage account, the secrets in a key vault, the messages in a queue. A role with no <code>DataActions</code> cannot read your data, however broad its management rights look.</li>
        <li><code>NotActions</code> is a subtraction, not a deny. It removes an operation from this role only; another assignment can still grant it.</li>
        <li>A wildcard such as <code>Microsoft.Compute/*</code> covers every current and future operation in that namespace, so the effective reach of a role grows as Azure does.</li>
      </ul>
      <h3>Choosing the right role</h3>
      <p>Start from the narrowest role whose actions cover the task, and assign it at the narrowest scope that works - a resource before a resource group, a resource group before a subscription. Owner, Contributor and User Access Administrator are flagged as privileged here because they can grant access to others or bypass the guardrails placed on a scope, so they deserve a Privileged Identity Management workflow rather than a standing assignment.</p>
      <h3>Where this data comes from</h3>
      <p>The dataset is rebuilt several times a day from Microsoft's generated Azure RBAC reference, so a role added or reworded upstream shows up here without anyone editing this page. The per-action descriptions come from the same source, which is why they read the way they do in the portal.</p>`,
  },
  "entra-built-in-roles": {
    h: "About Microsoft Entra ID built-in roles",
    b: `<p>Entra ID roles govern the directory itself - users, groups, applications, devices, authentication methods and the Microsoft 365 services that trust it. They are a different system from Azure RBAC: an Entra role never grants access to a subscription or a resource group, and an Azure role never lets you reset a password or consent to an application. The one bridge between them is the Global Administrator's ability to elevate access to User Access Administrator at the root management group, which is a deliberate, auditable action.</p>
      <h3>Template ID, not role ID</h3>
      <p>Each built-in role has a template ID that is identical in every tenant, and a role definition ID that is only stable within one tenant. Automation should reference the template ID - that is the GUID listed here - so the same script works against any directory.</p>
      <h3>Roles are not Graph API permissions</h3>
      <p>The <code>microsoft.directory/...</code> strings listed against each role are Entra RBAC resource actions, not Microsoft Graph scopes such as <code>Directory.Read.All</code>. The two models are parallel and Microsoft publishes no mapping between them: a Graph permission decides what an application's <em>token</em> may attempt, while the role decides what the <em>identity</em> may do in the directory, and many operations need both. A call that fails with <code>Authorization_RequestDenied</code> despite the correct scope is almost always missing the role. The full scope catalog is on the <a href="/graph-permissions/">Microsoft Graph permissions</a> page.</p>
      <h3>Privileged roles</h3>
      <p>Microsoft flags a role as privileged when it can manage access to the directory or to Microsoft 365 services, directly or by proxy: creating credentials on an application, resetting an administrator's password, or assigning other roles. Those roles are the ones worth putting behind Privileged Identity Management with approval and time limits, and worth alerting on when assigned permanently.</p>
      <h3>Practical guidance</h3>
      <ul>
        <li>Prefer a narrow role over Global Administrator; most day-to-day tasks are covered by a specific administrator role listed here.</li>
        <li>Scope role assignments to an administrative unit when the role supports it, so a helpdesk role does not reach the whole directory.</li>
        <li>Keep at least two, and no more than a handful, of permanent Global Administrators, and exclude a break-glass account from Conditional Access.</li>
        <li>Read the permissions rather than the name: several reader-sounding roles can read sensitive data, and some administrator roles are narrower than they sound.</li>
      </ul>
      <h3>Where this data comes from</h3>
      <p>The dataset is rebuilt several times a day from Microsoft's generated Entra ID roles reference, so a role or permission added upstream appears here without anyone editing this page.</p>`,
  },
  "graph-permissions": {
    h: "About Microsoft Graph permissions",
    b: `<p>A Graph permission, also called a scope, is what an application asks for so that its access token is allowed to reach a given part of Microsoft Graph. Every permission exists in up to two flavours, and the difference decides who can consent to it and what the call can reach.</p>
      <h3>Delegated, application and resource-specific</h3>
      <ul>
        <li><strong>Delegated</strong> permissions are used when a user is signed in. The effective access is the intersection of the permission and what that user is already allowed to do, so a delegated <code>User.ReadWrite.All</code> still cannot edit a user the signed-in account has no rights over.</li>
        <li><strong>Application</strong> permissions are used with no signed-in user, typically by a daemon or a pipeline. There is no user to intersect with, so the permission is the whole story - which is why almost all of them require admin consent.</li>
        <li><strong>Resource-specific consent (RSC)</strong> permissions are scoped to a single Teams team, chat or user rather than the tenant, and are consented by the owner of that resource.</li>
      </ul>
      <h3>Permissions are not Entra ID roles</h3>
      <p>This is the distinction that costs the most debugging time. A Graph permission decides what the <em>token</em> may attempt; an <a href="/entra-built-in-roles/">Entra ID directory role</a> decides what the <em>identity</em> may do in the directory. Many operations need both, and Microsoft publishes no mapping between the two - the models are deliberately parallel. If a call fails with <code>Authorization_RequestDenied</code> despite the right scope, the missing piece is usually the role, not the permission.</p>
      <h3>Choosing the least privileged permission</h3>
      <ul>
        <li>Prefer the narrowest permission a call accepts; each Graph API method documents its own least privileged option.</li>
        <li>Prefer delegated over application whenever a user is present, so the user's own limits still apply.</li>
        <li>Watch for the <code>.All</code> suffix - it means tenant-wide, not "all properties".</li>
        <li>Identifiers listed here are the same GUIDs in every tenant, so they are safe to hard-code in an app manifest or a consent URL.</li>
      </ul>
      <h3>Where this data comes from</h3>
      <p>The dataset is rebuilt several times a day from Microsoft's published permissions reference. The same catalog can be read from Graph itself on the Microsoft Graph service principal, but only by a caller holding <code>Application.Read.All</code>; the reference is public and additionally carries the RSC permissions.</p>`,
  },
  "azure-taggable-resources": {
    h: "About tag support in Azure",
    b: `<p>Not every Azure resource type accepts tags, and among those that do, not all propagate tags into the cost report. This page lists both facts per resource type, from the official tag-support reference data.</p>
      <h3>Why it matters for cost management</h3>
      <p>Cost allocation by team, environment, or application relies on tags reaching the billing pipeline. A resource that accepts tags but does not surface them in cost analysis will appear as unallocated spend no matter how carefully it is labelled, which quietly undermines a showback or chargeback model.</p>
      <h3>Practical guidance</h3>
      <ul>
        <li>Tags are not inherited automatically: a resource does not take the tags of its resource group unless a policy applies them.</li>
        <li>Use Azure Policy with the <code>Modify</code> effect to apply and remediate required tags at scale.</li>
        <li>Keep the required set small — an owner, an environment, and a cost centre are enough to be useful and realistic to maintain.</li>
        <li>Tag names are case-insensitive for lookup but preserve the case you set, so agree on one spelling early.</li>
      </ul>`,
  },
  "azure-release-updates": {
    h: "About Azure release updates",
    b: `<p>The latest entries from the official Azure Updates feed, refreshed twice a day, so you can scan what changed without leaving the site.</p>
      <h3>Reading the announcements</h3>
      <ul>
        <li><strong>In preview</strong> — usable but not covered by an SLA, and the shape of the service can still change.</li>
        <li><strong>Generally available</strong> — production-ready, under SLA, and safe to standardise on.</li>
        <li><strong>Retirement</strong> — the entries worth reading first, since they come with a deadline and eventually force work.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Features roll out region by region, so an announcement does not mean immediate availability everywhere. Retirement notices usually give twelve months or more of notice; tracking them as they appear is far cheaper than discovering a deadline weeks before it lands. The same information is available directly from the <a href="https://azure.microsoft.com/updates/" target="_blank" rel="noopener noreferrer">Azure Updates</a> page and its RSS feed.</p>`,
  },
  "m365-release-updates": {
    h: "About Microsoft 365 roadmap updates",
    b: `<p>Entries from the official Microsoft 365 roadmap feed, refreshed twice a day, covering Teams, Exchange, SharePoint, OneDrive, Purview, Entra, and the rest of the suite.</p>
      <h3>How roadmap items progress</h3>
      <ul>
        <li><strong>In development</strong> — announced, with a target month that can and does move.</li>
        <li><strong>Rolling out</strong> — reaching tenants progressively, starting with targeted release.</li>
        <li><strong>Launched</strong> — available, though not necessarily in every tenant on the same day.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Roadmap dates are intentions rather than commitments, and the ring model means two tenants can see the same feature weeks apart. For changes that affect your users directly — a new interface, a changed default, a deprecated setting — the message centre in the admin portal remains the authoritative, tenant-specific source. The roadmap is the better tool for planning a quarter ahead.</p>`,
  },
  "aws-release-updates": {
    h: "About AWS release updates",
    b: `<p>The latest items from the official AWS "What's New" feed, refreshed automatically. Useful for keeping an eye on a second provider without maintaining another set of bookmarks.</p>
      <h3>What to watch</h3>
      <ul>
        <li>New regions and availability zones, which change latency and residency options.</li>
        <li>Instance families and storage classes, which usually shift price-performance calculations.</li>
        <li>Deprecations and end-of-support notices, which come with hard dates.</li>
      </ul>
      <h3>Good to know</h3>
      <p>AWS ships features region by region, and a launch post frequently lists a limited set of regions at first. If you run workloads across providers, comparing announcement streams side by side is a practical way to keep architecture decisions honest — capability gaps between the major clouds tend to be narrower and shorter-lived than vendor material suggests.</p>`,
  },
  "rss-watcher": {
    h: "About RSS Watcher",
    b: `<p>An aggregator that pulls headlines from a curated set of technology sources and refreshes them through the day, so one page replaces a folder of bookmarks.</p>
      <h3>How it works</h3>
      <ul>
        <li>A scheduled job fetches each feed and stores the result as static JSON alongside the page.</li>
        <li>Items are grouped and dated so you can see what is genuinely new since your last visit.</li>
        <li>Sources cover cloud platforms, security, and general engineering news.</li>
      </ul>
      <h3>Why RSS still earns its place</h3>
      <p>A feed gives you the publisher's own headlines in publication order, with no ranking algorithm, no account, and no tracking of what you read. It is also resilient: if a source stops publishing or its feed breaks, that is visible immediately rather than silently absorbed. Feed health for every source tracked here is listed on the activity page.</p>`,
  },
  "microsoft-techcommunity-rss-feeds": {
    h: "About the Microsoft Tech Community feeds",
    b: `<p>The Microsoft Tech Community hosts dozens of separate product blogs, each with its own RSS feed. This page consolidates their recent activity so you can follow several at once instead of subscribing individually.</p>
      <h3>What you will find there</h3>
      <ul>
        <li>Engineering posts from the product groups behind Azure, Microsoft 365, Windows, and security.</li>
        <li>Deep dives and troubleshooting guidance that rarely make it into official documentation.</li>
        <li>Early signals about features before they reach the formal release notes.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Tech Community posts are written by individual engineers and programme managers, so they are more detailed and more opinionated than documentation — and occasionally out of date. Treat them as expert commentary and confirm anything load-bearing against Microsoft Learn. The per-feed status listing makes it obvious when a blog has gone quiet or its feed has changed address.</p>`,
  },
  "microsoft-portals": {
    h: "About the Microsoft portals directory",
    b: `<p>Microsoft's administration surface is spread across a large number of separate portals, each with its own address and its own scope. This directory gathers them in one searchable place.</p>
      <h3>The ones you will use most</h3>
      <ul>
        <li><strong>Azure portal</strong> — subscriptions, resources, and infrastructure.</li>
        <li><strong>Microsoft Entra admin centre</strong> — identity, groups, conditional access, and application registrations.</li>
        <li><strong>Microsoft 365 admin centre</strong> — tenant, licences, users, and the message centre.</li>
        <li><strong>Microsoft Purview</strong> — data governance, compliance, and information protection.</li>
        <li><strong>Microsoft Defender</strong> — security operations, incidents, and endpoint management.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Portals are consolidated and renamed regularly — several identity and security consoles have moved in recent years — and old addresses usually redirect rather than disappear. Because permissions are granted per service and not per portal, being able to open a console says nothing about what you can change inside it; that still depends on your role assignments.</p>`,
  },
  "icons": {
    h: "About the Azure icon gallery",
    b: `<p>A browsable gallery of Azure service icons in SVG, for architecture diagrams, documentation, presentations, and design mockups.</p>
      <h3>Why SVG</h3>
      <ul>
        <li>Vector artwork stays sharp at any size, from a slide thumbnail to a printed poster.</li>
        <li>File sizes are small, which keeps documentation repositories light.</li>
        <li>Colours can be adapted where a diagram needs a monochrome or dark-background variant.</li>
      </ul>
      <h3>Using them well</h3>
      <p>Keep icon sizes consistent within a diagram and let position, not size, express hierarchy. Always pair an icon with a text label: the icon set is large, several services look alike at small sizes, and a diagram that depends on icon recognition alone is unreadable for anyone new to the platform — and inaccessible to screen reader users.</p>
      <p>Microsoft publishes the official Azure architecture icon set with its own terms of use; check them before using the artwork in commercial or public-facing material.</p>`,
  },
  "it-images": {
    h: "About this image collection",
    b: `<p>A light-hearted gallery of IT memes, developer humour, and technology images — the kind of slide that wakes a room up halfway through a long architecture review.</p>
      <h3>Using them in talks and documents</h3>
      <ul>
        <li>One image per section is plenty; humour loses its effect through repetition.</li>
        <li>Give the joke a moment to land before moving on — a meme nobody has time to read is wasted space.</li>
        <li>Keep an eye on audience and context: what works in a team retrospective may not suit a customer steering committee.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Internet memes circulate widely and their origin is often unclear, so ownership can be hard to establish. For internal presentations that is rarely an issue; before publishing anything externally or commercially, check the source and licence of the specific image you intend to use.</p>`,
  },
  "favorite-links": {
    h: "About this link collection",
    b: `<p>A curated set of references I actually return to — documentation, tooling, learning material, and community resources gathered while working on Azure and DevOps projects.</p>
      <h3>What makes the list</h3>
      <ul>
        <li>Primary sources over aggregators, so the information stays current.</li>
        <li>Tools that solve a real recurring problem rather than demonstrate a technique.</li>
        <li>Material that has stayed useful over time, not just at the moment it was published.</li>
      </ul>
      <h3>Good to know</h3>
      <p>Links are checked periodically, but the web moves and documentation gets reorganised: if something has moved, the vendor's own search is usually the quickest route to the new location. Suggestions are welcome through <a href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</p>`,
  },
  "friends-websites": {
    h: "About this blogroll",
    b: `<p>Websites and blogs published by friends, colleagues, and people from the francophone cloud community — engineers writing about Azure, security, automation, and the day-to-day reality of building on the cloud.</p>
      <h3>Why a blogroll</h3>
      <p>Independent technical blogs are where the hard-won detail lives: the workaround that is not in the documentation, the migration that went sideways, the honest verdict on a service after six months in production. Linking to them is also how a community stays discoverable, now that search and social feeds surface far less of the independent web than they used to.</p>
      <h3>Good to know</h3>
      <p>Every site listed here is written and maintained by its own author, and opinions expressed there are theirs. If you publish about cloud, Azure, or DevOps and would like to be added, get in touch through <a href="https://linkedin.com/in/benoit-gaumard" target="_blank" rel="noopener noreferrer">LinkedIn</a>.</p>`,
  },
  "workflows": {
    h: "About these scheduled workflows",
    b: `<p>Several pages on this site display data that has to stay current: Azure and AWS release notes, Microsoft 365 roadmap items, RSS headlines, and the published IP ranges for Azure and GitHub. Each is refreshed by a scheduled GitHub Actions workflow, and this page reports the state of every one of them.</p>
      <h3>How the refresh works</h3>
      <ul>
        <li>A workflow runs on a cron schedule, fetches the upstream source, and writes the result as static JSON into the repository.</li>
        <li>Committing that data triggers a rebuild, so the published pages serve pre-fetched files rather than calling third-party APIs on every visit.</li>
        <li>Because the output is static, pages stay fast and keep working even when an upstream source is temporarily unavailable.</li>
      </ul>
      <h3>Why show the status</h3>
      <p>Stale data is worse than missing data, because nothing looks wrong. Surfacing the last successful run for each workflow makes it obvious when a feed has changed address, an API has started rate-limiting, or a schedule has silently stopped firing.</p>`,
  },
  "articles": {
    h: "About these articles",
    b: `<p>Practical write-ups from real Azure, GitHub, and DevOps work: the configuration that was not obvious, the error message with no useful search result, and the procedure worth writing down before it is forgotten.</p>
      <h3>What you will find</h3>
      <ul>
        <li><strong>Azure infrastructure</strong> — networking, virtual machines, identity, and governance.</li>
        <li><strong>Infrastructure as code</strong> — Terraform and Bicep, and how they compare in practice.</li>
        <li><strong>GitHub</strong> — Actions, OIDC federation with Azure, branch and commit conventions, and contribution workflows.</li>
        <li><strong>Operations</strong> — cost optimisation, policy and RBAC clean-up, and KQL queries for troubleshooting.</li>
      </ul>
      <h3>How to browse</h3>
      <p>Use the category and tag filters to narrow the list, or the search box to look across every title and summary at once. Each article is self-contained, with the commands and configuration in copyable blocks. An <a href="/articles/rss.xml">RSS feed</a> is available if you would rather be notified when something new is published.</p>`,
  },
};

let patched = 0;
let already = 0;
let missing = 0;

for (const [slug, note] of Object.entries(NOTES)) {
  const file = `${slug}/index.html`;
  if (!existsSync(file)) {
    console.log(`missing  ${file}`);
    missing++;
    continue;
  }

  let src = readFileSync(file, "utf8");
  if (src.includes(MARKER)) {
    already++;
    continue;
  }

  const section = `
    <section class="page-notes" aria-labelledby="notes-heading">
      <h2 id="notes-heading">${note.h}</h2>
      ${note.b}
    </section>
  </main>`;

  if (!src.includes("</main>") || !src.includes("</style>")) {
    console.log(`skipped  ${file} (unexpected shape)`);
    missing++;
    continue;
  }

  src = src.replace("  </main>", section);
  src = src.replace("</style>", NOTES_CSS.slice(NOTES_CSS.indexOf("    .page-notes")));
  writeFileSync(file, src, "utf8");
  patched++;
  console.log(`patched  ${file}`);
}

console.log(`\n${patched} page(s) enriched, ${already} already done, ${missing} skipped.`);
