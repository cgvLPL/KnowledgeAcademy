import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const resultSync = read("app/result-sync-enhancer.tsx");
const performance = read("app/interaction-performance-enhancer.tsx");
const requestPolicy = read("app/sheets-request-policy.mjs");
const backend = read("google-apps-script/Code.gs");

test("the optimized Apps Script backend remains valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(backend));
});

test("the loading screen keeps its branded intro bounded and short on low-power devices", () => {
  const match = client.match(/BOOT_SCREEN_MINIMUM_MS\s*=\s*(\d+)/);
  const reducedMatch = client.match(/BOOT_SCREEN_REDUCED_MS\s*=\s*(\d+)/);
  assert.ok(match, "Missing the bounded loading-screen delay");
  assert.ok(reducedMatch, "Missing the reduced loading-screen delay");
  assert.ok(Number(match[1]) <= 750, "The branded intro blocks access for more than 750ms");
  assert.ok(Number(reducedMatch[1]) <= 300, "Low-power devices wait more than 300ms");
});

test("capacity retry protection adds no more than 300ms to a healthy first request", () => {
  const spread = requestPolicy.match(/BURST_SPREAD_MS\s*=\s*(\d+)/);
  assert.ok(spread, "Missing the burst-spread limit");
  assert.ok(Number(spread[1]) <= 300, "Healthy exam requests are spread for more than 300ms");
});

test("sign-in returns the initial workspace without a second backend round trip", () => {
  assert.match(backend, /loginResult\.workspace\s*=/);
  assert.match(backend, /participantHomeForUser_\(authenticatedUser\)/);
  assert.match(backend, /adminDashboardForUser_\(authenticatedUser, ""\)/);
  assert.match(client, /Array\.isArray\(loginData\.workspace\?\.courses\)/);
  assert.match(performance, /data\.token && !data\.workspace/);
});

test("Apps Script reuses request reads and skips full dashboard rebuilds for routine saves", () => {
  const saveCourse = backend.slice(
    backend.indexOf("function adminSaveCourse_"),
    backend.indexOf("function adminDuplicateCourse_"),
  );
  const deleteCourse = backend.slice(
    backend.indexOf("function adminDeleteCourse_"),
    backend.indexOf("function adminSaveParticipant_"),
  );
  assert.match(backend, /function beginRequest_\(\)/);
  assert.match(backend, /state\.rows\[name\]/);
  assert.match(backend, /function questionCountsByCourse_\(\)/);
  assert.match(backend, /attempt\.answers_json/);
  assert.doesNotMatch(saveCourse, /buildDashboard_\(\)/);
  assert.doesNotMatch(deleteCourse, /buildDashboard_\(\)/);
});

test("the app does not ship remote font bundles", () => {
  assert.doesNotMatch(layout, /next\/font|Geist|font-geist/);
});

test("live refresh pauses in background tabs and reuses the request cache", () => {
  assert.match(resultSync, /document\.visibilityState !== "visible"/);
  assert.match(resultSync, /window\.fetch === enhancedFetch/);
  assert.match(resultSync, /visibilitychange/);
});
