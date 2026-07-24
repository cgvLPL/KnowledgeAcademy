import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const layout = read("app/layout.tsx");
const enhancer = read("app/admin-avatar-enhancer.tsx");
const css = read("app/admin-avatar-fix.css");

test("administrator avatars use first and last initials with fixed proportions", () => {
  assert.match(layout, /AdminAvatarEnhancer/);
  assert.match(layout, /import "\.\/admin-avatar-fix\.css";/);
  assert.match(enhancer, /words\.at\(-1\)/);
  assert.match(enhancer, /\.user-chip/);
  assert.match(enhancer, /cgv-admin-account-avatar/);
  assert.match(enhancer, /MutationObserver/);
  assert.match(css, /aspect-ratio:\s*1 \/ 1/);
  assert.match(css, /min-inline-size:\s*40px\s*!important/);
  assert.match(css, /max-inline-size:\s*40px\s*!important/);
  assert.match(css, /\.cgv-admin-account-avatar/);
  assert.match(css, /border-radius:\s*50%/);
});
