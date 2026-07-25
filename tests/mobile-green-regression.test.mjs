import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/final-colour-sidebar-lock.css");
const layout = read("app/layout.tsx");

test("mobile admin UI replaces every visible lime control", () => {
  for (const selector of [
    ".mobile-nav button.active",
    ".setup-actions button > span",
    ".topbar .avatar",
    ".topbar .user-chip .avatar",
  ]) {
    assert.ok(css.includes(selector), `Missing mobile warm-palette override: ${selector}`);
  }

  assert.ok(css.includes("linear-gradient(135deg, var(--cgv-warm-amber), var(--cgv-warm-orange), var(--cgv-warm-red))"));
  assert.ok(css.includes("background-color: var(--cgv-warm-orange) !important"));
  assert.ok(css.includes("@media (max-width: 760px)"));
});

test("mobile warm-palette release marker forces a fresh Pages bundle", () => {
  assert.ok(layout.includes('"cgv-ui-release": "2026.07.25-mobile-no-green-v5"'));
});
