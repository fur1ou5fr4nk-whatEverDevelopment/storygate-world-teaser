import assert from "node:assert/strict";
import { test } from "node:test";

let api = {};

try {
  api = await import("../docs/i18n.mjs");
} catch {
  api = {};
}

const {
  CATALOGUES,
  SUPPORTED_LOCALES,
  getMessage,
  getSelectableLocales,
  loadPreviewCatalogues,
  normalizeLocale,
  resolveLocale,
  validateCatalogs,
} = api;

function callResolve(options) {
  assert.equal(typeof resolveLocale, "function", "locale resolution is not implemented");
  return resolveLocale(options);
}

test("the configured locale registry has one canonical order", () => {
  assert.deepEqual(SUPPORTED_LOCALES, [
    "en",
    "de",
    "th",
    "fr",
    "es",
    "ru",
    "zh-Hans",
    "zh-Hant",
  ]);
});

test("every supported production locale ships as a complete public catalogue", () => {
  assert.deepEqual(Object.keys(CATALOGUES), SUPPORTED_LOCALES);
  assert.deepEqual(validateCatalogs(CATALOGUES), []);
  for (const locale of SUPPORTED_LOCALES) {
    assert.equal(CATALOGUES[locale].meta.public, true, locale);
  }
});

test("explicit URL language wins over saved and browser preferences", () => {
  assert.equal(typeof resolveLocale, "function", "locale resolution is not implemented");

  assert.equal(
    callResolve({
      search: "?lang=th",
      storedLocale: "de",
      browserLanguages: ["fr"],
    }),
    "th",
  );
});

test("saved language wins when the URL has no supported language", () => {
  assert.equal(
    callResolve({
      search: "?lang=xx",
      storedLocale: "es",
      browserLanguages: ["de"],
    }),
    "es",
  );
});

test("browser preferences are matched in order before English fallback", () => {
  assert.equal(
    callResolve({ search: "", storedLocale: "", browserLanguages: ["ja", "fr-CA", "de"] }),
    "fr",
  );
  assert.equal(
    callResolve({ search: "", storedLocale: "", browserLanguages: ["ja", "ko"] }),
    "en",
  );
});

test("Chinese browser locales resolve to the correct writing system", () => {
  const cases = [
    ["zh-TW", "zh-Hant"],
    ["zh-HK", "zh-Hant"],
    ["zh-MO", "zh-Hant"],
    ["zh-CN", "zh-Hans"],
    ["zh-SG", "zh-Hans"],
    ["zh", "zh-Hans"],
  ];

  for (const [browserLocale, expected] of cases) {
    assert.equal(
      callResolve({ search: "", storedLocale: "", browserLanguages: [browserLocale] }),
      expected,
      browserLocale,
    );
  }
});

test("normalization rejects unsupported values and accepts case-insensitive supported tags", () => {
  assert.equal(typeof normalizeLocale, "function", "locale normalization is not implemented");
  assert.equal(normalizeLocale("DE-de"), "de");
  assert.equal(normalizeLocale("ZH-hant"), "zh-Hant");
  assert.equal(normalizeLocale("zh-HK"), "zh-Hant");
  assert.equal(normalizeLocale(""), null);
  assert.equal(normalizeLocale("xx"), null);
});

test("local previews and production expose every public locale", () => {
  assert.equal(typeof getSelectableLocales, "function", "selectable locale filtering is not implemented");
  const catalogues = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [
    locale,
    catalogue(locale, { greeting: locale }, { reveal: [locale] }, { public: true }),
  ]));

  assert.deepEqual(
    getSelectableLocales({ protocol: "http:", hostname: "127.0.0.1" }, catalogues),
    SUPPORTED_LOCALES,
  );
  assert.deepEqual(
    getSelectableLocales({ protocol: "file:", hostname: "" }, catalogues),
    SUPPORTED_LOCALES,
  );
  assert.deepEqual(
    getSelectableLocales({ protocol: "https:", hostname: "storygate.world" }, catalogues),
    SUPPORTED_LOCALES,
  );
});

test("local pages use the same complete catalogue set as production", async () => {
  assert.equal(typeof loadPreviewCatalogues, "function", "preview catalogue loading is not implemented");
  let previewImportAttempted = false;
  const defaultLocalCatalogues = await loadPreviewCatalogues(
    { protocol: "http:", hostname: "127.0.0.1", search: "" },
    async () => {
      previewImportAttempted = true;
      throw new Error("private catalogues require explicit preview mode");
    },
  );

  assert.equal(previewImportAttempted, false);
  assert.deepEqual(Object.keys(defaultLocalCatalogues), SUPPORTED_LOCALES);
});

