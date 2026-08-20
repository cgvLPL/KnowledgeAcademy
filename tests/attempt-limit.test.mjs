import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const adminTools = read("app/admin-functionality-enhancer.tsx");
const runtime = read("app/runtime-functionality-enhancer.tsx");
const backendReadme = read("google-apps-script/README.md");

test("course attempt limits are stored, returned, and preserved when duplicating", () => {
  assert.match(backend, /Courses:\s*\[[\s\S]*"attempt_limit"/);
  assert.match(backend, /attempt_limit:\s*input\.attemptLimit/);
  assert.match(backend, /attemptLimit:\s*courseAttemptLimit_\(course\)/);
  assert.match(backend, /attemptLimit:\s*courseAttemptLimit_\(source\)/);
  assert.match(backend, /ensureDataSheet_\(activeSpreadsheet_\(\), APP\.sheets\.courses, HEADERS\.Courses\)/);
});

test("attempt limits are enforced inside the concurrent start and submit locks", () => {
  const start = backend.slice(backend.indexOf("function startAttempt_"), backend.indexOf("function existingAttemptResult_"));
  const submit = backend.slice(backend.indexOf("function submitAttempt_"), backend.indexOf("function submittedAttemptCountForCourse_"));
  assert.match(start, /withScriptLock_\(APP\.capacity\.writeLockTimeoutMs[\s\S]*assertAttemptLimitAvailable_/);
  assert.match(submit, /withScriptLock_\(APP\.capacity\.submissionLockTimeoutMs[\s\S]*assertAttemptLimitAvailable_/);
  assert.match(backend, /isSubmittedAttempt_\(attempt\)/);
  assert.match(backend, /You have reached the " \+ attemptLimit \+ "-attempt limit/);
});

test("participants receive usage counts and cannot start after reaching the limit", () => {
  assert.match(backend, /attemptsUsed:\s*attemptsUsed/);
  assert.match(backend, /attemptsRemaining:/);
  assert.match(backend, /canAttempt:/);
  assert.match(client, /attemptLimit:\s*normalizedAttemptLimit\(course\.attemptLimit\)/);
  assert.match(client, /isAttemptLimitReached\(evaluation\)/);
  assert.match(client, /Attempt limit reached/);
  assert.match(client, /attemptsUsed:\s*serverAttemptsUsed/);
});

test("administrators can configure and review an arbitrary attempt limit", () => {
  assert.match(client, /Maximum attempts \(0 = unlimited\)/);
  assert.match(client, /attemptLimit:\s*evaluation\.attemptLimit/);
  assert.match(adminTools, /Maximum attempts \(0 = unlimited\)/);
  assert.match(adminTools, /attemptLimit:\s*Math\.min\(100/);
  assert.match(adminTools, /<span>Attempts<\/span>/);
  assert.match(adminTools, /Unlimited attempts/);
});

test("frontend and deployment guide require the matching attempt-limit backend", () => {
  assert.match(backend, /version:\s*"2026\.08\.11-account-positions"/);
  assert.match(runtime, /EXPECTED_BACKEND_VERSION = "2026\.08\.11-account-positions"/);
  assert.match(backendReadme, /"version":"2026\.08\.11-account-positions"/);
});
