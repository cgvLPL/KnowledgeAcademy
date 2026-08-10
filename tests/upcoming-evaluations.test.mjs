import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const lifecycle = read("app/quiz-lifecycle.ts");
const runtime = read("app/runtime-functionality-enhancer.tsx");
const layout = read("app/layout.tsx");
const css = read("app/upcoming-evaluations.css");

test("backend health failures never create a user-facing warning", () => {
  assert.ok(!runtime.includes("health check could not be completed"));
  assert.ok(runtime.includes("backend health check skipped"));
  assert.ok(runtime.includes("return null;"));
});

test("course state follows the availability window", () => {
  assert.ok(backend.includes("function courseLifecycleStatus_"));
  assert.ok(backend.includes('return "scheduled"'));
  assert.ok(backend.includes('return "completed"'));
  assert.ok(backend.includes('return "live"'));
  assert.ok(lifecycle.includes('return "Scheduled"'));
  assert.ok(lifecycle.includes('return "Completed"'));
  assert.ok(lifecycle.includes('return "Live"'));
  assert.ok(lifecycle.indexOf('endAt < now') < lifecycle.indexOf('startAt > now'));
  assert.ok(backend.includes("This evaluation has not opened yet"));
  assert.ok(backend.includes("This evaluation has closed"));
});

test("participant dashboard displays scheduled and completed tests safely", () => {
  assert.ok(client.includes("const scheduledEvaluations"));
  assert.ok(client.includes("const visibleEvaluations"));
  assert.ok(client.includes('evaluation.status === "Scheduled" ? " is-scheduled"'));
  assert.ok(client.includes('disabled={evaluation.status === "Scheduled" || isAttemptLimitReached(evaluation)}'));
  assert.ok(client.includes('const isUnavailable = item.status !== "Live" || limitReached'));
  assert.ok(client.includes("const refreshLifecycle"));
  assert.ok(client.includes("window.setInterval(refreshLifecycle, 30_000)"));
  assert.ok(client.includes('const lifecycle = deriveQuizLifecycle(evaluation)'));
  assert.ok(client.includes("<LockKeyhole size={15} /> Closed"));
  assert.ok(client.includes("Not open yet"));
  assert.ok(client.includes("evaluation.opens"));
  assert.ok(layout.includes('import "./upcoming-evaluations.css";'));
  assert.ok(css.includes(".evaluation-row.is-scheduled"));
  assert.ok(css.includes(".course-card.is-scheduled"));
  assert.ok(css.includes("cursor: not-allowed"));
});
