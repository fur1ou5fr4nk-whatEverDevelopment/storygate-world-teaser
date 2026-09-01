import assert from "node:assert/strict";
import { test } from "node:test";

let api = {};
let englishCatalogue;

try {
  api = await import("../docs/i18n.mjs");
} catch {
  api = {};
}

try {
  ({ default: englishCatalogue } = await import("../docs/locales/en.mjs"));
} catch {
  englishCatalogue = undefined;
}

function styleDeclaration() {
  const values = new Map();
  return {
    setProperty(name, value) {
      values.set(name, value);
    },
    getPropertyValue(name) {
      return values.get(name) || "";
    },
  };
}

function element(dataset = {}) {
  const attributes = new Map();
  return {
    dataset: { ...dataset },
    textContent: "original",
    className: "",
    style: styleDeclaration(),
    children: [],
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    replaceChildren(...children) {
      this.children = children;
    },
  };
}

function documentFixture(groups) {
  const documentElement = element();
  documentElement.lang = "en";
  documentElement.dataset.phase = "3";
  documentElement.className = "is-still-prompt has-found-both";

  return {
    documentElement,
    createElement() {
      return element();
    },
    querySelectorAll(selector) {
      return groups.get(selector) || [];
    },
  };
}

test("safe DOM localization updates text, attributes and ordered reveal segments", () => {
  assert.equal(typeof api.applyLocale, "function", "DOM localization is not implemented");

  const textNode = element({ i18n: "copy" });
  const ariaNode = element({ i18nAriaLabel: "aria" });
  const altNode = element({ i18nAlt: "alt" });
  const contentNode = element({ i18nContent: "description" });
  const segmentNode = element({ i18nSegments: "reveal" });
  const groups = new Map([
    ["[data-i18n]", [textNode]],
    ["[data-i18n-aria-label]", [ariaNode]],
    ["[data-i18n-alt]", [altNode]],
    ["[data-i18n-content]", [contentNode]],
    ["[data-i18n-segments]", [segmentNode]],
  ]);
  const root = documentFixture(groups);
  const catalogues = {
    en: {
      messages: { copy: "English", aria: "English label", alt: "English alt", description: "English description" },
      segments: { reveal: ["Some", "things"] },
    },
    de: {
      messages: { copy: "Deutsch", aria: "Deutsches Label", alt: "Deutscher Alternativtext", description: "Deutsche Beschreibung" },
      segments: { reveal: ["Manches", "zeigt", "sich"] },
    },
  };

  api.applyLocale(root, "de", catalogues);

  assert.equal(root.documentElement.lang, "de");
  assert.equal(textNode.textContent, "Deutsch");
  assert.equal(ariaNode.getAttribute("aria-label"), "Deutsches Label");
  assert.equal(altNode.getAttribute("alt"), "Deutscher Alternativtext");
  assert.equal(contentNode.getAttribute("content"), "Deutsche Beschreibung");
  assert.deepEqual(segmentNode.children.map((child) => child.textContent), ["Manches", "zeigt", "sich"]);
  assert.deepEqual(segmentNode.children.map((child) => child.className), ["word", "word", "word"]);
  assert.deepEqual(
    segmentNode.children.map((child) => child.style.getPropertyValue("--word-index")),
    ["0", "1", "2"],
  );
  assert.deepEqual(
    segmentNode.children.map((child) => child.style.getPropertyValue("--word-delay")),
    ["0.15s", "2.25s", "4.35s"],
  );
});

test("localization falls back per key without resetting page interaction state", () => {
  assert.equal(typeof api.applyLocale, "function", "DOM localization is not implemented");

  const textNode = element({ i18n: "copy" });
  textNode.setAttribute("aria-expanded", "true");
  const root = documentFixture(new Map([
    ["[data-i18n]", [textNode]],
    ["[data-i18n-aria-label]", []],
    ["[data-i18n-alt]", []],
    ["[data-i18n-content]", []],
    ["[data-i18n-segments]", []],
  ]));
  const catalogues = {
    en: { messages: { copy: "English fallback" }, segments: {} },
    fr: { messages: {}, segments: {} },
  };

  api.applyLocale(root, "fr", catalogues);

  assert.equal(textNode.textContent, "English fallback");
  assert.equal(textNode.getAttribute("aria-expanded"), "true");
  assert.equal(root.documentElement.dataset.phase, "3");
  assert.equal(root.documentElement.className, "is-still-prompt has-found-both");
});

test("the English source catalogue covers every StoryGate surface", () => {
  assert.ok(englishCatalogue, "English source catalogue is not implemented");
  assert.equal(englishCatalogue.meta.locale, "en");
  assert.equal(englishCatalogue.meta.status, "source");
  assert.equal(englishCatalogue.meta.public, true);
  assert.equal(englishCatalogue.messages["teaser.page.title"], "StoryGate — Coming soon");
  assert.equal(englishCatalogue.messages["coming.back"], "Back to StoryGate");
  assert.match(englishCatalogue.messages["bio.story.1.afterWhatever"], /Customer service had become part of the menu\./);
  assert.equal(englishCatalogue.messages["bio.layer.aiCrew.title"], "The digital crew");
  assert.deepEqual(englishCatalogue.segments["teaser.firstReveal"], [
    "Some",
    "things",
    "only",
    "reveal",
    "themselves",
    "when",
    "you",
    "stay",
  ]);
});
