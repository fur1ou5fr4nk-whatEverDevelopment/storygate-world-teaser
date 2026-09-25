import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

function createMockElement(tag, attrs = {}) {
  const attributes = new Map(Object.entries(attrs));
  const listeners = new Map();
  const children = [];

  const el = {
    tagName: tag.toUpperCase(),
    dataset: {},
    classList: {
      _classes: new Set(),
      add(cls) { this._classes.add(cls); },
      remove(cls) { this._classes.delete(cls); },
      toggle(cls, force) {
        if (force === undefined) {
          if (this._classes.has(cls)) this._classes.delete(cls);
          else this._classes.add(cls);
        } else if (force) {
          this._classes.add(cls);
        } else {
          this._classes.delete(cls);
        }
      },
      contains(cls) { return this._classes.has(cls); },
    },
    hidden: false,
    disabled: false,
    tabIndex: 0,
    textContent: "",
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      const fns = listeners.get(event.type) || [];
      for (const fn of fns) fn(event);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name === "hidden") el.hidden = true;
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    removeAttribute(name) {
      attributes.delete(name);
      if (name === "hidden") el.hidden = false;
    },
    querySelector(selector) {
      return el.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const results = [];
      function match(node) {
        if (selector === ".story-block__intro" && node._isIntro) results.push(node);
        if (selector === ".story-block__details" && node._isDetails) results.push(node);
        if (selector === "[data-step-prev]" && node._isPrev) results.push(node);
        if (selector === "[data-step-next]" && node._isNext) results.push(node);
        if (selector === "[data-step-current]" && node._isCurrent) results.push(node);
        if (selector === "[data-step-total]" && node._isTotal) results.push(node);
        if (selector === ".about-stepper__dot" && node._isDot) results.push(node);
        if (selector === ".story-block--status" && node._isStatus) results.push(node);
        if (selector === ".biography > .story-block:not(.story-block--status)" && node._isBlock) results.push(node);
        for (const child of node._children || []) match(child);
      }
      match(el);
      return results;
    },
    focus() {},
    _children: children,
  };

  return el;
}

async function createAboutHarness() {
  const docListeners = new Map();
  const windowListeners = new Map();

  const storyBlocks = Array.from({ length: 7 }, (_, i) => {
    const block = createMockElement("section");
    block._isBlock = true;
    block.dataset.stepIndex = String(i);

    const intro = createMockElement("p");
    intro._isIntro = true;
    block._children.push(intro);

    const details = createMockElement("details");
    details._isDetails = true;
    details.open = false;
    block._children.push(details);

    return block;
  });

  const statusBlock = createMockElement("section");
  statusBlock._isStatus = true;
  statusBlock.hidden = true;

  const prevBtn = createMockElement("button");
  prevBtn._isPrev = true;

  const nextBtn = createMockElement("button");
  nextBtn._isNext = true;

  const currentEl = createMockElement("span");
  currentEl._isCurrent = true;

  const totalEl = createMockElement("span");
  totalEl._isTotal = true;

  const dots = Array.from({ length: 7 }, () => {
    const dot = createMockElement("button");
    dot._isDot = true;
    return dot;
  });

  const root = createMockElement("div");
  root.classList.add("about-page");
  root._children.push(...storyBlocks, statusBlock, prevBtn, nextBtn, currentEl, totalEl, ...dots);

  const dispatchedEvents = [];
  const documentMock = {
    querySelector(selector) {
      if (selector === ".about-page") return root;
      if (selector === ".about-stepper") return root;
      return null;
    },
    querySelectorAll(selector) {
      return root.querySelectorAll(selector);
    },
    addEventListener(type, fn, options) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      const fns = docListeners.get(event.type) || [];
      for (const fn of fns) fn(event);
    },
    activeElement: null,
  };

  const windowMock = {
    location: { hash: "", pathname: "/what-is-storygate.html", search: "" },
    history: {
      replaceState(_state, _title, url) {
        const hashIdx = url.indexOf("#");
        if (hashIdx >= 0) windowMock.location.hash = url.slice(hashIdx);
      },
    },
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
    getSelection() {
      return { toString: () => "" };
    },
  };

  const script = await readFile(new URL("../docs/about.js", import.meta.url), "utf8");
  const context = {
    document: documentMock,
    window: windowMock,
    PointerEvent: class { constructor(type) { this.type = type; } },
    KeyboardEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
    history: windowMock.history,
  };
  vm.createContext(context);
  vm.runInContext(script, context);

  return {
    storyBlocks,
    statusBlock,
    prevBtn,
    nextBtn,
    currentEl,
    totalEl,
    dots,
    docListeners,
    windowListeners,
    windowMock,
    dispatchedEvents,
  };
}

