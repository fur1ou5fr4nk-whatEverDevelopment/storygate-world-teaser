import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import englishCatalogue from "../docs/locales/en.mjs";

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
      const relativePath = (
        requestPath === "/"
          ? "index.html"
          : requestPath.endsWith("/")
            ? requestPath + "index.html"
            : requestPath
      ).replace(/^\/+/, "");
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

test("homepage routes the StoryGate introduction and simple demo internally", async () => {
  const response = await fetch(baseUrl + "/");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /StoryGate teaser/);
  assert.match(
    html,
    /id="detail-demo"[^>]*href="\.\/simple-demo\/"/
  );
  assert.doesNotMatch(html, /storygate-immediate-benefit\.furiousfrank\.chatgpt\.site/);
  assert.match(html, /id="detail-storygate"[^>]*href="\.\/what-is-storygate\.html"/);
  assert.equal((html.match(/href="\.\/coming-soon\.html"/g) || []).length, 0);

  const { response: aboutResponse, text: aboutHtml } = await fetchText("/what-is-storygate.html");
  assert.equal(aboutResponse.status, 200);
  assert.match(aboutHtml, /data-i18n="about\.introduction"/);

  const { response: demoResponse, text: demoHtml } = await fetchText("/simple-demo/");
  assert.equal(demoResponse.status, 200);
  assert.match(demoHtml, /data-demo-stage/);
  assert.match(demoHtml, />StoryGate detected</);
  assert.match(demoHtml, /data-i18n="demo\.instruction"/);

  for (const path of [
    "/simple-demo/simple-demo.css",
    "/simple-demo/simple-demo.js",
    "/simple-demo/demo-proximity.mjs",
    "/assets/storygate-demo-phone-front.png",
  ]) {
    const assetResponse = await fetch(baseUrl + path);
    assert.equal(assetResponse.status, 200, path);
  }
});

test("simple demo uses a straight-on non-selectable phone presentation", async () => {
  const { response, text: demoHtml } = await fetchText("/simple-demo/");
  assert.equal(response.status, 200);
  assert.match(
    demoHtml,
    /class="demo-phone__asset" src="\.\.\/assets\/storygate-demo-phone-front\.png" alt="" draggable="false"/
  );

  for (const image of demoHtml.matchAll(/<img\b[^>]*>/g)) {
    assert.match(image[0], /draggable="false"/);
  }

  const { text: css } = await fetchText("/simple-demo/simple-demo.css");
  assert.match(
    css,
    /html,\s*body,\s*\.demo-stage\s*\{[^}]*-webkit-user-select:\s*none;[^}]*user-select:\s*none;/s
  );
  const statusRule = css.match(/\.demo-status\s*\{([\s\S]*?)\n\}/);
  assert.ok(statusRule);
  assert.doesNotMatch(statusRule[1], /rotate\(/);

  const phoneRule = css.match(/\.demo-phone\s*\{([\s\S]*?)\n\}/);
  assert.ok(phoneRule);
  assert.match(phoneRule[1], /left:\s*80%;/);
  assert.match(phoneRule[1], /top:\s*57%;/);
  assert.match(phoneRule[1], /width:\s*clamp\(230px,\s*25vw,\s*360px\);/);

  const assetResponse = await fetch(baseUrl + "/assets/storygate-demo-phone-front.png");
  assert.equal(assetResponse.status, 200);
});

test("homepage carries the approved suspense reveal copy", async () => {
  const response = await fetch(baseUrl + "/");
  const html = await response.text();
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  assert.match(visibleText, /Some things only reveal themselves when you keep going/);
  assert.equal((html.match(/class="reveal-line"/g) || []).length, 2);
  assert.doesNotMatch(html, /class="word"/);
  assert.match(visibleText, /Still tapping\? Good!/);
  assert.match(visibleText, /Your wild, wandering heart was born for this/);
  assert.match(visibleText, /You earned it:/);
  assert.match(visibleText, /Gate is open: Find the demo story/);
  assert.doesNotMatch(visibleText, /The gate opens soon/);
  assert.doesNotMatch(visibleText, /The first story has already begun/);
  assert.doesNotMatch(visibleText, /friction included/);
});

