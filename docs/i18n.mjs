import englishCatalogue from "./locales/en.mjs";

export const SUPPORTED_LOCALES = Object.freeze([
  "en",
  "de",
  "th",
  "fr",
  "es",
  "ru",
  "zh-Hans",
  "zh-Hant",
]);

const PREVIEW_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PREVIEW_CATALOGUE_IMPORTS = Object.freeze({
  de: "./locales/de.mjs",
  th: "./locales/th.mjs",
  fr: "./locales/fr.mjs",
  es: "./locales/es.mjs",
  ru: "./locales/ru.mjs",
  "zh-Hans": "./locales/zh-Hans.mjs",
  "zh-Hant": "./locales/zh-Hant.mjs",
});

export const LOCALE_LABELS = Object.freeze({
  en: "EN",
  de: "DE",
  th: "ไทย",
  fr: "FR",
  es: "ES",
  ru: "RU",
  "zh-Hans": "简",
  "zh-Hant": "繁",
});

export const CATALOGUES = Object.freeze({
  en: englishCatalogue,
});

function isPreviewLocation({ protocol = "", hostname = "" } = {}) {
  return protocol === "file:" || PREVIEW_HOSTS.has(hostname.toLowerCase());
}

function requestsPrivateLocalePreview({ search = "" } = {}) {
  try {
    return new URLSearchParams(search).get("previewLocales") === "all";
  } catch {
    return false;
  }
}

export async function loadPreviewCatalogues(
  locationLike = {},
  importer = (specifier) => import(specifier),
) {
  if (!isPreviewLocation(locationLike) || !requestsPrivateLocalePreview(locationLike)) {
    return CATALOGUES;
  }

  const catalogues = { ...CATALOGUES };
  await Promise.all(Object.entries(PREVIEW_CATALOGUE_IMPORTS).map(async ([locale, specifier]) => {
    try {
      const module = await importer(specifier);
      if (module?.default?.meta?.locale === locale) catalogues[locale] = module.default;
    } catch {
      // Preview catalogues are intentionally absent from the public release.
    }
  }));

  return Object.freeze(catalogues);
}

export function normalizeLocale(value) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replaceAll("_", "-").toLowerCase();
  if (!normalized) return null;

  if (
    normalized === "zh-hant"
    || normalized.startsWith("zh-hant-")
    || /^(zh)-(tw|hk|mo)(-|$)/.test(normalized)
  ) {
    return "zh-Hant";
  }

  if (
    normalized === "zh"
    || normalized === "zh-hans"
    || normalized.startsWith("zh-hans-")
    || /^(zh)-(cn|sg)(-|$)/.test(normalized)
  ) {
    return "zh-Hans";
  }

  const base = normalized.split("-")[0];
  return SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === base) || null;
}

export function getSelectableLocales(
  { protocol = "", hostname = "" } = {},
  catalogMap = CATALOGUES,
) {
  if (isPreviewLocation({ protocol, hostname })) {
    return SUPPORTED_LOCALES.filter((locale) => Boolean(catalogMap[locale]));
  }

  return SUPPORTED_LOCALES.filter((locale) => catalogMap[locale]?.meta?.public === true);
}

export function resolveLocale({
  search = "",
  storedLocale = "",
  browserLanguages = [],
  allowedLocales = SUPPORTED_LOCALES,
} = {}) {
  const allowed = new Set(allowedLocales);
  let explicitLocale = null;

  try {
    explicitLocale = normalizeLocale(new URLSearchParams(search).get("lang") || "");
  } catch {
    explicitLocale = null;
  }

  const candidates = [
    explicitLocale,
    normalizeLocale(storedLocale),
    ...browserLanguages.map(normalizeLocale),
    "en",
  ];

  return candidates.find((locale) => locale && allowed.has(locale)) || "en";
}

export function getMessage(locale, key, catalogMap = {}) {
  const localized = catalogMap[locale]?.messages?.[key];
  if (typeof localized === "string" && localized.length > 0) return localized;

  const fallback = catalogMap.en?.messages?.[key];
  return typeof fallback === "string" ? fallback : "";
}

function containsMarkup(value) {
  return /<\/?[a-z][^>]*>/i.test(value);
}

