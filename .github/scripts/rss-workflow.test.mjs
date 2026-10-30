import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { test } from "node:test";

const workflow = readFileSync(new URL("../workflows/rss-updates.yaml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const script = workflow.split("      - name: Commit and push if changed\n")[1]
  .split("        run: |\n")[1].split("\n").map(line => line.replace(/^          /, "")).join("\n");
const paths = ["updates.json", "feed.en.xml", "feed.fr.xml", "feeds-status.json", "feeds-meta.json", "source-icons.json"];

test("deployment after a data refresh uses updated main rather than the refresh starting commit", () => {
  const deploy = readFileSync(new URL("../workflows/deploy-hugo.yaml", import.meta.url), "utf8");
  assert.ok(deploy.includes("ref: ${{ github.event_name == 'workflow_run' && 'main' || github.sha }}"));
  assert.doesNotMatch(deploy, /ref:.*workflow_run\.head_sha/);
});

function git(cwd, ...args) {
  const command = cwd.endsWith("remote.git") ? ["--git-dir", cwd, ...args] : args;
  const result = spawnSync("git", command, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function fixture(action) {
  const directory = mkdtempSync(join(tmpdir(), "rss-workflow-"));
  const remote = join(directory, "remote.git");
  const runner = join(directory, "runner");
  const writer = join(directory, "writer");
  try {
    git(directory, "init", "--bare", "--initial-branch=main", remote);
    git(directory, "clone", remote, runner);
    git(runner, "config", "user.name", "RSS test");
    git(runner, "config", "user.email", "rss@example.test");
    mkdirSync(join(runner, "rss-watcher", "source-icons"), { recursive: true });
    for (const file of paths) writeFileSync(join(runner, "rss-watcher", file), "initial\n");
    writeFileSync(join(runner, "rss-watcher", "source-icons", "icon.svg"), "<svg/>\n");
    git(runner, "add", ".");
    git(runner, "commit", "-m", "Initial data");
    git(runner, "push", "origin", "main");
    git(directory, "clone", remote, writer);
    git(writer, "config", "user.name", "Other workflow");
    git(writer, "config", "user.email", "other@example.test");
    action({ runner, writer, remote });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function run(runner) {
  return spawnSync("bash", ["-e", "-c", script], { cwd: runner, encoding: "utf8", timeout: 60000 });
}

test("RSS refresh explicitly checks out full main history and never force-pushes", () => {
  assert.match(workflow, /ref: main\n\s+fetch-depth: 0/);
  assert.doesNotMatch(script, /--force|--autostash|reset --hard/);
});

test("RSS refresh without data changes does not create a commit", () => fixture(({ runner, remote }) => {
  const before = git(remote, "rev-parse", "main");
  const result = run(runner);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No changes to RSS Watcher data/);
  assert.equal(git(remote, "rev-parse", "main"), before);
}));

test("RSS refresh preserves concurrent commits and retries a rejected push", () => fixture(({ runner, writer, remote }) => {
  writeFileSync(join(runner, "rss-watcher", "updates.json"), "new RSS data\n");
  writeFileSync(join(writer, "other-data.json"), "other workflow\n");
  git(writer, "add", ".");
  git(writer, "commit", "-m", "Concurrent data refresh");
  git(writer, "push", "origin", "main");
  // Advance main after the first fetch/rebase to exercise the retry, too.
  const writerPath = writer.replace(/\\/g, "/").replace(/'/g, "'\\''");
  writeFileSync(join(runner, ".git", "hooks", "pre-push"), `#!/bin/sh
if [ ! -f .git/race-triggered ]; then
  touch .git/race-triggered
  git -C '${writerPath}' commit --allow-empty -m 'Another concurrent refresh' >&2
  git -C '${writerPath}' push origin main >&2
fi
`, { mode: 0o755 });
  const result = run(runner);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /attempt 1\/3/);
  assert.equal(git(remote, "show", "main:other-data.json"), "other workflow");
  assert.equal(git(remote, "show", "main:rss-watcher/updates.json"), "new RSS data");
  assert.match(git(remote, "log", "--format=%s", "-3"), /Another concurrent refresh/);
}));

test("conflicting RSS data fails explicitly without overwriting remote changes", () => fixture(({ runner, writer, remote }) => {
  writeFileSync(join(runner, "rss-watcher", "updates.json"), "runner data\n");
  writeFileSync(join(writer, "rss-watcher", "updates.json"), "remote data\n");
  git(writer, "add", ".");
  git(writer, "commit", "-m", "Concurrent RSS edit");
  git(writer, "push", "origin", "main");
  const before = git(remote, "rev-parse", "main");
  const result = run(runner);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /::error::RSS data conflicts/);
  assert.equal(git(remote, "rev-parse", "main"), before);
}));
