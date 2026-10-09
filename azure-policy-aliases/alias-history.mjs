import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RETENTION_DAYS = 180;
const MAX_ENTRIES = 3000;
const aliasKey = (resourceType, name) => JSON.stringify([resourceType, name]);
const nonempty = value => typeof value === "string" && value.trim().length > 0;
const pathValue = value => value === null || typeof value === "string";

function timestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error("Invalid alias observation timestamp.");
  }
  return Date.parse(value);
}

export function aliasIndex(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.resources)) throw new Error("Missing alias snapshot.");
  timestamp(snapshot.generatedAt);
  const rows = new Map(), types = new Set();
  for (const resource of snapshot.resources) {
    if (!resource || !nonempty(resource.resourceType) || !/^[^/]+\/.+/.test(resource.resourceType)
      || types.has(resource.resourceType) || !Array.isArray(resource.aliases)
      || !nonempty(resource.provider) || resource.provider.toLowerCase() !== resource.resourceType.split("/")[0].toLowerCase()) {
      throw new Error("Invalid or duplicate alias resource type.");
    }
    types.add(resource.resourceType);
    for (const pair of resource.aliases) {
      if (!Array.isArray(pair) || pair.length !== 2 || !pathValue(pair[0]) || !nonempty(pair[1])) {
        throw new Error("Invalid alias pair.");
      }
      const key = aliasKey(resource.resourceType, pair[1]);
      if (rows.has(key)) throw new Error(`Duplicate alias in ${resource.resourceType}: ${pair[1]}`);
      rows.set(key, { name: pair[1], resourceType: resource.resourceType, provider: resource.provider, defaultPath: pair[0] });
    }
  }
  if ((snapshot.totalAliases != null && snapshot.totalAliases !== rows.size)
    || (snapshot.totalResourceTypes != null && snapshot.totalResourceTypes !== types.size)) {
    throw new Error("Alias snapshot totals do not match the recorded data.");
  }
  return rows;
}

function validateExisting(history, previous, observedAt) {
  if (!previous) throw new Error("The previous alias snapshot is required to continue history.");
  if (history.schemaVersion !== 1 || !Array.isArray(history.entries)) throw new Error("Invalid existing alias history.");
  const baseline = timestamp(history.baselineAt), last = timestamp(history.generatedAt);
  if (baseline > last || last > observedAt || (last !== timestamp(previous.generatedAt) && last !== observedAt)) {
    throw new Error("The alias snapshot and existing history describe inconsistent observations.");
  }
  for (const entry of history.entries) {
    if (!entry || entry.kind !== "alias" || !["added", "modified", "removed"].includes(entry.change)
      || !nonempty(entry.name) || !nonempty(entry.resourceType) || !nonempty(entry.provider) || !pathValue(entry.defaultPath)) {
      throw new Error("Invalid existing alias event; refusing to discard history.");
    }
    if (timestamp(entry.detectedAt) > observedAt || timestamp(entry.comparedFrom) > timestamp(entry.detectedAt)) {
      throw new Error("Invalid alias comparison interval.");
    }
    if (entry.change === "modified" && (!Array.isArray(entry.fields) || entry.fields.length !== 1
      || entry.fields[0]?.field !== "defaultPath" || !pathValue(entry.fields[0].from) || !pathValue(entry.fields[0].to))) {
      throw new Error("Missing default-path change evidence.");
    }
  }
}

export function createAliasHistory(previous, current, existing = null, provenance = null) {
  const currentRows = aliasIndex(current);
  const previousRows = previous ? aliasIndex(previous) : null;
  const observedAt = timestamp(current.generatedAt);
  if (previous && timestamp(previous.generatedAt) > observedAt) throw new Error("Alias snapshots are out of chronological order.");
  if (existing) validateExisting(existing, previous, observedAt);
  const entries = [];
  const add = (change, row, fields) => {
    const event = { detectedAt: current.generatedAt, comparedFrom: previous.generatedAt, kind: "alias", change, ...row };
    if (fields) event.fields = fields;
    if (provenance) event.snapshots = { ...provenance };
    entries.push(event);
  };
  if (previousRows) {
    for (const [key, row] of currentRows) {
      const before = previousRows.get(key);
      if (!before) add("added", row);
      else if (before.defaultPath !== row.defaultPath) {
        add("modified", row, [{ field: "defaultPath", from: before.defaultPath, to: row.defaultPath }]);
      }
    }
    for (const [key, row] of previousRows) {
      if (!currentRows.has(key)) add("removed", row);
    }
  }
  const lastRunEntries = entries.length;
  const eventKey = entry => JSON.stringify([timestamp(entry.detectedAt), entry.resourceType, entry.name, entry.change]);
  const seen = new Set(entries.map(eventKey));
  const cutoff = observedAt - RETENTION_DAYS * 86400000;
  for (const entry of existing?.entries || []) {
    const key = eventKey(entry);
    if (timestamp(entry.detectedAt) >= cutoff && !seen.has(key)) {
      seen.add(key);
      entries.push(entry);
    }
  }
  entries.sort((a, b) => timestamp(b.detectedAt) - timestamp(a.detectedAt)
    || a.resourceType.localeCompare(b.resourceType, "en") || a.name.localeCompare(b.name, "en"));
  const retained = entries.slice(0, MAX_ENTRIES);
  return {
    schemaVersion: 1, generatedAt: current.generatedAt,
    baselineAt: existing?.baselineAt || previous?.generatedAt || current.generatedAt,
    source: "Observed differences between retained Get-AzPolicyAlias catalogue snapshots",
    retentionDays: RETENTION_DAYS, maxEntries: MAX_ENTRIES,
    lastRunEntries, totalEntries: retained.length, entries: retained,
  };
}

export function publishAliasSnapshot(current, directory = HERE) {
  const dataPath = join(directory, "policy-aliases.json");
  const historyPath = join(directory, "alias-changes.json");
  const previous = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, "utf8")) : null;
  const existing = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, "utf8")) : null;
  const history = createAliasHistory(previous, current, existing);
  if (aliasIndex(current).size === 0) throw new Error("No aliases returned; refusing to publish an empty collection.");
  const staged = [dataPath, historyPath].map(file => `${file}.${process.pid}.tmp`);
  try {
    writeFileSync(staged[0], JSON.stringify(current) + "\n", "utf8");
    writeFileSync(staged[1], JSON.stringify(history, null, 2) + "\n", "utf8");
    renameSync(staged[0], dataPath);
    renameSync(staged[1], historyPath);
  } finally {
    for (const file of staged) if (existsSync(file)) unlinkSync(file);
  }
  return history;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const current = JSON.parse(readFileSync(0, "utf8"));
    const history = publishAliasSnapshot(current, process.argv[2] ? resolve(process.argv[2]) : HERE);
    console.log(`Published aliases and recorded ${history.lastRunEntries} change(s); ${history.totalEntries} retained.`);
  } catch (error) {
    console.error("Alias history refresh failed:", error.message);
    process.exitCode = 1;
  }
}
