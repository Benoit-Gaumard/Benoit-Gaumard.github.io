// Folds merged community submissions (submissions/issue-N.csv) into the reference CSV
// and deletes the folded files, so the source CSV stays the single source of truth.
// Usage: node fold-submissions.mjs <source.csv> <submissions-dir> [<source.csv> <submissions-dir> ...]
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function parseRecords(text) {
  const records = [];
  let current = "";
  let inQuotes = false;
  for (const char of text.replace(/\r\n/g, "\n")) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === "\n" && !inQuotes) {
      if (current.trim()) records.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) records.push(current);
  return records;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          inQuotes = false;
        }
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

function normalizeUrl(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

export function foldSubmissions(sourcePath, submissionsDirectory) {
  const sourceText = readFileSync(sourcePath, "utf8");
  const eol = sourceText.includes("\r\n") ? "\r\n" : "\n";
  const sourceRecords = parseRecords(sourceText);
  const headerLine = sourceRecords[0] || "";
  const header = parseCsvLine(headerLine);
  if (header.length === 0 || header.some((column) => !column)) {
    throw new Error(`Invalid CSV header in ${sourcePath}.`);
  }
  const urlIndex = header.findIndex((column) => /^(url|link|feedurl|feed)$/i.test(column.trim()));
  const knownUrls = new Set(
    urlIndex < 0 ? [] : sourceRecords.slice(1).map((record) => normalizeUrl(parseCsvLine(record)[urlIndex])),
  );

  const files = readdirSync(submissionsDirectory)
    .filter((file) => /^issue-\d+\.csv$/.test(file))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  const added = [];
  const skipped = [];
  for (const file of files) {
    const path = join(submissionsDirectory, file);
    const records = parseRecords(readFileSync(path, "utf8"));
    if (JSON.stringify(parseCsvLine(records[0] || "")) !== JSON.stringify(header)) {
      throw new Error(`Submission ${path} has an unexpected CSV header.`);
    }
    if (records.length !== 2) {
      throw new Error(`Submission ${path} must contain exactly one row.`);
    }
    const key = urlIndex < 0 ? "" : normalizeUrl(parseCsvLine(records[1])[urlIndex]);
    if (key && knownUrls.has(key)) {
      skipped.push(file);
    } else {
      if (key) knownUrls.add(key);
      added.push({ file, record: records[1] });
    }
  }

  if (added.length > 0) {
    const base = sourceText.endsWith("\n") ? sourceText : sourceText + eol;
    writeFileSync(sourcePath, base + added.map(({ record }) => record.replace(/\r?\n/g, eol) + eol).join(""), "utf8");
  }
  for (const file of files) unlinkSync(join(submissionsDirectory, file));
  return { added: added.map(({ file }) => file), skipped };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.length % 2 !== 0) {
    throw new Error("Usage: node fold-submissions.mjs <source.csv> <submissions-dir> [...]");
  }
  for (let index = 0; index < args.length; index += 2) {
    const { added, skipped } = foldSubmissions(args[index], args[index + 1]);
    console.log(`${args[index]}: ${added.length} added, ${skipped.length} duplicate(s) dropped.`);
  }
}
