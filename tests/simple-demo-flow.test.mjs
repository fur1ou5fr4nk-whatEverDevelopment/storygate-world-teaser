import assert from "node:assert/strict";
import test from "node:test";
import * as demoFlow from "../docs/simple-demo/demo-flow.mjs";

async function createFlow() {
  const module = await import("../docs/simple-demo/demo-flow.mjs").catch(() => ({}));
  assert.equal(
    typeof module.createDemoFlow,
    "function",
    "the demo needs one explicit flow controller for the NFC confirmation journey",
  );
  return module.createDemoFlow();
}

test("a detected NFC tag needs an explicit Open before entry", async () => {
  const flow = await createFlow();

  assert.deepEqual(flow.snapshot(), {
    phase: "approach",
    countdown: 0,
    storyLayer: 0,
  });

  flow.dispatch("OPEN");
  assert.deepEqual(flow.snapshot(), {
    phase: "approach",
    countdown: 0,
    storyLayer: 0,
  });

  flow.dispatch("DETECTED");
  assert.deepEqual(flow.snapshot(), {
    phase: "nfc",
    countdown: 0,
    storyLayer: 0,
  });

  flow.dispatch("OPEN");
  assert.deepEqual(flow.snapshot(), {
    phase: "entry",
    countdown: 0,
    storyLayer: 0,
  });
});

test("the story follows the entry countdown and stops at its third layer", async () => {
  const flow = await createFlow();

  flow.dispatch("DETECTED");
  flow.dispatch("OPEN");
  flow.dispatch("BEGIN_STORY");
  assert.deepEqual(flow.snapshot(), {
    phase: "countdown",
    countdown: 1,
    storyLayer: 0,
  });

  flow.dispatch("TICK");
  assert.equal(flow.snapshot().countdown, 2);
  flow.dispatch("TICK");
  assert.equal(flow.snapshot().countdown, 3);
  flow.dispatch("TICK");
  assert.deepEqual(flow.snapshot(), {
    phase: "story",
    countdown: 0,
    storyLayer: 1,
  });

  flow.dispatch("REVEAL_LAYER");
  flow.dispatch("REVEAL_LAYER");
  flow.dispatch("REVEAL_LAYER");
  assert.deepEqual(flow.snapshot(), {
    phase: "story",
    countdown: 0,
    storyLayer: 3,
  });
});

test("only the current story layer is exposed after a reveal", () => {
  assert.equal(
    typeof demoFlow.isStoryLayerVisible,
    "function",
    "the renderer needs an explicit visibility rule for the active story layer",
  );

  const story = { phase: "story", countdown: 0, storyLayer: 2 };
  assert.equal(demoFlow.isStoryLayerVisible(story, 1), false);
  assert.equal(demoFlow.isStoryLayerVisible(story, 2), true);
  assert.equal(demoFlow.isStoryLayerVisible(story, 3), false);
});
