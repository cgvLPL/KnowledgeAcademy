import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/course-table-containment.css");

test("course table icons and text remain contained at every breakpoint", () => {
  assert.match(layout, /import "\.\/course-table-containment\.css";/);

  for (const selector of [
    ".evaluation-icon",
    ".evaluation-icon > svg",
    ".table-card .table-title-cell",
    ".table-card .table-title-cell > .evaluation-icon",
    ".table-card .table-title-cell strong",
    ".table-card .table-title-cell span",
    ".course-card .course-meta",
    "@media (max-width: 760px)",
  ]) {
    assert.ok(css.includes(selector), `Missing course containment safeguard for ${selector}`);
  }

  assert.match(css, /grid-template-columns:\s*38px minmax\(0, 1fr\)/);
  assert.match(css, /max-inline-size:\s*42px\s*!important/);
  assert.match(css, /max-block-size:\s*42px\s*!important/);
  assert.match(css, /font-size:\s*12px\s*!important/);
  assert.match(css, /font-size:\s*9px\s*!important/);
  assert.match(css, /text-size-adjust:\s*100%/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});
