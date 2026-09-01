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

test("third tap holds the Still tapping prompt and fourth tap starts the final reveal", () => {
  assert.equal(typeof getNextRevealStep, "function", "reveal flow is not implemented");

  let phase = 0;
  const actions = [];

  for (let tap = 0; tap < 4; tap += 1) {
    const step = getNextRevealStep(phase);
    phase = step.phase;
    actions.push(step.action);
  }

  assert.deepEqual(actions, ["focus", "message", "still", "final"]);
  assert.equal(phase, 4);
});

test("reduced-motion users get a readable final-message interval before discoveries replace it", () => {
  assert.equal(typeof getRevealTimings, "function", "reveal timing policy is not implemented");

  const standard = getRevealTimings({ reducedMotion: false });
  const reduced = getRevealTimings({ reducedMotion: true });

  assert.ok(reduced.discoveryDelay >= 2500, "reduced-motion final copy disappears too quickly");
  assert.ok(reduced.discoveryDelay < standard.discoveryDelay);
  assert.ok(reduced.focusDuration < standard.focusDuration);
});
