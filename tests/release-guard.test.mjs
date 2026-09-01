import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const releaseCheck = resolve("scripts/release-check.mjs");
const parentGitDirectory = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
  encoding: "utf8"
}).trim();
let repository;

function git(...args) {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" });
}

function checkClean(environment = {}) {
  return spawnSync(process.execPath, [releaseCheck, "--check-clean-only"], {
    cwd: repository,
    encoding: "utf8",
    env: { ...process.env, ...environment }
  });
}

before(async () => {
  repository = await mkdtemp(join(tmpdir(), "storygate-release-guard-"));
  git("init", "--quiet");
  await writeFile(join(repository, "tracked.txt"), "approved\n");
  git("add", "tracked.txt");
  git("-c", "user.name=StoryGate Test", "-c", "user.email=test@storygate.invalid", "commit", "--quiet", "-m", "baseline");
});

after(async () => {
  await rm(repository, { recursive: true, force: true });
});

test("release check ignores Git variables inherited from a pre-push hook", () => {
  const result = checkClean({ GIT_DIR: parentGitDirectory });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RELEASE_TREE_CLEAN/);
});

test("release check refuses uncommitted tracked changes", async () => {
  await writeFile(join(repository, "tracked.txt"), "not committed\n");
  const result = checkClean();

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Refusing release: working tree is dirty/);
});
