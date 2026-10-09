// Usage: node build-workflow-schedules.mjs [outputPath]
// Regenerates the embedded catalog, or writes the page into the Pages artifact.
// The reader intentionally supports the block-style on.schedule used here,
// not arbitrary YAML. Unsupported schedule structures fail the build.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const CATALOG = /(<script id="workflow-catalog" type="application\/json">)([\s\S]*?)(<\/script>)/g;
const DATASETS = {
  "azure-updates.yaml": ["azure-release-updates/updates.json"],
  "m365-updates.yaml": ["m365-release-updates/updates.json"],
  "aws-updates.yaml": ["aws-release-updates/updates.json"],
  "rss-updates.yaml": ["rss-watcher/updates.json", "rss-watcher/feeds-status.json"],
  "github-ip-ranges-updates.yaml": ["github-ip-ranges/ip-ranges.json"],
  "azure-ip-ranges-updates.yaml": ["azure-ip-ranges/ip-ranges.json"],
  "microsoft-techcommunity-rss-feeds-updates.yaml": ["microsoft-techcommunity-rss-feeds/feeds-status.json"],
  "azure-taggable-resources-updates.yaml": ["azure-taggable-resources/tag-support.json"],
  "azure-policy-aliases-updates.yaml": ["azure-policy-aliases/policy-aliases.json"],
  "azure-regions-updates.yaml": ["azure-regions/regions.json"],
  "azure-policies-updates.yaml": ["azure-policies/policydefinitions.json", "azure-policies/policysetdefinitions.json", "azure-policies/policyrules.json", "azure-policies/policy-changes.json"],
  "azure-built-in-roles-updates.yaml": ["azure-built-in-roles/roles.json"],
  "entra-built-in-roles-updates.yaml": ["entra-built-in-roles/roles.json"],
  "graph-permissions-updates.yaml": ["graph-permissions/permissions.json"],
};

export function buildDatasetFreshness(root = ROOT) {
  const workflows = {};
  for (const [workflow, paths] of Object.entries(DATASETS)) {
    workflows[workflow] = { kind: "datasets", datasets: paths.map(path => {
      try {
        const payload = JSON.parse(readFileSync(join(root, ...path.split("/")), "utf8"));
        const generatedAt = typeof payload.generatedAt === "string" && Number.isFinite(Date.parse(payload.generatedAt)) ? payload.generatedAt : null;
        if (!generatedAt) console.warn(`No collection timestamp recorded: ${path}`);
        return { path, generatedAt, error: generatedAt ? null : "Collection timestamp not recorded" };
      } catch (error) {
        console.warn(`Dataset metadata unavailable: ${path}: ${error.message}`);
        return { path, generatedAt: null, error: "Dataset metadata unavailable at build time" };
      }
    }) };
  }
  workflows["favicons-refresh.yaml"] = { kind: "assets", datasets: [], note: "Asset-maintenance workflow; no dataset collection timestamp." };
  return { schemaVersion: 1, basis: "The generatedAt field in each published data snapshot, not the deployment or Git commit time.", workflows };
}

function withoutComment(line) {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (quote === '"' && char === "\\") { i++; continue; }
      if (quote === "'" && char === "'" && line[i + 1] === "'") { i++; continue; }
      if (char === quote) quote = "";
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line.trimEnd();
}

function scalar(value, context) {
  const text = value.trim();
  if (/^'(?:[^']|'')*'$/.test(text)) return text.slice(1, -1).replace(/''/g, "'");
  if (text.startsWith('"')) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`${context}: unsupported quoted YAML scalar`, { cause: error });
    }
  }
  if (!text || /^['[\]{}&*!|>]/.test(text) || /:\s/.test(text)) {
    throw new Error(`${context}: expected a single-line YAML scalar`);
  }
  return text;
}

function validateCron(cron, context) {
  const fields = cron.split(/\s+/);
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
  const names = [
    [], [], [],
    ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
    ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
  ];
  if (fields.length !== 5) throw new Error(`${context}: expected a five-field cron expression`);
  fields.forEach((field, index) => {
    const [min, max] = ranges[index];
    const number = (token) => {
      const value = /^\d+$/.test(token) ? Number(token) : names[index].indexOf(token.toUpperCase());
      if (value < min || value > max) throw new Error(`${context}: invalid cron field "${field}"`);
      return value;
    };
    for (const part of field.split(",")) {
      const [base, step, ...extra] = part.split("/");
      if (extra.length || (step !== undefined && (!/^\d+$/.test(step) || Number(step) < 1))) {
        throw new Error(`${context}: invalid cron step "${part}"`);
      }
      if (base === "*") continue;
      const bounds = base.split("-");
      if (bounds.length > 2 || bounds.some((bound) => !bound)) {
        throw new Error(`${context}: invalid cron range "${part}"`);
      }
      const start = number(bounds[0]);
      if (bounds.length === 2 && number(bounds[1]) < start) {
        throw new Error(`${context}: reversed cron range "${part}"`);
      }
    }
  });
}

