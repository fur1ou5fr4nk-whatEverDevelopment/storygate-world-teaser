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

`main` is the integration and release branch, not a shared development checkout.
Every task must use an isolated worktree and branch. Before pushing, run:

    npm run release:check

The check refuses staged, unstaged, and untracked release dirt and runs the
complete test suite, including the exact approved-public-link policy. The
automatically installed pre-push hook runs the same gate locally; the GitHub
workflow remains the authoritative release gate.

GitHub Pages deploys only through `.github/workflows/pages.yml` after the exact
commit passes the release gate. Do not re-enable direct branch-folder deployment.

Repository roles and the mandatory release sequence are defined in `AGENTS.md`.
