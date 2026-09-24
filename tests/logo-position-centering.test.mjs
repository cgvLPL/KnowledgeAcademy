import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/logo-position-centering.css");
const client = read("app/exam-client.tsx");

test("centering overrides are the last CSS layer", () => {
  const lastImport = 'import "./logo-position-centering.css";';
  assert.ok(layout.includes(lastImport));
  assert.ok(layout.indexOf(lastImport) > layout.indexOf('import "./mobile-table-cards.css";'));
  assert.ok(css.includes(".boot-screen .boot-content .boot-logo-stage"));
  assert.ok(css.includes(".boot-screen .boot-logo-reveal .brand-logo"));
  assert.ok(css.includes("object-position: center !important"));
});

test("mobile splash logo remains entirely inside its centered stage", () => {
  assert.ok(css.includes("width: min(660px, 82vw) !important"));
  assert.ok(css.includes(".boot-screen .boot-logo-reveal"));
  assert.ok(css.includes("max-width: 100% !important"));
  assert.ok(client.includes("<Logo priority />"));
});

test("mobile login centers the complete shared SVG without altering the sign-in form", () => {
  assert.ok(css.includes("@media (max-width: 860px)"));
  assert.ok(css.includes(".login-page .login-brand-row .brand-lockup"));
  assert.ok(css.includes("justify-content: center !important"));
  assert.ok(css.includes("align-self: center !important"));
  assert.ok(css.includes("left: auto !important"));
  assert.ok(css.includes("right: auto !important"));
  assert.ok(css.includes("width: min(560px, 78vw) !important"));
  assert.ok(client.includes('src={`${publicBasePath}/brand/cgv-knowledge-academy.svg?v=20260924-vector-v2`}'));
  assert.ok(client.includes('className="login-card" onSubmit={submit}'));
});
