import fs from "node:fs";

const file = "app/exam-client.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`Could not apply ${label}`);
  }
  source = source.replace(before, after);
}

replaceOnce(
  `<section className="table-card">\n        <div className="responsive-table">\n          <table>\n            <thead><tr><th>Course</th><th>Status</th><th>Schedule</th><th>Participants</th><th>Average</th><th>Actions</th></tr></thead>`,
  `<section className="table-card">\n        <div className="responsive-table">\n          <table className="course-management-table">\n            <thead><tr><th>Course</th><th>Status</th><th>Schedule</th><th>Participants</th><th>Average</th><th>Actions</th></tr></thead>`,
  "course management table class",
);

replaceOnce(
  `<td><div className="date-cell"><strong>{course.due}</strong><span>{course.duration} minute limit</span></div></td>`,
  `<td><div className="date-cell"><strong>{course.opens && course.opens !== "Scheduled" ? course.opens : course.due}</strong><span>{course.opens && course.opens !== "Scheduled" ? "Opening date" : "Closing date"} · {course.duration} min</span></div></td>`,
  "admin schedule label",
);

replaceOnce(
  `{evaluation.status === "Upcoming" ? "Not open yet" : <>Start <ArrowRight size={17} /></>}`,
  `{evaluation.status === "Upcoming" ? <><LockKeyhole size={15} /> Not open yet</> : <>Start <ArrowRight size={17} /></>}`,
  "dashboard upcoming lock",
);

replaceOnce(
  `<span>Due date</span>\n                <strong>{item.due}</strong>`,
  `<span>{item.status === "Upcoming" ? "Opens" : "Due date"}</span>\n                <strong>{item.status === "Upcoming" ? item.opens : item.due}</strong>`,
  "evaluation card schedule label",
);

replaceOnce(
  `{item.status === "Completed" ? "Retake" : item.status === "Upcoming" ? "Not open yet" : "Start"}\n                {item.status !== "Upcoming" && <ArrowRight size={16} />}`,
  `{item.status === "Completed" ? "Retake" : item.status === "Upcoming" ? <><LockKeyhole size={15} /> Not open yet</> : "Start"}\n                {item.status !== "Upcoming" && <ArrowRight size={16} />}`,
  "evaluation card upcoming lock",
);

fs.writeFileSync(file, source);

fs.writeFileSync("tests/visual-polish.test.mjs", `import assert from "node:assert/strict";
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
  assert.ok(client.includes('item.status === "Upcoming" ? "Opens" : "Due date"'));
  assert.ok(client.includes('item.status === "Upcoming" ? item.opens : item.due'));
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
`);

console.log("Applied visual markup polish and regression tests.");
