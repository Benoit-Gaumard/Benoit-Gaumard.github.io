import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Owner's style rule: no em-dashes or en-dashes anywhere on the site, including
// in text fetched from upstream feeds. Applied at write time so a scheduled
// refresh cannot quietly reintroduce them. Spacing is preserved: "a \u2014 b"
// becomes "a - b" and "a\u2014b" becomes "a-b".
function stripLongDashes(text) {
  return String(text).replace(/\s*[\u2014\u2013]\s*/g, (match) => (/^\s|\s$/.test(match) ? " - " : "-"));
}


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

const svgFiles = (await findSvgFiles(iconsDirectory))
  .filter((file) => file.toLowerCase().endsWith(".svg"));

const icons = (await Promise.all(svgFiles.map(async (file) => {
    const content = await readFile(file, "utf8");
    const openingTag = content.match(/<svg\b[^>]*>/i)?.[0];
    if (!openingTag || !/\sxmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(openingTag)) return null;

    const path = relative(iconsDirectory, file).split(sep).join("/");
    const pathSegments = path.split("/");
    return {
      name: displayName(pathSegments.at(-1)),
      source: pathSegments[0],
      category: pathSegments.length > 2 ? pathSegments[1] : "General",
      path,
    };
  })))
  .filter(Boolean)
  .sort((left, right) => left.name.localeCompare(right.name));

await writeFile(outputPath, `${stripLongDashes(JSON.stringify(icons))}\n`, "utf8");
const metaPath = join(dirname(outputPath), "meta.json");
await writeFile(metaPath, `${JSON.stringify({ generatedAt: new Date().toISOString() })}\n`, "utf8");
console.log(`Generated ${icons.length} icons (${svgFiles.length - icons.length} skipped) in ${outputPath}`);
