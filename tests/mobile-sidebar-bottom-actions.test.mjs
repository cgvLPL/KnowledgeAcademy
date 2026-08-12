import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const interactions = read("app/app-interactions.tsx");
const settings = read("app/settings-enhancer.tsx");
const safetyNet = read("app/button-safety-net.tsx");
const sessionScroll = read("app/session-scroll-enhancer.tsx");
const css = read("app/mobile-sidebar-bottom-actions.css");
const layout = read("app/layout.tsx");
const client = read("app/exam-client.tsx");

test("sidebar menu settings help and sign out share one React-owned interaction state", () => {
  assert.ok(interactions.includes("createContext<AppInteractions"));
  assert.ok(interactions.includes("mobileMenuOpen"));
  assert.ok(interactions.includes("settingsOpen"));
  assert.ok(interactions.includes("onClickCapture={onClickCapture}"));
  assert.ok(interactions.includes('label === "open menu"'));
  assert.ok(interactions.includes('button.closest(".sidebar-nav")'));
  assert.ok(interactions.includes('label === "help centre"'));
  assert.ok(interactions.includes('label === "settings" || label === "pengaturan"'));
  assert.ok(interactions.includes('label === "sign out"'));
  assert.ok(interactions.includes("<AppInteractionContext.Provider"));
  assert.ok(!interactions.includes('document.addEventListener("click"'));
});

test("legacy interaction enhancers no longer own mobile drawer or settings click state", () => {
  assert.ok(settings.includes("useAppInteractions"));
  assert.ok(settings.includes("settingsOpen"));
  assert.ok(!settings.includes('document.addEventListener("click"'));
  assert.ok(!safetyNet.includes("mobileMenuOpen"));
  assert.ok(!safetyNet.includes('label === "open menu"'));
  assert.ok(!safetyNet.includes('label === "help centre"'));
  assert.ok(!safetyNet.includes('label === "settings"'));
  assert.ok(!sessionScroll.includes('document.addEventListener("click"'));
  assert.equal(fs.existsSync(path.join(root, "app/mobile-sidebar-bottom-actions.tsx")), false);
});

test("mobile drawer actions remain above fixed navigation and accept touch input", () => {
  assert.ok(css.includes("body.cgv-mobile-menu-open .sidebar"));
  assert.ok(css.includes("z-index: 1000 !important"));
  assert.ok(css.includes("body.cgv-mobile-menu-open .sidebar-bottom button"));
  assert.ok(css.includes("touch-action: manipulation !important"));
  assert.ok(css.includes("body.cgv-mobile-menu-open .mobile-nav"));
  assert.ok(css.includes("pointer-events: none !important"));
});

test("help settings and sign out remain real sidebar buttons", () => {
  assert.match(client, /<CircleHelp size=\{19\} \/> Help centre/);
  assert.match(client, /<Settings size=\{19\} \/> Settings/);
  assert.match(client, /<button type="button" onClick=\{onLogout\}>/);
  assert.match(client, /<LogOut size=\{19\} \/> Sign out/);
});

test("the root layout mounts every interaction enhancer inside the shared provider", () => {
  assert.ok(layout.includes('import { AppInteractionProvider } from "./app-interactions";'));
  assert.ok(layout.includes('import "./app-interactions.css";'));
  assert.ok(layout.includes("<AppInteractionProvider>"));
  assert.ok(layout.includes("</AppInteractionProvider>"));
  assert.ok(layout.indexOf("<SettingsEnhancer />") > layout.indexOf("<AppInteractionProvider>"));
  assert.ok(layout.indexOf("<LanguageEnhancer />") < layout.indexOf("</AppInteractionProvider>"));
  assert.ok(!layout.includes("MobileSidebarBottomActions"));
});
