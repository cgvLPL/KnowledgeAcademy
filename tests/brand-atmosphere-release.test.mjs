import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const css = read("app/brand-atmosphere-release.css");

test("the branded atmosphere is installed as the final visual layer", () => {
  const containment = 'import "./mobile-containment-release.css";';
  const atmosphere = 'import "./brand-atmosphere-release.css";';
  assert.ok(layout.includes(atmosphere));
  assert.ok(layout.indexOf(atmosphere) > layout.indexOf(containment));
});

test("decorative atmosphere covers every primary application surface", () => {
  assert.match(client, /function BrandAtmosphere/);
  for (const variant of ["app", "boot", "builder", "login", "quiz", "result"]) {
    assert.ok(client.includes(`<BrandAtmosphere variant="${variant}" />`), `Missing atmosphere variant: ${variant}`);
  }
  assert.ok(client.includes('aria-hidden="true"'));
});

test("warm ribbons, glass grain, light fields, and editorial frames stay accessible", () => {
  for (const token of [
    "--cgv-atmosphere-amber: #ffb11f",
    "--cgv-atmosphere-orange: #ff6a22",
    "--cgv-atmosphere-red: #e6322f",
    ".brand-atmosphere-ribbon",
    ".brand-atmosphere-lightfield",
    ".brand-atmosphere-grain",
    ".participant-page-header::before",
    "pointer-events: none",
  ]) {
    assert.ok(css.includes(token), `Missing atmosphere safeguard: ${token}`);
  }
  assert.ok(css.includes("html.cgv-low-power .brand-atmosphere-ribbon"));
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("@media (prefers-reduced-transparency: reduce)"));
  assert.ok(css.includes("@media print"));
});
