import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

const [styles, script] = await Promise.all([
  readFile(new URL("../docs/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../docs/script.js", import.meta.url), "utf8")
]);

function cssBlock(selector) {
  const selectorIndex = styles.indexOf(selector);
  assert.notEqual(selectorIndex, -1, `Missing CSS selector: ${selector}`);
  const openBrace = styles.indexOf("{", selectorIndex);
  const closeBrace = styles.indexOf("}", openBrace);
  return styles.slice(openBrace + 1, closeBrace);
}

test("early reveal copy shares the measured final-copy anchor", () => {
  assert.match(script, /querySelector\("\.final-copy"\)/);
  assert.match(script, /getBoundingClientRect\(\)\.top/);
  assert.match(script, /setProperty\("--message-anchor-top"/);

  const firstMessage = cssBlock(".message--first");
  assert.match(firstMessage, /align-content:\s*flex-start/);
  assert.match(firstMessage, /padding-top:\s*max\(var\(--text-safe-top\),\s*var\(--message-anchor-top\)\)/);

  const stillMessage = cssBlock(".still {");
  assert.match(stillMessage, /top:\s*var\(--message-anchor-top\)/);
  assert.match(stillMessage, /bottom:\s*auto/);
});
