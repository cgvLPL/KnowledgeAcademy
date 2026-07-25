import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/no-green-release.css");

test("the no-green release layer is loaded last", () => {
  const releaseImport = 'import "./mockup-uix-release.css";';
  const noGreenImport = 'import "./no-green-release.css";';
  assert.ok(layout.includes(noGreenImport));
  assert.ok(layout.indexOf(noGreenImport) > layout.indexOf(releaseImport));
  assert.ok(layout.includes('"cgv-ui-release": "2026.07.25-no-green-loading-v3"'));
});

test("legacy green design tokens are remapped to the warm palette", () => {
  for (const token of ["--lime:", "--lime-dark:", "--green:", "--success:", "accent-color: #ff6a22"]) {
    assert.ok(css.includes(token), `Missing no-green token override: ${token}`);
  }
  assert.ok(css.includes(".metric-icon.green"));
  assert.ok(css.includes(".status-live"));
  assert.ok(css.includes(".question-progress-bars button.answered"));
  assert.ok(css.includes("input[type=\"checkbox\"]:checked"));
});

test("loading screen uses responsive red orange vertical light bands", () => {
  assert.ok(css.includes(".boot-screen"));
  assert.ok(css.includes("repeating-linear-gradient("));
  assert.ok(css.includes("rgba(255, 171, 31"));
  assert.ok(css.includes("rgba(228, 47, 31"));
  assert.ok(css.includes("background-attachment: fixed"));
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes(".boot-bar span"));
});

test("green success and focus visuals are explicitly replaced", () => {
  assert.ok(css.includes("button:focus-visible"));
  assert.ok(css.includes("background: #ff7c32"));
  assert.ok(css.includes("background: #ff8a3d"));
  assert.ok(css.includes("box-shadow: 0 0 0 4px rgba(255, 107, 34"));
});
