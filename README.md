# StoryGate.world teaser

Static GitHub Pages site for storygate.world.

## Local preview

Run:

    python3 -m http.server 8000 --directory docs

Then open http://localhost:8000.

## Test

Run:

    npm test

## Publishing

`main` is the integration and release branch, not a shared development checkout.
Every task must use an isolated worktree and branch. Before pushing, run:

    npm run release:check

The check refuses a dirty checkout and runs the complete test suite, including
the approved-public-link policy. The committed pre-push hook runs the same gate.

GitHub Pages deploys only through `.github/workflows/pages.yml` after the exact
commit passes the release gate. Do not re-enable direct branch-folder deployment.

Repository roles and the mandatory release sequence are defined in `AGENTS.md`.
