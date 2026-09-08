// Turns a community submission issue into a change in the site's data files.
// One entry point for every "Submit ..." issue form: it detects which form was
// used, validates the payload, writes the change, and reports the outcome
// through GITHUB_OUTPUT so the workflow can open a pull request or reject.
import { readFileSync, writeFileSync, appendFileSync, readdirSync } from "node:fs";

const MAX_URL = 400;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "rb.gy", "cutt.ly",
  "is.gd", "buff.ly", "shorturl.at", "rebrand.ly", "lnkd.in", "s.id", "tiny.cc",
]);

// Portals must live on a surface Microsoft actually operates. This is the
// single most effective spam filter available for that page.
const MICROSOFT_DOMAINS = [
  "microsoft.com", "microsoft.us", "microsoftonline.com", "azure.com", "azure.net",
  "windowsazure.com", "windows.net", "office.com", "office365.com", "cloud.microsoft",
  "live.com", "msn.com", "sharepoint.com", "dynamics.com", "powerbi.com",
  "powerapps.com", "powerautomate.com", "visualstudio.com", "github.com",
  "microsoftazure.de", "azure.cn", "chinacloudapi.cn",
];

const IMAGE_SIGNATURES = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    ext: "webp",
    test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

/* ------------------------------------------------------------------ helpers */

function parseIssueForm(body) {
  const fields = {};
  const sections = String(body || "").replace(/\r\n/g, "\n").split(/^### +/m);
  for (const section of sections.slice(1)) {
    const newline = section.indexOf("\n");
    if (newline === -1) continue;
    const label = section.slice(0, newline).trim().toLowerCase();
    const value = section.slice(newline + 1).trim();
    fields[label] = value === "_No response_" ? "" : value;
  }
  return fields;
}

function clean(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false;
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

function parseCsvRecords(text) {
  const records = [];
  let current = "";
  let inQuotes = false;
  for (const char of text.replace(/\r\n/g, "\n")) {
    if (char === '"') inQuotes = !inQuotes;
    if (char === "\n" && !inQuotes) {
      records.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) records.push(current);
  return records;
}

function readCsv(path) {
  const raw = readFileSync(path, "utf8");
  const records = parseCsvRecords(raw);
  const header = parseCsvLine(records[0]).map((cell) => cell.trim());
  const rows = records.slice(1).filter((record) => record.trim()).map((record) => {
    const cells = parseCsvLine(record).map((cell) => cell.trim());
    return Object.fromEntries(header.map((column, index) => [column, cells[index] ?? ""]));
  });
  return { raw, header, rows, eol: raw.includes("\r\n") ? "\r\n" : "\n" };
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function appendCsvRow(path, csv, values) {
  const line = csv.header.map((column) => csvCell(values[column] ?? "")).join(",");
  const body = csv.raw.endsWith(csv.eol) ? csv.raw : csv.raw + csv.eol;
  writeFileSync(path, body + line + csv.eol, "utf8");
}

function normalizeUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    return host + parsed.pathname.replace(/\/+$/, "").toLowerCase() + parsed.search;
  } catch {
    return null;
  }
}

// Reuse the existing spelling when a submission only differs by case, so the
// filters on the page do not gain a near-duplicate entry. A genuinely new
// value that arrived all lowercase is title-cased to match the house style.
function matchExisting(rows, column, value) {
  const known = rows.map((row) => String(row[column] || "").trim()).filter(Boolean);
  const existing = known.find((entry) => entry.toLowerCase() === value.toLowerCase());
  if (existing) return existing;
  if (value !== value.toLowerCase()) return value;
  return value.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class Rejected extends Error {
  constructor(status, reason) {
    super(reason);
    this.status = status;
    this.reason = reason;
  }
}

const invalid = (reason) => { throw new Rejected("invalid", reason); };
const duplicate = (reason) => { throw new Rejected("duplicate", reason); };

function requireText(fields, label, { max, noCommas = false } = {}) {
  const value = clean(fields[label]);
  if (!value) invalid(`The "${label}" field is required.`);
  if (max && value.length > max) invalid(`The "${label}" field is longer than ${max} characters.`);
  if (noCommas && value.includes(",")) invalid(`The "${label}" field must not contain a comma.`);
  return value;
}

function requireUrl(fields, label, { allowedDomains } = {}) {
  const raw = clean(fields[label]).replace(/\s+/g, "");
  if (!raw) invalid(`The "${label}" field is required.`);
  if (raw.length > MAX_URL) invalid("The URL is too long.");

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    invalid("The URL could not be parsed.");
  }
  if (parsed.protocol !== "https:") invalid("Only https:// URLs are accepted.");

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".") || host.endsWith(".")) invalid("The URL does not point to a public hostname.");
  if (URL_SHORTENERS.has(host)) invalid("Shortened URLs are not accepted - please submit the final destination.");
  if (allowedDomains && !allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    invalid("This page only lists Microsoft-operated portals, and that address is not on a Microsoft domain.");
  }
  return raw;
}

