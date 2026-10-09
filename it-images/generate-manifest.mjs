import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const exportDirectory = join(dirname(fileURLToPath(import.meta.url)), "export");
const outputPath = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "images.json"));
const descriptions = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), "image-descriptions.json"), "utf8"));

function titleFromFilename(filename) {
  return filename
    .replace(extname(filename), "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const entries = await readdir(exportDirectory, { withFileTypes: true });
const images = entries
  .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
  .map((entry) => ({
    file: entry.name,
    title: titleFromFilename(entry.name),
    ...(descriptions[entry.name] || {
      description: "Description not yet recorded.",
      transcription: "Text transcription not yet recorded.",
      credit: "Author and original source not recorded.",
      license: "Usage permission not recorded. Check rights before reuse.",
    }),
  }))
  .sort((left, right) => left.title.localeCompare(right.title));

const payload = { generatedAt: new Date().toISOString(), count: images.length, images };
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Generated ${images.length} images into ${outputPath}`);
