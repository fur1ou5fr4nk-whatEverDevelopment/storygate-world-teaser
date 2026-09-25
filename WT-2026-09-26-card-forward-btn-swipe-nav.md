Task
Fix forward arrow button in About StoryGate content box by replacing CSS pseudo-element with dedicated HTML button, position forward button at the bottom-right of each readable card, hide stepper action buttons so only Apple-style points appear under the card, and enhance mobile/tablet swipe gesture navigation across the entire card including expanded text disclosures.

Files Modified
- docs/about.css
- docs/about.js
- docs/what-is-storygate.html
- tests/about-stepped-reading.test.mjs

Files Created
- WT-2026-09-26-card-forward-btn-swipe-nav.md

Files Deleted
None

Changes Applied
- docs/what-is-storygate.html:
  - Replaced pseudo-element forward cue with explicit `<button class="story-block__forward" type="button" aria-label="Next paragraph">` inside story blocks 0 to 5.
- docs/about.css:
  - Positioned `.story-block__forward` button at bottom-right of `.story-block` (`position: absolute; right: clamp(1.25rem, 3.5vw, 2.25rem); bottom: clamp(1.25rem, 3.5vw, 2rem);`).
  - Added bottom padding to `.story-block` (`padding-bottom: clamp(4.25rem, 8vw, 5.25rem);`) to guarantee card text and expanded disclosures never overlap the button.
  - Removed old `::after` pseudo-element rules from `.story-block`.
  - Hidden `.about-stepper__actions` via `display: none !important;` so truly only the Apple-style points are displayed under the content box.
  - Set `touch-action: pan-y;` on `.story-block` and its content children, and `touch-action: manipulation;` on interactive controls for fluid touch scrolling and gesture delegation.
- docs/about.js:
  - Added dedicated click listener for all `.story-block__forward` buttons to reliably advance to the next step with `stopPropagation()`.
  - Added `resetDrag()` cleanup helper and added `pointercancel` listener to cleanly release gesture styles and avoid stuck drag state on mobile.
  - Allowed swipe gestures over `.story-block__expanded` text so readers can swipe between steps while reading expanded disclosures.
  - Enhanced swipe gesture detection to support flick velocity (`velocity > 0.35px/ms`) alongside distance threshold.
- tests/about-stepped-reading.test.mjs:
  - Added mock forward button support to harness.
  - Added tests for forward button click, mobile swipe on expanded content blocks, and pointercancel state reset.

Verification
- npm test: 113/113 tests passing.
- npm run release:check: clean working tree verification passing.

Result
- PASS - Forward arrow button in content box replaced with dedicated bottom-right button, stepper actions hidden leaving only Apple points under the box, and mobile/tablet swipe navigation optimized.

Limitations
None