function optionalDescription(fields, label, max) {
  const value = clean(fields[label]);
  if (value.length > max) invalid(`The "${label}" field is longer than ${max} characters.`);
  if (/https?:\/\//i.test(value)) invalid("The description must not contain extra links.");
  return value;
}

/* -------------------------------------------------------------------- forms */

async function submitFavoriteLink(fields) {
  const path = "favorite-links/favorite-links.csv";
  const csv = readCsv(path);
  const title = requireText(fields, "link title", { max: 120 });
  const url = requireUrl(fields, "link url");
  const category = requireText(fields, "link category", { max: 40 });
  const description = optionalDescription(fields, "why is it useful?", 300);

  const key = normalizeUrl(url);
  if (csv.rows.some((row) => normalizeUrl(row.url) === key)) {
    duplicate("This link is already in the collection.");
  }

  const finalCategory = matchExisting(csv.rows, "category", category);
  appendCsvRow(path, csv, {
    title,
    url,
    description,
    category: finalCategory,
    rating: "0",
    isHighlighted: "false",
    dateAdded: new Date().toISOString().slice(0, 10),
  });

  return {
    files: [path],
    title,
    prTitle: `Add favorite link: ${title}`,
    summary: [["Title", title], ["URL", url], ["Category", finalCategory]],
    note: "Adjust the rating and isHighlighted columns if needed, then merge.",
  };
}

async function submitFriendWebsite(fields) {
  const path = "friends-websites/friends-websites.csv";
  const csv = readCsv(path);
  // fetch-updates.mjs re-reads this file with a naive comma split, so a comma
  // anywhere in a cell would silently corrupt the metadata refresh.
  const name = requireText(fields, "site owner", { max: 80, noCommas: true });
  const url = requireUrl(fields, "website url");
  const category = requireText(fields, "website category", { max: 40, noCommas: true });
  const subcategory = requireText(fields, "website topic", { max: 40, noCommas: true });
  const country = requireText(fields, "country", { max: 40, noCommas: true });

  const key = normalizeUrl(url);
  if (csv.rows.some((row) => normalizeUrl(row.url) === key)) {
    duplicate("This website is already listed.");
  }

  const finalCategory = matchExisting(csv.rows, "category", category);
  const finalSubcategory = matchExisting(csv.rows, "subcategory", subcategory);
  const finalCountry = matchExisting(csv.rows, "country", country);

  appendCsvRow(path, csv, {
    name,
    category: finalCategory,
    subcategory: finalSubcategory,
    country: finalCountry,
    url,
    // Submissions land disabled: merging the pull request never publishes on
    // its own, the row only appears once enabled is flipped by hand.
    enabled: "FALSE",
  });

  return {
    files: [path],
    title: name,
    prTitle: `Add friend website: ${name}`,
    summary: [["Name", name], ["URL", url], ["Category", finalCategory], ["Topic", finalSubcategory], ["Country", finalCountry]],
    note: "The row is added with enabled=FALSE, so merging does not publish it. Set enabled to TRUE when you want it live.",
  };
}

async function submitPortal(fields) {
  const path = "microsoft-portals/portals-urls.csv";
  const csv = readCsv(path);
  const name = requireText(fields, "portal name", { max: 80 });
  const url = requireUrl(fields, "portal url", { allowedDomains: MICROSOFT_DOMAINS });
  const category = requireText(fields, "portal category", { max: 40 });

  const key = normalizeUrl(url);
  if (csv.rows.some((row) => normalizeUrl(row.Url) === key)) {
    duplicate("This portal is already listed.");
  }

  const finalCategory = matchExisting(csv.rows, "Categorie", category);
  appendCsvRow(path, csv, { Name: name, Categorie: finalCategory, Url: url });

  return {
    files: [path],
    title: name,
    prTitle: `Add Microsoft portal: ${name}`,
    summary: [["Name", name], ["URL", url], ["Category", finalCategory]],
    note: "",
  };
}

async function submitRssFeed(fields) {
  const path = "rss-watcher/rss-feeds.csv";
  const csv = readCsv(path);
  const name = requireText(fields, "feed name", { max: 80 });
  const url = requireUrl(fields, "feed url");
  const category = requireText(fields, "feed category", { max: 60 });
  const subcategory = requireText(fields, "feed subcategory", { max: 60 });

  const language = clean(fields["feed language"]).toUpperCase();
  // The page's language filter only knows these two, so anything else would
  // create a feed no visitor can filter to.
  if (!["EN", "FR"].includes(language)) {
    invalid('The "feed language" field must be either EN or FR.');
  }

  const key = normalizeUrl(url);
  if (csv.rows.some((row) => normalizeUrl(row.url) === key)) {
    duplicate("This feed is already being watched.");
  }
  if (csv.rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
    duplicate("A feed with that name is already being watched.");
  }

  // A feed that does not parse would be fetched on every run and never show
  // anything, so prove it works before proposing to add it.
  let response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; benoit-gaumard-rss-watcher/1.0)" },
    });
  } catch (error) {
    invalid(`The feed could not be reached (${error.message}).`);
  }
  if (!response.ok) invalid(`The feed returned HTTP ${response.status}.`);

  const body = (await response.text()).slice(0, 200000);
  if (!/<rss[\s>]|<feed[\s>]|<rdf:RDF[\s>]/i.test(body)) {
    invalid("That address does not return an RSS or Atom feed.");
  }
  if (!/<item[\s>]|<entry[\s>]/i.test(body)) {
    invalid("The feed parses but currently contains no items.");
  }

  const finalCategory = matchExisting(csv.rows, "category", category);
  const finalSubcategory = matchExisting(csv.rows, "subcategory", subcategory);

  appendCsvRow(path, csv, {
    name,
    category: finalCategory,
    subcategory: finalSubcategory,
    country: language,
    url,
    enabled: "TRUE",
  });

  return {
    files: [path],
    title: name,
    prTitle: `Add RSS feed: ${name}`,
    summary: [
      ["Name", name],
      ["Feed URL", url],
      ["Category", finalCategory],
      ["Subcategory", finalSubcategory],
      ["Language", language],
    ],
    note: "The feed was fetched and parsed successfully during validation. Merging adds it to the next refresh.",
  };
}

