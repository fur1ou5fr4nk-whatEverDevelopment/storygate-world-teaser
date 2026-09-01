import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { chmod, copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const cleanEnvironment = { ...process.env };
for (const variable of [
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_COMMON_DIR",
  "GIT_DIR",
  "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY",
  "GIT_PREFIX",
  "GIT_WORK_TREE"
]) {
  delete cleanEnvironment[variable];
}

const repositoryRoot = process.cwd();
const commonDirectory = spawnSync("git", ["rev-parse", "--git-common-dir"], {
  cwd: repositoryRoot,
  encoding: "utf8",
  env: cleanEnvironment
});

if (commonDirectory.status !== 0) {
  process.stderr.write(commonDirectory.stderr || "Cannot install StoryGate hooks outside a Git repository.\n");
  process.exit(commonDirectory.status || 1);
}

const source = resolve(repositoryRoot, ".githooks", "pre-push");
const destination = resolve(repositoryRoot, commonDirectory.stdout.trim(), "hooks", "pre-push");

await mkdir(dirname(destination), { recursive: true });
const sourceContents = await readFile(source);

try {
  const installedContents = await readFile(destination);
  if (!sourceContents.equals(installedContents)) {
    process.stderr.write(
      "Refusing to overwrite existing pre-push hook at " + destination +
      ". Preserve or deliberately chain it before retrying.\n"
    );
    process.exit(1);
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  await copyFile(source, destination, constants.COPYFILE_EXCL);
}

await chmod(destination, 0o755);

process.stdout.write("STORYGATE_HOOKS_INSTALLED\n");
