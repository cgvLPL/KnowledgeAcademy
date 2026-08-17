import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const interactions = read("app/app-interactions.tsx");
const enhancer = read("app/session-scroll-enhancer.tsx");
const client = read("app/exam-client.tsx");
const css = read("app/account-scroll-final.css");
const layout = read("app/layout.tsx");

test("sign out closes shared UI state clears persisted credentials and keeps the native logout handler", () => {
  assert.ok(interactions.includes('"cgv-exams-session-token"'));
  assert.ok(interactions.includes('"cgv-exams-session-role"'));
  assert.ok(interactions.includes('"cgv-exams-session-user"'));
  assert.ok(interactions.includes("window.sessionStorage.removeItem"));
  assert.ok(interactions.includes("window.localStorage.removeItem"));
  assert.ok(interactions.includes('label === "sign out"'));
  assert.ok(interactions.includes("closeMobileMenu()"));
  assert.ok(interactions.includes("closeSettings()"));
  assert.ok(interactions.includes("window.location.replace"));
  assert.ok(interactions.includes("}, 120);"));
  assert.match(client, /<button type="button" onClick=\{onLogout\}>/);
  assert.ok(client.includes('void sheetsRequest("logout", { token: sessionToken })'));
});

test("session scroll enhancer now owns viewport measurement only", () => {
  assert.ok(enhancer.includes("window.visualViewport?.height"));
  assert.ok(enhancer.includes("--cgv-mobile-viewport-height"));
  assert.ok(!enhancer.includes('"sign out"'));
  assert.ok(!enhancer.includes("sessionStorage.removeItem"));
  assert.ok(!enhancer.includes('document.addEventListener("click"'));
});

test("mobile viewport uses one document scroller and a measured visual viewport", () => {
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

test("session and scroll safeguards remain installed inside the interaction provider", () => {
  assert.ok(layout.includes('import SessionScrollEnhancer from "./session-scroll-enhancer";'));
  assert.ok(layout.includes('import "./account-scroll-final.css";'));
  assert.ok(layout.indexOf('import "./account-scroll-final.css";') > layout.indexOf('import "./mobile-no-green-v5.css";'));
  assert.ok(layout.includes("<SessionScrollEnhancer />"));
  assert.ok(layout.indexOf("<SessionScrollEnhancer />") > layout.indexOf("<AppInteractionProvider>"));
  assert.ok(layout.indexOf("<SessionScrollEnhancer />") < layout.indexOf("</AppInteractionProvider>"));

  const release = layout.match(/"cgv-ui-release":\s*"([^"]+)"/u)?.[1] || "";
  assert.match(release, /^2026\.07\.\d{2}-[a-z0-9-]+-v\d+$/u);
});
