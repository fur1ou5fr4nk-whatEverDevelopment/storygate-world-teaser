Task
Fix tapping stuck/stalled at stage "Dein Wildes rastloses..." (teaser.wild).

Files Modified
- docs/styles.css
- docs/script.js
- tests/site-smoke.test.mjs

Files Created
- WT-2026-09-06-fix-wild-stage-tap.md

Files Deleted
None

Changes Applied
- docs/styles.css:
  - Added .portal-stage.is-wild-prompt .gate to the idle pulse rule with opacity: .9, pointer-events: auto, and gate-idle-pulse animation.
  - Restricted pointer-events: none on .gate to .portal-stage.is-final-act, preventing .portal-stage.is-full-focus from disabling gate clicks during phase 4.
- docs/script.js:
  - Replaced gate click listener with handleStageClick on stage (#portal) to advance reveal phases on tap and allow skipping the final act wait timer.
  - Protected interactive UI elements (.discovery-star, [data-discovery-card], [data-prelude-card], .language-control, links, non-gate buttons) from triggering stage advance.
- tests/site-smoke.test.mjs:
  - Added test verifying gate interactivity and pulse during wild prompt, restricted pointer-events disabling to final act, and stage click advance binding.

Verification
- Executed npm test: 94/94 tests passing.
- Verified release check clean and passing.

Result
PASS - Stage 4 wild prompt tapping stall resolved; gate is interactive, pulsing, and advances on tap.

Limitations
None
