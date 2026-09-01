import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

function createStyle() {
  const values = new Map();

  return {
    removeProperty(name) {
      values.delete(name);
    },
    setProperty(name, value) {
      values.set(name, value);
    },
    getPropertyValue(name) {
      return values.get(name) || "";
    },
  };
}

function appendTo(parent, child) {
  child.parentElement = parent;
}

test("a mobile tap opens its Layer card beside the trigger instead of after the paragraph", async () => {
  const listeners = new Map();
  const slot = { name: "inline-slot", append: (child) => appendTo(slot, child) };
  const trigger = {
    dataset: { layer: "demo" },
    isConnected: true,
    attributes: new Map(),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    removeAttribute(name) {
      this.attributes.delete(name);
    },
    closest() {
      return { querySelector: () => slot };
    },
    contains() {
      return false;
    },
    matches() {
      return false;
    },
    getBoundingClientRect() {
      return { left: 24, right: 92, top: 120, bottom: 148, width: 68, height: 28 };
    },
    focus() {},
  };
  const card = {
    dataset: { layerCard: "demo" },
    hidden: true,
    parentElement: null,
    style: createStyle(),
    addEventListener() {},
    setAttribute() {},
    contains() {
      return false;
    },
    matches() {
      return false;
    },
    getBoundingClientRect() {
      return { left: 0, right: 0, top: 0, bottom: 0, width: 300, height: 180 };
    },
  };
  const popoverHost = { name: "popover-host", append: (child) => appendTo(popoverHost, child) };
  const library = { name: "layer-library", append: (child) => appendTo(library, child) };
  const responsiveQuery = { matches: true, addEventListener() {} };
  const documentListeners = new Map();
  const document = {
    activeElement: null,
    querySelectorAll(selector) {
      if (selector === ".layer-trigger") return [trigger];
      if (selector === "[data-layer-card]") return [card];
      return [];
    },
    querySelector(selector) {
      if (selector === "#layer-popover-host") return popoverHost;
      if (selector === "#layer-library") return library;
      return null;
    },
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    },
  };
  const window = {
    innerWidth: 390,
    innerHeight: 844,
    matchMedia(query) {
      return query.includes("max-width")
        ? responsiveQuery
        : { matches: false, addEventListener() {} };
    },
    addEventListener() {},
    clearTimeout,
    setTimeout,
  };

  const script = await readFile(new URL("../docs/biography.js", import.meta.url), "utf8");
  vm.runInNewContext(script, { document, window, queueMicrotask });
  listeners.get("click")();

  assert.equal(card.parentElement?.name, "popover-host");
  assert.equal(trigger.attributes.get("aria-expanded"), "true");
  assert.equal(card.style.getPropertyValue("--layer-left"), "16px");
  assert.equal(card.style.getPropertyValue("--layer-top"), "160px");
});
