Task
Position prelude remember cards straight under the stars matching the positions of content cards later on.

Files Modified
- docs/index.html
- docs/styles.css
- docs/script.js
- tests/site-smoke.test.mjs

Files Created
- WT-2026-09-06-prelude-remember-under-stars.md

Files Deleted
None

Changes Applied
- docs/index.html:
  - Removed single root prelude-card element.
  - Added a prelude-card inside each discovery container (storygate, demo, biography).
- docs/styles.css:
  - Updated .prelude-card styling to match discovery card dimensions (clamp(220px, 23vw, 300px), 72px min-height, 16px radius, gold border and glass glow).
  - Applied the exact same desktop and mobile position coordinates to .prelude-card as .discovery-card for each discovery.
  - Added display: none for .prelude-card outside phases 1 and 2, and opening styles for .discovery.is-remember-open.
- docs/script.js:
  - Updated preludeCards to collect all [data-prelude-card] elements.
  - Updated revealRemember to open the specific remember card under the tapped star via closest discovery container.
  - Updated syncPrelude to hide all prelude cards and clear is-remember-open states when leaving prelude phases.
- tests/site-smoke.test.mjs:
  - Added test verifying all 3 discoveries contain a prelude-card and that styling matches discovery positions.

Verification
- Executed npm test: 95/95 tests passing.
- Executed npm run release:check: clean commit check passes.

Result
PASS - Prelude remember cards positioned straight under the stars in the identical positions of content cards.

Limitations
None
