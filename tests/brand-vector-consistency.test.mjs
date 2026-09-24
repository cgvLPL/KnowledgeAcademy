import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
const brand = read("public/brand/cgv-knowledge-academy.svg");
const mark = read("public/brand/cgv-mark.svg");
const favicon = read("public/favicon.svg");
const client = read("app/exam-client.tsx");
const updater = read("app/app-update-enhancer.tsx");
const layout = read("app/layout.tsx");

test("the app, README, and update screen share the crisp corrected vector logo", () => {
  assert.match(brand, /viewBox="0 0 1450 320"/);
  assert.equal((brand.match(/<path\\b/g) || []).length, 7);
  assert.doesNotMatch(brand, /<image\\b|<filter\\b|base64/);
  assert.match(read("README.md"), /public\\/brand\\/cgv-knowledge-academy\\.svg/);
  for (const module of [client, updater]) {
    assert.match(module, /cgv-knowledge-academy\\.svg\\?v=20260924-vector-v2/);
    assert.match(module, /height=\\{320\\}/);
  }
  for (const stylesheet of ["app/logo-lockup.css", "app/brand-system.css"]) {
    assert.match(read(stylesheet), /aspect-ratio: 1450 \\/ 320 !important/);
  }
});

test("certificate, reports, and browser icon use the standalone genuine CGV vector", () => {
  assert.equal((mark.match(/<path\\b/g) || []).length, 7);
  assert.equal((mark.match(/fill="url\\(#cgv-spark\\)"/g) || []).length, 6);
  assert.match(client, /brand\\/cgv-mark\\.svg\\?v=20260924-vector-v2/);
  assert.match(client, /loadExecutiveReportLogo\\(/);
  assert.match(favicon, /aria-label="CGV Knowledge Academy"/);
  assert.match(layout, /publicAssetUrl\\("\\/favicon\\.svg"\\)/);
  const manifest = JSON.parse(read("public/site.webmanifest"));
  assert.equal(manifest.icons[0].src, "favicon.svg");
});