test("localization hides every teaser page until the preferred language is applied", async () => {
  for (const path of ["/", "/coming-soon.html", "/frank-bodmann.html"]) {
    const { text: html } = await fetchText(path);
    assert.match(html, /<script src="\.\/locale-boot\.js"><\/script>/, path);
  }

  const { response, text: boot } = await fetchText("/locale-boot.js");
  assert.equal(response.status, 200);
  assert.match(boot, /dataset\.localization\s*=\s*"pending"/);
  assert.match(boot, /removeAttribute\("data-localization"\)/);

  const { text: css } = await fetchText("/language-control.css");
  assert.match(css, /html\[data-localization="pending"\] body\s*\{[^}]*visibility:\s*hidden;/s);
});

test("the teaser stage cannot become an internal scroll container", async () => {
  const { text: css } = await fetchText("/styles.css");

  assert.match(
    css,
    /\.portal-stage\s*\{[^}]*overflow:\s*clip;/s,
    "focused discovery points must not scroll the fixed teaser composition"
  );
});

test("all three discovery cards inherit one glass material", async () => {
  const { text: css } = await fetchText("/styles.css");
  const sharedRule = css.match(/\.discovery-card\s*\{([^}]*)\}/s)?.[1] || "";
  const positionalRules = [...css.matchAll(/\.discovery--(?:storygate|demo|biography) \.discovery-card\s*\{([^}]*)\}/gs)]
    .map((match) => match[1]);

  assert.match(sharedRule, /background:\s*rgba\(/);
  assert.match(sharedRule, /backdrop-filter:\s*blur\(/);
  assert.match(sharedRule, /border:\s*1px solid/);
  assert.match(sharedRule, /box-shadow:/);
  assert.ok(positionalRules.length >= 3);
  for (const declarations of positionalRules) {
    assert.doesNotMatch(declarations, /(?:background|border|box-shadow|backdrop-filter|color)\s*:/);
  }
});

test("mobile StoryGate discovery card opens above its sparkle and away from the tap point", async () => {
  const { text: css } = await fetchText("/styles.css");
  const mobileRules = css.slice(
    css.indexOf("@media (max-width: 680px)"),
    css.indexOf("@media (prefers-reduced-motion: reduce)"),
  );
  const declarations = mobileRules.match(
    /\.discovery--storygate \.discovery-card\s*\{([^}]*)\}/s,
  )?.[1] || "";

  assert.match(declarations, /top:\s*auto;/);
  assert.match(declarations, /right:\s*auto;/);
  assert.match(declarations, /bottom:\s*24px;/);
  assert.match(
    declarations,
    /left:\s*calc\(50vw - var\(--storygate-detail-x\) - 110px\);/,
  );
});

test("reduced-motion final copy stays static until discoveries become ready", async () => {
  const { text: css } = await fetchText("/styles.css");
  const reducedMotionRules = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  const visibleDeclarations = reducedMotionRules.match(
    /\.portal-stage\.is-final-act \.final-copy\s*\{([^}]*)\}/s,
  )?.[1] || "";
  const hiddenDeclarations = reducedMotionRules.match(
    /\.portal-stage\.is-final-act\.is-discovery-ready \.final-copy\s*\{([^}]*)\}/s,
  )?.[1] || "";

  assert.match(visibleDeclarations, /opacity:\s*1;/);
  assert.match(visibleDeclarations, /animation:\s*none\s*!important;/);
  assert.match(visibleDeclarations, /filter:\s*none;/);
  assert.match(visibleDeclarations, /transform:\s*translateY\(-50%\);/);
  assert.match(hiddenDeclarations, /opacity:\s*0;/);
});

test("Thai and Chinese use explicit UI and story font candidates", async () => {
  const { text: teaserCss } = await fetchText("/styles.css");
  const { text: biographyCss } = await fetchText("/biography.css");
  const { text: controlCss } = await fetchText("/language-control.css");
  const combined = `${teaserCss}\n${biographyCss}\n${controlCss}`;

  for (const font of [
    "Noto Sans Thai",
    "Noto Serif Thai",
    "Noto Sans SC",
    "Noto Serif SC",
    "Noto Sans TC",
    "Noto Serif TC",
  ]) {
    assert.match(combined, new RegExp(`font-family:[^;]*${font}`));
  }
});

test("Thai and Chinese reveal phrases without artificial segment gaps", async () => {
  const { text: css } = await fetchText("/styles.css");

  assert.match(
    css,
    /html\[lang="th"\] \.message--first,\s*html\[lang="zh-Hans"\] \.message--first,\s*html\[lang="zh-Hant"\] \.message--first\s*\{[^}]*gap:\s*0;/s,
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
  assert.match(homepage, /href="\.\/what-is-storygate\.html"/i);
  assert.equal((homepage.match(/href="\.\/coming-soon\.html"/g) || []).length, 0);
});

test("coming-soon page has one route back to the homepage", async () => {
  const response = await fetch(baseUrl + "/coming-soon.html");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Coming soon/);
  assert.match(html, /href="\.\/"/);
});

