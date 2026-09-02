import assert from "node:assert/strict";
import test from "node:test";
import * as proximity from "../docs/simple-demo/demo-proximity.mjs";

test("desktop approach derives progress from the remaining distance", () => {
  const tracker = proximity.createProximityTracker?.({
    mode: "desktop",
    start: { x: 900, y: 500 },
    target: { x: 300, y: 500 },
  });

  assert.deepEqual(tracker?.update({ x: 600, y: 500 }), {
    phase: "approach",
    progress: 0.5,
  });
});

test("mobile approach derives progress from deliberate upward travel", () => {
  const tracker = proximity.createProximityTracker?.({
    mode: "mobile",
    start: { x: 120, y: 620 },
    travel: 180,
  });

  assert.deepEqual(tracker?.update({ x: 120, y: 530 }), {
    phase: "approach",
    progress: 0.5,
  });
});

test("detection latches after the proximity threshold is crossed", () => {
  const tracker = proximity.createProximityTracker?.({
    mode: "desktop",
    start: { x: 900, y: 500 },
    target: { x: 300, y: 500 },
    threshold: 0.82,
  });

  assert.equal(tracker?.update({ x: 400, y: 500 }).phase, "detected");
  assert.deepEqual(tracker?.update({ x: 900, y: 500 }), {
    phase: "detected",
    progress: 1,
  });
});
