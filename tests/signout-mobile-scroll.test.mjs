import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const enhancer = read("app/session-scroll-enhancer.tsx");
const css = read("app/account-scroll-final.css");
const layout = read("app/layout.tsx");

test("sign out clears persisted session data and has a reload fallback", () => {
  assert.ok(enhancer.includes('"cgv-exams-session-token"'));
  assert.ok(enhancer.includes('"cgv-exams-session-role"'));
  assert.ok(enhancer.includes("window.sessionStorage.removeItem"));
  assert.ok(enhancer.includes("window.localStorage.removeItem"));
  assert.ok(enhancer.includes("keepalive: true"));
  assert.ok(enhancer.includes('!== "sign out"'));
  assert.ok(enhancer.includes("window.location.replace"));
});

test("mobile viewport uses one document scroller and a measured visual viewport", () => {
  assert.ok(enhancer.includes("window.visualViewport?.height"));
  assert.ok(enhancer.includes("--cgv-mobile-viewport-height"));
  assert.ok(css.includes("body:not(.cgv-mobile-menu-open)"));
  assert.ok(css.includes("overscroll-behavior-y: none"));
  assert.ok(css.includes("overflow-y: auto !important"));
  assert.ok(css.includes("height: auto !important"));
  assert.ok(css.includes("min-height: var(--cgv-mobile-viewport-height, 100svh)"));
});

test("account modal cannot inherit the old green palette", () => {
  assert.ok(css.includes(".cgv-admin-account-modal"));
  assert.ok(css.includes(".cgv-admin-account-avatar"));
  assert.ok(css.includes("linear-gradient(145deg, #ffb11f, #ff6a22 58%, #e6322f)"));
  assert.ok(css.includes(".cgv-admin-account-modal .primary-button"));
  assert.ok(css.includes("color: #ffad67 !important"));
});

test("final safeguards load after every historical theme", () => {
  assert.ok(layout.includes('import SessionScrollEnhancer from "./session-scroll-enhancer";'));
  assert.ok(layout.includes('import "./account-scroll-final.css";'));
  assert.ok(layout.indexOf('import "./account-scroll-final.css";') > layout.indexOf('import "./mobile-no-green-v5.css";'));
  assert.ok(layout.includes("<SessionScrollEnhancer />"));
  assert.ok(layout.includes('"cgv-ui-release": "2026.07.25-signout-mobile-scroll-v6"'));
});