function extractAttachmentUrl(text) {
  const patterns = [
    /https:\/\/github\.com\/user-attachments\/assets\/[0-9a-fA-F-]+/,
    /https:\/\/user-images\.githubusercontent\.com\/[^\s)"'<>]+/,
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/assets\/\d+\/[0-9a-fA-F-]+/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

async function submitImage(fields) {
  const directory = "it-images/export";
  const title = requireText(fields, "image title", { max: 80 });
  const attachment = extractAttachmentUrl(String(fields["image file"] || ""));
  if (!attachment) {
    invalid("No uploaded image was found. Drag the image file into the upload box so GitHub attaches it to the issue.");
  }

  const response = await fetch(attachment, { redirect: "follow" });
  if (!response.ok) invalid(`The attached file could not be downloaded (HTTP ${response.status}).`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) invalid("The attached file is empty.");
  if (bytes.length > MAX_IMAGE_BYTES) {
    invalid(`The image is ${(bytes.length / 1024 / 1024).toFixed(1)} MB, over the ${MAX_IMAGE_BYTES / 1024 / 1024} MB limit.`);
  }

  const signature = IMAGE_SIGNATURES.find((entry) => entry.test(bytes));
  if (!signature) invalid("The attached file is not a JPEG, PNG, GIF or WebP image.");

  const slug = slugify(title);
  if (!slug) invalid("The title must contain at least one letter or digit.");

  const existing = readdirSync(directory);
  if (existing.some((file) => file.toLowerCase().replace(/\.[^.]+$/, "") === slug)) {
    duplicate("An image with that title is already in the gallery.");
  }

  const filename = `${slug}.${signature.ext}`;
  writeFileSync(`${directory}/${filename}`, bytes);

  return {
    files: [`${directory}/${filename}`, "it-images/images.json"],
    regenerateManifest: true,
    title,
    prTitle: `Add IT image: ${title}`,
    summary: [
      ["Title", title],
      ["File", filename],
      ["Size", `${Math.round(bytes.length / 1024)} KB`],
      ["Source", attachment],
    ],
    note: "Check the image renders in the diff above and that its licence allows publication before merging.",
  };
}

const FORMS = [
  { key: "favorite-links", marker: "link url", handler: submitFavoriteLink },
  { key: "friends-websites", marker: "website url", handler: submitFriendWebsite },
  { key: "microsoft-portals", marker: "portal url", handler: submitPortal },
  { key: "rss-watcher", marker: "feed url", handler: submitRssFeed },
  { key: "it-images", marker: "image file", handler: submitImage },
];

/* --------------------------------------------------------------------- main */

function report(output) {
  for (const [key, value] of Object.entries(output)) {
    console.log(`${key}: ${value}`);
  }
  if (process.env.GITHUB_OUTPUT) {
    const lines = Object.entries(output)
      .map(([key, value]) => `${key}<<__SUBMISSION_EOF__\n${value}\n__SUBMISSION_EOF__`)
      .join("\n");
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`, "utf8");
  }
}

const fields = parseIssueForm(process.env.ISSUE_BODY);
const form = FORMS.find((entry) => entry.marker in fields);

if (!form) {
  report({ status: "skipped", reason: "The issue does not match a known submission form.", form: "" });
  process.exit(0);
}

try {
  const result = await form.handler(fields);
  report({
    status: "ok",
    reason: "",
    form: form.key,
    title: result.title,
    pr_title: result.prTitle,
    files: result.files.join(" "),
    regenerate_manifest: result.regenerateManifest ? "true" : "false",
    summary: result.summary.map(([label, value]) => `| ${label} | ${value} |`).join("\n"),
    note: result.note,
  });
} catch (error) {
  if (!(error instanceof Rejected)) throw error;
  report({ status: error.status, reason: error.reason, form: form.key });
}
