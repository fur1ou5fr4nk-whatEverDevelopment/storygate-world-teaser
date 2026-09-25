Task
Fix skip forward navigating back to the gate by isolating stepper touch events, eliminating synthetic pointerdown dispatch, and enforcing stopImmediatePropagation on swipe navigation.

Files Modified
- docs/about.js
- docs/biography.js
- tests/about-stepped-reading.test.mjs

Files Created
- WT-2026-09-26-fix-skip-forward-gate-redirect.md

Files Deleted
None

Changes Applied
- docs/about.js:
  - Replaced synthetic `pointerdown` event dispatch with `Escape` keyboard event to close popover layers without corrupting touch tracking coordinates.
  - Added pointer event isolation on `.about-stepper` container to prevent stepper clicks and taps from triggering global swipe tracking.
  - Updated horizontal swipe handling to call `event.stopImmediatePropagation()` on both swipe directions so subsequent document listeners do not trigger gate redirects.
- docs/biography.js:
  - Added safeguards ignoring synthetic / untrusted pointer events and touches originating from `.about-stepper` controls.
- tests/about-stepped-reading.test.mjs:
  - Added automated test verifying that skipping forward via Next button and swipe left does not dispatch pointerdown or trigger gate redirects.

Verification
- Executed npm test: 106/106 tests passing.
- Executed npm run release:check: clean working tree verification passing.

Result
- PASS - Skipping forward via Next button or swipe left advances through story blocks without triggering unintended redirects to the gate.

Limitations
None
