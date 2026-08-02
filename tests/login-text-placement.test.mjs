import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/login-text-placement.css", import.meta.url),
  "utf8",
);
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("login heading stylesheet is loaded last", () => {
  const certificateIndex = layout.indexOf('import "./certificate.css";');
  const placementIndex = layout.indexOf('import "./login-text-placement.css";');

  assert.ok(certificateIndex >= 0);
  assert.ok(placementIndex > certificateIndex);
});

test("login title stays on the centered form axis without a subtitle", () => {
  assert.match(css, /\.login-page \.login-card-heading\s*\{/);
  assert.match(css, /align-items:\s*center\s*!important/);
  assert.match(css, /max-width:\s*560px\s*!important/);
  assert.match(css, /text-align:\s*center\s*!important/);
  assert.match(css, /width:\s*100%\s*!important/);

  assert.doesNotMatch(css, /\.field-label/);
  assert.doesNotMatch(css, /\.text-button/);
});
