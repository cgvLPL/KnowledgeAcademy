import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const foundation = read("app/ui-foundation.css");

test("canonical UI foundation replaces the separate final visual layers", () => {
  assert.ok(layout.includes('import "./ui-foundation.css";'));
  assert.equal(layout.includes('import "./shape-system.css";'), false);
  assert.equal(layout.includes('import "./table-label-visibility.css";'), false);
  assert.equal(layout.includes('import "./overall-visual-polish.css";'), false);
  assert.equal(fs.existsSync(path.join(root, "app/shape-system.css")), false);
  assert.equal(fs.existsSync(path.join(root, "app/table-label-visibility.css")), false);
  assert.equal(fs.existsSync(path.join(root, "app/overall-visual-polish.css")), false);
});

test("shape system exposes a small shared radius hierarchy", () => {
  assert.ok(foundation.includes("--cgv-shape-hero: 24px"));
  assert.ok(foundation.includes("--cgv-shape-panel: 20px"));
  assert.ok(foundation.includes("--cgv-shape-card: 16px"));
  assert.ok(foundation.includes("--cgv-shape-control: 12px"));
  assert.ok(foundation.includes("--cgv-shape-pill: 999px"));
});

test("cards controls and semantic pills use their shared silhouettes", () => {
  assert.ok(foundation.includes(".course-card,"));
  assert.ok(foundation.includes(".evaluation-row,"));
  assert.ok(foundation.includes("border-radius: var(--cgv-shape-card) !important"));
  assert.ok(foundation.includes(".primary-button,"));
  assert.ok(foundation.includes(".sidebar-bottom button,"));
  assert.ok(foundation.includes("border-radius: var(--cgv-shape-control) !important"));
  assert.ok(foundation.includes(".outcome-pill,"));
  assert.ok(foundation.includes("border-radius: var(--cgv-shape-pill) !important"));
});

test("intentional circular UI stays circular", () => {
  assert.ok(foundation.includes(".cgv-admin-account-avatar,"));
  assert.ok(foundation.includes(".score-ring,"));
  assert.ok(foundation.includes("border-radius: 50% !important"));
});