test("about stepped reading starts at step 0 and updates on next/prev", async () => {
  const harness = await createAboutHarness();

  // Initial state: Step 0
  assert.equal(harness.currentEl.textContent, "1");
  assert.equal(harness.totalEl.textContent, "7");
  assert.equal(harness.storyBlocks[0].dataset.active, "true");
  assert.equal(harness.storyBlocks[1].dataset.active, "false");
  assert.ok(harness.storyBlocks[1].hidden);
  assert.equal(harness.statusBlock.dataset.active, "false");
  assert.equal(harness.prevBtn.disabled, true);
  assert.equal(harness.nextBtn.disabled, false);
  assert.equal(harness.dots[0].classList.contains("is-active"), true);

  // Click Next -> Step 1
  harness.nextBtn.dispatchEvent({ type: "click" });
  assert.equal(harness.currentEl.textContent, "2");
  assert.equal(harness.storyBlocks[0].dataset.active, "false");
  assert.equal(harness.storyBlocks[1].dataset.active, "true");
  assert.equal(harness.prevBtn.disabled, false);
  assert.equal(harness.nextBtn.disabled, false);
  assert.equal(harness.dots[1].classList.contains("is-active"), true);

  // Click Dot 6 (Final step) -> Step 6
  harness.dots[6].dispatchEvent({ type: "click" });
  assert.equal(harness.currentEl.textContent, "7");
  assert.equal(harness.storyBlocks[6].dataset.active, "true");
  assert.equal(harness.statusBlock.dataset.active, "true");
  assert.equal(harness.statusBlock.hidden, false);
  assert.equal(harness.nextBtn.disabled, true);
  assert.equal(harness.prevBtn.disabled, false);

  // Click Prev -> Step 5
  harness.prevBtn.dispatchEvent({ type: "click" });
  assert.equal(harness.currentEl.textContent, "6");
  assert.equal(harness.storyBlocks[5].dataset.active, "true");
  assert.equal(harness.statusBlock.dataset.active, "false");
  assert.equal(harness.statusBlock.hidden, true);
  assert.equal(harness.nextBtn.disabled, false);
});

test("about stepped reading responds to keyboard arrow keys", async () => {
  const harness = await createAboutHarness();
  assert.equal(harness.currentEl.textContent, "1");

  const keydownFns = harness.docListeners.get("keydown") || [];
  assert.ok(keydownFns.length > 0);

  // ArrowRight advances step
  let prevented = false;
  keydownFns[0]({ key: "ArrowRight", defaultPrevented: false, preventDefault() { prevented = true; } });
  assert.equal(harness.currentEl.textContent, "2");
  assert.equal(prevented, true);

  // ArrowLeft goes back
  prevented = false;
  keydownFns[0]({ key: "ArrowLeft", defaultPrevented: false, preventDefault() { prevented = true; } });
  assert.equal(harness.currentEl.textContent, "1");
  assert.equal(prevented, true);
});

test("about stepped reading reveals panel on beforematch search event", async () => {
  const harness = await createAboutHarness();
  assert.equal(harness.currentEl.textContent, "1");

  // Simulate find in page on paragraph 4 (index 3)
  harness.storyBlocks[3].dispatchEvent({ type: "beforematch" });
  assert.equal(harness.currentEl.textContent, "4");
  assert.equal(harness.storyBlocks[3].dataset.active, "true");
  assert.equal(harness.storyBlocks[0].dataset.active, "false");
});

test("skipping forward via Next or swipe left does not dispatch pointerdown or trigger gate redirect", async () => {
  const harness = await createAboutHarness();

  // Clear initial load dispatched events
  harness.dispatchedEvents.length = 0;

  // Click Next
  harness.nextBtn.dispatchEvent({ type: "click" });
  assert.equal(harness.currentEl.textContent, "2");

  // Verify NO pointerdown event was dispatched
  assert.equal(harness.dispatchedEvents.some((e) => e.type === "pointerdown"), false);
  // Verify Escape key event was dispatched to close layers safely
  assert.equal(harness.dispatchedEvents.some((e) => e.type === "keydown" && e.key === "Escape"), true);

  // Simulate swipe left (skip forward)
  const pointerdownFns = harness.docListeners.get("pointerdown") || [];
  const pointerupFns = harness.docListeners.get("pointerup") || [];
  assert.ok(pointerdownFns.length > 0);
  assert.ok(pointerupFns.length > 0);

  pointerdownFns[0]({ pointerType: "touch", button: 0, clientX: 200, clientY: 100 });

  let stoppedImmediate = false;
  pointerupFns[0]({
    clientX: 100,
    clientY: 100,
    stopImmediatePropagation() { stoppedImmediate = true; },
  });

  // Verify swipe left advanced to step 3 and called stopImmediatePropagation
  assert.equal(harness.currentEl.textContent, "3");
  assert.equal(stoppedImmediate, true);
});
