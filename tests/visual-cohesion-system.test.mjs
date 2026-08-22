import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/visual-cohesion-system.css");

test("visual cohesion layer is loaded last", () => {
  const tableFix = 'import "./table-header-visibility-fix.css";';
  const podium = 'import "./podium-leaderboard.css";';
  const cohesion = 'import "./visual-cohesion-system.css";';

  assert.ok(layout.includes(tableFix));
  assert.ok(layout.includes(podium));
  assert.ok(layout.includes(cohesion));
  assert.ok(layout.indexOf(podium) > layout.indexOf(tableFix));
  assert.ok(layout.indexOf(cohesion) > layout.indexOf(podium));
});

test("cohesion layer defines canonical visual tokens", () => {
  for (const token of [
    "--cgv-cohesion-bg: #090a09",
    "--cgv-cohesion-surface:",
    "--cgv-cohesion-text: #f6f7f4",
    "--cgv-cohesion-accent: #ff6a22",
    "--cgv-cohesion-radius-panel: 20px",
    "--cgv-cohesion-radius-control: 12px",
    "--cgv-cohesion-shadow:",
    "--cgv-cohesion-focus: #ffb11f",
  ]) {
    assert.ok(css.includes(token), `Missing cohesion token: ${token}`);
  }
});

test("major surfaces, controls, tables, and navigation share the system", () => {
  for (const selector of [
    ".table-card",
    ".live-quiz-monitor",
    ".premium-podium-card",
    ".primary-button",
    ".secondary-button",
    ".sidebar-nav button.active",
    ".table-card thead th",
    ".live-quiz-monitor thead th",
  ]) {
    assert.ok(css.includes(selector), `Missing cohesion coverage: ${selector}`);
  }

  assert.ok(css.includes("background: transparent !important;"));
  assert.ok(css.includes("-webkit-text-fill-color: #dce2db !important;"));
});

test("scoreboard award colors and monitor statuses are standardized", () => {
  for (const token of [
    "--cgv-cohesion-gold: #d9b84c",
    "--cgv-cohesion-silver: #cfd5d2",
    "--cgv-cohesion-bronze: #d9a27e",
    ".live-status--active",
    ".live-status--idle",
    ".live-status--disconnected",
    ".live-status--completed",
    ".podium-rank-1 .premium-podium-base",
    ".podium-rank-2 .premium-podium-base",
    ".podium-rank-3 .premium-podium-base",
  ]) {
    assert.ok(css.includes(token), `Missing semantic visual rule: ${token}`);
  }
});

test("accessibility and responsive safeguards remain part of the final layer", () => {
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.ok(css.includes("@media print"));
  assert.ok(css.includes("env(safe-area-inset-left)"));
  assert.ok(css.includes("env(safe-area-inset-right)"));
});
