import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const foundation = fs.readFileSync(path.join(root, "app/ui-foundation.css"), "utf8");
const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");

test("canonical UI foundation owns one cohesive spacing and control system", () => {
  assert.ok(foundation.includes("4. COHESIVE EXPERIENCE RHYTHM"));
  for (const token of [
    "--cgv-space-1",
    "--cgv-space-6",
    "--cgv-panel-padding",
    "--cgv-card-padding",
    "--cgv-grid-gap",
    "--cgv-control-height",
    "--cgv-control-font-size",
  ]) {
    assert.ok(foundation.includes(token), `missing ${token}`);
  }

  assert.match(foundation, /\.metric-grid,[\s\S]*\.course-grid,[\s\S]*gap: var\(--cgv-grid-gap\) !important/);
  assert.match(foundation, /\.welcome-row,[\s\S]*\.section-block,[\s\S]*padding: var\(--cgv-panel-padding\) !important/);
  assert.match(foundation, /\.metric-card,[\s\S]*\.course-card,[\s\S]*padding: var\(--cgv-card-padding\) !important/);
});

test("typography cards and controls share predictable hierarchy", () => {
  assert.match(foundation, /\.welcome-row h2,[\s\S]*font-size: clamp\(/);
  assert.match(foundation, /\.section-heading h3,[\s\S]*\.hero-evaluation h3[\s\S]*font-size: clamp\(/);
  assert.match(foundation, /\.course-card \{[\s\S]*display: flex;[\s\S]*flex-direction: column;/);
  assert.match(foundation, /\.course-card-footer \{[\s\S]*margin-top: auto;/);
  assert.match(foundation, /\.primary-button,[\s\S]*font-size: var\(--cgv-control-font-size\) !important;/);
  assert.match(foundation, /button:focus-visible,[\s\S]*outline: 3px solid/);
});

test("cohesive system preserves mobile density and accessibility fallbacks", () => {
  assert.match(foundation, /@media \(max-width: 760px\) \{[\s\S]*--cgv-panel-padding: 18px;[\s\S]*--cgv-card-padding: 16px;[\s\S]*--cgv-control-height: 46px;/);
  assert.match(foundation, /@media \(forced-colors: active\) \{[\s\S]*outline-color: Highlight;/);
  assert.ok(foundation.includes("body.cgv-reduced-motion *"));
  assert.ok(layout.includes('import "./ui-foundation.css";'));
});
