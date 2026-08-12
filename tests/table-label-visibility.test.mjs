import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/table-label-visibility.css");

test("table label visibility layer loads after the shared shape system", () => {
  assert.ok(layout.includes('import "./table-label-visibility.css";'));
  assert.ok(
    layout.indexOf('import "./table-label-visibility.css";')
      > layout.indexOf('import "./shape-system.css";'),
  );
});

test("desktop and tablet table headers keep explicit high-contrast labels", () => {
  assert.ok(css.includes(".table-card thead th,"));
  assert.ok(css.includes(".responsive-table thead th,"));
  assert.ok(css.includes("color: var(--cgv-table-label) !important"));
  assert.ok(css.includes("-webkit-text-fill-color: var(--cgv-table-label) !important"));
  assert.ok(css.includes("opacity: 1 !important"));
  assert.ok(css.includes("font-weight: 800 !important"));
});

test("mobile history and participant card labels remain readable", () => {
  assert.ok(css.includes(".history-results-table tbody tr:not(.empty-table-row) td[data-label]::before"));
  assert.ok(css.includes(".participants-management-table tbody tr:not(.empty-table-row) td[data-label]::before"));
  assert.ok(css.includes("color: var(--cgv-table-label-mobile) !important"));
  assert.ok(css.includes("font-size: max(10px, 0.625rem) !important"));
  assert.ok(css.includes("letter-spacing: 0.09em !important"));
});

test("table labels preserve forced-colour accessibility", () => {
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.ok(css.includes("color: CanvasText !important"));
  assert.ok(css.includes("text-shadow: none"));
});
