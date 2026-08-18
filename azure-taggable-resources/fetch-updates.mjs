import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CSV_URL = "https://raw.githubusercontent.com/tfitzmac/resource-capabilities/master/tag-support.csv";
const outputPath = join(dirname(fileURLToPath(import.meta.url)), "tag-support.json");

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

const response = await fetch(CSV_URL, {
  headers: { "User-Agent": "Mozilla/5.0 (compatible; benoit-gaumard-azure-taggable-resources/1.0)" },
});
if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);
const csvText = await response.text();

const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
const resources = lines.slice(1).map((line) => {
  const [providerName, resourceType, supportsTags, costReport] = parseCsvLine(line);
  return {
    provider: providerName,
    resourceType,
    supportsTags: supportsTags?.trim().toUpperCase() === "TRUE",
    costReport: costReport?.trim().toUpperCase() === "TRUE",
  };
});

const providers = new Set(resources.map((r) => r.provider));
const supportsTagsCount = resources.filter((r) => r.supportsTags).length;

const payload = {
  generatedAt: new Date().toISOString(),
  source: CSV_URL,
  totalResources: resources.length,
  totalProviders: providers.size,
  supportsTagsCount,
  resources,
};

await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Fetched ${resources.length} Azure resource types (${providers.size} providers, ${supportsTagsCount} support tags) into ${outputPath}`);
