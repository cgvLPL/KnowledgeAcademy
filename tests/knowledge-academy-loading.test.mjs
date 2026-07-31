import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/knowledge-academy-loading.css");
const finalCss = read("app/final-loading-viewport-fix.css");
const visibilityCss = read("app/brand-visibility-polish.css");
const layout = read("app/layout.tsx");
const logo = read("public/cgv-logo.svg");
const logoCss = read("app/logo-lockup.css");
const client = read("app/exam-client.tsx");

test("Knowledge Academy artwork remains installed beneath the final alignment layer", () => {
  const artworkImport = 'import "./knowledge-academy-loading.css";';
  const finalImport = 'import "./final-loading-viewport-fix.css";';

  assert.ok(layout.includes(artworkImport));
  assert.ok(layout.includes(finalImport));
  assert.ok(layout.includes('import "./brand-visibility-polish.css";'));
  assert.ok(layout.indexOf(artworkImport) > layout.indexOf('import "./account-scroll-final.css";'));
  assert.ok(layout.indexOf(finalImport) > layout.indexOf(artworkImport));
  assert.ok(
    layout.indexOf('import "./brand-visibility-polish.css";') >
      layout.indexOf('import "./admin-header-consistency.css";'),
  );

  const release = layout.match(/"cgv-ui-release":\s*"([^"]+)"/u)?.[1] || "";
  assert.match(release, /^2026\.07\.\d{2}-[a-z0-9-]+-v\d+$/u);
});

test("loading screen uses the real CGV SVG and a visible Knowledge Academy lockup", () => {
  assert.ok(logo.includes("<svg"));
  assert.ok(logo.includes("transparent background"));
  assert.ok(client.includes("cgv-knowledge-academy.svg"));
  assert.ok(client.includes("<Logo priority />"));
  assert.equal(client.match(/cgv-logo\.svg/g)?.length, 1);
  assert.ok(logoCss.includes(".brand-logo"));
  assert.ok(visibilityCss.includes("background: transparent !important"));
  assert.ok(visibilityCss.includes("width: min(820px, 84vw) !important"));
  assert.ok(visibilityCss.includes("font-weight: 650 !important"));
  assert.ok(visibilityCss.includes(".boot-content .brand-academy-label"));
  assert.ok(visibilityCss.includes("text-shadow: 0 3px 14px"));
  assert.ok(finalCss.includes("content: none !important"));
  assert.ok(css.includes(".boot-content img"));
});

test("shared logo remains prominent without overflowing smaller surfaces", () => {
  for (const selector of [
    ".sidebar .brand-logo",
    ".quiz-header .brand-logo",
    ".login-page .login-brand-row",
    ".mobile-brand .brand-logo",
    "@media (max-width: 420px)",
  ]) {
    assert.ok(visibilityCss.includes(selector), `Missing visibility sizing for ${selector}`);
  }

  assert.ok(visibilityCss.includes("width: min(42vw, 620px) !important"));
  assert.ok(visibilityCss.includes("width: 208px !important"));
  assert.ok(visibilityCss.includes("color: #fff !important"));
});

test("loading backdrop and progress styling match the approved orange mockup", () => {
  assert.ok(css.includes("radial-gradient(ellipse at 28% 36%"));
  assert.ok(css.includes("filter: blur(34px)"));
  assert.ok(css.includes("#ffbf3a"));
  assert.ok(css.includes("#ff4d1d"));
  assert.ok(finalCss.includes("width: min(706px, 74vw) !important"));
});

test("loading screen remains responsive and respects reduced motion", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(finalCss.includes("var(--cgv-mobile-viewport-height, 100svh)"));
  assert.ok(finalCss.includes("@media (prefers-reduced-motion: reduce)"));
});
