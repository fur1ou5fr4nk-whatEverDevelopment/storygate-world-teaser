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

test("biography omits the redundant interaction cue in every language", () => {
  const catalogues = { en: englishCatalogue, ...loadedTargets };

  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(catalogues[locale].messages["bio.cue"], undefined, locale);
  }
});

test("biography chapter controls and closing line are localized in every language", () => {
  const keys = [
    "bio.section.about.title",
    "bio.section.origin.title",
    "bio.section.thread.title",
    "bio.section.about.more",
    "bio.section.origin.more",
    "bio.section.thread.more",
    "bio.section.less",
    "bio.story.3.closing",
  ];
  const expected = {
    en: ["About Frank", "How StoryGate came to be", "The common thread", "More about me", "More about the road to StoryGate", "More about the common thread", "Show less", "That little bit of chaos in between still comes straight from the source."],
    de: ["Über Frank", "Wie es zu StoryGate kam", "Der rote Faden", "Mehr über mich", "Mehr über den Weg zu StoryGate", "Mehr über den roten Faden", "Weniger anzeigen", "Das bisschen Chaos dazwischen stammt also weiterhin aus erster Hand."],
    th: ["เกี่ยวกับ Frank", "StoryGate เกิดขึ้นได้อย่างไร", "สายใยที่เชื่อมทุกอย่าง", "อ่านเรื่องของผมเพิ่มเติม", "อ่านเพิ่มเติมเกี่ยวกับเส้นทางสู่ StoryGate", "อ่านเพิ่มเติมเกี่ยวกับสายใยที่เชื่อมทุกอย่าง", "แสดงน้อยลง", "ความยุ่งเหยิงเล็ก ๆ น้อย ๆ ระหว่างทางจึงยังมาจากเจ้าตัวโดยตรง"],
    fr: ["À propos de Frank", "Comment StoryGate a vu le jour", "Le fil rouge", "En savoir plus sur moi", "En savoir plus sur le chemin vers StoryGate", "En savoir plus sur le fil rouge", "Afficher moins", "Le peu de chaos qui subsiste entre les deux vient donc toujours directement de la source."],
    es: ["Sobre Frank", "Cómo surgió StoryGate", "El hilo conductor", "Más sobre mí", "Más sobre el camino hacia StoryGate", "Más sobre el hilo conductor", "Mostrar menos", "Así que el pequeño caos que queda entre medias sigue viniendo directamente de la fuente."],
    ru: ["О Frank", "Как появился StoryGate", "Связующая нить", "Подробнее обо мне", "Подробнее о пути к StoryGate", "Подробнее о связующей нити", "Скрыть подробности", "Так что немного оставшегося между строк хаоса по-прежнему исходит непосредственно от первоисточника."],
    "zh-Hans": ["关于 Frank", "StoryGate 从何而来", "贯穿始终的线索", "进一步了解我", "进一步了解通往 StoryGate 的过程", "进一步了解贯穿始终的线索", "收起", "所以，夹在其中的那一点混乱，依然是第一手出品。"],
    "zh-Hant": ["關於 Frank", "StoryGate 從何而來", "貫穿始終的線索", "進一步了解我", "進一步了解通往 StoryGate 的過程", "進一步了解貫穿始終的線索", "收起", "所以，夾在其中的那一點混亂，依然是第一手出品。"],
  };
  const catalogues = { en: englishCatalogue, ...loadedTargets };

  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(keys.map((key) => catalogues[locale].messages[key]), expected[locale], locale);
  }
});

test("biography brigade positions follow the approved six-step progression in every language", () => {
  const positionKeys = [
    "bio.layer.career.position.kochazubi",
    "bio.layer.career.position.halbkoch",
    "bio.layer.career.position.kochkaspa",
    "bio.layer.career.position.rudelfuehrer",
    "bio.layer.career.position.depp",
    "bio.layer.career.position.obadepp",
  ];
  const expected = {
    en: ["Culinary apprenticeship", "Commis de Cuisine / junior cook", "Demi-Chef de Partie / deputy station chef", "Chef de Partie / station chef", "Sous-Chef / deputy head chef", "Chef de Cuisine / head chef"],
    de: ["Kochausbildung", "Jungkoch / Commis de Cuisine", "Demi-Chef de Partie", "Chef de Partie / Postenchef", "Sous-Chef / stellvertretender Küchenchef", "Küchenchef / Chef de Cuisine"],
    th: ["การฝึกงานเป็นพ่อครัว", "Commis de Cuisine / พ่อครัวรุ่นใหม่", "Demi-Chef de Partie / ผู้ช่วยหัวหน้าประจำสถานี", "Chef de Partie / หัวหน้าประจำสถานี", "Sous-Chef / รองหัวหน้าเชฟ", "Chef de Cuisine / หัวหน้าเชฟ"],
    fr: ["Apprentissage en cuisine", "Commis de cuisine / jeune cuisinier", "Demi-chef de partie / adjoint au chef de partie", "Chef de partie / responsable de poste", "Sous-chef / second de cuisine", "Chef de cuisine"],
    es: ["Formación como cocinero", "Commis de Cuisine / cocinero júnior", "Demi-Chef de Partie / ayudante de jefe de partida", "Chef de Partie / jefe de partida", "Sous-Chef / segundo de cocina", "Chef de Cuisine / jefe de cocina"],
    ru: ["Обучение на повара", "Commis de Cuisine / младший повар", "Demi-Chef de Partie / помощник начальника участка", "Chef de Partie / начальник участка", "Sous-Chef / заместитель шеф-повара", "Chef de Cuisine / шеф-повар"],
    "zh-Hans": ["厨师学徒培训", "Commis de Cuisine / 初级厨师", "Demi-Chef de Partie / 副档口主管", "Chef de Partie / 档口主管", "Sous-Chef / 副主厨", "Chef de Cuisine / 主厨"],
    "zh-Hant": ["廚師學徒訓練", "Commis de Cuisine / 初級廚師", "Demi-Chef de Partie / 副崗位主管", "Chef de Partie / 崗位主管", "Sous-Chef / 副主廚", "Chef de Cuisine / 主廚"],
  };
  const catalogues = { en: englishCatalogue, ...loadedTargets };

  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(positionKeys.map((key) => catalogues[locale].messages[key]), expected[locale], locale);
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
