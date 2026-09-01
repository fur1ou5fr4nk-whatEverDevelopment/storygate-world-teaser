# StoryGate.world teaser

Static GitHub Pages site for storygate.world.

## Local preview

Run:

    python3 -m http.server 8000 --directory docs

Then open http://localhost:8000.

## Test

Run:

    npm install
    npm test

`npm install` activates the repository's committed pre-push safeguard in a
fresh checkout.

## Publishing

`main` is the protected integration and release branch, not a shared development
checkout. Every task must use an isolated worktree and branch. Before pushing
that task branch, run:

    npm run release:check

The check refuses staged, unstaged, and untracked release dirt and runs the
complete test suite, including the exact approved-public-link policy. The
automatically installed pre-push hook runs the same gate locally. Open a pull
request to `main`; GitHub requires the `Release safeguards` check and rejects
direct pushes, force pushes, and deletion under the committed ruleset at
`.github/rulesets/protect-main.json`.

After the pull request is merged, GitHub Pages deploys only through
`.github/workflows/pages.yml` after the exact merged commit passes the release
gate again. Do not re-enable direct branch-folder deployment.

Repository roles and the mandatory release sequence are defined in `AGENTS.md`.
