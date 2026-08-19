import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const interactions = read("app/app-interactions.tsx");
const settings = read("app/settings-enhancer.tsx");
const session = read("app/session-scroll-enhancer.tsx");
const config = read("tests/visual/playwright.config.mjs");
const interactionSpec = read("tests/visual/ui.interaction.spec.mjs");
const mobilePdfSpec = read("tests/visual/ui.mobile-pdf.spec.mjs");

test("navigation coordination is React-owned instead of document click interception", () => {
  assert.ok(interactions.includes("AppInteractionProvider"));
  assert.ok(interactions.includes("onClickCapture={onClickCapture}"));
  assert.ok(interactions.includes("useAppInteractions"));
  assert.ok(!interactions.includes('document.addEventListener("click"'));
  assert.ok(!settings.includes('document.addEventListener("click"'));
  assert.ok(!session.includes('document.addEventListener("click"'));
});

test("Playwright runs sidebar and mobile PDF interactions alongside visual checks", () => {
  assert.ok(config.includes("ui\\.(visual|interaction|mobile-pdf)\\.spec\\.mjs"));
  assert.ok(interactionSpec.includes("mobile menu settings help navigation and sign out stay synchronized"));
  assert.ok(interactionSpec.includes("desktop sidebar actions use the same interaction controller"));
  assert.ok(interactionSpec.includes('page.route("**/exec"'));
  assert.ok(interactionSpec.includes('getByRole("button", { name: "Open menu" })'));
  assert.ok(interactionSpec.includes('getByRole("dialog", { name: "Settings" })'));
  assert.ok(interactionSpec.includes('filter({ hasText: "Sign out" })'));
  assert.ok(mobilePdfSpec.includes("iPhone-sized reader can navigate every PDF page"));
  assert.ok(mobilePdfSpec.includes('getByRole("button", { name: "Next PDF page" })'));
});