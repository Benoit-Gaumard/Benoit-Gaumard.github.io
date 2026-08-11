import { readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const iconsDirectory = join(dirname(fileURLToPath(import.meta.url)), "export");
const outputPath = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "icons.json"));

async function findSvgFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? findSvgFiles(entryPath) : [entryPath];
  }));

  return files.flat();
}

function displayName(filename) {
  return filename
    .replace(/\.svg$/i, "")
    .replace(/^\d+\s*-?icon-service-/i, "")
    .replace(/^icon-service-/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const icons = (await findSvgFiles(iconsDirectory))
  .filter((file) => file.toLowerCase().endsWith(".svg"))
  .map((file) => {
    const path = relative(iconsDirectory, file).split(sep).join("/");
    const pathSegments = path.split("/");
    return {
      name: displayName(pathSegments.at(-1)),
      source: pathSegments[0],
      category: pathSegments[1],
      path,
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name));

await writeFile(outputPath, `${JSON.stringify(icons)}\n`, "utf8");
console.log(`Generated ${icons.length} icons in ${outputPath}`);
