import assert from "node:assert/strict";
import { test } from "node:test";

let initializeLocalization;

try {
  ({ initializeLocalization } = await import("../docs/i18n.mjs"));
} catch {
  initializeLocalization = undefined;
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.dataset = {};
    this.hidden = false;
    this.textContent = "";
    this.className = "";
    this.focusCount = 0;
  }

  append(...children) {
    this.children.push(...children);
    for (const child of children) child.parentElement = this;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((entry) => entry !== listener));
  }

  dispatch(type, overrides = {}) {
    const event = {
      currentTarget: this,
      target: this,
      key: "",
      preventDefault() {},
      stopPropagation() {},
      ...overrides,
    };
    for (const listener of this.listeners.get(type) || []) listener(event);
  }

  contains(target) {
    return target === this || this.children.some((child) => child.contains?.(target));
  }

  focus() {
    this.focusCount += 1;
  }
}

function createDocument() {
  const listeners = new Map();
  const documentElement = new FakeElement("html");
  documentElement.lang = "en";
  const body = new FakeElement("body");

  return {
    documentElement,
    body,
    dispatchedEvents: [],
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    querySelectorAll() {
      return [];
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) || []).filter((entry) => entry !== listener));
    },
    dispatch(type, overrides = {}) {
      const event = {
        key: "",
        target: body,
        preventDefault() {},
        ...overrides,
      };
      for (const listener of listeners.get(type) || []) listener(event);
    },
    dispatchEvent(event) {
      this.dispatchedEvents.push(event);
      return true;
    },
  };
}

function createWindow({ protocol = "http:", hostname = "127.0.0.1", search = "" } = {}) {
  const replacements = [];
  return {
    location: {
      protocol,
      hostname,
      search,
      href: `${protocol === "file:" ? "file:///tmp/index.html" : `${protocol}//${hostname}/index.html`}${search}`,
    },
    navigator: { languages: ["en"] },
    history: {
      replaceState(_state, _title, url) {
        replacements.push(String(url));
      },
    },
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    replacements,
  };
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    value(key) {
      return values.get(key);
    },
  };
}

function minimalCatalogues() {
  const labels = {
    "language.buttonLabel": "Choose language",
    "language.menuLabel": "Available languages",
  };
  return Object.fromEntries(
    ["en", "de", "th", "fr", "es", "ru", "zh-Hans", "zh-Hant"].map((locale) => [
      locale,
      {
        meta: { public: true },
        messages: { ...labels },
        segments: {},
      },
    ]),
  );
}

function initialize(options) {
  assert.equal(typeof initializeLocalization, "function", "language controller is not implemented");
  return initializeLocalization(options);
}

test("local preview mounts all eight discreet language choices", () => {
  const document = createDocument();
  const window = createWindow();

  const controller = initialize({
    document,
    window,
    storage: createStorage(),
    catalogMap: minimalCatalogues(),
  });

  assert.equal(controller.locale, "en");
  assert.equal(document.body.children.length, 1);
  const picker = document.body.children[0];
  const [trigger, menu] = picker.children;
  assert.equal(picker.className, "language-picker");
  assert.equal(trigger.className, "language-picker__trigger");
  assert.equal(trigger.textContent, "EN");
  assert.equal(trigger.getAttribute("aria-label"), "Choose language");
  assert.equal(menu.getAttribute("aria-label"), "Available languages");
  assert.deepEqual(menu.children.map((option) => option.textContent), [
    "EN",
    "DE",
    "ไทย",
    "FR",
    "ES",
    "RU",
    "简",
    "繁",
  ]);
});

test("changing language persists it and updates the URL without reloading", () => {
  const document = createDocument();
  const window = createWindow({ search: "?view=story" });
  const storage = createStorage();
  const controller = initialize({ document, window, storage, catalogMap: minimalCatalogues() });

  assert.equal(controller.setLocale("de"), "de");
  assert.equal(document.documentElement.lang, "de");
  assert.equal(storage.value("storygate.locale"), "de");
  assert.match(window.replacements.at(-1), /[?&]lang=de(?:&|$)/);
  assert.match(window.replacements.at(-1), /[?&]view=story(?:&|$)/);
  assert.equal(document.dispatchedEvents.at(-1).type, "storygate:localechange");
  assert.deepEqual(document.dispatchedEvents.at(-1).detail, { locale: "de" });
});

test("localization still initializes when browser storage access is blocked", () => {
  const document = createDocument();
  const window = createWindow();
  window.navigator.languages = ["fr"];
  Object.defineProperty(window, "localStorage", {
    get() {
      throw new Error("storage blocked");
    },
  });

  const controller = initialize({ document, window, catalogMap: minimalCatalogues() });

  assert.equal(controller.locale, "fr");
  assert.equal(document.documentElement.lang, "fr");
  assert.equal(document.body.children.length, 1);
});

test("Escape closes the language menu and returns focus to its trigger", () => {
  const document = createDocument();
  const controller = initialize({
    document,
    window: createWindow(),
    storage: createStorage(),
    catalogMap: minimalCatalogues(),
  });
  const [trigger, menu] = controller.element.children;

  trigger.dispatch("click");
  assert.equal(menu.hidden, false);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");

  document.dispatch("keydown", { key: "Escape" });
  assert.equal(menu.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(trigger.focusCount, 1);
});

test("production detects the browser language on first visit and exposes every language", () => {
  const document = createDocument();
  const window = createWindow({ protocol: "https:", hostname: "storygate.world" });
  window.navigator.languages = ["de-DE", "en"];
  const storage = createStorage();
  const controller = initialize({
    document,
    window,
    storage,
    catalogMap: minimalCatalogues(),
  });

  assert.equal(controller.locale, "de");
  assert.equal(document.documentElement.lang, "de");
  assert.equal(storage.value("storygate.locale"), "de");
  assert.equal(document.body.children.length, 1);
  assert.deepEqual(
    controller.element.children[1].children.map((option) => option.textContent),
    ["EN", "DE", "ไทย", "FR", "ES", "RU", "简", "繁"],
  );
});
