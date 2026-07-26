import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/knowledge-academy-loading.css");
const finalCss = read("app/final-loading-viewport-fix.css");
const layout = read("app/layout.tsx");
const logo = read("public/cgv-logo.svg");

test("Knowledge Academy artwork remains installed beneath the final alignment layer", () => {
  const artworkImport = 'import "./knowledge-academy-loading.css";';
  const finalImport = 'import "./final-loading-viewport-fix.css";';

  assert.ok(layout.includes(artworkImport));
  assert.ok(layout.includes(finalImport));
  assert.ok(layout.indexOf(artworkImport) > layout.indexOf('import "./account-scroll-final.css";'));
  assert.ok(layout.indexOf(finalImport) > layout.indexOf(artworkImport));

  const release = layout.match(/"cgv-ui-release":\s*"([^"]+)"/u)?.[1] || "";
  assert.match(release, /^2026\.07\.\d{2}-[a-z0-9-]+-v\d+$/u);
});

test("loading screen uses the real CGV SVG and thin Knowledge Academy lockup", () => {
  assert.ok(logo.includes("<svg"));
  assert.ok(css.includes('content: "KNOWLEDGE ACADEMY"'));
  assert.ok(css.includes("font-weight: 300"));
  assert.ok(finalCss.includes("font-weight: 250"));
  assert.ok(finalCss.includes("left: 50% !important"));
  assert.ok(finalCss.includes("transform: translateX(-50%) !important"));
  assert.ok(css.includes(".boot-content img"));
});

test("loading backdrop and progress styling match the approved orange mockup", () => {
  assert.ok(css.includes("radial-gradient(ellipse at 28% 36%"));
  assert.ok(css.includes("filter: blur(34px)"));
  assert.ok(css.includes("#ffbf3a"));
  assert.ok(css.includes("#ff4d1d"));
  assert.ok(finalCss.includes("width: min(706px, 74vw) !important"));
});

test("loading screen remains responsive and respects reduced motion", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(finalCss.includes("var(--cgv-mobile-viewport-height, 100svh)"));
  assert.ok(finalCss.includes("@media (prefers-reduced-motion: reduce)"));
});
