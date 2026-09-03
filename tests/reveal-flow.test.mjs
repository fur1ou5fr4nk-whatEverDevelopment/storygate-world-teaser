import assert from "node:assert/strict";
import { test } from "node:test";

let getNextRevealStep;
let getRevealTimings;

try {
  ({ getNextRevealStep, getRevealTimings } = await import("../docs/reveal-flow.mjs"));
} catch {
  getNextRevealStep = undefined;
  getRevealTimings = undefined;
}

test("all five reveal taps emit the same pulse while preserving the reveal sequence", () => {
  assert.equal(typeof getNextRevealStep, "function", "reveal flow is not implemented");

  let phase = 0;
  const actions = [];

  const ripples = [];

  for (let tap = 0; tap < 5; tap += 1) {
    const step = getNextRevealStep(phase);
    phase = step.phase;
    actions.push(step.action);
    ripples.push(step.ripple);
  }

  assert.deepEqual(actions, ["message", "focus-partial", "still", "focus-full", "final"]);
  assert.deepEqual(ripples, [true, true, true, true, true]);
  assert.equal(phase, 5);
  assert.deepEqual(getNextRevealStep(phase), { phase: 5, action: "done", ripple: false });
});

test("reduced-motion users get a readable final-message interval before discoveries replace it", () => {
  assert.equal(typeof getRevealTimings, "function", "reveal timing policy is not implemented");

  const standard = getRevealTimings({ reducedMotion: false });
  const reduced = getRevealTimings({ reducedMotion: true });

  assert.ok(reduced.discoveryDelay >= 2500, "reduced-motion final copy disappears too quickly");
  assert.ok(reduced.discoveryDelay < standard.discoveryDelay);
  assert.ok(reduced.focusDuration < standard.focusDuration);
});
