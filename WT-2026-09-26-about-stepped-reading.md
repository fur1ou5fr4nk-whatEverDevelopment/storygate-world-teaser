Task
Implement stepped reading experience on What is StoryGate (about page) showing one paragraph at a time with expandable depth disclosure, adaptive typography, and slow steady progression controls without changing content, CI fonts, or black and white palette.

Files Modified
- docs/about.css
- docs/what-is-storygate.html
- tests/site-smoke.test.mjs

Files Created
- docs/about.js
- tests/about-stepped-reading.test.mjs
- WT-2026-09-26-about-stepped-reading.md

Files Deleted
None

Changes Applied
- docs/what-is-storygate.html:
  - Added sticky `.about-stepper` navigation header containing step counter, paragraph progression dots, and previous/next navigation buttons.
  - Bound story blocks to step index attributes (`data-step-index`, `data-active`, `hidden="until-found"`).
  - Loaded `about.js` script.
- docs/about.js:
  - Implemented stepped presentation displaying exactly one story block at a time.
  - Added smooth transition and state management for previous/next actions, step dots, and keyboard navigation (ArrowLeft/ArrowRight, PageUp/PageDown).
  - Added horizontal touch swipe support (swipe left advances; swipe right on step > 0 returns to previous step while step 0 preserves swipe-to-gate).
  - Supported `beforematch` search events to reveal and activate matched paragraphs during find-in-page.
  - Bound startup status notice to appear gracefully on final step.
- docs/about.css:
  - Configured adaptive typography for single paragraph display via container queries (`clamp(1.4rem, 1.2rem + 1.2cqi, 2.2rem)`) and responsive breakpoints.
  - Styled sticky blurred stepper navigation bar with black-and-white CI palette and CI fonts (Spectral / Inter / Noto).
  - Streamlined hero vertical spacing to bring active narrative into immediate view.
- tests/site-smoke.test.mjs:
  - Added smoke verification for stepper navigation controls, active block attributes, and adaptive typography declarations.
  - Registered `/about.js` in production asset checks.
- tests/about-stepped-reading.test.mjs:
  - Added automated test suite verifying step navigation, keyboard controls, and beforematch search activation.

Verification
- Executed npm test: 105/105 tests passing.
- Executed npm run release:check: clean working tree verification passing.

Result
- PASS - What is StoryGate displays one paragraph at a time with more-about chevron disclosures, adaptive typography, and smooth steady progression controls while strictly preserving all text, CI fonts, and black-and-white palette.

Limitations
None
