import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const css = read("app/admin-dashboard-information-release.css");

test("admin overview derives informative live workspace indicators", () => {
  for (const token of [
    "participationRate",
    "totalAttempts",
    "lowPerformingCourses",
    "unattendedLiveCourses",
    "scoreBands",
    "evaluationInsights",
    "Evaluation performance",
    "Course pipeline",
    "Participant score bands",
    "Needs attention",
  ]) {
    assert.ok(client.includes(token), `Missing admin insight: ${token}`);
  }
});

test("informative dashboard remains responsive and lightweight", () => {
  assert.ok(layout.includes('import "./admin-dashboard-information-release.css";'));
  for (const token of [
    ".admin-information-grid",
    ".admin-performance-list",
    ".admin-course-states",
    ".admin-score-band-list",
    ".admin-attention-list",
    "@media (max-width: 1100px)",
    "@media (max-width: 760px)",
    "html.cgv-low-power",
  ]) {
    assert.ok(css.includes(token), `Missing dashboard safeguard: ${token}`);
  }
});
