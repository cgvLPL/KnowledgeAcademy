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
  assert.ok(workflow.includes("name: Publish CGV Exams site"));
  assert.ok(workflow.includes("group: cgv-exams-pages-${{ github.ref }}"));
});

test("Pages workflow keeps required permissions and job dependency", () => {
  assert.ok(workflow.includes("pages: write"));
  assert.ok(workflow.includes("id-token: write"));
  assert.ok(workflow.includes("needs: build"));
  assert.ok(workflow.includes("environment:"));
  assert.ok(workflow.includes("name: github-pages"));
});

test("Pages build validates the generated application before artifact upload", () => {
  const buildIndex = workflow.indexOf("npm run build:github-pages");
  const validationIndex = workflow.indexOf("Validate generated site");
  const uploadIndex = workflow.indexOf("actions/upload-pages-artifact@v4");

  assert.ok(buildIndex >= 0 && validationIndex > buildIndex && uploadIndex > validationIndex);
  assert.ok(workflow.includes("test -f dist/client/index.html"));
  assert.ok(workflow.includes("test -d dist/client/_next"));
  assert.ok(!workflow.includes("node --test tests/*.test.mjs"));
});
