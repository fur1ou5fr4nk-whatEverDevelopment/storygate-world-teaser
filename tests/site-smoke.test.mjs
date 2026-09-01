import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const rootPath = resolve("docs");
let server;
let baseUrl;

async function fetchText(path) {
  const response = await fetch(baseUrl + path);
  return { response, text: await response.text() };
}

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};

before(async () => {
  server = createServer(async (request, response) => {
    try {
      const requestPath = new URL(request.url, "http://localhost").pathname;
      const relativePath = (requestPath === "/" ? "index.html" : requestPath).replace(/^\/+/, "");
      const filePath = join(rootPath, relativePath);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) throw new Error("Not a file");
      response.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
      response.end(await readFile(filePath));
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolveReady) => server.listen(0, "127.0.0.1", resolveReady));
  const address = server.address();
  baseUrl = "http://127.0.0.1:" + address.port;
});

after(() => new Promise((resolveClosed) => server.close(resolveClosed)));

test("homepage serves the teaser and two coming-soon links", async () => {
  const response = await fetch(baseUrl + "/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /StoryGate teaser/);
  assert.equal((html.match(/href="\.\/coming-soon\.html"/g) || []).length, 2);
});

test("homepage carries the approved suspense reveal copy", async () => {
  const response = await fetch(baseUrl + "/");
  const html = await response.text();
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  assert.match(visibleText, /Some things only reveal themselves when you stay/);
  assert.match(visibleText, /Still tapping\?/);
  assert.match(visibleText, /Good\. The first story has already begun/);
  assert.match(visibleText, /The gate opens soon\./);
  assert.doesNotMatch(visibleText, /friction included/);
  assert.doesNotMatch(visibleText, /wild, wandering heart/);
});

test("the teaser stage cannot become an internal scroll container", async () => {
  const { text: css } = await fetchText("/styles.css");

  assert.match(
    css,
    /\.portal-stage\s*\{[^}]*overflow:\s*clip;/s,
    "focused discovery points must not scroll the fixed teaser composition"
  );
});

test("biography candidate is available behind the third discovery", async () => {
  for (const path of ["/frank-bodmann.html", "/biography.css", "/biography.js"]) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 200, path);
  }

  const { text: homepage } = await fetchText("/");
  assert.equal((homepage.match(/data-primary-discovery/g) || []).length, 2);
  assert.match(homepage, /data-discovery-id="storygate"/);
  assert.match(homepage, /data-discovery-id="demo"/);
  assert.match(homepage, /data-biography-discovery/);
  assert.match(homepage, /href="\.\/frank-bodmann\.html"/i);
  assert.equal((homepage.match(/href="\.\/coming-soon\.html"/g) || []).length, 2);
});

test("coming-soon page has one route back to the homepage", async () => {
  const response = await fetch(baseUrl + "/coming-soon.html");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Coming soon/);
  assert.match(html, /href="\.\/"/);
});

test("all referenced production assets are available", async () => {
  const paths = [
    "/styles.css",
    "/script.js",
    "/discovery-state.mjs",
    "/teaser-layout.mjs",
    "/assets/teaser-source-original.png",
    "/assets/storygate-wordmark-white.png",
    "/assets/frank-bodmann-portrait-collage.jpeg"
  ];
  for (const path of paths) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 200, path);
  }
});

