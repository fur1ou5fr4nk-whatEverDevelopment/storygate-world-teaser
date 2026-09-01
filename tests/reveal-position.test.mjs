import assert from "node:assert/strict";
import { test } from "node:test";
import { getLowerCopyCenter } from "../docs/teaser-layout.mjs";

test("lower reveal copy stays equidistant from the gate point and viewport edge", () => {
  const gateY = 371;
  const stageHeight = 844;
  const center = getLowerCopyCenter({ gateY, stageHeight });

  assert.equal(center - gateY, 236.5);
  assert.equal(stageHeight - center, 236.5);
});
