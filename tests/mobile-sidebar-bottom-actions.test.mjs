import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const enhancer = read("app/mobile-sidebar-bottom-actions.tsx");
const css = read("app/mobile-sidebar-bottom-actions.css");
const layout = read("app/layout.tsx");
const client = read("app/exam-client.tsx");

test("mobile sidebar bottom actions close the React-owned drawer before continuing", () => {
  assert.ok(enhancer.includes('target.closest<HTMLButtonElement>(".sidebar-bottom button")'));
  assert.ok(enhancer.includes('document.querySelector<HTMLButtonElement>(".button-safety-menu-overlay")'));
  assert.ok(enhancer.includes("overlay.click()"));
  assert.ok(enhancer.includes('window.addEventListener("click", onClickCapture, true)'));
});

test("mobile drawer actions remain above fixed navigation and accept touch input", () => {
  assert.ok(css.includes("body.cgv-mobile-menu-open .sidebar"));
  assert.ok(css.includes("z-index: 1000 !important"));
  assert.ok(css.includes("body.cgv-mobile-menu-open .sidebar-bottom button"));
  assert.ok(css.includes("touch-action: manipulation !important"));
  assert.ok(css.includes("body.cgv-mobile-menu-open .mobile-nav"));
  assert.ok(css.includes("pointer-events: none !important"));
});

test("help, settings, and sign out remain real sidebar buttons", () => {
  assert.match(client, /<CircleHelp size=\{19\} \/> Help centre/);
  assert.match(client, /<Settings size=\{19\} \/> Settings/);
  assert.match(client, /<button type="button" onClick=\{onLogout\}>/);
  assert.match(client, /<LogOut size=\{19\} \/> Sign out/);
});

test("mobile sidebar reliability layer is mounted last", () => {
  assert.ok(layout.includes('import MobileSidebarBottomActions from "./mobile-sidebar-bottom-actions";'));
  assert.ok(layout.includes('import "./mobile-sidebar-bottom-actions.css";'));
  assert.ok(layout.lastIndexOf('import "./mobile-sidebar-bottom-actions.css";') > layout.lastIndexOf('import "./productivity-insights-release.css";'));
  assert.ok(layout.includes("<MobileSidebarBottomActions />"));
  assert.ok(layout.indexOf("<MobileSidebarBottomActions />") > layout.indexOf("<LanguageEnhancer />"));
});
