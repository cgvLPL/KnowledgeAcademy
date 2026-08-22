import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globals = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const fix = readFileSync(new URL("../app/table-header-visibility-fix.css", import.meta.url), "utf8");

test("dark application tables override the generic light table-header cells", () => {
  assert.match(globals, /th\s*\{[\s\S]*?background:\s*#f6f7f5/);
  assert.match(fix, /\.course-management-table thead th/);
  assert.match(fix, /background:\s*#181a18\s*!important/);
  assert.match(fix, /color:\s*#e6ebe4\s*!important/);
  assert.match(fix, /-webkit-text-fill-color:\s*#e6ebe4\s*!important/);
});

test("table visibility lock loads after the canonical UI foundation", () => {
  const foundation = layout.indexOf('import "./ui-foundation.css";');
  const visibilityFix = layout.indexOf('import "./table-header-visibility-fix.css";');
  assert.ok(foundation >= 0, "UI foundation import is missing");
  assert.ok(visibilityFix > foundation, "table header visibility fix must load after UI foundation");
});
