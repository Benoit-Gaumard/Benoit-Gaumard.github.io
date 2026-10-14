import test from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = resolve(".");
const applyScript = resolve(".github/scripts/apply-submission.mjs");
const buildScript = resolve(".github/scripts/build-submission-csv.mjs");
const imageManifestScript = resolve("it-images/generate-manifest.mjs");
const sourceCsv = readFileSync(resolve("favorite-links/favorite-links.csv"), "utf8");
const sourceFiles = {
  friends: ["friends-websites/friends-websites.csv", "friends-websites/submissions"],
  portals: ["microsoft-portals/portals-urls.csv", "microsoft-portals/submissions"],
  rss: ["rss-watcher/rss-feeds.csv", "rss-watcher/submissions"],
};

function temporaryDirectory(t) {
  const directory = mkdtempSync(join(tmpdir(), "community-submissions-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test("favorite-link issues write separate submission files without changing the shared CSV", (t) => {
  const directory = temporaryDirectory(t);
  mkdirSync(join(directory, "favorite-links", "submissions"), { recursive: true });
  writeFileSync(join(directory, "favorite-links", "favorite-links.csv"), sourceCsv);
  const body = [
    "### Link title",
    "Example resource",
    "### Link URL",
    "https://example.org/resource",
    "### Link category",
    "Tools",
    "### Why is it useful?",
    "A useful, searchable resource.",
  ].join("\n");
  const result = spawnSync(process.execPath, [applyScript], {
    cwd: directory,
    encoding: "utf8",
    env: { ...process.env, ISSUE_BODY: body, ISSUE_NUMBER: "123" },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /status: ok/);
  assert.equal(readFileSync(join(directory, "favorite-links", "favorite-links.csv"), "utf8"), sourceCsv);
  assert.match(
    readFileSync(join(directory, "favorite-links", "submissions", "issue-123.csv"), "utf8"),
    /Example resource,https:\/\/example\.org\/resource,"A useful, searchable resource\.",Tools,0,false,\d{4}-\d{2}-\d{2}/,
  );
});

test("friend website and Microsoft portal issues write separate CSVs", (t) => {
    const directory = temporaryDirectory(t);
    for (const [key, [sourcePath, submissionPath]] of Object.entries(sourceFiles).filter(([key]) => key !== "rss")) {
      const source = join(directory, sourcePath);
      const submissions = join(directory, submissionPath);
      mkdirSync(submissions, { recursive: true });
      copyFileSync(resolve(sourcePath), source);
      const body = key === "friends"
        ? ["### Site owner", "Example author", "### Website URL", "https://example.org/", "### Website category", "Blog", "### Website topic", "Cloud", "### Country", "France"].join("\n")
        : ["### Portal name", "Example portal", "### Portal URL", "https://submission-test.microsoft.com/", "### Portal category", "Entra ID"].join("\n");
      const result = spawnSync(process.execPath, [applyScript], {
        cwd: directory,
        encoding: "utf8",
        env: { ...process.env, ISSUE_BODY: body, ISSUE_NUMBER: key === "friends" ? "201" : "202" },
      });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /status: ok/);
      assert.equal(readFileSync(source, "utf8"), readFileSync(resolve(sourcePath), "utf8"));
      assert.ok(readFileSync(join(submissions, `issue-${key === "friends" ? "201" : "202"}.csv`), "utf8").includes("Example"));
    }
  });

test("RSS feed issues write a separate CSV without modifying the shared feed list", (t) => {
    const directory = temporaryDirectory(t);
    const [sourcePath, submissionsPath] = sourceFiles.rss;
    const source = join(directory, sourcePath);
    const submissions = join(directory, submissionsPath);
    mkdirSync(submissions, { recursive: true });
    copyFileSync(resolve(sourcePath), source);
    const mockFetch = join(directory, "mock-fetch.mjs");
    writeFileSync(mockFetch, `globalThis.fetch = async () => new Response("<rss><channel><item><title>One</title></item></channel></rss>");\n`);
    const body = [
      "### Feed name", "Example Feed",
      "### Feed URL", "https://example.org/feed.xml",
      "### Feed category", "Cloud",
      "### Feed subcategory", "Tools",
      "### Feed language", "EN",
    ].join("\n");
    const result = spawnSync(process.execPath, ["--import", pathToFileURL(mockFetch).href, applyScript], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, ISSUE_BODY: body, ISSUE_NUMBER: "203" },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /status: ok/);
    assert.equal(readFileSync(source, "utf8"), readFileSync(resolve(sourcePath), "utf8"));
    assert.match(readFileSync(join(submissions, "issue-203.csv"), "utf8"), /Example Feed/);
  });

