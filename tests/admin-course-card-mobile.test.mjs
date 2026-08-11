import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/admin-course-card-mobile-fix.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("the mobile admin quiz-card fix wins the final cascade", () => {
  const stabilityIndex = layout.indexOf('import "./visual-stability-release.css";');
  const cardFixIndex = layout.indexOf('import "./admin-course-card-mobile-fix.css";');

  assert.ok(stabilityIndex >= 0);
  assert.ok(cardFixIndex > stabilityIndex);
});

test("empty quiz metrics no longer stretch mobile cards", () => {
  assert.match(client, /course\.participants \? "course-card-stat" : "course-card-stat is-empty"/);
  assert.match(client, /course\.average \? "course-card-stat" : "course-card-stat is-empty"/);
  assert.match(css, /td\.course-card-stat\.is-empty\s*\{[\s\S]*?display:\s*none\s*!important/);
});

test("populated metrics share one row while actions remain touch friendly", () => {
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)\s*!important/);
  assert.match(css, /td\.course-card-stat\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto\s*!important/);
  assert.match(css, /tr:has\(td\.course-card-stat\.is-empty\)[\s\S]*?grid-column:\s*1 \/ -1\s*!important/);
  assert.match(css, /\.inline-actions button\s*\{[\s\S]*?min-height:\s*44px\s*!important/);
});
