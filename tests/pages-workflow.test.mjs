import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const workflowPath = path.join(root, ".github/workflows/deploy-pages.yml");
const obsoleteWorkflowPath = path.join(root, ".github/workflows/deploy.yml");
const workflow = fs.readFileSync(workflowPath, "utf8");

test("GitHub Pages deployment uses supported official action versions", () => {
  assert.ok(workflow.includes("actions/checkout@v6"));
  assert.ok(workflow.includes("actions/setup-node@v6"));
  assert.ok(workflow.includes("actions/configure-pages@v5"));
  assert.ok(workflow.includes("actions/upload-pages-artifact@v4"));
  assert.ok(workflow.includes("actions/deploy-pages@v4"));
  assert.ok(!workflow.includes("actions/configure-pages@v6"));
});

test("only one canonical repository Pages deployment workflow remains", () => {
  assert.ok(fs.existsSync(workflowPath));
  assert.equal(fs.existsSync(obsoleteWorkflowPath), false);
  assert.ok(workflow.includes("name: Publish CGV Knowledge Academy site"));
  assert.ok(workflow.includes("group: knowledge-academy-pages-${{ github.ref }}"));
});

test("Pages workflow keeps required permissions and job dependency", () => {
  assert.ok(workflow.includes("pages: write"));
  assert.ok(workflow.includes("id-token: write"));
  assert.ok(workflow.includes("needs: build"));
  assert.ok(workflow.includes("environment:"));
  assert.ok(workflow.includes("name: github-pages"));
});

test("Pages workflow targets this fork while retaining the Google Apps Script backend", () => {
  assert.ok(workflow.includes("NEXT_PUBLIC_BASE_PATH: /KnowledgeAcademy"));
  assert.ok(workflow.includes("NEXT_PUBLIC_SITE_URL: https://cgvlpl.github.io/KnowledgeAcademy/"));
  assert.ok(workflow.includes("NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL: https://script.google.com/macros/s/AKfycbz0_-mm0ya8mmBf-mCmFGQhRbR4h2GCVJjwtq3iGUTKZUDP8l5p89ahnSyP41rppA78lQ/exec"));
  assert.ok(workflow.includes("grep -q \"/KnowledgeAcademy/\" dist/client/index.html"));
  assert.ok(workflow.includes("/CGV.Exams/"));
});

test("Pages build validates the generated application before artifact upload", () => {
  const buildIndex = workflow.indexOf("npm run build:github-pages");
  const validationIndex = workflow.indexOf("Validate generated site");
  const uploadIndex = workflow.indexOf("actions/upload-pages-artifact@v4");

  assert.ok(buildIndex >= 0 && validationIndex > buildIndex && uploadIndex > validationIndex);
  assert.ok(workflow.includes("test -f dist/client/index.html"));
  assert.ok(workflow.includes("test -d dist/client/assets"));
  assert.ok(!workflow.includes("node --test tests/*.test.mjs"));
});
