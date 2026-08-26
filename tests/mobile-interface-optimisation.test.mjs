import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/mobile-interface-optimisation.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("shared mobile optimisation loads after cohesion and before page-specific table cards", () => {
  const cohesionIndex = layout.indexOf('import "./visual-cohesion-touch-targets.css";');
  const optimisationIndex = layout.indexOf('import "./mobile-interface-optimisation.css";');
  const tableCardsIndex = layout.indexOf('import "./mobile-table-cards.css";');

  assert.ok(cohesionIndex >= 0);
  assert.ok(optimisationIndex > cohesionIndex);
  assert.ok(tableCardsIndex > optimisationIndex);
});

test("phone form controls prevent Safari focus zoom", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /input:not\(\[type="checkbox"\]\)[\s\S]*?textarea,[\s\S]*?select\s*\{[\s\S]*?font-size:\s*16px\s*!important/);
});

test("signed-in chrome respects display cut-outs and keeps bottom navigation tappable", () => {
  assert.match(css, /\.topbar\s*\{[\s\S]*?min-height:\s*calc\(68px \+ env\(safe-area-inset-top\)\)\s*!important/);
  assert.match(css, /\.mobile-nav button\s*\{[\s\S]*?flex:\s*1 1 0\s*!important[\s\S]*?font-size:\s*10px\s*!important[\s\S]*?min-height:\s*48px\s*!important/);
  assert.match(css, /\.mobile-nav button:focus-visible\s*\{[\s\S]*?outline:\s*2px solid currentColor\s*!important/);
});

test("login, drawer, and dialogs use dynamic viewport and safe-area containment", () => {
  assert.match(css, /\.login-page\s*\{[\s\S]*?min-height:\s*100dvh\s*!important[\s\S]*?overflow-y:\s*auto\s*!important/);
  assert.match(css, /body\.cgv-mobile-menu-open \.sidebar\s*\{[\s\S]*?safe-area-inset-top[\s\S]*?safe-area-inset-bottom/);
  assert.match(css, /\.cgv-settings-panel,[\s\S]*?\.cgv-function-modal,[\s\S]*?\.cgv-course-editor-modal\s*\{[\s\S]*?100dvh[\s\S]*?overscroll-behavior-y:\s*contain/);
});

test("mobile transient feedback clears the fixed navigation", () => {
  assert.match(css, /\.cgv-function-toast\s*\{[\s\S]*?bottom:\s*calc\(84px \+ env\(safe-area-inset-bottom\)\)\s*!important/);
});
