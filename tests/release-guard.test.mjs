import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, test } from "node:test";

const releaseCheck = resolve("scripts/release-check.mjs");
const hookInstaller = resolve("scripts/install-hooks.mjs");
const parentGitDirectory = execFileSync("git", ["rev-parse", "--absolute-git-dir"], {
  encoding: "utf8"
}).trim();
const inheritedHookEnvironment = {
  GIT_ALTERNATE_OBJECT_DIRECTORIES: join(parentGitDirectory, "objects"),
  GIT_COMMON_DIR: parentGitDirectory,
  GIT_DIR: parentGitDirectory,
  GIT_INDEX_FILE: join(parentGitDirectory, "index"),
  GIT_OBJECT_DIRECTORY: join(parentGitDirectory, "objects"),
  GIT_PREFIX: "nested/",
  GIT_WORK_TREE: resolve(".")
};
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
  const result = checkClean(inheritedHookEnvironment);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RELEASE_TREE_CLEAN/);
});

test("release check refuses uncommitted tracked changes", async () => {
  try {
    await writeFile(join(repository, "tracked.txt"), "not committed\n");
    const result = checkClean();

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing release: working tree is dirty/);
  } finally {
    git("restore", "tracked.txt");
  }
});

test("release check refuses staged changes", async () => {
  try {
    await writeFile(join(repository, "tracked.txt"), "staged but not committed\n");
    git("add", "tracked.txt");
    const result = checkClean();

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing release: working tree is dirty/);
  } finally {
    git("restore", "--staged", "tracked.txt");
    git("restore", "tracked.txt");
  }
});

test("release check refuses untracked files", async () => {
  const untracked = join(repository, "not-in-release.txt");
  try {
    await writeFile(untracked, "unfinished concurrent work\n");
    const result = checkClean();

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing release: working tree is dirty/);
  } finally {
    await unlink(untracked);
  }
});

test("project setup installs the committed pre-push hook in a fresh clone", async () => {
  const clone = await mkdtemp(join(tmpdir(), "storygate-hook-install-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: clone });
    await mkdir(join(clone, ".githooks"));
    await writeFile(join(clone, ".githooks", "pre-push"), "#!/bin/sh\nexit 0\n");
    await chmod(join(clone, ".githooks", "pre-push"), 0o755);

    const result = spawnSync(process.execPath, [hookInstaller], {
      cwd: clone,
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    const installed = join(clone, ".git", "hooks", "pre-push");
    assert.equal(await readFile(installed, "utf8"), "#!/bin/sh\nexit 0\n");
    assert.equal((await stat(installed)).mode & 0o111, 0o111);
  } finally {
    await rm(clone, { recursive: true, force: true });
  }
});

test("project setup preserves an identical installed pre-push hook", async () => {
  const clone = await mkdtemp(join(tmpdir(), "storygate-hook-identical-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: clone });
    await mkdir(join(clone, ".githooks"));
    await mkdir(join(clone, ".git", "hooks"), { recursive: true });
    await writeFile(join(clone, ".githooks", "pre-push"), "#!/bin/sh\nexit 0\n");
    await writeFile(join(clone, ".git", "hooks", "pre-push"), "#!/bin/sh\nexit 0\n");

    const result = spawnSync(process.execPath, [hookInstaller], {
      cwd: clone,
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(join(clone, ".git", "hooks", "pre-push"), "utf8"), "#!/bin/sh\nexit 0\n");
  } finally {
    await rm(clone, { recursive: true, force: true });
  }
});

test("project setup refuses to overwrite a different pre-push hook", async () => {
  const clone = await mkdtemp(join(tmpdir(), "storygate-hook-conflict-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: clone });
    await mkdir(join(clone, ".githooks"));
    await mkdir(join(clone, ".git", "hooks"), { recursive: true });
    await writeFile(join(clone, ".githooks", "pre-push"), "#!/bin/sh\nnpm run release:check\n");
    await writeFile(join(clone, ".git", "hooks", "pre-push"), "#!/bin/sh\ncustom-tool\n");

    const result = spawnSync(process.execPath, [hookInstaller], {
      cwd: clone,
      encoding: "utf8"
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to overwrite existing pre-push hook/);
    assert.equal(await readFile(join(clone, ".git", "hooks", "pre-push"), "utf8"), "#!/bin/sh\ncustom-tool\n");
  } finally {
    await rm(clone, { recursive: true, force: true });
  }
});
