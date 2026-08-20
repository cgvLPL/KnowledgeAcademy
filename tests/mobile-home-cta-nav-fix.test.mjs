import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const css = fs.readFileSync(path.join(root, "app/mobile-home-cta-nav-fix.css"), "utf8");
const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");

test("mobile navigation keeps active tile inset inside its outer pill", () => {
  assert.match(css, /\.mobile-nav \{[\s\S]*?padding:\s*7px !important;/);
  assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\) !important;/);
  assert.match(css, /\.mobile-nav button \{[\s\S]*?min-inline-size:\s*0 !important;/);
  assert.match(css, /\.mobile-nav button\.active,[\s\S]*?border-radius:\s*14px !important;/);
  assert.match(css, /overflow:\s*visible !important;/);
});

test("mobile start evaluation CTA keeps label centered and arrow safely inset", () => {
  assert.match(css, /\.participant-home \.hero-button \{[\s\S]*?min-height:\s*60px !important;/);
  assert.match(css, /padding:\s*0 68px 0 20px !important;/);
  assert.match(css, /\.participant-home \.hero-button > span \{[\s\S]*?height:\s*44px !important;/);
  assert.match(css, /right:\s*8px !important;/);
  assert.match(css, /transform:\s*translateY\(-50%\) !important;/);
});

test("mobile home fix loads after the canonical UI foundation", () => {
  const foundationIndex = layout.indexOf('import "./ui-foundation.css";');
  const fixIndex = layout.indexOf('import "./mobile-home-cta-nav-fix.css";');
  assert.ok(foundationIndex >= 0);
  assert.ok(fixIndex > foundationIndex);
});
