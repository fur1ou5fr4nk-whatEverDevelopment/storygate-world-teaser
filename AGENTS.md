# StoryGate public-release boundary

This repository is the sole deployable source for `storygate.world`.

## Repository roles

- `/Users/frankbodmann/dev/StoryGate.world` is the canonical editable product and identity repository. Its Constitution and active documentation define StoryGate decisions.
- `/Users/frankbodmann/dev/storygate-world-teaser` is the narrow public production repository. Only approved public assets and behavior belong here.
- ChatGPT project mirrors are read-only context. Never deploy from them or treat them as editable repository variants.

## Mandatory working rules

- Never develop directly in the shared `main` checkout. Create an isolated Git worktree and task branch from current `origin/main`.
- Never mix files from concurrent tasks into one commit. Preserve every unrelated or unfinished change.
- Never push while any tracked or untracked repository change remains outside the release commit. The committed pre-push hook and `npm run release:check` enforce this.
- Run `npm run release:check` on the exact clean commit before every push.
- GitHub Pages must deploy through `.github/workflows/pages.yml`; do not restore branch-folder auto-deployment.
- Public external destinations are allowlisted by `tests/public-content-policy.test.mjs`. Adding or replacing a destination requires Frank's explicit approval. Never weaken or bypass that policy to make a test pass.
- Commit, push, deployment, DNS changes, paid settings, and other external mutations require explicit authorization.
- Report local verification, pushed commit, GitHub Actions result, and live-browser verification as separate evidence.

## Release sequence

1. Implement and test in an isolated worktree.
2. Commit only the approved task files.
3. Confirm the worktree is clean.
4. Run `npm run release:check`.
5. Push the reviewed commit to `main` only when explicitly authorized.
6. Wait for the gated Pages workflow.
7. Verify the live HTTPS page and the specific changed behavior.
