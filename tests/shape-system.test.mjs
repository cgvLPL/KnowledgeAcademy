import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const shapes = read("app/shape-system.css");

test("cohesive shape system loads after legacy release layers", () => {
  assert.ok(layout.includes('import "./shape-system.css";'));
  assert.ok(layout.indexOf('import "./shape-system.css";') > layout.indexOf('import "./mobile-sidebar-bottom-actions.css";'));
});

test("shape system exposes a small shared radius hierarchy", () => {
  assert.ok(shapes.includes("--cgv-shape-hero: 24px"));
  assert.ok(shapes.includes("--cgv-shape-panel: 20px"));
  assert.ok(shapes.includes("--cgv-shape-card: 16px"));
  assert.ok(shapes.includes("--cgv-shape-control: 12px"));
  assert.ok(shapes.includes("--cgv-shape-pill: 999px"));
});

test("cards controls and semantic pills use their shared silhouettes", () => {
  assert.ok(shapes.includes(".course-card,"));
  assert.ok(shapes.includes(".evaluation-row,"));
  assert.ok(shapes.includes("border-radius: var(--cgv-shape-card) !important"));
  assert.ok(shapes.includes(".primary-button,"));
  assert.ok(shapes.includes(".sidebar-bottom button,"));
  assert.ok(shapes.includes("border-radius: var(--cgv-shape-control) !important"));
  assert.ok(shapes.includes(".outcome-pill,"));
  assert.ok(shapes.includes("border-radius: var(--cgv-shape-pill) !important"));
});

test("intentional circular UI stays circular", () => {
  assert.ok(shapes.includes(".cgv-admin-account-avatar,"));
  assert.ok(shapes.includes(".score-ring,"));
  assert.ok(shapes.includes("border-radius: 50% !important"));
});
