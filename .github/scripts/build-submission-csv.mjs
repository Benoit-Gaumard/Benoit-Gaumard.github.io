import { readdirSync, readFileSync, writeFileSync } from "node:fs";

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
  if (current) records.push(current);
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

const [sourcePath, submissionsDirectory, outputPath] = process.argv.slice(2);
if (!sourcePath || !submissionsDirectory || !outputPath) {
  throw new Error("Usage: node build-submission-csv.mjs <source.csv> <submissions-dir> <output.csv>");
}

const sourceRecords = parseRecords(readFileSync(sourcePath, "utf8"));
const header = parseCsvLine(sourceRecords[0] || "");
if (header.length === 0 || header.some((column) => !column)) {
  throw new Error(`Invalid CSV header in ${sourcePath}.`);
}

const submissions = readdirSync(submissionsDirectory)
  .filter((file) => /^issue-\d+\.csv$/.test(file))
  .sort()
  .map((file) => {
    const path = `${submissionsDirectory}/${file}`;
    const records = parseRecords(readFileSync(path, "utf8"));
    if (JSON.stringify(parseCsvLine(records[0] || "")) !== JSON.stringify(header)) {
      throw new Error(`Submission ${path} has an unexpected CSV header.`);
    }
    if (records.length !== 2) {
      throw new Error(`Submission ${path} must contain exactly one row.`);
    }
    return records[1];
  });

writeFileSync(outputPath, `${[...sourceRecords, ...submissions].join("\n")}\n`, "utf8");
