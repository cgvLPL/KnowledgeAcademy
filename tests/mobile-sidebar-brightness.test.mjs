import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/button-safety-net.css", import.meta.url), "utf8");
const interactions = await readFile(new URL("../app/app-interactions.tsx", import.meta.url), "utf8");

test("opening the mobile sidebar does not darken the screen", () => {
  assert.match(
    css,
    /\.button-safety-menu-overlay\s*\{[\s\S]*?background:\s*transparent\s*;/,
  );
  assert.doesNotMatch(
    css,
    /\.button-safety-menu-overlay\s*\{[\s\S]*?background:\s*rgba\(0,\s*0,\s*0,/,
  );
});

test("the transparent overlay still closes the sidebar when tapped", () => {
  assert.match(interactions, /className="button-safety-menu-overlay"/);
  assert.match(interactions, /aria-label="Close menu"/);
  assert.match(interactions, /onClick=\{closeMobileMenu\}/);
  assert.match(interactions, /const closeMobileMenu = useCallback\(\(\) => setMobileMenuOpen\(false\), \[\]\)/);
});
