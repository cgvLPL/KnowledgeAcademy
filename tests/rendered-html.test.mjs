import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const renderedIndex = path.join(root, "dist/client/index.html");
const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("static Pages output omits development preview metadata", () => {
  assert.ok(fs.existsSync(renderedIndex), "Static Pages index.html was not generated");
  const html = fs.readFileSync(renderedIndex, "utf8");

  assert.match(html, /<html\b/i);
  assert.match(html, /CGV Knowledge Academy/i);
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.doesNotMatch(html, /\/workspace\/sites\/|\.vinext\/fonts/);
});
