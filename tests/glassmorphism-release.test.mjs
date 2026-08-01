import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const layout = read("app/layout.tsx");
const glass = read("app/glassmorphism-release.css");

test("the final layout loads the CGV glass release layer", () => {
  assert.match(layout, /import "\.\/glassmorphism-release\.css"/);
  assert.ok(
    layout.indexOf('import "./glassmorphism-release.css"') >
      layout.indexOf('import "./app-update-enhancer.css"'),
  );
});

test("glass surfaces cover navigation, content, controls, and dialogs", () => {
  for (const selector of [
    ".topbar",
    ".sidebar",
    ".participant-page-header",
    ".metric-card",
    ".course-card",
    ".question-card",
    ".input-shell",
    ".modal-backdrop",
    ".cgv-settings-panel",
    ".cgv-update-content",
    ".mobile-nav",
  ]) {
    assert.ok(glass.includes(selector), `missing glass treatment for ${selector}`);
  }
  assert.match(glass, /backdrop-filter:\s*blur\(/);
  assert.match(glass, /inset 0 1px 0/);
  assert.match(glass, /rgba\(255, 124, 36, 0\.25\)/);
});

test("glass effects retain accessibility and performance fallbacks", () => {
  assert.match(glass, /html\.cgv-low-power/);
  assert.match(glass, /prefers-reduced-transparency:\s*reduce/);
  assert.match(glass, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(glass, /@media print/);
  assert.match(glass, /backdrop-filter:\s*none !important/);
  assert.match(glass, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(glass, /@media \(max-width: 760px\)/);
});

test("scoreboard glass never inherits dark text from legacy light surfaces", () => {
  assert.match(glass, /\.scoreboard-hero select,\s*\n\.scoreboard-hero select:disabled/);
  assert.match(glass, /color:\s*#f7f8f6 !important/);
  assert.match(glass, /-webkit-text-fill-color:\s*#f7f8f6 !important/);
  assert.match(glass, /\.scoreboard-hero select option\s*\{[\s\S]*background:\s*#151718 !important/);
  assert.match(glass, /\.scoreboard-kpis > div\s*\{[\s\S]*rgba\(7, 9, 10, 0\.7\) !important/);
  assert.match(glass, /\.scoreboard-kpis strong\s*\{[\s\S]*color:\s*#ffffff !important/);
  assert.match(glass, /\.scoreboard-kpis small\s*\{[\s\S]*color:\s*#ff9d62 !important/);
});
