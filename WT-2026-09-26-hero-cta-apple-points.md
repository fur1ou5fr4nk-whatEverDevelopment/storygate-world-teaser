Task
Transition What is StoryGate page to an initial centered hero stage displaying "Was ist StoryGate? Jeder Ort, jedes Objekt und jeder Moment kann eine Story in sich tragen. StoryGate öffnet sie" with a CTA to slide the title up and reveal the centered content card, remove the x/x count and top progress bar, and position Apple-style points underneath the reading box while strictly adhering to StoryGate CI fonts, monochrome colors, and unchanged content text.

Files Modified
- docs/about.css
- docs/about.js
- docs/what-is-storygate.html
- tests/about-stepped-reading.test.mjs

Files Created
- WT-2026-09-26-hero-cta-apple-points.md

Files Deleted
None

Changes Applied
- docs/what-is-storygate.html:
  - Added `.bio-hero__cta` button with chevron SVG icon inside `.bio-hero__copy`.
- docs/about.css:
  - Configured initial `[data-stage="hero"]` stage to display hero heading and introduction large and centered in the viewport.
  - Added smooth transition when switching to `[data-stage="content"]`, sliding the title upward (`aboutTitleSlideToTop`) and revealing the centered content box (`aboutContentBoxEnter`).
  - Hid `.about-stepper__count` (`x/x`) display entirely.
  - Positioned `.about-stepper` directly underneath the `.story-block` via flex layout ordering.
  - Styled `.about-stepper__dots` as Apple-style pagination points with subtle dots and an elongated glowing active pill.
- docs/about.js:
  - Added stage management (`data-stage="hero"` vs `data-stage="content"`).
  - Attached CTA button and hero copy click handlers to transition from hero to content mode.
  - Preserved `#step-\d+` deep linking by immediately activating content mode when a step hash or non-zero step is detected.
- tests/about-stepped-reading.test.mjs:
  - Updated mock test harness to support `.bio-hero__cta` querying and click events.
  - Added unit test verifying transition from hero to content stage on CTA click.

Verification
- npm test: 110/110 tests passing.
- npm run release:check: clean working tree verification passing.

Result
- PASS - Initial centered hero view transitions on CTA click with title sliding up, content box centered in screen, x/x counter removed, and Apple-style points positioned underneath the reading card.

Limitations
None
