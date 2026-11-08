// Generates the CGV Knowledge Academy app icons in the iOS 26 Liquid Glass
// style from the CGV vector mark.
//
// Layers (per Apple's icon guidance: simple filled shapes in separate
// layers, with depth from light rather than detail):
//   1. Background — the brand gradient with a soft top-left light source.
//   2. Glyph — the CGV letters as a glass layer: warm-white, slightly
//      translucent so the background tints through, with a specular top
//      edge, an inner rim at the bottom, and a soft lifted shadow.
//   3. Sparkle — the CGV sparkle as its own glass layer in pale amber.
//
// iOS masks home-screen icons itself, so the Apple touch icon and maskable
// icon are full-bleed squares. "any" icons get transparent rounded corners.
//
// Outputs (public/ and public/brand/):
//   app-icon.svg, app-icon-dark.svg, app-icon-monochrome.svg  (masters)
//   favicon.svg (light/dark aware), favicon.png (512), favicon-16/32.png,
//   apple-touch-icon.png (180), app-icon-192/512.png,
//   app-icon-maskable-512.png, app-icon-monochrome-512.png
//
// Usage: node scripts/render-app-icons.mjs
// PNG rendering needs Playwright's Chromium (`npx playwright install chromium`).
// Set PLAYWRIGHT_MODULE to a playwright entry file if it is not resolvable
// from the project, and CHROME_PATH to use a system Chrome.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const brand = path.join(root, "public", "brand");
const SIZE = 1024;
const MARK = { width: 212.88134, height: 93.954597 };

const markSource = await readFile(path.join(brand, "cgv-mark.svg"), "utf8");
const markBody = markSource.slice(markSource.indexOf("<g "), markSource.lastIndexOf("</svg>"));
const LETTER_FILL = 'fill="#F13B40"';
const SPARK_FILL = 'fill="url(#cgv-spark)"';
if (!markBody.includes(LETTER_FILL) || !markBody.includes(SPARK_FILL)) {
  throw new Error("cgv-mark.svg no longer has the expected letter and sparkle fills.");
}

function mark(letterFill, sparkFill) {
  return markBody.split(LETTER_FILL).join(`fill="${letterFill}"`).split(SPARK_FILL).join(`fill="${sparkFill}"`);
}

function glyph({ width, letterFill, sparkFill, offsetY = -10 }) {
  const height = (width / MARK.width) * MARK.height;
  const x = (SIZE - width) / 2;
  const y = (SIZE - height) / 2 + offsetY;
  return `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width}" height="${height.toFixed(2)}" viewBox="0 0 ${MARK.width} ${MARK.height}">${mark(letterFill, sparkFill)}</svg>`;
}

function glassFilter({ id, shadow, shadowOpacity, rim, rimOpacity, highlightOpacity }) {
  return `
  <filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${SIZE}" height="${SIZE}" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="blur"/>
    <feOffset in="blur" dy="20" result="lifted"/>
    <feFlood flood-color="${shadow}" flood-opacity="${shadowOpacity}"/>
    <feComposite in2="lifted" operator="in" result="shadow"/>
    <feOffset in="SourceAlpha" dy="7" result="down"/>
    <feComposite in="SourceAlpha" in2="down" operator="out" result="topEdge"/>
    <feGaussianBlur in="topEdge" stdDeviation="1.6" result="topEdgeSoft"/>
    <feFlood flood-color="#FFFFFF" flood-opacity="${highlightOpacity}"/>
    <feComposite in2="topEdgeSoft" operator="in" result="specular"/>
    <feOffset in="SourceAlpha" dy="-8" result="up"/>
    <feComposite in="SourceAlpha" in2="up" operator="out" result="bottomEdge"/>
    <feGaussianBlur in="bottomEdge" stdDeviation="2.4" result="bottomEdgeSoft"/>
    <feFlood flood-color="${rim}" flood-opacity="${rimOpacity}"/>
    <feComposite in2="bottomEdgeSoft" operator="in" result="rim"/>
    <feMerge>
      <feMergeNode in="shadow"/>
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="rim"/>
      <feMergeNode in="specular"/>
    </feMerge>
  </filter>`;
}

