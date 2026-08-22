import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/admin-overview-cohesion.css");

test("admin overview cohesion layer is the final stylesheet", () => {
  const canonical = 'import "./visual-cohesion-system.css";';
  const overview = 'import "./admin-overview-cohesion.css";';
  assert.ok(layout.includes(canonical));
  assert.ok(layout.includes(overview));
  assert.ok(layout.indexOf(overview) > layout.indexOf(canonical));
});

test("dashboard modules share spacing, shell, and metric rhythm", () => {
  for (const token of [
    "--admin-overview-gap",
    "--admin-overview-pad",
    ".admin-overview .admin-metrics",
    ".admin-overview .table-card",
    ".admin-overview .live-quiz-monitor",
    ".live-quiz-monitor__summary button",
    ".admin-overview .premium-podium-card",
  ]) {
    assert.ok(css.includes(token), `Missing dashboard cohesion rule: ${token}`);
  }
});

test("live monitor is visually integrated into the dashboard shell", () => {
  assert.ok(css.includes("margin-top: 0 !important"));
  assert.ok(css.includes("padding: 0 !important"));
  assert.ok(css.includes("border-top: 1px solid rgba(255, 255, 255, 0.07)"));
  assert.ok(css.includes("var(--cgv-cohesion-surface)"));
});

test("responsive dashboard rhythm remains intentional", () => {
  assert.ok(css.includes("@media (max-width: 900px)"));
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("@media (max-width: 430px)"));
  assert.ok(css.includes("@media (forced-colors: active)"));
  assert.ok(css.includes("grid-template-columns: repeat(2, minmax(0, 1fr)) !important"));
  assert.ok(css.includes("grid-template-columns: 1fr !important"));
});
