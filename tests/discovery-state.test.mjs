import assert from "node:assert/strict";
import { test } from "node:test";

let createDiscoveryTracker;

try {
  ({ createDiscoveryTracker } = await import("../docs/discovery-state.mjs"));
} catch {
  createDiscoveryTracker = undefined;
}

test("biography discovery unlocks only after both primary details are found", () => {
  assert.equal(typeof createDiscoveryTracker, "function", "discovery tracker is not implemented");

  const tracker = createDiscoveryTracker(["storygate", "demo"]);

  assert.deepEqual(tracker.find("storygate"), {
    newlyFound: true,
    foundCount: 1,
    allFound: false
  });
  assert.deepEqual(tracker.find("demo"), {
    newlyFound: true,
    foundCount: 2,
    allFound: true
  });
});

test("repeating one primary detail cannot unlock the biography discovery", () => {
  assert.equal(typeof createDiscoveryTracker, "function", "discovery tracker is not implemented");

  const tracker = createDiscoveryTracker(["storygate", "demo"]);
  tracker.find("storygate");

  assert.deepEqual(tracker.find("storygate"), {
    newlyFound: false,
    foundCount: 1,
    allFound: false
  });
});
