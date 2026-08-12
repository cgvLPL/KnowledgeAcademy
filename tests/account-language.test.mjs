import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const settings = read("app/settings-enhancer.tsx");
const language = read("app/language-enhancer.tsx");
const layout = read("app/layout.tsx");
const backend = read("google-apps-script/Code.gs");

test("settings exposes English and Bahasa Indonesia as an account preference", () => {
  assert.ok(settings.includes('language: "en" | "id"'));
  assert.ok(settings.includes('<option value="en">English</option>'));
  assert.ok(settings.includes('<option value="id">Bahasa Indonesia</option>'));
  assert.ok(settings.includes("Language is saved to your account."));
  assert.ok(settings.includes("Choose the interface language for your account."));
});

test("language enhancer loads and saves the authenticated account preference", () => {
  assert.ok(language.includes('action: "getAccountLanguage"'));
  assert.ok(language.includes('action: "setAccountLanguage"'));
  assert.ok(language.includes('const TOKEN_KEY = "cgv-exams-session-token"'));
  assert.ok(language.includes('const ENDPOINT_KEY = "cgv-exams-api-endpoint"'));
  assert.ok(language.includes('"Settings": "Pengaturan"'));
  assert.ok(language.includes('"Sign out": "Keluar"'));
  assert.ok(language.includes("dataset.cgvActionLabel"));
  assert.ok(language.includes('element.setAttribute("aria-label"'));
});

test("Apps Script persists language per authenticated account", () => {
  assert.ok(backend.includes('return "account_language:" + String(userId || "")'));
  assert.ok(backend.includes("function getAccountLanguage_(body)"));
  assert.ok(backend.includes("function setAccountLanguage_(body)"));
  assert.ok(backend.includes('action === "getAccountLanguage"'));
  assert.ok(backend.includes('action === "setAccountLanguage"'));
  assert.ok(backend.includes("requireSession_(body.token)"));
  assert.ok(backend.includes("normalizeAccountLanguage_(body.language)"));
});

test("language runtime is mounted after the existing interaction safeguards", () => {
  assert.ok(layout.includes('import LanguageEnhancer from "./language-enhancer";'));
  assert.ok(layout.includes("<LanguageEnhancer />"));
  assert.ok(layout.indexOf("<LanguageEnhancer />") > layout.indexOf("<SessionScrollEnhancer />"));
  assert.ok(layout.includes('"cgv-ui-release": "2026.08.12-account-language-v1"'));
});
