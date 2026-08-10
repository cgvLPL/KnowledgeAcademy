import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/login-static-backdrop.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("login preserves its branded panel and uses the supplied still behind the form", () => {
  assert.doesNotMatch(client, /<BrandAtmosphere variant=/);
  assert.match(css, /url\("\.\/login-backdrop\.jpg"\)/);
  assert.match(css, /repeating-linear-gradient\(/);
  assert.match(css, /\.login-page \.login-card\s*\{/);
});

test("signed-in application surfaces share the still backdrop", () => {
  for (const selector of [".app-shell", ".builder-page", ".quiz-page", ".result-page"]) {
    assert.ok(css.includes(selector), `Missing static backdrop selector: ${selector}`);
  }
  assert.match(css, /\.main-shell\s*\{[\s\S]*?background:\s*transparent\s*!important/);
  assert.match(css, /\.app-shell::before,[\s\S]*?display:\s*none\s*!important/);
});

test("static login backdrop stylesheet wins the login cascade", () => {
  const archivedIndex = layout.indexOf('import "./archived-courses.css";');
  const backdropIndex = layout.indexOf('import "./login-static-backdrop.css";');

  assert.ok(archivedIndex >= 0);
  assert.ok(backdropIndex > archivedIndex);
});
