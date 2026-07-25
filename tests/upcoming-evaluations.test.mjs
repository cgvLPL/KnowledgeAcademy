import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const runtime = read("app/runtime-functionality-enhancer.tsx");
const layout = read("app/layout.tsx");
const css = read("app/upcoming-evaluations.css");

test("backend health failures never create a user-facing warning", () => {
  assert.ok(!runtime.includes("health check could not be completed"));
  assert.ok(runtime.includes("backend health check skipped"));
  assert.ok(runtime.includes("return null;"));
});

test("future scheduled tests are returned and cannot start early", () => {
  assert.ok(backend.includes('status === "live" || status === "upcoming"'));
  assert.ok(backend.includes('item.status = "upcoming"'));
  assert.ok(backend.includes("This evaluation has not opened yet"));
});

test("participant dashboard displays upcoming tests in a muted disabled state", () => {
  assert.ok(client.includes("const upcomingEvaluations"));
  assert.ok(client.includes("const visibleEvaluations"));
  assert.ok(client.includes('evaluation.status === "Upcoming" ? " is-upcoming"'));
  assert.ok(client.includes('disabled={evaluation.status === "Upcoming"}'));
  assert.ok(client.includes("Not open yet"));
  assert.ok(client.includes("evaluation.opens"));
  assert.ok(layout.includes('import "./upcoming-evaluations.css";'));
  assert.ok(css.includes(".evaluation-row.is-upcoming"));
  assert.ok(css.includes(".course-card.is-upcoming"));
  assert.ok(css.includes("cursor: not-allowed"));
});
