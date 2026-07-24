import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const layout = read("app/layout.tsx");
const resultSync = read("app/result-sync-enhancer.tsx");
const runtime = read("app/runtime-functionality-enhancer.tsx");
const adminTools = read("app/admin-functionality-enhancer.tsx");
const builder = read("app/course-builder-enhancer.tsx");
const safetyNet = read("app/button-safety-net.tsx");

const requiredActions = [
  "health",
  "login",
  "logout",
  "getParticipantHome",
  "startAttempt",
  "submitAttempt",
  "adminGetDashboard",
  "adminGetCourse",
  "adminSaveCourse",
  "adminDuplicateCourse",
  "adminDeleteCourse",
  "adminSetCourseStatus",
  "adminSaveParticipant",
  "adminSaveUser",
  "adminSetUserStatus",
  "adminResetPassword",
];

test("Apps Script registers every participant and administrator action", () => {
  for (const action of requiredActions) {
    assert.match(backend, new RegExp(`\\b${action}:\\s*[A-Za-z0-9_]+_`), `Missing API action ${action}`);
  }
});

test("quiz submissions are durable and safe for concurrent retries", () => {
  assert.match(backend, /function submitAttempt_\(body\)/);
  assert.match(backend, /withScriptLock_\(20000/);
  assert.match(backend, /SpreadsheetApp\.flush\(\)/);
  assert.match(backend, /alreadySubmitted:\s*true/);
  assert.match(backend, /existing.*status === "started"/s);
  assert.match(resultSync, /for \(let attempt = 0; attempt < 3;/);
});

test("quiz timing, exit protection, and duplicate-submit protection are active", () => {
  assert.match(runtime, /remainingSeconds/);
  assert.match(runtime, /forceSubmitAtTimeout/);
  assert.match(runtime, /Exit this evaluation\?/);
  assert.match(runtime, /cgvSubmitting/);
  assert.match(layout, /RuntimeFunctionalityEnhancer/);
});

test("course scheduling and publishing values are sent to the backend", () => {
  assert.match(builder, /readPublishingSettings/);
  assert.match(builder, /startAt: publishing\.startAt/);
  assert.match(builder, /endAt: publishing\.endAt/);
  assert.match(builder, /status: publishing\.status/);
  assert.match(runtime, /publish immediately/);
  assert.match(runtime, /attempt policy/);
  assert.match(runtime, /email notification/);
  assert.match(runtime, /assign to/);
});

test("administrator, course, and account management controls are loaded", () => {
  assert.match(layout, /AdminFunctionalityEnhancer/);
  assert.match(adminTools, /Add administrator/);
  for (const action of [
    "adminSaveUser",
    "adminGetCourse",
    "adminDuplicateCourse",
    "adminDeleteCourse",
    "adminSetCourseStatus",
    "adminSetUserStatus",
    "adminResetPassword",
  ]) {
    assert.match(adminTools, new RegExp(action));
  }
  assert.doesNotMatch(adminTools, /window\.location\.reload/);
});

test("remaining global controls have explicit behavior", () => {
  for (const label of [
    "notifications",
    "forgot password?",
    "help centre",
    "settings",
    "export scoreboard",
    "duplicate question",
  ]) {
    assert.match(safetyNet.toLowerCase(), new RegExp(label.replace(/[?]/g, "\\?")));
  }
  assert.match(adminTools, /\.user-chip/);
});

test("backend health exposes the audited version", () => {
  assert.match(backend, /version:\s*"2026\.07\.24-functional-audit"/);
  assert.match(runtime, /2026\.07\.24-functional-audit/);
});
