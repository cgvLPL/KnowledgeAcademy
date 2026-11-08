import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../app/liquid-glass.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

function ruleBody(selector) {
  const index = css.indexOf(`\n${selector}`);
  assert.ok(index >= 0, `missing rule for ${selector}`);
  return css.slice(index, css.indexOf("}", index));
}

test("the Liquid Glass layer is the final stylesheet and is cascade-layered", () => {
  const imports = [...layout.matchAll(/^import "\.\/([^"]+\.css)";/gm)].map((match) => match[1]);
  assert.equal(imports.at(-1), "liquid-glass.css");
  assert.match(css, /^@layer liquid-glass \{/m);
});

test("glass is applied to navigation, not to content", () => {
  for (const selector of ["  .sidebar", "  .mobile-nav"]) {
    assert.match(ruleBody(selector), /backdrop-filter: (var\(--lg-glass-filter|blur\()/);
  }
  const content = css.slice(css.indexOf("Content layer: standard materials"));
  const cards = content.slice(0, content.indexOf("}"));
  assert.match(cards, /\.metric-card/);
  assert.match(cards, /\.table-card/);
  assert.match(cards, /\.question-card/);
  assert.match(cards, /backdrop-filter: none !important/);
});

test("only the primary action is tinted, with a legible label", () => {
  assert.match(css, /--lg-tint: #c93d0b/);
  const primary = ruleBody("  .primary-button,\n  .login-button,\n  .hero-button");
  assert.match(primary, /var\(--lg-tint\)/);
  assert.match(primary, /color: #fff/);
  const secondary = ruleBody("  .secondary-button,\n  .row-button");
  assert.doesNotMatch(secondary, /--lg-tint/);
});

test("accessibility preferences and missing backdrop-filter are handled", () => {
  for (const query of [
    "@media (prefers-reduced-transparency: reduce)",
    "@media (prefers-contrast: more)",
    "@media (prefers-reduced-motion: reduce)",
    "@media (forced-colors: active)",
    "@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px)))",
  ]) {
    assert.ok(css.includes(query), `missing ${query}`);
  }
  assert.match(css, /:focus-visible \{\s*outline: 2px solid/);
});

test("controls use capsules and sheets use the larger concentric radius", () => {
  assert.match(css, /--lg-capsule: 999px/);
  assert.match(css, /--lg-radius-sheet: 34px/);
  assert.match(ruleBody("  .mobile-nav"), /border-radius: var\(--lg-capsule\)/);
});

test("text alignment follows HIG reading order", () => {
  const alignment = css.slice(css.indexOf("Text alignment. HIG reading order"));
  assert.match(alignment, /\.sidebar-nav button,\s*\.sidebar-bottom button \{\s*justify-content: flex-start !important;\s*text-align: start !important;/);
  assert.match(alignment, /\.question-card h2/);
  assert.match(alignment, /text-align: end !important/, "numeric columns align trailing");
  assert.match(alignment, /font-variant-numeric: tabular-nums !important/);
  assert.doesNotMatch(alignment, /text-align: left|text-align: right/, "use logical start/end for RTL safety");
});