const variants = {
  light: {
    background: `
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFB11F"/>
        <stop offset="0.5" stop-color="#FF6A22"/>
        <stop offset="1" stop-color="#E6322F"/>
      </linearGradient>
      <radialGradient id="light" cx="0.22" cy="0.1" r="0.85">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.38"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stop-color="#7A1300" stop-opacity="0"/>
        <stop offset="1" stop-color="#7A1300" stop-opacity="0.24"/>
      </linearGradient>
      <linearGradient id="letters" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF"/>
        <stop offset="1" stop-color="#FFE8DA"/>
      </linearGradient>
      <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFF6DD"/>
        <stop offset="1" stop-color="#FFD58A"/>
      </linearGradient>`,
    filter: { id: "glass", shadow: "#7A1300", shadowOpacity: 0.34, rim: "#FF7A3D", rimOpacity: 0.55, highlightOpacity: 1 },
    glyphOpacity: 0.95,
  },
  dark: {
    background: `
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2A2C30"/>
        <stop offset="1" stop-color="#0B0C0E"/>
      </linearGradient>
      <radialGradient id="light" cx="0.78" cy="0.95" r="0.75">
        <stop offset="0" stop-color="#FF6A22" stop-opacity="0.34"/>
        <stop offset="1" stop-color="#FF6A22" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.08"/>
        <stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="letters" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FFB11F"/>
        <stop offset="0.5" stop-color="#FF6A22"/>
        <stop offset="1" stop-color="#E6322F"/>
      </linearGradient>
      <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFD58A"/>
        <stop offset="1" stop-color="#FF8A3D"/>
      </linearGradient>`,
    filter: { id: "glass", shadow: "#000000", shadowOpacity: 0.55, rim: "#5A0E00", rimOpacity: 0.5, highlightOpacity: 0.75 },
    glyphOpacity: 1,
  },
};

function iconSvg(variantName, { glyphWidth = 700, rounded = false, title = "CGV Knowledge Academy" } = {}) {
  const variant = variants[variantName];
  const radius = rounded ? 230 : 0; // ~22.5%, the iOS icon corner proportion
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${title}">
<title>${title}</title>
<defs>${variant.background}${glassFilter(variant.filter)}
  <clipPath id="shape"><rect width="${SIZE}" height="${SIZE}" rx="${radius}"/></clipPath>
</defs>
<g clip-path="url(#shape)">
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#light)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#depth)"/>
  <g filter="url(#glass)" opacity="${variant.glyphOpacity}">${glyph({ width: glyphWidth, letterFill: "url(#letters)", sparkFill: "url(#spark)" })}</g>
</g>
</svg>
`;
}

function monochromeSvg(glyphWidth = 600) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="CGV Knowledge Academy">
<title>CGV Knowledge Academy</title>
${glyph({ width: glyphWidth, letterFill: "#FFFFFF", sparkFill: "#FFFFFF" })}
</svg>
`;
}

// Browser favicon: rounded tile (tabs are not masked); follows the
// browser's light/dark preference by swapping to the dark variant.
function faviconSvg() {
  const light = iconSvg("light", { rounded: true });
  const dark = iconSvg("dark", { rounded: true })
    .replaceAll('id="', 'id="d-')
    .replaceAll("url(#", "url(#d-");
  const inner = (svg) => svg.slice(svg.indexOf("<defs>"), svg.lastIndexOf("</svg>"));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="CGV Knowledge Academy">
<style>.dark{display:none}@media (prefers-color-scheme: dark){.light{display:none}.dark{display:inline}}</style>
<g class="light">${inner(light)}</g>
<g class="dark">${inner(dark)}</g>
</svg>
`;
}

const masters = {
  "app-icon.svg": iconSvg("light"),
  "app-icon-dark.svg": iconSvg("dark"),
  "app-icon-monochrome.svg": monochromeSvg(),
};
for (const [file, svg] of Object.entries(masters)) await writeFile(path.join(brand, file), svg);
await writeFile(path.join(root, "public", "favicon.svg"), faviconSvg());

const renders = [
  // [file, svg, size, transparent]
  ["apple-touch-icon.png", iconSvg("light"), 180, false],
  ["app-icon-192.png", iconSvg("light", { rounded: true }), 192, true],
  ["app-icon-512.png", iconSvg("light", { rounded: true }), 512, true],
  ["favicon.png", iconSvg("light", { rounded: true }), 512, true],
  ["favicon-32.png", iconSvg("light", { rounded: true, glyphWidth: 780 }), 32, true],
  ["favicon-16.png", iconSvg("light", { rounded: true, glyphWidth: 820 }), 16, true],
  // Maskable: full bleed, glyph inside the 80% safe circle.
  ["app-icon-maskable-512.png", iconSvg("light", { glyphWidth: 560 }), 512, false],
  ["app-icon-monochrome-512.png", monochromeSvg(560), 512, true],
];

const playwrightEntry = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : "playwright";
let chromium;
try {
  ({ chromium } = await import(playwrightEntry));
} catch {
  console.warn("Playwright is unavailable; wrote SVG masters only. Install it to render PNGs.");
  process.exit(0);
}
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [file, svg, size, transparent] of renders) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg.replace(/width="1024" height="1024"/, `width="${size}" height="${size}"`)}</body></html>`,
  );
  await page.locator("svg").first().screenshot({ path: path.join(brand, file), omitBackground: transparent });
}
await browser.close();
console.log(`Rendered ${Object.keys(masters).length} SVG masters, favicon.svg, and ${renders.length} PNG icons.`);
