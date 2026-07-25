import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/mockup-uix-release.css");

test("mockup production layer is loaded last with a visible release marker", () => {
  assert.ok(layout.includes('import "./mockup-uix-release.css";'));
  assert.ok(layout.indexOf('import "./mockup-uix-release.css";') > layout.indexOf('import "./mockup-uix-system.css";'));
  assert.ok(layout.includes('"cgv-ui-release": "2026.07.25-mockup-phone-v2"'));
});

test("desktop mockup palette and primary surfaces are enforced", () => {
  for (const token of [
    "--mockup-orange: #ff6a22",
    "--mockup-amber: #ffad21",
    "--mockup-red: #e6322f",
    ".sidebar-nav button.active",
    ".hero-evaluation",
    ".answer-list button.selected",
    ".score-ring",
  ]) {
    assert.ok(css.includes(token), `Missing production mockup safeguard: ${token}`);
  }
});

test("phone layout has dedicated navigation, dashboard, course, quiz, and table rules", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  for (const selector of [
    ".sidebar",
    ".topbar .mobile-brand",
    ".content",
    ".participant-home .metric-grid",
    ".evaluation-row",
    "grid-template-areas: \"icon main\" \"details details\" \"due due\" \"action action\"",
    ".responsive-table",
    ".quiz-progress-panel",
    ".question-card",
    ".result-actions",
    ".builder-actions",
  ]) {
    assert.ok(css.includes(selector), `Missing phone mockup safeguard: ${selector}`);
  }
  assert.ok(css.includes("env(safe-area-inset-top)"));
  assert.ok(css.includes("env(safe-area-inset-bottom)"));
});
