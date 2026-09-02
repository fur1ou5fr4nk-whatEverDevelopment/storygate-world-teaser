import assert from "node:assert/strict";
import { test } from "node:test";
import englishCatalogue from "../docs/locales/en.mjs";
import { CATALOGUES, SUPPORTED_LOCALES, validateCatalogs } from "../docs/i18n.mjs";

const targetLocales = SUPPORTED_LOCALES.filter((locale) => locale !== "en");
const loadedTargets = {};

for (const locale of targetLocales) {
  try {
    ({ default: loadedTargets[locale] } = await import(`../docs/locales/${locale}.mjs`));
  } catch {
    loadedTargets[locale] = undefined;
  }
}

test("all eight locale modules load and are registered at runtime", () => {
  assert.deepEqual(Object.keys(CATALOGUES), SUPPORTED_LOCALES);
  for (const locale of targetLocales) {
    assert.ok(loadedTargets[locale], `${locale} catalogue is missing`);
    assert.equal(CATALOGUES[locale], loadedTargets[locale], `${locale} is not the registered module`);
  }
});

test("target catalogues exactly mirror the English text and reveal keys", () => {
  for (const locale of targetLocales) {
    assert.ok(loadedTargets[locale], `${locale} catalogue is missing`);
  }
  const catalogues = { en: englishCatalogue, ...loadedTargets };
  assert.deepEqual(validateCatalogs(catalogues), []);

  const englishMessageKeys = Object.keys(englishCatalogue.messages);
  const englishSegmentKeys = Object.keys(englishCatalogue.segments);
  for (const locale of targetLocales) {
    assert.deepEqual(Object.keys(loadedTargets[locale].messages), englishMessageKeys, `${locale} messages`);
    assert.deepEqual(Object.keys(loadedTargets[locale].segments), englishSegmentKeys, `${locale} segments`);
  }
});

test("AI-reviewed targets keep truthful human-review metadata and are public", () => {
  for (const locale of targetLocales) {
    assert.ok(loadedTargets[locale], `${locale} catalogue is missing`);
    const { meta } = loadedTargets[locale];
    assert.equal(meta.locale, locale);
    assert.equal(meta.sourceVersion, englishCatalogue.meta.sourceVersion);
    assert.equal(meta.status, "ai-reviewed");
    assert.equal(meta.generatedBy, "codex-translation-worker-2026-09-02");
    assert.equal(meta.qaReviewedBy, "codex-locale-qa-2026-09-02");
    assert.equal(meta.nativeReviewed, false);
    assert.equal(meta.public, true);
  }
});

test("each target contains translated narrative and deliberate reveal segments", () => {
  for (const locale of targetLocales) {
    assert.ok(loadedTargets[locale], `${locale} catalogue is missing`);
    const catalogue = loadedTargets[locale];
    assert.notEqual(
      catalogue.messages["bio.story.1.beforeCareer"],
      englishCatalogue.messages["bio.story.1.beforeCareer"],
      `${locale} biography remained English`,
    );
    assert.notEqual(
      catalogue.messages["teaser.final.first"],
      englishCatalogue.messages["teaser.final.first"],
      `${locale} teaser remained English`,
    );
    assert.notEqual(
      catalogue.messages["about.introduction"],
      englishCatalogue.messages["about.introduction"],
      `${locale} introduction remained English`,
    );
    assert.notEqual(
      catalogue.messages["demo.instruction"],
      englishCatalogue.messages["demo.instruction"],
      `${locale} demo remained English`,
    );
    assert.ok(catalogue.segments["teaser.firstReveal"].length >= 3, `${locale} reveal segmentation`);
  }
});
