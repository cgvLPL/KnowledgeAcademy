import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const resultSync = read("app/result-sync-enhancer.tsx");
const adminTools = read("app/admin-functionality-enhancer.tsx");
const safetyNet = read("app/button-safety-net.tsx");

const requiredActions = [
  "health",
  "login",
  "logout",
  "getParticipantHome",
  "startAttempt",
  "submitAttempt",
  "adminGetDashboard",
  "adminSaveCourse",
  "adminSaveParticipant",
  "adminSaveUser",
  "adminGetCourse",
  "adminDuplicateCourse",
  "adminDeleteCourse",
  "adminSetCourseStatus",
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
  assert.match(resultSync, /for \(let attempt = 0; attempt < 3;/);
});

test("quiz timer, exit protection, and duplicate-submit guard are native", () => {
  assert.match(client, /secondsRemaining/);
  assert.match(client, /timerLabel/);
  assert.match(client, /setShowSubmit\(true\)/);
  assert.match(client, /if \(submitting\) return/);
  assert.match(client, /Exit this evaluation\?/);
});

test("course builder owns schedule and publishing values", () => {
  assert.match(client, /const \[startAt, setStartAt\]/);
  assert.match(client, /const \[endAt, setEndAt\]/);
  assert.match(client, /const \[publishImmediately, setPublishImmediately\]/);
  assert.match(client, /startAt: evaluation\.startAt/);
  assert.match(client, /endAt: evaluation\.endAt/);
  assert.doesNotMatch(client, /Selected branches/);
  assert.doesNotMatch(client, /Email notification/);
  assert.doesNotMatch(client, /Attempt policy/);
});

test("sessions restore after refresh and clear on logout", () => {
  assert.match(client, /sessionTokenKey/);
  assert.match(client, /sessionRoleKey/);
  assert.match(client, /window\.sessionStorage\.getItem\(sessionTokenKey\)/);
  assert.match(client, /window\.sessionStorage\.removeItem\(sessionTokenKey\)/);
});

test("administrator, course, and account management controls are loaded", () => {
  assert.match(layout, /AdminFunctionalityEnhancer/);
  assert.match(adminTools, /Add administrator/);
  assert.match(adminTools, /adminSaveUser/);
  assert.match(adminTools, /adminGetCourse/);
  assert.match(adminTools, /adminDuplicateCourse/);
  assert.match(adminTools, /adminDeleteCourse/);
  assert.match(adminTools, /adminSetCourseStatus/);
  assert.match(adminTools, /adminSetUserStatus/);
  assert.match(adminTools, /adminResetPassword/);
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
