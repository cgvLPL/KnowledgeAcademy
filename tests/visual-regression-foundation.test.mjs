import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const workflow = read(".github/workflows/verify-pr.yml");
const config = read("tests/visual/playwright.config.mjs");
const spec = read("tests/visual/ui.visual.spec.mjs");
const foundation = read("app/ui-foundation.css");

test("visual regression suite is wired into pull request verification", () => {
  assert.ok(workflow.includes("Install visual regression browser"));
  assert.ok(workflow.includes("@playwright/test@1.55.0"));
  assert.ok(workflow.includes("Run responsive visual regression suite"));
  assert.ok(workflow.includes("Upload visual regression artifacts"));
  assert.ok(workflow.includes("test-results/visual-artifacts"));
});

test("visual regression runner resolves the Pages artifact from the repository root", () => {
  assert.ok(config.includes('path.resolve(import.meta.dirname, "../..")'));
  assert.ok(config.includes('path.join(root, "dist/client")'));
  assert.ok(config.includes('path.join(root, "test-results/visual-artifacts")'));
  assert.ok(config.includes('ln -sfn . "${dist}/KnowledgeAcademy"'));
  assert.ok(config.includes("python3 -m http.server 4173 --directory"));
  assert.ok(config.includes("http://127.0.0.1:4173/KnowledgeAcademy/index.html"));
});

test("responsive visual fixture covers the requested mobile tablet and desktop widths", () => {
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    assert.ok(spec.includes(`width: ${width}`), `missing ${width}px visual regression viewport`);
  }
  assert.ok(spec.includes("document.documentElement.scrollWidth"));
  assert.ok(spec.includes("td[data-label=\"Position\"]"));
  assert.ok(spec.includes("page.screenshot"));
});

test("canonical foundation preserves shape labels polish and accessibility sections", () => {
  assert.ok(foundation.includes("1. SHAPE SYSTEM"));
  assert.ok(foundation.includes("2. TABLE LABEL VISIBILITY"));
  assert.ok(foundation.includes("3. APPLICATION-WIDE VISUAL POLISH"));
  assert.ok(foundation.includes("@media (forced-colors: active)"));
  assert.ok(foundation.includes("body.cgv-reduced-motion *"));
});