export function validateCatalogs(catalogMap) {
  const source = catalogMap?.en;
  if (!source) return [{ code: "missing-source", locale: "en" }];

  const issues = [];
  const sourceMessageKeys = Object.keys(source.messages || {});
  const sourceSegmentKeys = Object.keys(source.segments || {});

  for (const [locale, catalogue] of Object.entries(catalogMap)) {
    const messages = catalogue?.messages || {};
    const segments = catalogue?.segments || {};

    if (catalogue?.meta?.locale !== locale) {
      issues.push({ code: "locale-mismatch", locale });
    }

    if (catalogue?.meta?.sourceVersion !== source.meta?.sourceVersion) {
      issues.push({ code: "source-version-mismatch", locale });
    }

    for (const key of sourceMessageKeys) {
      if (!(key in messages)) {
        issues.push({ code: "missing-message", locale, key });
      } else if (typeof messages[key] !== "string" || messages[key].trim() === "") {
        issues.push({ code: "invalid-message", locale, key });
      }
    }

    for (const [key, value] of Object.entries(messages)) {
      if (typeof value === "string" && containsMarkup(value)) {
        issues.push({ code: "markup-message", locale, key });
      }
    }

    for (const key of Object.keys(messages)) {
      if (!sourceMessageKeys.includes(key)) {
        issues.push({ code: "extra-message", locale, key });
      }
    }

    for (const key of sourceSegmentKeys) {
      if (!(key in segments)) {
        issues.push({ code: "missing-segments", locale, key });
        continue;
      }

      const value = segments[key];
      if (
        !Array.isArray(value)
        || value.length === 0
        || value.some((segment) => typeof segment !== "string" || segment.trim() === "" || containsMarkup(segment))
      ) {
        issues.push({ code: "invalid-segment", locale, key });
      }
    }

    for (const key of Object.keys(segments)) {
      if (!sourceSegmentKeys.includes(key)) {
        issues.push({ code: "extra-segments", locale, key });
      }
    }
  }

  return issues;
}

function getSegments(locale, key, catalogMap) {
  const localized = catalogMap[locale]?.segments?.[key];
  if (Array.isArray(localized) && localized.length > 0) return localized;

  const fallback = catalogMap.en?.segments?.[key];
  return Array.isArray(fallback) ? fallback : [];
}

function getRevealDelay(index, segmentCount) {
  const firstStart = 0.15;
  const lastStart = 4.35;
  if (segmentCount <= 1) return `${firstStart}s`;

  const delay = firstStart + index * ((lastStart - firstStart) / (segmentCount - 1));
  return `${Number(delay.toFixed(3))}s`;
}

export function applyLocale(root, locale, catalogMap = CATALOGUES) {
  const documentElement = root.documentElement || root.ownerDocument?.documentElement;
  const documentLike = typeof root.createElement === "function" ? root : root.ownerDocument;

  if (documentElement) documentElement.lang = locale;

  const textBindings = [
    ["[data-i18n]", "i18n", null],
    ["[data-i18n-aria-label]", "i18nAriaLabel", "aria-label"],
    ["[data-i18n-alt]", "i18nAlt", "alt"],
    ["[data-i18n-content]", "i18nContent", "content"],
  ];

  for (const [selector, datasetKey, attribute] of textBindings) {
    for (const node of root.querySelectorAll(selector)) {
      const value = getMessage(locale, node.dataset[datasetKey], catalogMap);
      if (!value) continue;

      if (attribute) node.setAttribute(attribute, value);
      else node.textContent = value;
    }
  }

  for (const node of root.querySelectorAll("[data-i18n-segments]")) {
    const segments = getSegments(locale, node.dataset.i18nSegments, catalogMap);
    const children = segments.map((segment, index) => {
      const span = documentLike.createElement("span");
      span.className = "word";
      span.textContent = segment;
      span.style.setProperty("--word-index", String(index));
      span.style.setProperty("--word-delay", getRevealDelay(index, segments.length));
      return span;
    });
    node.replaceChildren(...children);
  }

  return locale;
}

function readStoredLocale(storage) {
  try {
    return storage?.getItem("storygate.locale") || "";
  } catch {
    return "";
  }
}

function getWindowStorage(windowLike) {
  try {
    return windowLike?.localStorage || null;
  } catch {
    return null;
  }
}

function writeStoredLocale(storage, locale) {
  try {
    storage?.setItem("storygate.locale", locale);
  } catch {
    // Storage is an enhancement. Language switching still works without it.
  }
}

function replaceLocaleInUrl(windowLike, locale) {
  try {
    const url = new URL(windowLike.location.href);
    url.searchParams.set("lang", locale);
    windowLike.history.replaceState(null, "", url.href);
  } catch {
    // A restricted history API must not block an in-place language change.
  }
}

function createLocaleEvent(windowLike, locale) {
  if (typeof windowLike.CustomEvent === "function") {
    return new windowLike.CustomEvent("storygate:localechange", { detail: { locale } });
  }

  return { type: "storygate:localechange", detail: { locale } };
}

