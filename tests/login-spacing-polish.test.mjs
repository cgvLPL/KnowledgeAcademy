import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app/login-spacing-polish.css"), "utf8");

test("login spacing polish is the final stylesheet in the cascade", () => {
  const performanceIndex = layout.indexOf('import "./performance-release.css";');
  const spacingIndex = layout.indexOf('import "./login-spacing-polish.css";');
  assert.ok(performanceIndex >= 0);
  assert.ok(spacingIndex > performanceIndex);
});

test("login logo grows while the form stack remains compact and responsive", () => {
  assert.match(css, /\.login-page \.login-brand-row\s*\{[\s\S]*?width:\s*min\(44vw, 660px\)\s*!important/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*?width:\s*min\(500px, 90vw\)\s*!important/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*?width:\s*min\(370px, 90vw\)\s*!important/);
  assert.match(css, /\.login-page \.login-card-heading\s*\{[\s\S]*?margin-bottom:\s*clamp\(18px, 2\.2vh, 22px\)\s*!important/);
  assert.match(css, /\.login-page \.role-switch\s*\{[\s\S]*?margin-bottom:\s*clamp\(16px, 2vh, 20px\)\s*!important/);
  assert.match(css, /\.login-page \.field-label\s*\{[\s\S]*?margin-bottom:\s*clamp\(12px, 1\.6vh, 15px\)\s*!important/);
  assert.match(css, /@media \(max-width: 860px\) and \(max-height: 700px\)/);
});
