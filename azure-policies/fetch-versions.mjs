// Export official Azure built-in versions for the static comparison page.
// Authentication stays in the refresh job, never in the published files.
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const API = "2026-07-01";
const ARM = "https://management.azure.com";
const VERSION = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export async function exportVersions({ token, root = ROOT, request = fetch, concurrency = 6 }) {
  if (!token) throw new Error("An Azure access token is required.");
  async function get(url) {
    const target = new URL(url, ARM);
    if (target.origin !== ARM || !target.pathname.startsWith("/providers/Microsoft.Authorization/")) throw new Error("Unexpected Azure pagination URL.");
    for (let attempt = 0; ; attempt++) {
      const response = await request(target.href, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(60000),
      });
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        const delay = Math.min(60, Math.max(1, Number(response.headers.get("retry-after")) || 2 ** attempt));
        await new Promise(done => setTimeout(done, delay * 1000));
        continue;
      }
      if (!response.ok) throw new Error(`Azure version export: HTTP ${response.status} for ${target.pathname}`);
      return response.json();
    }
  }
  async function list(resource) {
    const result = [];
    const seen = new Set();
    let url = `${ARM}/providers/Microsoft.Authorization/${resource}?api-version=${API}&$top=1000`;
    while (url) {
      if (seen.has(url)) throw new Error("Repeated Azure pagination URL.");
      seen.add(url);
      const page = await get(url);
      if (!Array.isArray(page.value)) throw new Error("Invalid Azure built-in list.");
      result.push(...page.value);
      url = page.nextLink;
    }
    if (!result.length) throw new Error(`Azure returned no ${resource}; refusing to replace the version index.`);
    return result;
  }
  const index = { generatedAt: new Date().toISOString(), source: `Azure Resource Manager built-in definition versions, API ${API}`, policies: {}, initiatives: {} };
  for (const [kind, resource] of [["policies", "policyDefinitions"], ["initiatives", "policySetDefinitions"]]) {
    const rows = await list(resource);
    let next = 0;
    let failure;
    async function worker() {
      while (next < rows.length && !failure) {
        const row = rows[next++];
        try {
          if (!row || !ID.test(row.name) || !row.properties || !["BuiltIn", "Static"].includes(row.properties.policyType)) throw new Error(`Invalid built-in ${kind} response: ${row?.name || "(missing ID)"}.`);
          const current = row.properties.version || row.properties.metadata?.version;
          const versions = [...new Set([...(row.properties.versions || []), ...(current ? [current] : [])])].sort();
          if (versions.some(version => !VERSION.test(version))) throw new Error(`Invalid official version for ${row.name}.`);
          if (!versions.length) continue;
          const directory = join(root, "versions", kind, row.name);
          for (const version of versions) {
            const file = join(directory, `${version}.json`);
            let previous;
            try { previous = JSON.parse(await readFile(file, "utf8")); }
            catch (error) { if (error.code !== "ENOENT") throw error; }
            const properties = previous
              || (version === current ? row.properties : (await get(`${ARM}/providers/Microsoft.Authorization/${resource}/${encodeURIComponent(row.name)}/versions/${encodeURIComponent(version)}?api-version=${API}`)).properties);
            if (!properties || !properties.displayName || (kind === "policies" ? !properties.policyRule : !Array.isArray(properties.policyDefinitions))) throw new Error(`Incomplete ${kind} definition ${row.name} version ${version}.`);
            const reported = properties.version || properties.metadata?.version;
            if (reported && reported !== version) throw new Error(`Azure returned ${reported} instead of ${version}.`);
            const definition = { ...properties };
            delete definition.versions;
            const payload = JSON.stringify(definition);
            if (payload !== JSON.stringify(previous)) {
              await mkdir(directory, { recursive: true });
              await writeFile(file, payload + "\n");
            }
          }
          index[kind][row.name] = versions;
        } catch (error) { failure = error; }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    if (failure) throw failure;
    index[kind] = Object.fromEntries(Object.entries(index[kind]).sort(([a], [b]) => a.localeCompare(b)));
    console.log(`Official ${kind} versions: ${Object.keys(index[kind]).length} definitions.`);
  }
  await writeFile(join(root, "versions-index.json"), JSON.stringify(index) + "\n");
  return index;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const token = process.env.AZURE_ACCESS_TOKEN || JSON.parse(execFileSync(process.platform === "win32" ? "az.cmd" : "az", [
    "account", "get-access-token", "--resource", ARM, "--output", "json", "--only-show-errors",
  ], { encoding: "utf8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "inherit"] })).accessToken;
  await exportVersions({ token });
}
