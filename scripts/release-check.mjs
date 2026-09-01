import { spawnSync } from "node:child_process";

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

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: cleanEnvironment,
    ...options
  });
}

const repository = run("git", ["rev-parse", "--show-toplevel"]);
if (repository.status !== 0) {
  process.stderr.write("Refusing release: not inside a Git repository.\n");
  process.exit(1);
}

const status = run("git", ["status", "--porcelain", "--untracked-files=all"]);
if (status.status !== 0) {
  process.stderr.write(status.stderr || "Refusing release: Git status failed.\n");
  process.exit(1);
}

if (status.stdout.trim()) {
  process.stderr.write("Refusing release: working tree is dirty. Commit or isolate every change before pushing.\n");
  process.stderr.write(status.stdout);
  process.exit(1);
}

process.stdout.write("RELEASE_TREE_CLEAN\n");

if (!process.argv.includes("--check-clean-only")) {
  const tests = run("npm", ["test"], { stdio: "inherit" });
  if (tests.status !== 0) process.exit(tests.status || 1);
  process.stdout.write("RELEASE_CHECK_OK\n");
}
