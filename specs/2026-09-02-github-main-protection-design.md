# StoryGate GitHub Main Protection Design

**Status:** Approved design  
**Approved by:** Frank  
**Approval date:** 2026-09-02  
**Repository:** `fur1ou5fr4nk-whatEverDevelopment/storygate-world-teaser`

## Decision

StoryGate keeps automatic deployment after a successful merge to `main`.
Frank does not become a mandatory manual deployment operator for every change.
Instead, GitHub becomes the authoritative merge gate:

`isolated task worktree → task branch → pull request → required release check → protected main → automatic Pages deployment`

Direct pushes, force pushes, and deletion of `main` are blocked server-side.
No user, administrator role, deploy key, integration, or other actor receives a
ruleset bypass.

## Context

The Facebook-link regression was possible because a shared local `main`
checkout contained unfinished changes while a different committed variant was
pushed and deployed. Local hooks and instructions reduce that risk but cannot
govern every clone, worktree, API client, or future agent.

The public repository currently has:

- a release check and automatically installed pre-push hook;
- a workflow-only GitHub Pages deployment;
- no branch protection and no repository ruleset;
- automatic deployment after every push to `main`;
- parallel local worktrees and a stale, dirty shared `main` checkout.

The server must therefore reject unsafe updates before they reach `main`.

## Goals

1. Every update to `main` must be associated with a pull request.
2. The exact pull-request head must pass the complete StoryGate release gate.
3. A pull request must be current with `main` before merge.
4. `main` cannot be force-pushed or deleted.
5. Rules apply without bypass actors, including normal administrative pushes.
6. A successful merge to `main` automatically reruns verification and deploys
   the exact merged commit.
7. Existing canonical-repository work, localization work, and mobile-biography
   work remain untouched.

## Non-goals

- No mandatory personal deployment approval by Frank for routine releases.
- No required approving review count. A pull request is mandatory, but a second
  GitHub identity is not required.
- No migration of the canonical private/local StoryGate repository to GitHub.
- No consolidation of the canonical and public repositories.
- No cleanup, stash, commit, reset, deletion, or movement of existing dirty
  worktrees.
- No visual-regression framework or public-content manifest in this change.

## Repository workflow

### Task work

All implementation starts from the latest `origin/main` in an isolated
worktree and task branch. The shared local `main` checkout is not a release
surface.

### Pull-request verification

`.github/workflows/pages.yml` runs on pull requests targeting `main`.
It contains a stable job named `Release safeguards` that:

1. checks out the exact pull-request head;
2. installs the dependency set from `package-lock.json` using `npm ci`;
3. runs `npm run release:check`.

The verification job receives only `contents: read`.

### Merge protection

An active repository branch ruleset named `Protect StoryGate main` targets
`~DEFAULT_BRANCH` and contains:

- `pull_request` with zero required approving reviews;
- `required_status_checks` requiring the exact context
  `Release safeguards`;
- `strict_required_status_checks_policy: true`;
- `non_fast_forward`;
- `deletion`.

The ruleset has an empty `bypass_actors` list. It takes effect immediately
after the protection pull request has produced the required check context.

### Production deployment

The same workflow runs after a push to `main`. The `Release safeguards` job
runs again against the exact merged commit. A separate `Deploy verified site`
job:

- depends on `Release safeguards`;
- runs only for a push to `refs/heads/main`;
- receives `pages: write` and `id-token: write`;
- uploads only `docs/`;
- deploys through the `github-pages` environment.

`workflow_dispatch` is removed so an arbitrary branch cannot be selected for a
manual Pages deployment. The Pages environment allows deployment from `main`
only; the obsolete `gh-pages` branch policy is removed.

## Permissions

Workflow permissions are least-privilege:

- global: `contents: read`;
- verification job: no write permissions;
- deployment job: `pages: write` and `id-token: write`.

Pull-request workflows never receive Pages deployment permissions.

## Bootstrap sequence

The ruleset depends on a status-check context that must exist before it can be
required. Bootstrap therefore proceeds in this order:

1. Create the workflow/documentation change on an isolated task branch.
2. Push the task branch and open a pull request against `main`.
3. Wait for `Release safeguards` to succeed on the pull-request head.
4. Create the active `Protect StoryGate main` ruleset with no bypass actors.
5. Confirm the open pull request is governed by the required check.
6. Merge through the pull request.
7. Wait for `Release safeguards` and `Deploy verified site` on the merged SHA.
8. Verify Pages configuration, deployed SHA evidence, and the live site.

No direct push to `main` is used to bootstrap the protection.

## Failure behavior and recovery

- A failed release check blocks merge. Repair happens on the task branch.
- An out-of-date pull request must be updated with current `main` and retested.
- A failed post-merge verification prevents deployment.
- A failed deployment leaves the previously deployed Pages version live.
- If the workflow definition itself is broken, repair it through another task
  branch and pull request. Ruleset changes or bypasses require a separate,
  explicit decision by Frank.
- Force-push rollback is forbidden. Recovery uses a normal revert pull request.

## Verification

Local evidence:

- workflow syntax validation;
- complete `npm test`;
- clean `npm run release:check`;
- clean Git diff and isolated worktree.

GitHub evidence:

- pull request shows `Release safeguards` for the exact head SHA;
- ruleset API reports active enforcement, default-branch targeting, no bypass
  actors, mandatory pull request, strict required check, deletion protection,
  and non-fast-forward protection;
- mergeability is blocked until the required check passes;
- post-merge workflow verifies and deploys the exact `main` SHA;
- Pages remains `build_type: workflow`, HTTPS-enforced, and restricted to
  `main`.

Live evidence:

- deployed biography is byte-identical to the merged `docs/frank-bodmann.html`;
- no Facebook destination is present;
- the approved Rice Paddy Google Maps destination is present.

Browser-rendered evidence remains a separate claim and is reported as blocked
if the admin-enforced browser security check cannot be completed.

## Acceptance criteria

- A task branch can open a pull request and run `Release safeguards`.
- `main` has one active ruleset matching the configuration above.
- Direct, force, and deletion paths are not available to ordinary or
  administrative Git pushes.
- The protection pull request merges only after its required check succeeds.
- The merged commit automatically passes verification and deploys.
- No existing dirty checkout or unrelated task file is modified.
