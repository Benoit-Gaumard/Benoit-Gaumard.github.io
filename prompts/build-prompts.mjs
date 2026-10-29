#!/usr/bin/env node
// Builds prompts/prompts.json from the Markdown files in prompts/library/.
// Each file: a small front matter block (key: value) followed by the prompt body.
// Usage: node prompts/build-prompts.mjs [--check]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const LIBRARY = join(here, "library");
const OUTPUT = join(here, "prompts.json");
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VAR_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

function unquote(value) {
  const m = value.match(/^(["'])(.*)\1$/);
  return m ? m[2] : value;
}

function parseValue(raw) {
  const value = raw.trim();
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map(v => unquote(v.trim())).filter(Boolean);
  }
  if (value === "true" || value === "false") return value === "true";
  return unquote(value);
}

export function parsePrompt(text, file) {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter (--- ... ---)`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (!kv) throw new Error(`${file}: cannot parse front matter line "${line}"`);
    meta[kv[1].toLowerCase()] = parseValue(kv[2]);
  }
  const body = m[2].replace(/^\n+/, "").replace(/\s+$/, "");
  const id = basename(file).replace(/\.md$/i, "");
  if (!ID_RE.test(id)) throw new Error(`${file}: file name must be kebab-case (a-z, 0-9, -)`);
  for (const key of ["title", "category"]) {
    if (typeof meta[key] !== "string" || !meta[key]) throw new Error(`${file}: "${key}" is required`);
  }
  if (!body) throw new Error(`${file}: the prompt body is empty`);
  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`${file}: date must be YYYY-MM-DD`);
  const variables = [];
  for (const [, name] of body.matchAll(VAR_RE)) {
    if (!variables.includes(name)) variables.push(name);
  }
  const tags = Array.isArray(meta.tags) ? meta.tags
    : meta.tags ? String(meta.tags).split(",").map(t => t.trim()).filter(Boolean) : [];
  return {
    id,
    title: meta.title,
    description: typeof meta.description === "string" ? meta.description : "",
    category: meta.category,
    tags,
    models: typeof meta.models === "string" ? meta.models : "Any LLM",
    date: meta.date || "",
    featured: meta.featured === true,
    variables,
    body
  };
}

export function buildPrompts(dir = LIBRARY) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith(".md") && f.toLowerCase() !== "readme.md")
    .map(f => parsePrompt(readFileSync(join(dir, f), "utf8"), f))
    .sort((a, b) => (b.featured - a.featured) || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function renderJson(prompts) {
  const categories = [...new Set(prompts.map(p => p.category))].sort((a, b) => a.localeCompare(b));
  return JSON.stringify({ count: prompts.length, categories, prompts }, null, 2) + "\n";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const json = renderJson(buildPrompts());
  if (process.argv.includes("--check")) {
    const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== json) {
      console.error("prompts/prompts.json is out of date. Run: node prompts/build-prompts.mjs");
      process.exit(1);
    }
    console.log("prompts/prompts.json is up to date.");
  } else {
    writeFileSync(OUTPUT, json);
    console.log(`Wrote ${OUTPUT} (${JSON.parse(json).count} prompts).`);
  }
}