test("homepage exposes an installable StoryGate manifest with correctly sized icons", async () => {
  const { text: homepage } = await fetchText("/");
  assert.match(homepage, /<link rel="manifest" href="\.\/manifest\.webmanifest">/);
  assert.match(homepage, /<link rel="icon" type="image\/png" sizes="32x32" href="\.\/assets\/icons\/favicon-32\.png">/);
  assert.match(homepage, /<link rel="apple-touch-icon" sizes="180x180" href="\.\/assets\/icons\/apple-touch-icon\.png">/);

  const manifestResponse = await fetch(baseUrl + "/manifest.webmanifest");
  assert.equal(manifestResponse.status, 200);
  assert.match(manifestResponse.headers.get("content-type") || "", /^application\/manifest\+json/);

  const manifest = await manifestResponse.json();
  assert.equal(manifest.name, "StoryGate");
  assert.equal(manifest.short_name, "StoryGate");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#0a1718");
  assert.equal(manifest.background_color, "#0a1718");
  assert.deepEqual(manifest.icons, [
    {
      src: "./assets/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "./assets/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "./assets/icons/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    }
  ]);

  for (const icon of manifest.icons) {
    const response = await fetch(baseUrl + "/" + icon.src.replace(/^\.\//, ""));
    assert.equal(response.status, 200, icon.src);
    assert.equal(response.headers.get("content-type"), "image/png");

    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.toString("ascii", 1, 4), "PNG", icon.src);
    assert.equal(png.readUInt32BE(16) + "x" + png.readUInt32BE(20), icon.sizes, icon.src);
  }
});

test("biography exposes three story blocks and complete Layer structure", async () => {
  const { response, text: html } = await fetchText("/frank-bodmann.html");
  assert.equal(response.status, 200);

  assert.equal((html.match(/<section class="story-block">/g) || []).length, 3);

  const triggers = [...html.matchAll(/<button\b[^>]*class="layer-trigger"[^>]*>/g)];
  assert.equal(triggers.length, 9);

  const controlledIds = triggers.map(([tag]) => tag.match(/aria-controls="([^"]+)"/)?.[1]);
  assert.ok(controlledIds.every(Boolean));
  assert.equal(new Set(controlledIds).size, 8);
  assert.equal(controlledIds.filter((id) => id === "layer-career").length, 2);
  assert.ok(controlledIds.includes("layer-cameron"));
  assert.ok(controlledIds.includes("layer-little-head"));

  for (const [tag] of triggers) {
    assert.match(tag, /type="button"/);
    assert.match(tag, /aria-expanded="false"/);
  }

  assert.equal((html.match(/class="layer-card"/g) || []).length, 8);
  assert.match(html, /id="layer-cameron"[^>]*data-layer-card="cameron"[^>]*role="note"/);
  assert.match(html, /id="layer-little-head"[^>]*data-layer-card="little-head"[^>]*role="note"/);
  assert.doesNotMatch(html, /(?:file:|\/Users\/)/);
});

test("biography keeps the restaurant information experiment separate from Blackbone", async () => {
  const { text: html } = await fetchText("/frank-bodmann.html");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const restaurantExperiment = visibleText.indexOf("His early restaurant experiments were digital");
  const blackboneBoundary = visibleText.indexOf("Blackbone was a separate project—and almost the opposite");

  assert.ok(restaurantExperiment >= 0);
  assert.ok(blackboneBoundary > restaurantExperiment);
  assert.match(visibleText, /At Blackbone, the treasure hunt was the point\. On the restaurant website, it was a usability defect\./);
  assert.doesNotMatch(visibleText, /täglich 2 Eier|Founder · Host · Builder/);
});

test("biography references are separate, public, and absent from Layer cards", async () => {
  const { text: html } = await fetchText("/frank-bodmann.html");
  const references = html.match(/<section\b[^>]*class="references"[\s\S]*?<\/section>/)?.[0];
  const layerLibraryStart = html.indexOf('<div id="layer-library"');
  const layerLibrary = layerLibraryStart >= 0 ? html.slice(layerLibraryStart) : "";

  assert.ok(references);
  assert.ok(layerLibraryStart >= 0);
  assert.ok(layerLibrary);
  assert.doesNotMatch(layerLibrary, /<a\b/i);

  const hrefs = [...references.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, [
    "https://www.facebook.com/frank.bodmann/",
    "https://designaustraliagroup.com.au/news/where-every-meal-tells-a-story/",
    "https://www.ricepaddy.website/",
    "https://www.tripadvisor.com/Restaurant_Review-g661285-d2099980-Reviews-Rice_Paddy-Ko_Yao_Noi_Phang_Nga_Province.html",
    "./"
  ]);
});