export function extractScheduledWorkflow(source, file) {
  const lines = source.split(/\r?\n/).map((raw, index) => {
    const text = withoutComment(raw);
    return { text: text.trim(), indent: text.length - text.trimStart().length, number: index + 1 };
  }).filter((line) => line.text);
  const onLines = lines.filter((line) => line.indent === 0 && /^(?:on|'on'|"on")\s*:/.test(line.text));
  if (onLines.length > 1) throw new Error(`${file}: duplicate on mapping`);
  if (!onLines.length) return null;
  const on = onLines[0];
  const onValue = on.text.replace(/^(?:on|'on'|"on")\s*:/, "").trim();
  if (onValue) {
    if (/\bschedule\b|[{}&*!|>]/.test(onValue)) {
      throw new Error(`${file}:${on.number}: expected a block-style on mapping`);
    }
    return null;
  }
  const onStart = lines.indexOf(on) + 1;
  let onEnd = onStart;
  while (onEnd < lines.length && lines[onEnd].indent > 0) onEnd++;
  const children = lines.slice(onStart, onEnd);
  const childIndent = Math.min(...children.map((line) => line.indent));
  const schedules = children.filter((line) => line.indent === childIndent && /^(?:schedule|'schedule'|"schedule")\s*:/.test(line.text));
  if (!schedules.length) return null;
  if (schedules.length !== 1) throw new Error(`${file}: duplicate schedule mapping`);
  const schedule = schedules[0];
  if (!/^(?:schedule|'schedule'|"schedule")\s*:\s*$/.test(schedule.text)) {
    throw new Error(`${file}:${schedule.number}: expected a block-style schedule list`);
  }
  const entries = [];
  for (let i = lines.indexOf(schedule) + 1; i < onEnd && lines[i].indent > schedule.indent; i++) {
    entries.push(lines[i]);
  }
  if (!entries.length) throw new Error(`${file}:${schedule.number}: empty or unsupported schedule list`);
  const crons = entries.map((entry) => {
    const context = `${file}:${entry.number}`;
    const match = entry.text.match(/^-\s+(?:cron|'cron'|"cron")\s*:\s*(.+)$/);
    if (!match || entry.indent !== entries[0].indent) {
      throw new Error(`${context}: expected '- cron: ...'; additional schedule fields are not supported`);
    }
    const cron = scalar(match[1], context).trim().replace(/\s+/g, " ");
    validateCron(cron, context);
    return cron;
  });
  const nameLines = lines.filter((line) => line.indent === 0 && /^(?:name|'name'|"name")\s*:/.test(line.text));
  if (nameLines.length > 1) throw new Error(`${file}: duplicate workflow name`);
  const name = nameLines.length
    ? scalar(nameLines[0].text.replace(/^(?:name|'name'|"name")\s*:/, ""), `${file}:${nameLines[0].number}`)
    : file;
  return { name, file, schedules: crons };
}

export function buildWorkflowPage(root = ROOT) {
  const html = readFileSync(join(root, "workflows", "index.html"), "utf8");
  const matches = [...html.matchAll(CATALOG)];
  if (matches.length !== 1) throw new Error("Expected exactly one embedded workflow-catalog script");
  const previous = JSON.parse(matches[0][2]);
  if (!Array.isArray(previous)) throw new Error("The embedded workflow catalog must be an array");
  const order = new Map(previous.map((workflow, index) => [workflow.file, index]));
  const directory = join(root, ".github", "workflows");
  const workflows = readdirSync(directory)
    .filter((file) => /\.ya?ml$/.test(file))
    .sort()
    .map((file) => extractScheduledWorkflow(readFileSync(join(directory, file), "utf8"), file))
    .filter(Boolean)
    .sort((a, b) => (order.get(a.file) ?? previous.length) - (order.get(b.file) ?? previous.length));
  if (!workflows.length) throw new Error("No scheduled workflows found");
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  const json = JSON.stringify(workflows, null, 2)
    .replace(/[<>&\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .replace(/\n/g, eol);
  return html.replace(CATALOG, (_match, open, _old, close) => `${open}${eol}${json}${eol}  ${close}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(process.argv[2] || join(ROOT, "workflows", "index.html"));
  writeFileSync(output, buildWorkflowPage(), "utf8");
  writeFileSync(join(dirname(output), "data-freshness.json"), JSON.stringify(buildDatasetFreshness(), null, 2) + "\n", "utf8");
  console.log(`Workflow schedules generated: ${output}`);
}
