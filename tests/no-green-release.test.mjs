import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const baseCss = read("app/no-green-release.css");
const finalCss = read("app/final-colour-sidebar-lock.css");

const noGreenImport = 'import "./no-green-release.css";';
const finalImport = 'import "./final-colour-sidebar-lock.css";';
const mobileImport = 'import "./mobile-no-green-v5.css";';

test("the final colour and mobile correction layers are loaded after every theme", () => {
  assert.ok(layout.includes(noGreenImport));
  assert.ok(layout.includes(finalImport));
  assert.ok(layout.includes(mobileImport));
  assert.ok(layout.indexOf(finalImport) > layout.indexOf(noGreenImport));
  assert.ok(layout.indexOf(mobileImport) > layout.indexOf(finalImport));
  assert.match(layout, /"cgv-ui-release": "2026\.07\.25-[^"]+"/);
});

test("legacy green tokens and direct green class variants are warm-mapped", () => {
  for (const token of ["--lime:", "--lime-dark:", "--green:", "--success:", "accent-color: #ff6a22"]) {
    assert.ok(baseCss.includes(token), `Missing no-green token override: ${token}`);
  }

  for (const selector of [
    '[class*="icon-green"]',
    '[class*="accent-green"]',
    '.course-card.accent-green',
    '.status-live',
    '.status-passed',
    '.answer-correct',
    '.chart-bar',
    '.orbit-dot',
    '.question-progress-bars button.answered',
  ]) {
    assert.ok(finalCss.includes(selector), `Missing direct green selector override: ${selector}`);
  }
});

test("selected, completed and focus states use amber orange and red", () => {
  assert.ok(finalCss.includes("--cgv-warm-amber: #ffb11f"));
  assert.ok(finalCss.includes("--cgv-warm-orange: #ff6a22"));
  assert.ok(finalCss.includes("--cgv-warm-red: #e6322f"));
  assert.ok(finalCss.includes("input[type=\"checkbox\"]:checked"));
  assert.ok(finalCss.includes(".question-progress-bars button.current"));
  assert.ok(finalCss.includes(".score-ring"));
  assert.ok(baseCss.includes("button:focus-visible"));
});

test("desktop sidebar is viewport-fixed and main content is offset", () => {
  assert.ok(finalCss.includes("--cgv-sidebar-width: 242px"));
  assert.ok(finalCss.includes("position: fixed !important"));
  assert.ok(finalCss.includes("height: 100dvh !important"));
  assert.ok(finalCss.includes("overflow-y: auto !important"));
  assert.ok(finalCss.includes("margin-left: var(--cgv-sidebar-width) !important"));
  assert.ok(finalCss.includes("width: calc(100% - var(--cgv-sidebar-width)) !important"));
});

test("phone layout removes the desktop sidebar offset", () => {
  assert.ok(finalCss.includes("@media (max-width: 760px)"));
  assert.ok(finalCss.includes("--cgv-sidebar-width: 0px"));
  assert.ok(finalCss.includes("display: none !important"));
  assert.ok(finalCss.includes("margin-left: 0 !important"));
  assert.ok(finalCss.includes("width: 100% !important"));
});

test("loading screen retains responsive red orange vertical light bands", () => {
  assert.ok(baseCss.includes(".boot-screen"));
  assert.ok(baseCss.includes("repeating-linear-gradient("));
  assert.ok(baseCss.includes("rgba(255, 171, 31"));
  assert.ok(baseCss.includes("rgba(228, 47, 31"));
  assert.ok(baseCss.includes("@media (max-width: 760px)"));
  assert.ok(baseCss.includes(".boot-bar span"));
});
