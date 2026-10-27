// Usage: node ai-leaderboard/fetch-updates.mjs
// Builds ai-leaderboard/leaderboard.json from two public, key-less sources:
//  - LMArena leaderboard snapshots (Hugging Face dataset lmarena-ai/leaderboard-dataset, CC BY 4.0)
//  - OpenRouter model catalogue (https://openrouter.ai/api/v1/models) for release dates, prices and context
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "leaderboard.json");
const HF = "https://datasets-server.huggingface.co";
const DATASET = "lmarena-ai/leaderboard-dataset";
const OPENROUTER = "https://openrouter.ai/api/v1/models";
const CATEGORY_LIMIT = 100;
const LATEST_LIMIT = 60;

const BOARDS = [
  { id: "text", label: "Text", config: "text_style_control", categories: ["overall", "coding", "math", "hard_prompts", "creative_writing", "instruction_following", "multi_turn", "longer_query", "expert", "french"] },
  { id: "webdev", label: "WebDev", config: "webdev", categories: ["overall"] },
  { id: "vision", label: "Vision", config: "vision_style_control", categories: ["overall"] },
  { id: "search", label: "Search", config: "search_style_control", categories: ["overall"] },
  { id: "document", label: "Document", config: "document_style_control", categories: ["overall"] },
];
const CATEGORY_LABELS = {
  overall: "Overall", coding: "Coding", math: "Math", hard_prompts: "Hard prompts", creative_writing: "Creative writing",
  instruction_following: "Instruction following", multi_turn: "Multi-turn", longer_query: "Longer query", expert: "Expert", french: "French",
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getJson(url, attempts = 8) {
  for (let attempt = 1; ; attempt++) {
    let wait = 2000 * attempt;
    try {
      const response = await fetch(url, { headers: { "user-agent": "benoit-gaumard.io ai-leaderboard refresh" }, signal: AbortSignal.timeout(60000) });
      if (response.status === 429) wait = Math.max(Number(response.headers.get("retry-after")) * 1000 || 0, 15000 * attempt);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt >= attempts) throw new Error(`${url}: ${error.message}`);
      console.warn(`Retrying in ${Math.round(wait / 1000)}s after ${error.message}`);
      await sleep(wait);
    }
  }
}

// The datasets-server /filter endpoint is slow and times out; paging the whole config
// through /rows is fast (~0.5 s per 100 rows), so group by category locally.
async function configRows(config) {
  const rows = [];
  for (let offset = 0; ; offset += 100) {
    const page = await getJson(`${HF}/rows?dataset=${encodeURIComponent(DATASET)}&config=${config}&split=latest&offset=${offset}&length=100`);
    rows.push(...page.rows.map(({ row }) => row));
    if (rows.length >= page.num_rows_total || !page.rows.length) break;
    await sleep(400);
  }
  const byCategory = new Map();
  for (const row of rows) {
    if (!byCategory.has(row.category)) byCategory.set(row.category, []);
    byCategory.get(row.category).push(row);
  }
  for (const list of byCategory.values()) list.sort((a, b) => a.rank - b.rank || b.rating - a.rating);
  return byCategory;
}

const round = (value, digits = 1) => Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
const isOpenLicense = license => Boolean(license) && !/proprietary/i.test(license);

function compactRow(row) {
  return {
    rank: row.rank,
    model: row.model_name,
    org: row.organization || "unknown",
    license: row.license || "Unknown",
    score: round(row.rating),
    ci: round((row.rating_upper - row.rating_lower) / 2),
    votes: Math.round(row.vote_count || 0),
  };
}

// Arena and OpenRouter name the same model differently ("Claude Opus 5.5 (High)" vs
// "Anthropic: Claude Opus 5.5"), so compare a normalised key and only accept exact hits.
export function nameKey(name) {
  return String(name || "")
    .replace(/^[^:/]{1,40}:\s*/, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b20\d{2}-?\d{2}-?\d{2}\b/g, " ")
    .replace(/\b(preview|latest|exp|experimental|instruct|chat|thinking|reasoning)\b/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/\.(?!\d)/g, "");
}

const perMillion = value => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? round(number * 1e6, 3) : null;
};

function openRouterInfo(model) {
  return {
    id: model.id,
    name: model.name.replace(/^[^:]{1,40}:\s*/, ""),
    provider: model.name.includes(":") ? model.name.split(":")[0].trim() : model.id.split("/")[0],
    released: model.created ? new Date(model.created * 1000).toISOString().slice(0, 10) : null,
    context: model.context_length || model.top_provider?.context_length || null,
    input: perMillion(model.pricing?.prompt),
    output: perMillion(model.pricing?.completion),
    modalities: [...new Set([...(model.architecture?.input_modalities || []), ...(model.architecture?.output_modalities || [])])],
    reasoning: Boolean(model.reasoning) || (model.supported_parameters || []).includes("reasoning"),
    openWeights: Boolean(model.hugging_face_id),
  };
}

