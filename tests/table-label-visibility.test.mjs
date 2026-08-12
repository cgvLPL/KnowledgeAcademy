import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/ui-foundation.css");

test("table label safeguards live in the canonical final UI foundation", () => {
  assert.ok(layout.includes('import "./ui-foundation.css";'));
  assert.ok(layout.indexOf('import "./ui-foundation.css";') > layout.indexOf('import "./mobile-sidebar-bottom-actions.css";'));
  assert.ok(css.indexOf("2. TABLE LABEL VISIBILITY") > css.indexOf("1. SHAPE SYSTEM"));
  assert.ok(css.indexOf("3. APPLICATION-WIDE VISUAL POLISH") > css.indexOf("2. TABLE LABEL VISIBILITY"));
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
