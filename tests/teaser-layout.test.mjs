import assert from "node:assert/strict";
import { test } from "node:test";

let getLowerCopyCenter;

try {
  ({ getLowerCopyCenter } = await import("../docs/teaser-layout.mjs"));
} catch {
  getLowerCopyCenter = undefined;
}

test("lower teaser copy is centered between the gate point and viewport edge", () => {
  assert.equal(typeof getLowerCopyCenter, "function", "lower-copy layout is not implemented");

  assert.equal(getLowerCopyCenter({ gateY: 371, stageHeight: 844 }), 607.5);
  assert.equal(getLowerCopyCenter({ gateY: 365, stageHeight: 900 }), 632.5);
});