test("image issues save unique issue-scoped files and keep the manifest for deployment", (t) => {
    const directory = temporaryDirectory(t);
    const exportDirectory = join(directory, "it-images", "export");
    const submissions = join(directory, "it-images", "submissions");
    mkdirSync(exportDirectory, { recursive: true });
    mkdirSync(submissions, { recursive: true });
    const mockFetch = join(directory, "mock-fetch.mjs");
    writeFileSync(mockFetch, `globalThis.fetch = async () => new Response(new Uint8Array([137, 80, 78, 71]));\n`);
    const body = ["### Image title", "Example Diagram", "### Image file", "https://github.com/user-attachments/assets/123e4567-e89b-12d3-a456-426614174000"].join("\n");
    const result = spawnSync(process.execPath, ["--import", pathToFileURL(mockFetch).href, applyScript], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, ISSUE_BODY: body, ISSUE_NUMBER: "204" },
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /status: ok/);
    assert.match(result.stdout, /it-images\/submissions\/example-diagram-issue-204\.png/);
    assert.equal(readFileSync(join(submissions, "example-diagram-issue-204.png")).length, 4);
    assert.equal(result.stdout.includes("images.json"), false);
  });

  test("image manifest keeps issue suffixes out of public titles", (t) => {
    const directory = temporaryDirectory(t);
    const images = join(directory, "export");
    const output = join(directory, "images.json");
    mkdirSync(images);
    writeFileSync(join(images, "example-diagram-issue-204.png"), new Uint8Array([137, 80, 78, 71]));
    const result = spawnSync(process.execPath, [imageManifestScript, output, images], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(manifest.images[0].title, "Example Diagram");
  });

test("submission CSV build combines independent issue files with the published CSV", (t) => {
  const directory = temporaryDirectory(t);
  const submissions = join(directory, "submissions");
  mkdirSync(submissions);
  const source = join(directory, "source.csv");
  const output = join(directory, "public.csv");
  writeFileSync(source, "title,url,description,category,rating,isHighlighted,dateAdded\nExisting,https://existing.example,,Tools,1,false,\n");
  writeFileSync(join(submissions, "issue-123.csv"), "title,url,description,category,rating,isHighlighted,dateAdded\nOne,https://one.example,,Tools,0,false,2026-10-13\n");
  writeFileSync(join(submissions, "issue-124.csv"), "title,url,description,category,rating,isHighlighted,dateAdded\nTwo,https://two.example,,Tools,0,false,2026-10-13\n");

  const result = spawnSync(process.execPath, [buildScript, source, submissions, output], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    readFileSync(output, "utf8"),
    "title,url,description,category,rating,isHighlighted,dateAdded\nExisting,https://existing.example,,Tools,1,false,\nOne,https://one.example,,Tools,0,false,2026-10-13\nTwo,https://two.example,,Tools,0,false,2026-10-13\n",
  );
});

test("submission CSV build rejects files with a different schema", (t) => {
  const directory = temporaryDirectory(t);
  const submissions = join(directory, "submissions");
  mkdirSync(submissions);
  const source = join(directory, "source.csv");
  const output = join(directory, "public.csv");
  writeFileSync(source, "title,url\nExisting,https://existing.example\n");
  writeFileSync(join(submissions, "issue-123.csv"), "title,url,category\nOne,https://one.example,Tools\n");

  const result = spawnSync(process.execPath, [buildScript, source, submissions, output], {
    cwd: root,
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unexpected CSV header/);
});
