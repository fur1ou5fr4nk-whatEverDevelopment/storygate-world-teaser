Task
Implement folded accordion paragraphs for What is StoryGate (about page) matching the Bio page style with short intro and expandable disclosures across all 8 locales.

Files Modified
- docs/what-is-storygate.html
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
- WT-2026-09-06-about-accordion.md

Files Deleted
None

Changes Applied
- docs/what-is-storygate.html:
  - Structured all 4 narrative story blocks using `<p class="story-block__intro">` and `<details class="story-block__details"><summary class="story-block__summary"><span class="story-block__more">...</span><span class="story-block__less">...</span></summary><div class="story-block__expanded"><p>...</p></div></details>`.
  - Preserved layer trigger buttons and card popover links (`gate`, `world`, `human-perspective`, `curiosity`).
- docs/locales/*.mjs (en, de, th, fr, es, ru, zh-Hans, zh-Hant):
  - Updated about story keys into intro/expanded components (`about.story.1.introAfterGate`, `about.story.1.expandedBeforeWorld`, `about.story.2.intro`, `about.story.2.expandedBeforeHumanPerspective`, `about.story.3.afterCuriosityIntro`, `about.story.3.expanded`, `about.story.4.intro`, `about.story.4.expanded`).
  - Added section disclosure summary trigger keys (`about.section.1.more`, `about.section.2.more`, `about.section.3.more`, `about.section.4.more`, `about.section.less`) across all 8 supported languages.
- tests/site-smoke.test.mjs:
  - Added smoke test verifying 4 intro paragraphs and 4 details/summary/expanded accordion disclosures on `what-is-storygate.html`.

Verification
- Executed npm test: 98/98 tests passing.
- Executed npm run release:check: passed on clean working tree.

Result
- PASS - What is StoryGate displays folded accordion paragraphs matching the Bio page styling, with full multi-language parity and interactive layer triggers.

Limitations
None
