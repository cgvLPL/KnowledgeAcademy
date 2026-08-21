import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const admin = read("app/admin-functionality-enhancer.tsx");
const proxy = read("app/api/sheets/route.ts");
const performance = read("app/interaction-performance-enhancer.tsx");

const reportingExclusionAction = backend.slice(
  backend.indexOf("function adminSetUserReportingExclusion_"),
  backend.indexOf("function adminResetPassword_"),
);

test("participant reporting exclusion is persisted and exposed by Apps Script", () => {
  assert.match(backend, /"excluded_from_reporting"/);
  assert.match(backend, /adminSetUserReportingExclusion: adminSetUserReportingExclusion_/);
  assert.match(backend, /function adminSetUserReportingExclusion_\(body\)/);
  assert.match(backend, /excluded_from_reporting: excluded/);
  assert.match(backend, /excludedFromReporting: user\.role === "participant"/);
  assert.match(proxy, /"adminSetUserReportingExclusion"/);
  assert.match(performance, /"adminSetUserReportingExclusion"/);
});

test("ranking and executive-report analytics omit excluded participants", () => {
  assert.match(backend, /const reportableSubmitted = allSubmitted\.filter/);
  assert.match(backend, /!booleanSetting_\(participant\.excluded_from_reporting\)/);
  assert.match(backend, /const courseStats = reportableSubmitted\.reduce/);
  assert.match(backend, /function adminGetExecutiveReport_[\s\S]*?!booleanSetting_\(participant\.excluded_from_reporting\)/);
  assert.match(backend, /Users!M:M,FALSE\)<>TRUE/);
});

test("administrators can toggle reporting eligibility without deleting participant results", () => {
  assert.match(admin, /Exclude from ranking & report/);
  assert.match(admin, /Include in ranking & report/);
  assert.match(admin, /adminSetUserReportingExclusion/);
  assert.match(admin, /keeps all attempts and personal results/);
  assert.match(client, /excludedFromReporting: boolean/);
  assert.match(client, /data-participant-reporting-excluded/);
  assert.ok(reportingExclusionAction.startsWith("function adminSetUserReportingExclusion_"));
  assert.doesNotMatch(reportingExclusionAction, /deleteRowsMatching_\(getSheet_\(APP\.sheets\.attempts\)/);
  assert.doesNotMatch(reportingExclusionAction, /\.deleteRow\(/);
});
