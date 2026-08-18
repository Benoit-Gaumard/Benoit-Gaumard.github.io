import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DETAILS_PAGE_URL = "https://www.microsoft.com/en-us/download/details.aspx?id=56519";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "ip-ranges.json");

async function findDownloadUrl() {
  const response = await fetch(DETAILS_PAGE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`Download details page request failed: ${response.status}`);
  const html = await response.text();
  const match = html.match(/https:\/\/download\.microsoft\.com\/download\/[^"']*ServiceTags_Public_\d+\.json/);
  if (!match) throw new Error("Could not find a ServiceTags_Public_*.json download link on the details page.");
  return match[0];
}

async function readExistingSourceFileName() {
  try {
    const existing = JSON.parse(await readFile(outputPath, "utf8"));
    return existing.sourceFileName ?? null;
  } catch {
    return null;
  }
}

const downloadUrl = await findDownloadUrl();
const sourceFileName = downloadUrl.split("/").pop();
const previousFileName = await readExistingSourceFileName();

if (previousFileName === sourceFileName) {
  console.log(`No new Azure IP ranges file published. Still on ${sourceFileName}.`);
  process.exit(0);
}

console.log(`New Azure IP ranges file detected: ${sourceFileName} (previous: ${previousFileName ?? "none"}). Downloading...`);

const fileResponse = await fetch(downloadUrl);
if (!fileResponse.ok) throw new Error(`Service tags file request failed: ${fileResponse.status}`);
const serviceTags = await fileResponse.json();

const tags = serviceTags.values.map((value) => ({
  name: value.name,
  id: value.id,
  region: value.properties.region || "",
  platform: value.properties.platform || "",
  systemService: value.properties.systemService || "",
  prefixes: value.properties.addressPrefixes,
}));

let ipv4Count = 0;
let ipv6Count = 0;
for (const tag of tags) {
  for (const prefix of tag.prefixes) {
    if (prefix.includes(":")) ipv6Count++;
    else ipv4Count++;
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  source: DETAILS_PAGE_URL,
  sourceFileUrl: downloadUrl,
  sourceFileName,
  version: serviceTags.changeNumber,
  cloud: serviceTags.cloud,
  totalTags: tags.length,
  totalPrefixes: ipv4Count + ipv6Count,
  ipv4Count,
  ipv6Count,
  tags,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Fetched ${tags.length} Azure service tags (${payload.totalPrefixes} prefixes) from ${sourceFileName} into ${outputPath}`);
