import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const backend = readFileSync(
  new URL("../google-apps-script/Code.gs", import.meta.url),
  "utf8",
);

function section(start, end) {
  const startIndex = backend.indexOf(start);
  const endIndex = backend.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, "Missing " + start);
  assert.ok(endIndex > startIndex, "Missing " + end);
  return backend.slice(startIndex, endIndex);
}

test("web requests are bounded, traced, and returned through one JSON envelope", () => {
  const getHandler = section("function doGet()", "function doPost(event)");
  const postHandler = section("function doPost(event)", "function health_()");
  const parser = section("function parseBody_(event)", "function json_(value)");
  const responseMeta = section("function withResponseMeta_(value)", "function errorResponse_(error)");

  assert.match(backend, /release:\s*"2026\.08\.11-backend-hardening"/);
  assert.match(backend, /maxBodyBytes:\s*512 \* 1024/);
  assert.match(getHandler, /withResponseMeta_\(health_\(\)\)/);
  assert.match(getHandler, /errorResponse_\(error\)/);
  assert.match(postHandler, /withResponseMeta_\(API_ACTIONS\[action\]\(body\)\)/);
  assert.match(postHandler, /errorResponse_\(error\)/);
  assert.match(parser, /Utilities\.newBlob\(contents, "application\/json"\)\.getBytes\(\)\.length/);
  assert.match(parser, /Request body is too large\./);
  assert.match(parser, /Request body must be a JSON object\./);
  assert.match(responseMeta, /requestId:\s*state\.requestId/);
  assert.match(responseMeta, /durationMs:/);
});

test("health reports setup readiness without exposing the spreadsheet ID", () => {
  const health = section("function health_()", "function setupEvaluationPlatform()");
  const spreadsheet = section("function activeSpreadsheet_()", "function getSheet_(name)");

  assert.match(health, /requiredSheets/);
  assert.match(health, /ready:\s*missingSheets\.length === 0/);
  assert.match(health, /missingSheets:\s*missingSheets/);
  assert.doesNotMatch(health, /spreadsheetId/);
  assert.match(spreadsheet, /getProperty\("SPREADSHEET_ID"\)/);
  assert.match(spreadsheet, /SpreadsheetApp\.openById\(spreadsheetId\)/);
});

test("resuming an attempt preserves its original server start time", () => {
  const startAttempt = section("function startAttempt_(body)", "function existingAttemptResult_");
  const durationSource = section(
    "function attemptDurationSeconds_(attempt, endedAt)",
    "function adminGetDashboard_(body)",
  );
  const durationFunction = new Function(
    durationSource + "; return attemptDurationSeconds_;",
  )();

  assert.match(startAttempt, /existingStartedAt = toIso_\(existing\.started_at\)/);
  assert.match(startAttempt, /attemptId:\s*attemptContext\.attemptId/);
  assert.match(startAttempt, /startedAt:\s*attemptContext\.startedAt/);
  assert.equal(
    durationFunction(
      { started_at: "2026-08-11T10:00:00.000Z" },
      new Date("2026-08-11T10:01:30.000Z"),
    ),
    90,
  );
  assert.throws(
    () => durationFunction({ started_at: "invalid" }, new Date()),
    /Attempt timing data is invalid/,
  );
});

test("a retried submission replaces partial answer rows before writing", () => {
  const submitAttempt = section(
    "function submitAttempt_(body)",
    "function submittedAttemptCountForCourse_",
  );
  const cleanupIndex = submitAttempt.indexOf(
    'deleteRowsMatching_(answersSheet, "attempt_id", attemptId);',
  );
  const writeIndex = submitAttempt.indexOf(".setValues(answerRows);");

  assert.ok(cleanupIndex >= 0, "submission cleanup is missing");
  assert.ok(writeIndex > cleanupIndex, "answer rows must be cleaned before the retry write");
  assert.match(submitAttempt, /const durationSeconds = attemptDurationSeconds_\(current, now\)/);
});
