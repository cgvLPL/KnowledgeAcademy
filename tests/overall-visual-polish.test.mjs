import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/overall-visual-polish.css");

test("overall visual polish loads after shape and table visibility safeguards", () => {
  const polish = 'import "./overall-visual-polish.css";';
  assert.ok(layout.includes(polish));
  assert.ok(layout.indexOf(polish) > layout.indexOf('import "./shape-system.css";'));
  assert.ok(layout.indexOf(polish) > layout.indexOf('import "./table-label-visibility.css";'));
});

test("visual polish defines a shared surface and depth hierarchy", () => {
  assert.ok(css.includes("--cgv-visual-surface:"));
  assert.ok(css.includes("--cgv-visual-surface-raised:"));
  assert.ok(css.includes("--cgv-visual-border:"));
  assert.ok(css.includes("--cgv-visual-shadow:"));
  assert.ok(css.includes("--cgv-visual-shadow-raised:"));
});

test("cards navigation controls and tables receive the polished treatment", () => {
  assert.ok(css.includes(".course-card,"));
  assert.ok(css.includes(".metric-card,"));
  assert.ok(css.includes(".sidebar-nav button,"));
  assert.ok(css.includes(".primary-button,"));
  assert.ok(css.includes(".table-card thead th,"));
  assert.ok(css.includes(".responsive-table tbody td"));
});

test("table label visibility remains explicitly protected", () => {
  assert.ok(css.includes("var(--cgv-table-label, #d7ddd5)"));
  assert.ok(css.includes("var(--cgv-table-label-mobile, #dde3dc)"));
  assert.match(css, /\.history-results-table td\[data-label\]::before,[\s\S]*?opacity:\s*1 !important;/);
});

test("hover polish only runs on precise hover-capable pointers", () => {
  assert.ok(css.includes("@media (hover: hover) and (pointer: fine)"));
  assert.ok(css.includes("transform: translateY(-2px)"));
});

test("mobile and reduced-motion safeguards remain part of the final layer", () => {
  assert.ok(css.includes("body.cgv-reduced-motion *"));
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes(".mobile-nav"));
  assert.ok(css.includes("padding-bottom: calc(98px + env(safe-area-inset-bottom))"));
});
