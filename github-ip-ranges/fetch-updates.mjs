import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const META_URL = "https://api.github.com/meta";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "ip-ranges.json");

const LABELS = {
  hooks: "Webhooks",
  web: "Web",
  api: "API",
  git: "Git",
  github_enterprise_importer: "GitHub Enterprise Importer",
  packages: "Packages",
  pages: "Pages",
  importer: "Importer",
  actions: "Actions",
  actions_macos: "Actions (macOS)",
  dependabot: "Dependabot",
  codespaces: "Codespaces",
  copilot: "Copilot",
};

function humanizeKey(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const response = await fetch(META_URL, {
  headers: { "User-Agent": "benoit-gaumard-github-ip-ranges", Accept: "application/vnd.github+json" },
});
if (!response.ok) throw new Error(`Meta request failed: ${response.status}`);
const meta = await response.json();

const EXCLUDED_KEYS = new Set(["ssh_keys", "commit_signing_keys"]);

const categories = Object.entries(meta)
  .filter(([key, value]) => !EXCLUDED_KEYS.has(key) && Array.isArray(value) && value.every((item) => typeof item === "string"))
  .map(([key, cidrs]) => ({
    key,
    label: LABELS[key] || humanizeKey(key),
    count: cidrs.length,
    ipv4Count: cidrs.filter((c) => c.includes(".")).length,
    ipv6Count: cidrs.filter((c) => c.includes(":")).length,
    cidrs,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const payload = {
  generatedAt: new Date().toISOString(),
  source: META_URL,
  verifiablePasswordAuthentication: meta.verifiable_password_authentication ?? null,
  totalCidrs: categories.reduce((sum, c) => sum + c.count, 0),
  categories,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Fetched ${categories.length} GitHub IP range categories (${payload.totalCidrs} CIDRs) into ${outputPath}`);