test("legacy preview mode uses the already complete public catalogue set", async () => {
  assert.equal(typeof loadPreviewCatalogues, "function", "preview catalogue loading is not implemented");
  const imported = [];
  const previewCatalogues = await loadPreviewCatalogues(
    { protocol: "file:", hostname: "", search: "?previewLocales=all" },
    async (specifier) => {
      imported.push(specifier);
      const locale = specifier.split("/").at(-1).replace(".mjs", "");
      return { default: catalogue(locale, { greeting: locale }) };
    },
  );

  assert.equal(imported.length, 0);
  assert.deepEqual(Object.keys(previewCatalogues), SUPPORTED_LOCALES);
});

test("production uses the complete public catalogue set even when preview mode is requested", async () => {
  assert.equal(typeof loadPreviewCatalogues, "function", "preview catalogue loading is not implemented");
  let productionImportAttempted = false;
  const productionCatalogues = await loadPreviewCatalogues(
    { protocol: "https:", hostname: "storygate.world", search: "?previewLocales=all" },
    async () => {
      productionImportAttempted = true;
      throw new Error("production must not load preview catalogues");
    },
  );

  assert.equal(productionImportAttempted, false);
  assert.deepEqual(Object.keys(productionCatalogues), SUPPORTED_LOCALES);
});

function catalogue(locale, messages, segments = { reveal: ["One", "two"] }, overrides = {}) {
  return {
    meta: {
      locale,
      sourceVersion: "source-1",
      status: locale === "en" ? "source" : "machine-draft",
      generatedBy: locale === "en" ? "frank" : "translator",
      qaReviewedBy: null,
      nativeReviewed: locale === "en",
      public: locale === "en",
      ...overrides,
    },
    messages,
    segments,
  };
}

test("a missing target message falls back to the English source per key", () => {
  assert.equal(typeof getMessage, "function", "message fallback is not implemented");
  const catalogues = {
    en: catalogue("en", { greeting: "The gate opens" }),
    de: catalogue("de", {}),
  };

  assert.equal(getMessage("de", "greeting", catalogues), "The gate opens");
  assert.equal(getMessage("xx", "greeting", catalogues), "The gate opens");
  assert.equal(getMessage("de", "unknown", catalogues), "");
});

test("catalogue validation accepts complete text-only catalogues", () => {
  assert.equal(typeof validateCatalogs, "function", "catalogue validation is not implemented");
  const catalogues = {
    en: catalogue("en", { greeting: "The gate opens", button: "Explore" }),
    de: catalogue("de", { greeting: "Das Tor öffnet sich", button: "Entdecken" }),
  };

  assert.deepEqual(validateCatalogs(catalogues), []);
});

test("catalogue validation identifies structural and content defects", () => {
  assert.equal(typeof validateCatalogs, "function", "catalogue validation is not implemented");
  const catalogues = {
    en: catalogue("en", { greeting: "The gate opens", button: "Explore" }),
    de: catalogue(
      "fr",
      {
        greeting: "<strong>Das Tor</strong>",
        extra: "Mehr",
        button: 7,
      },
      { reveal: ["Eins", ""] },
      { sourceVersion: "source-0" },
    ),
  };

  const issueCodes = validateCatalogs(catalogues).map(({ code }) => code);

  assert.deepEqual(issueCodes, [
    "locale-mismatch",
    "source-version-mismatch",
    "invalid-message",
    "markup-message",
    "extra-message",
    "invalid-segment",
  ]);
});

test("catalogue validation reports missing message and reveal keys", () => {
  assert.equal(typeof validateCatalogs, "function", "catalogue validation is not implemented");
  const catalogues = {
    en: catalogue("en", { greeting: "The gate opens", button: "Explore" }, {
      reveal: ["One"],
      second: ["Two"],
    }),
    de: catalogue("de", { greeting: "Das Tor öffnet sich" }, { reveal: ["Eins"] }),
  };

  assert.deepEqual(
    validateCatalogs(catalogues).map(({ code, key }) => [code, key]),
    [
      ["missing-message", "button"],
      ["missing-segments", "second"],
    ],
  );
});
