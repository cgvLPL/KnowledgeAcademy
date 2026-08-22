import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/visual-cohesion-touch-targets.css");

test("touch target cohesion guard loads after overview polish", () => {
  const overview = 'import "./admin-overview-cohesion.css";';
  const touch = 'import "./visual-cohesion-touch-targets.css";';
  assert.ok(layout.includes(overview));
  assert.ok(layout.includes(touch));
  assert.ok(layout.indexOf(touch) > layout.indexOf(overview));
});

test("phone primary controls keep the 46px visual regression contract", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes(".primary-button"));
  assert.ok(css.includes(".hero-button"));
  assert.ok(css.includes("min-height: 46px !important"));
});

test("compact icon controls still meet a 44px touch target", () => {
  assert.ok(css.includes(".icon-button"));
  assert.ok(css.includes("min-height: 44px"));
  assert.ok(css.includes("min-width: 44px"));
});
