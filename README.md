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

Configure GitHub Pages to deploy from the main branch and the /docs folder.
First approve the temporary github.io preview. Add docs/CNAME with
storygate.world only when the DNS switch to GitHub Pages is explicitly approved.
