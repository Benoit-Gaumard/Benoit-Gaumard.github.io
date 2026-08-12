import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const iconsDirectory = join(dirname(fileURLToPath(import.meta.url)), "export");
const defaultNamespacePattern = /\sxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i;

async function findSvgFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? findSvgFiles(entryPath) : [entryPath];
  }));

  return files.flat().filter((file) => file.toLowerCase().endsWith(".svg"));
}

const svgFiles = await findSvgFiles(iconsDirectory);
let fixedCount = 0;

for (const file of svgFiles) {
  const content = await readFile(file, "utf8");
  const openingTag = content.match(/<svg\b[^>]*>/i)?.[0];
  if (!openingTag || defaultNamespacePattern.test(openingTag)) continue;

  const fixedOpeningTag = openingTag.replace(/^<svg/i, `<svg xmlns="http://www.w3.org/2000/svg"`);
  await writeFile(file, content.replace(openingTag, fixedOpeningTag), "utf8");
  fixedCount += 1;
}

console.log(`Fixed ${fixedCount} of ${svgFiles.length} SVG files (missing default xmlns).`);
