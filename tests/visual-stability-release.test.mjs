import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/visual-stability-release.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("the visual stability layer wins the application cascade", () => {
  const knowledgeIndex = layout.indexOf('import "./knowledge-centre.css";');
  const stabilityIndex = layout.indexOf('import "./visual-stability-release.css";');

  assert.ok(knowledgeIndex >= 0);
  assert.ok(stabilityIndex > knowledgeIndex);
});

test("login controls remain legible, aligned, and touch friendly", () => {
  assert.match(client, /placeholder="Enter your password"/);
  assert.match(css, /\.login-page \.login-options\s*\{[\s\S]*?justify-content:\s*flex-end\s*!important/);
  assert.match(css, /\.login-page \.input-action\s*\{[\s\S]*?min-width:\s*44px/);
  assert.match(css, /\.login-page \.text-button\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(css, /\.login-page \.login-card::after\s*\{[\s\S]*?color:\s*#929894\s*!important/);
});

test("dialogs and long account positions stay usable", () => {
  assert.match(css, /\.modal-close\s*\{[\s\S]*?height:\s*44px\s*!important[\s\S]*?width:\s*44px\s*!important/);
  assert.match(css, /\.cgv-function-modal > \.field-label,[\s\S]*?width:\s*100%/);
  assert.match(css, /\.profile-copy p,[\s\S]*?\.detail-grid strong\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
});

test("participant data uses a stable desktop table and balanced mobile cards", () => {
  assert.match(css, /\.participants-management-table\s*\{[\s\S]*?min-width:\s*920px[\s\S]*?table-layout:\s*fixed/);
  assert.match(css, /td\[data-label="Position"\],[\s\S]*?td\[data-label="Branch"\],[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?min-width:\s*0\s*!important[\s\S]*?table-layout:\s*auto\s*!important/);
  assert.match(css, /td\[data-label="Status"\]\s*\{[\s\S]*?grid-column:\s*1 \/ -1\s*!important/);
});
