import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parse } from "yaml";

const workflowPath = new URL("../.github/workflows/pages.yml", import.meta.url);
const rulesetPath = new URL(
  "../.github/rulesets/protect-main.json",
  import.meta.url,
);

async function readWorkflow() {
  return parse(await readFile(workflowPath, "utf8"));
}

function branchList(trigger) {
  if (!trigger) return [];
  return Array.isArray(trigger.branches) ? trigger.branches : [trigger.branches];
}

function findStep(job, predicate) {
  return job.steps.find(predicate);
}

test("workflow verifies pull requests and main pushes without manual dispatch", async () => {
  const workflow = await readWorkflow();

  assert.deepEqual(branchList(workflow.on?.pull_request), ["main"]);
  assert.deepEqual(branchList(workflow.on?.push), ["main"]);
  assert.equal(workflow.on?.workflow_dispatch, undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
});

test("Release safeguards is a stable, read-only required-check job", async () => {
  const workflow = await readWorkflow();
  const job = workflow.jobs?.["release-safeguards"];

  assert.ok(job, "release-safeguards job must exist");
  assert.equal(job.name, "Release safeguards");
  assert.equal(job.permissions, undefined);
  assert.match(
    findStep(job, (step) => step.uses?.startsWith("actions/checkout@"))?.uses ?? "",
    /^actions\/checkout@v\d+$/,
  );
  assert.equal(findStep(job, (step) => step.run === "npm ci")?.run, "npm ci");
  assert.equal(
    findStep(job, (step) => step.run === "npm run release:check")?.run,
    "npm run release:check",
  );
});

test("deployment is main-only, least-privilege, and downstream of safeguards", async () => {
  const workflow = await readWorkflow();
  const job = workflow.jobs?.["deploy-verified-site"];

  assert.ok(job, "deploy-verified-site job must exist");
  assert.equal(job.name, "Deploy verified site");
  assert.equal(job.needs, "release-safeguards");
  assert.equal(
    job.if,
    "github.event_name == 'push' && github.ref == 'refs/heads/main'",
  );
  assert.deepEqual(job.permissions, {
    contents: "read",
    pages: "write",
    "id-token": "write",
  });
  assert.equal(job.environment?.name, "github-pages");

  const uploadIndex = job.steps.findIndex((step) =>
    step.uses?.startsWith("actions/upload-pages-artifact@"),
  );
  const deployIndex = job.steps.findIndex((step) =>
    step.uses?.startsWith("actions/deploy-pages@"),
  );
  assert.ok(uploadIndex >= 0, "verified site must be uploaded");
  assert.equal(job.steps[uploadIndex].with?.path, "docs");
  assert.ok(deployIndex > uploadIndex, "deployment must follow artifact upload");
});

test("committed ruleset protects main without bypass actors", async () => {
  const ruleset = JSON.parse(await readFile(rulesetPath, "utf8"));

  assert.equal(ruleset.name, "Protect StoryGate main");
  assert.equal(ruleset.target, "branch");
  assert.equal(ruleset.enforcement, "active");
  assert.deepEqual(ruleset.bypass_actors, []);
  assert.deepEqual(ruleset.conditions, {
    ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] },
  });

  const rules = new Map(ruleset.rules.map((rule) => [rule.type, rule]));
  assert.deepEqual(rules.get("deletion"), { type: "deletion" });
  assert.deepEqual(rules.get("non_fast_forward"), {
    type: "non_fast_forward",
  });
  assert.deepEqual(rules.get("pull_request")?.parameters, {
    allowed_merge_methods: ["merge", "squash", "rebase"],
    dismiss_stale_reviews_on_push: false,
    require_code_owner_review: false,
    require_last_push_approval: false,
    required_approving_review_count: 0,
    required_review_thread_resolution: false,
  });
  assert.deepEqual(rules.get("required_status_checks")?.parameters, {
    do_not_enforce_on_create: false,
    required_status_checks: [{ context: "Release safeguards" }],
    strict_required_status_checks_policy: true,
  });
});
