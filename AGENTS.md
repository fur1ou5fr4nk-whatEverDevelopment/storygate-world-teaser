# StoryGate public-release boundary

This repository is the sole deployable source for `storygate.world`.

## Repository roles

- `/Users/frankbodmann/dev/StoryGate.world` is the canonical editable product and identity repository. Its Constitution and active documentation define StoryGate decisions.
- `/Users/frankbodmann/dev/storygate-world-teaser` is the narrow public production repository. Only approved public assets and behavior belong here.
- ChatGPT project mirrors are read-only context. Never deploy from them or treat them as editable repository variants.

## Mandatory working rules

- Never develop directly in the shared `main` checkout. Create an isolated Git worktree and task branch from current `origin/main`.
- Run `npm install` once in every fresh checkout. It automatically installs the committed pre-push safeguard.
- Never mix files from concurrent tasks into one commit. Preserve every unrelated or unfinished change.
- Never push while any staged, unstaged, or untracked repository change remains outside the release commit. The installed pre-push hook and `npm run release:check` enforce this locally; the gated GitHub workflow and protected `main` ruleset are authoritative.
- Run `npm run release:check` on the exact clean commit before every push.
- Never push directly to `main`. Push the isolated task branch, open a pull request, and merge only after the required `Release safeguards` check passes.
- GitHub Pages must deploy through `.github/workflows/pages.yml`; do not restore branch-folder auto-deployment.
- The reviewed server configuration is committed at `.github/rulesets/protect-main.json`. Do not add bypass actors or weaken it outside an explicitly approved governance change.
- Public external destinations are allowlisted by `tests/public-content-policy.test.mjs`. Adding or replacing a destination requires Frank's explicit approval. Never weaken or bypass that policy to make a test pass.
- For a clearly scoped, verified teaser change, commit and push the isolated branch and complete the existing protected-branch and Pages deployment sequence without asking again. Stop for destructive actions, paid settings, DNS or cloud changes, secrets, external messages, or an unclear target, and ask then.
- Report local verification, pushed commit, GitHub Actions result, and live-browser verification as separate evidence.

## Release sequence

1. Implement and test in an isolated worktree.
2. Commit only the approved task files.
3. Confirm the worktree is clean.
4. Run `npm run release:check`.
5. Push the isolated task branch after the exact clean release check passes.
6. Open a pull request to `main` and wait for the required `Release safeguards` check.
7. Merge through GitHub; never bypass the protected-branch ruleset.
8. Wait for automatic verification and Pages deployment of the exact merged commit.
9. Verify the live HTTPS page and the specific changed behavior.
