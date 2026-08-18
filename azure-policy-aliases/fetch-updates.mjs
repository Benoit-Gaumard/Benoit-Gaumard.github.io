import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FEED_URL = "https://policyalias.mats.codes/index.xml";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "policy-aliases.json");

const ENTITY_MAP = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const codePoint = entity[1].toLowerCase() === "x"
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? match;
  });
}

const response = await fetch(FEED_URL, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; benoit-gaumard-azure-policy-aliases/1.0)" },
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
const feedText = await response.text();

const itemRegex = /<item>([\s\S]*?)<\/item>/g;
const rowRegex = /<tr>\s*<td><code>([^<]*)<\/code><\/td>\s*<td><code>([^<]*)<\/code><\/td>\s*<\/tr>/g;
const resources = [];
let itemMatch;
while ((itemMatch = itemRegex.exec(feedText))) {
  const block = itemMatch[1];
  const descriptionMatch = block.match(/<description>([\s\S]*?)<\/description>/);
  if (!descriptionMatch) continue;
  const html = decodeEntities(descriptionMatch[1]);

  const typeMatch = html.match(/<code>([^<]+)<\/code>/);
  const docUrlMatch = html.match(/<a\b[^>]*href="([^"]+)"/);
  if (!typeMatch) continue;
  const resourceType = typeMatch[1];

  const aliases = [];
  rowRegex.lastIndex = 0;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html))) {
    aliases.push([rowMatch[1], rowMatch[2]]);
  }
  if (!aliases.length) continue;

  resources.push({
    provider: resourceType.split("/")[0],
    resourceType,
    docUrl: docUrlMatch ? docUrlMatch[1] : null,
    aliases,
  });
}

resources.sort((a, b) => a.resourceType.localeCompare(b.resourceType));
const providers = new Set(resources.map((r) => r.provider));
const totalAliases = resources.reduce((sum, r) => sum + r.aliases.length, 0);

const payload = {
  generatedAt: new Date().toISOString(),
  source: "https://policyalias.mats.codes (Get-AzPolicyAlias, https://github.com/matsest/az-policy-alias)",
  totalResourceTypes: resources.length,
  totalProviders: providers.size,
  totalAliases,
  resources,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Fetched ${resources.length} resource types (${providers.size} providers, ${totalAliases} aliases) into ${outputPath}`);
