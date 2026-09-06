Task
Fix gate stalled/no stars when returning to the gate from cards (Bio, Demo, About), enable swipe back gesture navigation, and replace link label with explanation.

Files Modified
- docs/script.js
- docs/biography.js
- docs/simple-demo/simple-demo.js
- docs/frank-bodmann.html
- docs/what-is-storygate.html
- docs/simple-demo/index.html
- docs/locales/en.mjs
- docs/locales/de.mjs
- docs/locales/th.mjs
- docs/locales/fr.mjs
- docs/locales/es.mjs
- docs/locales/ru.mjs
- docs/locales/zh-Hans.mjs
- docs/locales/zh-Hant.mjs
- tests/site-smoke.test.mjs

Files Created
- WT-2026-09-06-back-to-gate-flow.md

Files Deleted
None

Changes Applied
- docs/script.js:
  - Updated syncPrelude to avoid removing is-ready and disabling stars when stage.dataset.phase is "5".
  - Updated setFinalReadyState to call unlockBiographyDiscovery and add has-found-both so all 3 discovery stars (Bio, Demo, StoryGate) are ready and interactive upon return via skipIntro.
- docs/biography.js:
  - Added horizontal swipe-right pointer gesture navigation to return to the gate (./?skipIntro=1).
- docs/simple-demo/simple-demo.js:
  - Added horizontal swipe-right gesture handling in endApproach, navigatePreviousPhase, and on the demo stage to return to the gate (../?skipIntro=1).
- docs/frank-bodmann.html, docs/what-is-storygate.html, docs/simple-demo/index.html:
  - Updated back link text to display the explanation "Swipe to return to the Gate".
- docs/locales/*.mjs (en, de, th, fr, es, ru, zh-Hans, zh-Hant):
  - Updated bio.back, about.back, and demo.back to translate "Swipe to return to the Gate" in all 8 supported languages.
- tests/site-smoke.test.mjs:
  - Added smoke tests verifying discovery stars readiness upon skipIntro return and swipe navigation on all cards.

Verification
- Executed npm test: 97/97 tests passing.
- Executed npm run release:check: passed on clean working tree.

Result
PASS - Returning to gate from Bio, Demo, and About presents active, interactive stars without stalling. Swipe-right gesture navigates back to the gate, with explanatory cue displayed across cards.

Limitations
None