async function main() {
  const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;

  const boards = {};
  let publishDate = null;
  for (const board of BOARDS) {
    const all = await configRows(board.config);
    const categories = {};
    for (const category of board.categories) {
      const rows = all.get(category) || [];
      if (!rows.length) throw new Error(`No rows for ${board.config}/${category}`);
      if (board.id === "text" && category === "overall") publishDate = rows[0].leaderboard_publish_date;
      const limit = board.id === "text" && category !== "overall" ? CATEGORY_LIMIT : rows.length;
      categories[category] = { label: CATEGORY_LABELS[category] || category, total: rows.length, rows: rows.slice(0, limit).map(compactRow) };
      console.log(`${board.id}/${category}: ${rows.length} models`);
    }
    boards[board.id] = { label: board.label, categories };
  }

  const textOverall = boards.text.categories.overall.rows;
  if (textOverall.length < 50) throw new Error(`Text leaderboard looks truncated (${textOverall.length} rows)`);

  // Rank movement is measured against the previous Arena snapshot stored in this file.
  // Re-running on the same snapshot keeps the earlier baseline instead of erasing the trend.
  let trendBase = previous?.trendBase ?? null;
  if (previous?.publishDate && previous.publishDate !== publishDate) {
    trendBase = { publishDate: previous.publishDate, ranks: Object.fromEntries(previous.boards.text.categories.overall.rows.map(row => [row.model, row.rank])) };
  }
  for (const row of textOverall) {
    const before = trendBase?.ranks?.[row.model];
    row.change = trendBase ? (before == null ? "new" : before - row.rank) : null;
  }

  const catalogue = (await getJson(OPENROUTER)).data || [];
  if (catalogue.length < 50) throw new Error(`OpenRouter catalogue looks truncated (${catalogue.length} models)`);
  const usable = catalogue.filter(model => !model.id.includes(":") && !/^openrouter\//.test(model.id));
  const byKey = new Map();
  for (const model of [...usable].sort((a, b) => (b.created || 0) - (a.created || 0))) {
    for (const key of [nameKey(model.name), nameKey(model.id.split("/")[1])]) if (key && !byKey.has(key)) byKey.set(key, model);
  }

  const details = {};
  const arenaRanks = new Map();
  for (const [boardId, board] of Object.entries(boards)) {
    for (const row of board.categories.overall.rows) {
      const match = byKey.get(nameKey(row.model));
      if (!match) continue;
      details[row.model] ??= openRouterInfo(match);
      if (boardId === "text" && !arenaRanks.has(match.id)) arenaRanks.set(match.id, { rank: row.rank, model: row.model, score: row.score });
    }
  }

  const latest = usable
    .filter(model => model.created)
    .sort((a, b) => b.created - a.created)
    .slice(0, LATEST_LIMIT)
    .map(model => ({ ...openRouterInfo(model), arena: arenaRanks.get(model.id) || null }));

  const organizations = {};
  for (const row of textOverall) {
    const org = (organizations[row.org] ??= { org: row.org, models: 0, top10: 0, top50: 0, best: row.rank, bestModel: row.model, bestScore: row.score, open: 0 });
    org.models++;
    if (row.rank <= 10) org.top10++;
    if (row.rank <= 50) org.top50++;
    if (isOpenLicense(row.license)) org.open++;
    if (row.rank < org.best) Object.assign(org, { best: row.rank, bestModel: row.model, bestScore: row.score });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    publishDate,
    sources: {
      arena: { name: "LMArena leaderboard", url: "https://lmarena.ai/leaderboard", dataset: `https://huggingface.co/datasets/${DATASET}`, license: "CC BY 4.0" },
      openrouter: { name: "OpenRouter models API", url: "https://openrouter.ai/models", api: OPENROUTER },
    },
    trendBase,
    boards,
    details,
    organizations: Object.values(organizations).sort((a, b) => a.best - b.best || b.top50 - a.top50).slice(0, 20),
    latest,
  };
  writeFileSync(OUT, JSON.stringify(payload) + "\n");
  const matched = textOverall.filter(row => details[row.model]).length;
  console.log(`Wrote ${OUT}: Arena ${publishDate}, ${textOverall.length} text models (${matched} matched to OpenRouter), ${latest.length} latest releases.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => { console.error(error); process.exit(1); });
}
