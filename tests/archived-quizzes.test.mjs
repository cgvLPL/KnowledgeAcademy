import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const lifecycle = read("app/quiz-lifecycle.ts");
const adminTools = read("app/admin-functionality-enhancer.tsx");
const layout = read("app/layout.tsx");
const css = read("app/archived-courses.css");

test("archived quizzes have a distinct lifecycle and stay hidden from participants", () => {
  assert.match(lifecycle, /"Archived"/);
  assert.match(lifecycle, /storedStatus === "archived"\) return "Archived"/);
  assert.match(backend, /storedStatus === "archived"\) return "archived"/);
  assert.match(backend, /lifecycle !== "draft" && lifecycle !== "archived"/);
});

test("backend archives result-bearing quizzes and supports restoring them", () => {
  assert.match(backend, /status:\s*"archived"/);
  assert.match(backend, /"completed", "archived"/);
  assert.match(backend, /if \(status === "archived"\) return "archived"/);
  assert.match(backend, /archived:\s*true/);
  assert.match(backend, /course:\s*publicCourse_\(Object\.assign\(\{\}, course, \{ status: "archived"/);
});

test("archived executive reports retain submitted and legacy completed results", () => {
  assert.match(backend, /function isSubmittedAttempt_\(attempt\)/);
  assert.match(backend, /status === "submitted"\) return true/);
  assert.match(backend, /status !== "started" && Boolean\(toIso_\(attempt && attempt\.submitted_at\)\)/);
  assert.match(
    backend,
    /function adminGetExecutiveReport_\(body\)[\s\S]*String\(attempt\.course_id\) === courseId &&[\s\S]*isSubmittedAttempt_\(attempt\) &&[\s\S]*!booleanSetting_\(participant\.excluded_from_reporting\)/,
  );
  assert.match(backend, /const allSubmitted = rowsAsObjects_[\s\S]*\.filter\(isSubmittedAttempt_\)/);
  assert.match(client, /Preparing preserved results for this archived quiz/);
  assert.match(client, /item\.status === "Archived" \? " — Archived"/);
});

test("admin course workspace separates current and archived quizzes", () => {
  assert.match(client, /const activeCourses = evaluations\.filter\(\(course\) => course\.status !== "Archived"\)/);
  assert.match(client, /const archivedCourses = evaluations\.filter\(\(course\) => course\.status === "Archived"\)/);
  assert.match(client, /id="archived-quizzes-heading">Archived quizzes/);
  assert.match(client, /Stored quizzes are hidden from participants/);
  assert.match(client, /aria-label="Restore"/);
  assert.match(client, /No archived quizzes/);
});

test("archived quiz library is collapsed by default and exposes an accessible toggle", () => {
  assert.match(client, /const \[archivedOpen, setArchivedOpen\] = useState\(false\)/);
  assert.match(client, /aria-expanded=\{archivedOpen\}/);
  assert.match(client, /aria-controls="archived-quizzes-content"/);
  assert.match(client, /aria-label=\{`\$\{archivedOpen \? "Collapse" : "Expand"\} archived quizzes`\}/);
  assert.match(client, /id="archived-quizzes-content"[\s\S]*?hidden=\{!archivedOpen\}/);
  assert.match(client, /archivedOpen \? "Hide" : "Show"/);
  assert.match(client, /setArchivedOpen\(\(open\) => !open\)/);
});

test("archive and restore actions synchronize the React course list", () => {
  assert.match(adminTools, /status:\s*"draft"/);
  assert.match(adminTools, /Quiz restored to drafts/);
  assert.match(adminTools, /setCourseStatus\(modal\.course, "archived"\)/);
  assert.match(adminTools, /announceCourseChange/);
  assert.match(client, /window\.addEventListener\("cgv:course-change"/);
  assert.match(client, /detail\.deletedId/);
});

test("archived quiz section remains distinct and mobile friendly", () => {
  assert.match(layout, /import "\.\/archived-courses\.css"/);
  assert.match(css, /\.archived-course-section/);
  assert.match(css, /\.status-archived/);
  assert.match(css, /\.archived-course-table \.inline-actions/);
  assert.match(css, /\.archived-section-toggle/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /\.archived-section-toggle\.is-open svg[\s\S]*?rotate\(180deg\)/);
  assert.match(css, /\.archived-course-content\[hidden\][\s\S]*?display:\s*none\s*!important/);
  assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
