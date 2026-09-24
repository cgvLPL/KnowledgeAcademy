import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (filename) => fs.readFileSync(path.join(root, filename), "utf8");
const count = (source, token) => source.split(token).length - 1;

const brand = read("public/brand/cgv-knowledge-academy.svg");
const mark = read("public/brand/cgv-mark.svg");
const favicon = read("public/favicon.svg");
const client = read("app/exam-client.tsx");
const updater = read("app/app-update-enhancer.tsx");
const layout = read("app/layout.tsx");

test("README and in-app branding use the same sharp SVG", () => {
  assert.ok(brand.includes('viewBox="0 0 1450 320"'));
  assert.equal(count(brand, "<path "), 7);
  for (const obsolete of ["<image", "<filter", "base64"]) {
    assert.ok(!brand.includes(obsolete), `Logo must not contain ${obsolete}`);
  }
  assert.ok(read("README.md").includes("public/brand/cgv-knowledge-academy.svg"));
  for (const module of [client, updater]) {
    assert.ok(module.includes("cgv-knowledge-academy.svg?v=20260924-vector-v2"));
    assert.ok(module.includes("height={320}"));
  }
  for (const stylesheet of ["app/logo-lockup.css", "app/brand-system.css"]) {
    assert.ok(read(stylesheet).includes("aspect-ratio: 1450 / 320 !important"));
  }
});

test("print, reports, and browser use the original CGV vector", () => {
  assert.equal(count(mark, "<path "), 7);
  assert.equal(count(mark, 'fill="url(#cgv-spark)"'), 6);
  assert.ok(client.includes("brand/cgv-mark.svg?v=20260924-vector-v2"));
  assert.ok(!client.includes("cgv-logo.svg"));
  assert.ok(read("app/certificate.css").includes("aspect-ratio: 426 / 188"));
  assert.ok(read("app/executive-report.ts").includes("context.drawImage(image, 0, 0, canvas.width, canvas.height)"));
  assert.equal(count(favicon, "<path "), 7);
  assert.ok(layout.includes('publicAssetUrl("/favicon.svg")'));
  const manifest = JSON.parse(read("public/site.webmanifest"));
  assert.equal(manifest.icons[0].src, "favicon.svg");
});