test("What is StoryGate presents the human, physical-world promise through four Layers", async () => {
  const { response, text: html } = await fetchText("/what-is-storygate.html");
  assert.equal(response.status, 200);
  assert.match(html, /StoryGate connects Stories made by people/);
  assert.match(html, /world around you/);
  assert.match(html, /StoryGate does not invent these Stories\. People do/);
  assert.match(html, /early-stage startup, currently under development and testing/);
  assert.equal((html.match(/class="layer-trigger"/g) || []).length, 4);
  assert.equal((html.match(/data-layer-card=/g) || []).length, 4);
});

test("every page binds every English source string to the shared localizer", async () => {
  const pages = ["/", "/coming-soon.html", "/frank-bodmann.html", "/simple-demo/", "/what-is-storygate.html"];
  const boundMessages = new Set();
  const boundSegments = new Set();

  for (const path of pages) {
    const { response, text: html } = await fetchText(path);
    assert.equal(response.status, 200, path);
    const prefix = path === "/simple-demo/" ? "\\.\\./" : "\\.\\/";
    assert.match(html, new RegExp(`<script type="module" src="${prefix}localize-page\\.mjs"></script>`), path);
    assert.match(html, new RegExp(`<link rel="stylesheet" href="${prefix}language-control\\.css">`), path);

    for (const match of html.matchAll(/data-i18n(?:-aria-label|-alt|-content)?="([^"]+)"/g)) {
      boundMessages.add(match[1]);
    }
    for (const match of html.matchAll(/data-i18n-segments="([^"]+)"/g)) {
      boundSegments.add(match[1]);
    }
  }

  const intentionallyRuntimeOnly = new Set(["language.buttonLabel", "language.menuLabel"]);
  const missingMessages = Object.keys(englishCatalogue.messages)
    .filter((key) => !intentionallyRuntimeOnly.has(key) && !boundMessages.has(key));
  const missingSegments = Object.keys(englishCatalogue.segments)
    .filter((key) => !boundSegments.has(key));

  assert.deepEqual(missingMessages, []);
  assert.deepEqual(missingSegments, []);
});

