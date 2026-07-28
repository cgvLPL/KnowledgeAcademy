import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const resultSync = read("app/result-sync-enhancer.tsx");

test("the loading screen does not impose a multi-second delay", () => {
  const match = client.match(/BOOT_SCREEN_MINIMUM_MS\s*=\s*(\d+)/);
  assert.ok(match, "Missing the bounded loading-screen delay");
  assert.ok(Number(match[1]) <= 1_000, "The loading screen blocks access for more than one second");
});

test("the app does not ship remote font bundles", () => {
  assert.doesNotMatch(layout, /next\/font|Geist|font-geist/);
});

test("live refresh pauses in background tabs and reuses the request cache", () => {
  assert.match(resultSync, /document\.visibilityState !== "visible"/);
  assert.match(resultSync, /window\.fetch === enhancedFetch/);
  assert.match(resultSync, /visibilitychange/);
});
