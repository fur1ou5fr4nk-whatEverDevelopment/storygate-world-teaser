import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { test } from "node:test";

const publicRoot = resolve("docs");
const approvedExternalDestinations = [
  "https://www.google.com/maps/place/Rice+Paddy+Restaurant/",
  "https://designaustraliagroup.com.au/news/where-every-meal-tells-a-story/",
  "https://www.ricepaddy.website/",
  "https://www.tripadvisor.com/Restaurant_Review-g661285-d2099980-Reviews-Rice_Paddy-Ko_Yao_Noi_Phang_Nga_Province.html"
];

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
  }));
  return files.flat();
}

test("public pages expose only Frank-approved external destinations", async () => {
  const found = [];

  for (const file of await htmlFiles(publicRoot)) {
    const html = await readFile(file, "utf8");
    for (const match of html.matchAll(/\bhref="(https?:\/\/[^"]+)"/g)) {
      found.push({ file: relative(publicRoot, file), url: match[1] });
    }
  }

  for (const link of found) {
    assert.ok(
      approvedExternalDestinations.some((approved) => link.url.startsWith(approved)),
      `Unapproved public destination in ${link.file}: ${link.url}`
    );
  }
});
