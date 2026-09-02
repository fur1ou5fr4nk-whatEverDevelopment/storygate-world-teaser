import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { parse } from "parse5";

const publicRoot = resolve("docs");
const publicSiteRoot = new URL("https://storygate.world/");
const approvedExternalDestinations = [
  "https://www.google.com/maps/place/Rice+Paddy+Restaurant/@8.1045234,98.6226284,17z/data=!4m8!3m7!1s0x3051b702b24bde97:0x601d622116dcc8d8!8m2!3d8.1045234!4d98.6226284!9m1!1b1!16s%2Fg%2F11bbrg_r0p",
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

function externalDestinations(html, pageUrl = publicSiteRoot) {
  const destinations = [];
  const document = parse(html);
  let effectiveBase = new URL(pageUrl);
  let baseResolved = false;

  function resolveBase(node) {
    if (!baseResolved && node.tagName === "base") {
      const value = node.attrs?.find((attribute) => attribute.name === "href")?.value;
      if (value !== undefined) {
        baseResolved = true;
        try {
          effectiveBase = new URL(value, pageUrl);
        } catch {
          destinations.push("INVALID_BASE_HREF:" + value);
        }
      }
    }

    for (const child of node.childNodes ?? []) resolveBase(child);
  }

  function visit(node) {
    if (node.tagName === "a" || node.tagName === "area") {
      const hrefAttributes = node.attrs?.filter((attribute) => attribute.name === "href") ?? [];
      const value = (
        hrefAttributes.find((attribute) => !attribute.prefix && !attribute.namespace) ??
        hrefAttributes.find((attribute) => attribute.prefix === "xlink")
      )?.value;
      if (value && /&(?:#[xX][0-9a-f]+;?|#\d+;?|[a-z][a-z0-9]+;)/i.test(value)) {
        destinations.push("UNRESOLVED_HTML_REFERENCE:" + value);
      } else if (value !== undefined) {
        try {
          const destination = new URL(value, effectiveBase);
          if (
            destination.protocol !== publicSiteRoot.protocol ||
            destination.origin !== publicSiteRoot.origin
          ) {
            destinations.push(destination.href);
          }
        } catch {
          destinations.push("INVALID_HREF:" + value);
        }
      }
    }

    for (const child of node.childNodes ?? []) visit(child);
  }

  resolveBase(document);
  visit(document);
  return destinations;
}

function isApproved(url) {
  try {
    const normalized = new URL(url, publicSiteRoot).href;
    return approvedExternalDestinations.some(
      (approved) => new URL(approved).href === normalized
    );
  } catch {
    return false;
  }
}

test("external-link policy recognizes valid HTML attribute variants", () => {
  const html = [
    "<a href='https://evil.example/single'>single quote</a>",
    '<A HREF = "https://evil.example/uppercase">uppercase</A>',
    '<a href=//evil.example/protocol-relative>protocol relative</a>',
    '<a href = https://evil.example/unquoted>unquoted</a>'
  ].join("\n");

  assert.deepEqual(externalDestinations(html), [
    "https://evil.example/single",
    "https://evil.example/uppercase",
    "https://evil.example/protocol-relative",
    "https://evil.example/unquoted"
  ]);
});

test("external-link policy uses the real href and decodes HTML references", () => {
  const html = [
    '<a data-href="https://www.ricepaddy.website/" href="https://evil.example/real">attribute decoy</a>',
    '<a title="1 > 0" href="https://evil.example/quoted-greater-than">quoted greater than</a>',
    '<a href="https&#58;//evil.example/decimal">decimal reference</a>',
    '<a href="https&#x3a;&#x2f;&#47;evil.example/mixed">mixed references</a>',
    '<a href="https&colon;&sol;&sol;evil.example/named">named references</a>'
  ].join("\n");

  assert.deepEqual(externalDestinations(html), [
    "https://evil.example/real",
    "https://evil.example/quoted-greater-than",
    "https://evil.example/decimal",
    "https://evil.example/mixed",
    "https://evil.example/named"
  ]);
});

test("external-link policy checks browser-resolved destinations", () => {
  const html = [
    '<base href="https://evil.example/">',
    '<a href=" https://evil.example/leading">leading space</a>',
    '<a href="inside">external base</a>',
    '<a href="https:\\\\evil.example\\backslash">backslashes</a>'
  ].join("\n");

  assert.deepEqual(externalDestinations(html), [
    "https://evil.example/leading",
    "https://evil.example/inside",
    "https://evil.example/backslash"
  ]);
});

test("external-link policy checks image-map area destinations", () => {
  const html = [
    '<map name="escape">',
    '  <area href="https://evil.example/image-map" shape="rect" coords="0,0,10,10">',
    "</map>",
    '<img usemap="#escape">'
  ].join("\n");

  assert.deepEqual(externalDestinations(html), [
    "https://evil.example/image-map"
  ]);
});

test("external-link policy honors modern SVG href precedence", () => {
  const html = [
    "<svg>",
    '  <a xlink:href="https://www.ricepaddy.website/" href="https://evil.example/svg">unsafe</a>',
    "</svg>"
  ].join("\n");

  assert.deepEqual(externalDestinations(html), [
    "https://evil.example/svg"
  ]);
});

test("approved destinations require an exact URL match", () => {
  assert.equal(isApproved(approvedExternalDestinations[0]), true);
  assert.equal(isApproved(approvedExternalDestinations[0] + "unapproved-suffix"), false);
});

test("public pages expose only Frank-approved external destinations", async () => {
  const found = [];

  for (const file of await htmlFiles(publicRoot)) {
    const html = await readFile(file, "utf8");
    const pageUrl = new URL(relative(publicRoot, file), publicSiteRoot);
    for (const url of externalDestinations(html, pageUrl)) {
      found.push({ file: relative(publicRoot, file), url });
    }
  }

  for (const link of found) {
    assert.ok(
      isApproved(link.url),
      `Unapproved public destination in ${link.file}: ${link.url}`
    );
  }
});

test("GitHub Pages ships only locale catalogues approved for public release", async () => {
  const localeRoot = join(publicRoot, "locales");
  const localeFiles = (await readdir(localeRoot))
    .filter((file) => file.endsWith(".mjs"))
    .sort();
  const unpublished = [];

  assert.deepEqual(
    localeFiles,
    ["en.mjs"],
    `public locale allowlist changed: ${localeFiles.join(", ")}`,
  );

  for (const file of localeFiles) {
    const { default: catalogue } = await import(pathToFileURL(join(localeRoot, file)));
    if (catalogue?.meta?.public !== true) unpublished.push(file);
  }

  assert.ok(localeFiles.includes("en.mjs"), "the English source catalogue must ship");
  assert.deepEqual(
    unpublished,
    [],
    `unpublished locale catalogues are inside the Pages artifact: ${unpublished.join(", ")}`,
  );
});