export function initializeLocalization({
  document: documentLike,
  window: windowLike,
  storage,
  catalogMap = CATALOGUES,
} = {}) {
  const availableStorage = storage === undefined ? getWindowStorage(windowLike) : storage;
  const selectableLocales = getSelectableLocales(windowLike.location, catalogMap);
  let currentLocale = resolveLocale({
    search: windowLike.location.search,
    storedLocale: readStoredLocale(availableStorage),
    browserLanguages: windowLike.navigator?.languages || [],
    allowedLocales: selectableLocales,
  });

  applyLocale(documentLike, currentLocale, catalogMap);

  if (selectableLocales.length <= 1) {
    return {
      get locale() {
        return currentLocale;
      },
      element: null,
      setLocale() {
        return currentLocale;
      },
      destroy() {},
    };
  }

  const container = documentLike.createElement("div");
  const trigger = documentLike.createElement("button");
  const menu = documentLike.createElement("div");
  const options = [];

  container.className = "language-picker";
  trigger.className = "language-picker__trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  menu.className = "language-picker__menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  for (const locale of selectableLocales) {
    const option = documentLike.createElement("button");
    option.className = "language-picker__option";
    option.type = "button";
    option.dataset.locale = locale;
    option.textContent = LOCALE_LABELS[locale];
    option.setAttribute("role", "menuitemradio");
    menu.append(option);
    options.push(option);
  }

  container.append(trigger, menu);
  documentLike.body.append(container);

  function updatePickerText() {
    trigger.textContent = LOCALE_LABELS[currentLocale];
    trigger.setAttribute("aria-label", getMessage(currentLocale, "language.buttonLabel", catalogMap));
    menu.setAttribute("aria-label", getMessage(currentLocale, "language.menuLabel", catalogMap));

    for (const option of options) {
      option.setAttribute("aria-checked", String(option.dataset.locale === currentLocale));
    }
  }

  function openMenu() {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  function closeMenu({ restoreFocus = false } = {}) {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  }

  function setLocale(nextLocale) {
    const normalized = normalizeLocale(nextLocale);
    if (!normalized || !selectableLocales.includes(normalized)) return currentLocale;

    currentLocale = normalized;
    applyLocale(documentLike, currentLocale, catalogMap);
    updatePickerText();
    writeStoredLocale(availableStorage, currentLocale);
    replaceLocaleInUrl(windowLike, currentLocale);
    documentLike.dispatchEvent(createLocaleEvent(windowLike, currentLocale));
    return currentLocale;
  }

  function handleTriggerClick() {
    if (menu.hidden) openMenu();
    else closeMenu();
  }

  function handleTriggerKeydown(event) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openMenu();
    const activeIndex = options.findIndex((option) => option.dataset.locale === currentLocale);
    options[Math.max(0, activeIndex)].focus();
  }

  function handleOptionClick(event) {
    setLocale(event.currentTarget.dataset.locale);
    closeMenu({ restoreFocus: true });
  }

  function handleOptionKeydown(event) {
    const currentIndex = options.indexOf(event.currentTarget);
    let nextIndex = null;

    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    options[nextIndex].focus();
  }

  function handleDocumentPointer(event) {
    if (!container.contains(event.target)) closeMenu();
  }

  function handleDocumentKeydown(event) {
    if (event.key !== "Escape" || menu.hidden) return;
    event.preventDefault();
    closeMenu({ restoreFocus: true });
  }

  trigger.addEventListener("click", handleTriggerClick);
  trigger.addEventListener("keydown", handleTriggerKeydown);
  for (const option of options) {
    option.addEventListener("click", handleOptionClick);
    option.addEventListener("keydown", handleOptionKeydown);
  }
  documentLike.addEventListener("pointerdown", handleDocumentPointer);
  documentLike.addEventListener("keydown", handleDocumentKeydown);
  updatePickerText();

  return {
    get locale() {
      return currentLocale;
    },
    element: container,
    setLocale,
    destroy() {
      trigger.removeEventListener("click", handleTriggerClick);
      trigger.removeEventListener("keydown", handleTriggerKeydown);
      for (const option of options) {
        option.removeEventListener("click", handleOptionClick);
        option.removeEventListener("keydown", handleOptionKeydown);
      }
      documentLike.removeEventListener("pointerdown", handleDocumentPointer);
      documentLike.removeEventListener("keydown", handleDocumentKeydown);
      container.remove();
    },
  };
}
