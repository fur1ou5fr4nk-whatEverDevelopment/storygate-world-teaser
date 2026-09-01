import assert from "node:assert/strict";
import { test } from "node:test";

let getImageLayout;
let getLowerCopyCenter;

try {
  ({ getImageLayout, getLowerCopyCenter } = await import("../docs/teaser-layout.mjs"));
} catch {
  getImageLayout = undefined;
  getLowerCopyCenter = undefined;
}

test("lower teaser copy is centered between the gate point and viewport edge", () => {
  assert.equal(typeof getLowerCopyCenter, "function", "lower-copy layout is not implemented");

  assert.equal(getLowerCopyCenter({ gateY: 371, stageHeight: 844 }), 607.5);
  assert.equal(getLowerCopyCenter({ gateY: 365, stageHeight: 900 }), 632.5);
});

test("portrait mobile keeps the complete token inside the viewport safety gap", () => {
  assert.equal(typeof getImageLayout, "function", "mobile image layout is not implemented");

  const layout = getImageLayout({
    stageWidth: 390,
    stageHeight: 844,
    sourceWidth: 1024,
    sourceHeight: 1024,
  });

  assert.equal(layout.mode, "token-fit");
  assert.ok(layout.offsetX + 170 * layout.scale >= 16);
  assert.ok(layout.offsetX + 854 * layout.scale <= 374);
  assert.equal(layout.offsetX + 512 * layout.scale, 195);
  assert.equal(layout.offsetY + 449.95061728395063 * layout.scale, 371.36);
});

test("desktop retains the existing centered cover geometry", () => {
  assert.equal(typeof getImageLayout, "function", "shared image layout is not implemented");

  assert.deepEqual(
    getImageLayout({
      stageWidth: 1440,
      stageHeight: 900,
      sourceWidth: 1024,
      sourceHeight: 1024,
    }),
    {
      mode: "cover",
      scale: 1.40625,
      renderedWidth: 1440,
      renderedHeight: 1440,
      offsetX: 0,
      offsetY: -270,
    },
  );
});