test("locale bootstrap prevents an English fallback flash and releases the page safely", async () => {
  for (const path of ["/", "/coming-soon.html", "/frank-bodmann.html", "/what-is-storygate.html"]) {
    const { text: html } = await fetchText(path);
    assert.match(html, /<script src="\.\/locale-boot\.js"><\/script>/, path);
  }
  const { text: demoHtml } = await fetchText("/simple-demo/");
  assert.match(demoHtml, /<script src="\.\.\/locale-boot\.js"><\/script>/);

  const { response, text: boot } = await fetchText("/locale-boot.js");
  assert.equal(response.status, 200);
  assert.match(boot, /dataset\.localization\s*=\s*"pending"/);
  assert.match(boot, /setTimeout/);
  assert.match(boot, /removeAttribute\("data-localization"\)/);

  const { text: css } = await fetchText("/language-control.css");
  assert.match(css, /html\[data-localization="pending"\] body\s*\{[^}]*visibility:\s*hidden;/s);

  const { text: localizer } = await fetchText("/localize-page.mjs");
  assert.match(localizer, /finally\s*\{/);
  assert.match(localizer, /removeAttribute\("data-localization"\)/);
});

test("all referenced production assets are available", async () => {
  const paths = [
    "/styles.css",
    "/script.js",
    "/i18n.mjs",
    "/localize-page.mjs",
    "/locale-boot.js",
    "/language-control.css",
    "/locales/en.mjs",
    "/locales/de.mjs",
    "/locales/th.mjs",
    "/locales/fr.mjs",
    "/locales/es.mjs",
    "/locales/ru.mjs",
    "/locales/zh-Hans.mjs",
    "/locales/zh-Hant.mjs",
    "/about.css",
    "/discovery-state.mjs",
    "/reveal-flow.mjs",
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

test("biography starts as three compact chapters with the full story behind inline disclosures", async () => {
  const { text: html } = await fetchText("/frank-bodmann.html");

  assert.equal((html.match(/class="story-block__title"/g) || []).length, 3);
  assert.match(html, /data-i18n="bio\.section\.about\.title">About Frank</);
  assert.match(html, /data-i18n="bio\.section\.origin\.title">How StoryGate came to be</);
  assert.match(html, /data-i18n="bio\.section\.thread\.title">The common thread</);
  assert.doesNotMatch(html, /bio\.cue|bio-hero__cue|Hover over highlighted terms/);

  const detailsTags = [...html.matchAll(/<details\b[^>]*class="story-block__details"[^>]*>/g)];
  assert.equal(detailsTags.length, 3);
  for (const [tag] of detailsTags) assert.doesNotMatch(tag, /\sopen(?:\s|=|>)/);
  assert.equal((html.match(/class="story-block__intro"/g) || []).length, 3);
  assert.equal((html.match(/class="story-block__summary"/g) || []).length, 3);
  assert.equal((html.match(/class="story-block__expanded"/g) || []).length, 3);
  const expandedChapters = [...html.matchAll(/<div class="story-block__expanded">([\s\S]*?)<\/div>/g)];
  assert.deepEqual(expandedChapters.map(([, chapter]) => (chapter.match(/<p(?:\s|>)/g) || []).length), [2, 3, 3]);
  assert.match(html, /data-i18n="bio\.section\.about\.more">More about Frank</);
  assert.match(html, /data-i18n="bio\.section\.origin\.more">More about the road to StoryGate</);
  assert.match(html, /data-i18n="bio\.section\.thread\.more">More about the common thread</);
  assert.equal((html.match(/data-i18n="bio\.section\.less">Show less</g) || []).length, 3);

  assert.match(html, /class="story-block__expanded"[\s\S]*It begins in 1981 at the Ratskeller/);
  assert.match(html, /class="story-block__expanded"[\s\S]*His first attempts to make restaurant stories and additional information available digitally were cumbersome/);
  assert.doesNotMatch(html, /His early restaurant experiments were digital/);
  assert.match(html, /class="story-block__expanded"[\s\S]*Its aim is to give very different material/);
  assert.match(html, /data-i18n="bio\.story\.3\.closing">That bit of chaos in between still comes from human hands\.<\/span>/);
});

test("biography translates Frank's kitchen nicknames into the real brigade progression", async () => {
  const { text: html } = await fetchText("/frank-bodmann.html");
  const careerLayer = html.match(/<aside\b[^>]*id="layer-career"[\s\S]*?<\/aside>/)?.[0] || "";

  assert.match(careerLayer, /<table\b[^>]*class="career-table"[^>]*aria-labelledby="layer-career-title"/);
  assert.equal((careerLayer.match(/scope="col"/g) || []).length, 3);
  assert.equal((careerLayer.match(/class="career-table__row"/g) || []).length, 6);
  for (const position of [
    "Culinary apprenticeship",
    "Commis de Cuisine / junior cook",
    "Demi-Chef de Partie / deputy station chef",
    "Chef de Partie / station chef",
    "Sous-Chef / deputy head chef",
    "Chef de Cuisine / head chef",
  ]) {
    assert.match(careerLayer, new RegExp(position.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("biography keeps the restaurant information experiment separate from Blackbone", async () => {
  const { text: html } = await fetchText("/frank-bodmann.html");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const restaurantExperiment = visibleText.indexOf("His first attempts to make restaurant stories and additional information available digitally were cumbersome");
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
    "https://www.google.com/maps/place/Rice+Paddy+Restaurant/@8.1045234,98.6226284,17z/data=!4m8!3m7!1s0x3051b702b24bde97:0x601d622116dcc8d8!8m2!3d8.1045234!4d98.6226284!9m1!1b1!16s%2Fg%2F11bbrg_r0p",
    "https://designaustraliagroup.com.au/news/where-every-meal-tells-a-story/",
    "https://www.ricepaddy.website/",
    "https://www.tripadvisor.com/Restaurant_Review-g661285-d2099980-Reviews-Rice_Paddy-Ko_Yao_Noi_Phang_Nga_Province.html",
    "./"
  ]);

  const externalLinks = [...references.matchAll(/<a\b[^>]*href="https:[^"]+"[^>]*>/g)];
  assert.equal(externalLinks.length, 4);
  for (const [tag] of externalLinks) {
    assert.match(tag, /target="_blank"/);
    assert.match(tag, /rel="noopener noreferrer"/);
  }
});
