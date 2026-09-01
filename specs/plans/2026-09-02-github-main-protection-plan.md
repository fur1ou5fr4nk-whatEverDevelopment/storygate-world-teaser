# StoryGate GitHub Main Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GitHub reject unsafe updates to StoryGate's public `main` branch and deploy only the exact merged commit after the complete release gate passes.

**Architecture:** A pull-request workflow exposes one stable required check, `Release safeguards`. A repository ruleset requires that check and a pull request, blocks force pushes and deletion, and grants no bypass. A separate least-privilege job deploys `docs/` only after verification of a merged `main` commit.

**Tech Stack:** GitHub Actions, GitHub repository rulesets REST API, GitHub Pages, Node.js 22, Node test runner, YAML parser, npm release gate.

**Spec:** `specs/2026-09-02-github-main-protection-design.md`

## Global Constraints

- Work only in `/private/tmp/storygate-facebook-regression-guard` on `codex/github-main-protection`.
- Do not modify, stash, reset, clean, commit, or otherwise alter any other StoryGate checkout or worktree.
- Do not weaken `npm run release:check` or the public-link allowlist.
- Keep `Release safeguards` exactly stable because GitHub identifies the required check by that context.
- Do not add a ruleset bypass actor or mandatory human deployment approval.
- Bootstrap protection through a pull request; never push this change directly to `main`.
- Keep local verification, GitHub configuration, Actions deployment, live HTTP evidence, and rendered-browser evidence as separate claims.

---

## Task 1: Add executable policy tests for the intended GitHub boundary

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/github-governance-policy.test.mjs`
- Create: `.github/rulesets/protect-main.json`

- [ ] Add `yaml` as a locked development dependency so tests parse the workflow structurally rather than matching fragile source text.
- [ ] Write tests that require `.github/workflows/pages.yml` to trigger on pull requests and pushes to `main`, forbid `workflow_dispatch`, and grant only `contents: read` globally.
- [ ] Write tests that require a job named exactly `Release safeguards` to check out the head, install with `npm ci`, and run `npm run release:check` without Pages write permissions.
- [ ] Write tests that require `Deploy verified site` to depend on the safeguard job, run only on a push to `refs/heads/main`, hold `pages: write` and `id-token: write`, upload only `docs/`, and deploy through `github-pages`.
- [ ] Write tests for `.github/rulesets/protect-main.json`: active enforcement, `~DEFAULT_BRANCH`, empty bypass actors, pull-request rule with zero approvals, strict required context `Release safeguards`, deletion protection, and non-fast-forward protection.
- [ ] Run only the new policy test before changing the workflow and confirm it fails for the existing direct-push/manual-dispatch deployment shape.
- [ ] Add the declarative ruleset payload using the exact GitHub REST schema and rerun the new test; confirm only the still-unimplemented workflow assertions remain red.

## Task 2: Split verification from deployment and document the protected path

**Files:**

- Modify: `.github/workflows/pages.yml`
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] Add the `pull_request` trigger for `main` and remove `workflow_dispatch`.
- [ ] Reduce global workflow permissions to `contents: read`.
- [ ] Replace the combined job with `release-safeguards`, named exactly `Release safeguards`, containing checkout, Node 22 setup, `npm ci`, and `npm run release:check`.
- [ ] Add `deploy-verified-site`, named `Deploy verified site`, depending on `release-safeguards`, conditioned on a `main` push, and scoped to Pages and OIDC write permissions.
- [ ] Keep upload and deployment after verification and keep the artifact path exactly `docs`.
- [ ] Update `AGENTS.md` so the mandatory sequence is isolated branch, clean release check, task-branch push, pull request, required check, merge, automatic deployment, live verification; explicitly prohibit direct pushes to `main`.
- [ ] Update `README.md` with the same concise contributor-facing path and identify the committed ruleset payload as the reviewed server configuration.
- [ ] Run `node --test tests/github-governance-policy.test.mjs` and confirm it passes.
- [ ] Run `npm test` and `npm run release:check`; confirm the entire local gate passes on a clean commit.

## Task 3: Commit, self-review, and publish only the task branch

**Files:**

- Review: all changes since `origin/main`

- [ ] Inspect `git diff --check`, the complete diff from `origin/main`, and the changed-file list for unrelated content.
- [ ] Confirm no `TODO`, `TBD`, placeholder, Facebook destination, workflow dispatch, bypass actor, or direct-main release instruction remains in the task diff.
- [ ] Commit the implementation as `ci: protect StoryGate main releases`.
- [ ] Re-run `npm run release:check` on the exact clean commit.
- [ ] Push only `codex/github-main-protection` to `origin`.
- [ ] Open one pull request to `main` summarizing the regression cause, the server-side protections, test evidence, and the lack of unrelated worktree changes.

## Task 4: Bootstrap and verify the active server-side ruleset

**Files:**

- Apply: `.github/rulesets/protect-main.json` through `POST /repos/fur1ou5fr4nk-whatEverDevelopment/storygate-world-teaser/rulesets`

- [ ] Wait for the pull request's exact head SHA to complete the `Release safeguards` check successfully.
- [ ] Confirm the required context string returned by GitHub is exactly `Release safeguards`.
- [ ] Re-query repository rulesets to ensure no matching protection ruleset appeared concurrently; update an exact match rather than creating a duplicate if necessary.
- [ ] Create the active `Protect StoryGate main` ruleset from the committed JSON payload.
- [ ] Read the created ruleset back and verify active enforcement, default-branch scope, empty bypass actors, pull-request requirement, strict status check, non-fast-forward rule, and deletion rule.
- [ ] Verify GitHub reports the open pull request as governed and mergeable only with the required check satisfied.
- [ ] If GitHub rejects the ruleset because the repository plan cannot enforce it, stop before merge and report the exact API response; do not silently substitute weaker local controls.

## Task 5: Merge through protection and verify the production chain

**Files:**

- Remote merge: the protection pull request
- Remote configuration: `github-pages` deployment branch policy

- [ ] Merge the pull request through GitHub without bypassing the ruleset.
- [ ] Record the resulting `main` SHA and wait for both `Release safeguards` and `Deploy verified site` on that exact SHA.
- [ ] Confirm Pages remains workflow-built with HTTPS enforced.
- [ ] Remove only the obsolete `gh-pages` deployment branch policy and retain `main`; verify the final environment branch policy through the API.
- [ ] Fetch the live biography and compare it byte-for-byte with `docs/frank-bodmann.html` at the merged SHA.
- [ ] Confirm the live document has no Facebook destination and retains the approved Rice Paddy Google Maps destination.
- [ ] Attempt a normal direct push of the already-merged SHA to `main` only if it can be done without creating a new commit; otherwise verify the rule through GitHub's rule evaluation and API evidence rather than manufacturing a mutation.
- [ ] Report local test evidence, PR/check evidence, ruleset evidence, merged/deployed SHA, live-content evidence, and any missing browser-rendered evidence separately.

## Acceptance Criteria

- [ ] The branch contains only the approved design, implementation plan, workflow/governance changes, test dependency, policy test, and declarative ruleset payload.
- [ ] `npm test` and `npm run release:check` pass on the exact clean task-branch commit.
- [ ] GitHub requires a pull request and the strict `Release safeguards` status context for `main`.
- [ ] The active ruleset has no bypass actors and prevents non-fast-forward updates and deletion.
- [ ] The protection change reaches `main` only through its pull request.
- [ ] The exact merged SHA passes verification and deploys automatically.
- [ ] Live deployed content matches the merged artifact and contains no Facebook destination.
- [ ] Existing dirty StoryGate worktrees remain byte-for-byte untouched by this task.
