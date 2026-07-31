import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/final-loading-viewport-fix.css");
const layout = read("app/layout.tsx");

test("final loading and viewport stylesheet is loaded last", () => {
  const finalImport = 'import "./final-loading-viewport-fix.css";';
  assert.ok(layout.includes(finalImport));
  assert.ok(layout.indexOf(finalImport) > layout.indexOf('import "./knowledge-academy-loading.css";'));
  assert.ok(layout.includes('"cgv-ui-release": "2026.07.31-knowledge-academy-brand-v1"'));
});

test("loading lockup, academy label, bar and status are centered", () => {
  assert.ok(css.includes(".boot-content"));
  assert.ok(css.includes("max-width: 960px !important"));
  assert.ok(css.includes("width: min(706px, 74vw) !important"));
  assert.ok(css.includes(".boot-content .brand-lockup"));
  assert.ok(css.includes(".boot-content .brand-academy-label"));
  assert.ok(css.includes("width: 96.14% !important"));
  assert.ok(css.includes("content: none !important"));
  assert.ok(css.includes("margin: 31px auto 0 !important"));
  assert.ok(css.includes("@keyframes boot-progress-fill"));
  assert.ok(css.includes("transform: scaleX(0)"));
  assert.ok(css.includes("overflow: hidden !important"));
  assert.ok(css.includes("animation: boot-progress-fill 2.85s"));
});

test("desktop login artwork and form fill the visible viewport", () => {
  assert.ok(css.includes("@media (min-width: 861px)"));
  assert.ok(css.includes("height: calc(100dvh - 28px) !important"));
  assert.ok(css.includes(".login-page .login-layout::before"));
  assert.ok(css.includes("height: 100% !important"));
  assert.ok(css.includes("align-items: center !important"));
  assert.ok(css.includes(".login-page .login-card > :not(.login-brand-row)"));
  assert.ok(css.includes(".login-page .login-card-heading h1::after"));
  assert.ok(css.includes("text-align: center !important"));
});

test("open phone drawer covers the measured Safari viewport", () => {
  assert.ok(css.includes("body.cgv-mobile-menu-open .sidebar"));
  assert.ok(css.includes("height: var(--cgv-mobile-viewport-height, 100svh) !important"));
  assert.ok(css.includes("position: fixed !important"));
  assert.ok(css.includes("width: 100vw !important"));
  assert.ok(css.includes("margin-top: auto !important"));
});
