import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const client = read("app/exam-client.tsx");
const css = read("app/visual-polish.css");

test("course management table has stable proportions and bounded actions", () => {
  assert.ok(client.includes('className="course-management-table"'));
  assert.ok(css.includes("table-layout: fixed"));
  assert.ok(css.includes("min-width: 980px"));
  assert.ok(css.includes(".course-management-table .inline-actions button"));
});

test("scheduled evaluations stay readable and show opening information", () => {
  assert.ok(client.includes('const isScheduled = item.status === "Scheduled"'));
  assert.ok(client.includes('isScheduled ? "Opens"'));
  assert.ok(client.includes('isScheduled ? item.opens'));
  assert.ok(client.includes("<LockKeyhole size={15} /> Not open yet"));
  assert.ok(css.includes("filter: none !important"));
  assert.ok(css.includes("opacity: 1 !important"));
  assert.ok(css.includes("grid-auto-rows: 1fr"));
});

test("visual polish loads last and suppresses legacy blocking warnings", () => {
  assert.ok(layout.includes('import "./visual-polish.css";'));
  assert.ok(css.includes(".cgv-backend-version-warning"));
  assert.ok(css.includes("display: none !important"));
});
