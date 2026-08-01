import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const css = read("app/participant-outcome-release.css");

test("participant result screen declares a clear pass or not-pass outcome", () => {
  assert.ok(client.includes("score >= evaluation.passingScore"));
  assert.ok(client.includes('passed ? "PASSED" : "NOT PASSED"'));
  assert.ok(client.includes('passed ? "You passed this quiz" : "You did not pass this quiz"'));
  assert.ok(client.includes('passed ? "Passed" : "Not passed"'));
  assert.ok(client.includes('role="status"'));
  assert.ok(client.includes('aria-live="polite"'));
});

test("outcome screen keeps responsive and accessibility safeguards", () => {
  assert.ok(layout.includes('import "./participant-outcome-release.css";'));
  for (const token of [
    ".result-outcome-passed",
    ".result-outcome-not-passed",
    ".result-status-icon",
    "@media (max-width: 760px)",
    "@media (prefers-reduced-transparency: reduce)",
    "@media print",
  ]) {
    assert.ok(css.includes(token), `Missing outcome safeguard: ${token}`);
  }
});
