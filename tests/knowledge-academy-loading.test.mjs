import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/knowledge-academy-loading.css");
const layout = read("app/layout.tsx");
const logo = read("public/cgv-logo.svg");

test("Knowledge Academy loading CSS is loaded after every historical theme", () => {
  assert.ok(layout.includes('import "./knowledge-academy-loading.css";'));
  assert.ok(layout.indexOf('import "./knowledge-academy-loading.css";') > layout.indexOf('import "./account-scroll-final.css";'));
  assert.ok(layout.includes('"cgv-ui-release": "2026.07.25-knowledge-academy-loading-v7"'));
});

test("loading screen uses the real CGV SVG and thin Knowledge Academy lockup", () => {
  assert.ok(logo.includes("<svg"));
  assert.ok(css.includes('content: "KNOWLEDGE ACADEMY"'));
  assert.ok(css.includes("font-weight: 300"));
  assert.ok(css.includes("max-width: 46%"));
  assert.ok(css.includes(".boot-content img"));
});

test("loading backdrop and progress styling match the approved orange mockup", () => {
  assert.ok(css.includes("radial-gradient(ellipse at 28% 36%"));
  assert.ok(css.includes("filter: blur(34px)"));
  assert.ok(css.includes("#ffbf3a"));
  assert.ok(css.includes("#ff4d1d"));
  assert.ok(css.includes("PREPARING YOUR EVALUATION PORTAL") === false);
});

test("loading screen remains responsive and respects reduced motion", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("var(--cgv-mobile-viewport-height, 100svh)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
});
