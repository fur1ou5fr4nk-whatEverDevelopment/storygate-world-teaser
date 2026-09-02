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

test("biography cue explains hover, keyboard selection, and tap in every language", () => {
  const expectedCues = {
    en: "Hover over highlighted terms, select them with your keyboard, or tap them to reveal more context.",
    de: "Fahre über hervorgehobene Begriffe, wähle sie per Tastatur an oder tippe darauf, um mehr Kontext zu erhalten.",
    th: "เลื่อนเมาส์เหนือคำที่ไฮไลต์ เลือกด้วยแป้นพิมพ์ หรือแตะเพื่อดูบริบทเพิ่มเติม",
    fr: "Survole les termes mis en évidence, sélectionne-les au clavier ou touche-les pour obtenir plus de contexte.",
    es: "Pasa el cursor sobre los términos destacados, selecciónalos con el teclado o tócalos para obtener más contexto.",
    ru: "Наведите указатель на выделенные термины, выберите их с клавиатуры или коснитесь, чтобы получить больше контекста.",
    "zh-Hans": "将鼠标悬停在高亮词语上，用键盘选中它们，或轻触以查看更多背景信息。",
    "zh-Hant": "將游標停在醒目標示的詞語上，用鍵盤選取它們，或輕觸以查看更多背景資訊。",
  };
  const catalogues = { en: englishCatalogue, ...loadedTargets };

  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(catalogues[locale].messages["bio.cue"], expectedCues[locale], locale);
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
