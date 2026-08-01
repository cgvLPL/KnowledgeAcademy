import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/mobile-containment-release.css");

test("mobile containment is the final visual layer", () => {
  const glassImport = 'import "./glassmorphism-release.css";';
  const containmentImport = 'import "./mobile-containment-release.css";';

  assert.ok(layout.includes(containmentImport));
  assert.ok(layout.indexOf(containmentImport) > layout.indexOf(glassImport));
});

test("participant panels cannot widen the phone viewport", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("grid-template-columns: minmax(0, 1fr) !important"));
  assert.ok(css.includes("max-inline-size: 100% !important"));
  assert.ok(css.includes("min-inline-size: 0 !important"));
  assert.ok(css.includes("overflow-wrap: anywhere"));
  assert.ok(css.includes("white-space: normal !important"));
});

test("floating navigation has safe-area clearance without disabling table scrolling", () => {
  assert.ok(css.includes("padding-bottom: calc(128px + env(safe-area-inset-bottom)) !important"));
  assert.ok(css.includes("scroll-padding-bottom: calc(112px + env(safe-area-inset-bottom)) !important"));
  assert.ok(css.includes(".participant-history .responsive-table"));
  assert.ok(css.includes("overflow-x: auto !important"));
  assert.ok(css.includes("-webkit-overflow-scrolling: touch"));
});
