// Points the blog posts that also exist under /articles/ at the canonical copy
// there, so the two copies stop competing in search results.
//
// Run: node blog/apply-canonicals.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = "https://benoit-gaumard.io";

// blog/content/post/<file> -> /articles/<slug>/
const PAIRS = {
  "10-kql-query-collection.md": "kql-query-collection",
  "11-rest-api-versions-and-lifecycle.md": "azure-rest-apis-versions-and-lifecycle",
  "12--azure-subscription-switcher.md": "azure-subscription-switcher",
  "13-azure-terraform-entra-id-authentication.md": "azure-terraform-entra-id-authentication",
  "14-cyber-attacks-live-maps.md": "cyber-attacks-live-maps",
  "15-how-to-delegate-a domain-to-azure-dns.md": "how-to-delegate-a-domain-to-azure-dns",
  "16-how-to-host-your-hugo-website-on-github-pages.md": "how-to-host-your-hugo-website-on-github-pages",
  "17-remove-old-resources-based-on-tags.md": "remove-old-azure-resources-based-on-tags",
  "18-search-azure-policy-aliases.md": "search-azure-policy-aliases",
  "19-display-github-secrets-for-debug.md": "display-github-secrets-for-debug",
  "2-from-wordpress-to-hugo.md": "from-wordpress-to-hugo",
  "20-terraform-vs-bicep.md": "terraform-vs-bicep-the-match",
  "21-authentication-restrict-access-to-azure-web-app.md": "restrict-web-app-access-with-entra-id-authentication",
  "22-allow-icmp-windows-vm.md": "allow-icmp-ping-on-an-azure-vm",
  "23-network-security-perimeter.md": "network-security-perimeter",
  "24-azure-sql-database-php-connection.md": "app-service-php-access-to-azure-sql-database-with-managed-identity",
  "25-github-contribution-workflow.md": "github-contribution-workflow",
  "26-github-branch-naming-convention.md": "github-branch-naming-convention",
  "26-github-commit-naming-convention.md": "github-commit-naming-convention",
  "28-display-latest-commits-with-git-graph.md": "display-latest-commits-with-git-graph",
  "29-git-basics.md": "git-basics",
  "3-set-up-your-first-terraform-environment-on-windows.md": "set-up-your-first-terraform-environment-on-windows",
  "31-azure-bastion-tunnel-rdp.md": "connect-azure-vm-using-native-rdp-client-through-bastion",
  "4-optimize-and-reduce-costs-in-azure.md": "optimize-and-reduce-costs-in-azure",
  "5-how-to-embed-github-code-to-hugo.md": "how-to-embed-a-github-script-in-an-article",
  "6-draw.io-vscode-extension-a-must-have-for-your-diagrams.md": "draw-io-vscode-extension-a-must-have-for-your-diagrams",
  "7-call-azure-api-with-powershell.md": "call-azure-api-with-powershell",
  "8-clean-rbac-identity-not-found.md": "clean-rbac-identity-not-found",
  "9-dont-build-your-cloud-home-on-shaky-foundations.md": "dont-build-your-cloud-home-on-shaky-foundations",
};

let applied = 0;
let already = 0;

for (const [file, slug] of Object.entries(PAIRS)) {
  const path = join(HERE, "content", "post", file);
  const src = readFileSync(path, "utf8");

  if (src.includes("canonicalURL")) {
    already++;
    continue;
  }

  const canonical = `${SITE}/articles/${slug}/`;
  // Front matter opens with +++ on the first line; insert straight after it so
  // the key lands inside the TOML block whatever the rest of the ordering is.
  const marker = src.startsWith("\uFEFF") ? "\uFEFF+++" : "+++";
  if (!src.startsWith(marker)) {
    throw new Error(`Unexpected front matter in ${file}`);
  }
  const out =
    marker +
    `\ncanonicalURL = "${canonical}" # duplicate of the /articles/ copy, which is the canonical one` +
    src.slice(marker.length);

  writeFileSync(path, out, "utf8");
  applied++;
}

console.log(`canonicalURL set on ${applied} post(s), ${already} already had one.`);
