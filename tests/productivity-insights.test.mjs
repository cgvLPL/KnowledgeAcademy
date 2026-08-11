import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createCsvDocument,
  createEvaluationCalendar,
  safeFilename,
} from "../app/productivity-insights.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const client = read("app/exam-client.tsx");
const layout = read("app/layout.tsx");
const css = read("app/productivity-insights-release.css");

test("CSV exports are Excel-friendly, quoted, and formula-injection safe", () => {
  const csv = createCsvDocument(
    ["Participant", "Branch"],
    [
      ["=2+2", "Cinema, One"],
      ["+SUM(1,2)", "quoted \"branch\""],
      ["@malicious", "regular"],
    ],
  );

  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.endsWith("\r\n"));
  assert.ok(csv.includes('"\'=2+2"'));
  assert.ok(csv.includes('"\'+SUM(1,2)"'));
  assert.ok(csv.includes('"\'@malicious"'));
  assert.ok(csv.includes('"Cinema, One"'));
  assert.ok(csv.includes('"quoted ""branch"""'));
});

test("calendar exports include the schedule, reminder, escaping, and RFC line folding", () => {
  const calendar = createEvaluationCalendar({
    id: "quiz-42",
    title: "Fire, Safety; Essentials",
    category: "Operations",
    description: "A long safety lesson ".repeat(12),
    duration: 20,
    due: "12 Aug 2026",
    startAt: "2026-08-12T01:00:00.000Z",
    endAt: "2026-08-12T02:00:00.000Z",
  }, { now: new Date("2026-08-11T22:30:00.000Z") });
  const unfolded = calendar.replace(/\r\n /g, "");

  assert.match(calendar, /^BEGIN:VCALENDAR\r\n/);
  assert.match(calendar, /DTSTAMP:20260811T223000Z/);
  assert.match(calendar, /DTSTART:20260812T010000Z/);
  assert.match(calendar, /DTEND:20260812T020000Z/);
  assert.match(unfolded, /SUMMARY:Fire\\, Safety\\; Essentials/);
  assert.match(calendar, /TRIGGER:-PT30M/);
  assert.match(calendar, /END:VCALENDAR\r\n$/);
  for (const line of calendar.split("\r\n").filter(Boolean)) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `calendar line exceeds 75 bytes: ${line}`);
  }
  assert.throws(() => createEvaluationCalendar({ title: "Unscheduled" }), /opening date/i);
});

test("download filenames remain portable", () => {
  assert.equal(safeFilename("  Fire & Safety / Level 1  "), "fire-safety-level-1");
  assert.equal(safeFilename("!!!", "cgv-export"), "cgv-export");
});

test("participant and course workspaces expose controlled productivity filters", () => {
  assert.match(client, /const \[branchFilter, setBranchFilter\] = useState\("All"\)/);
  assert.match(client, /const \[positionFilter, setPositionFilter\] = useState\("All"\)/);
  assert.match(client, /const \[statusFilter, setStatusFilter\] = useState\("All"\)/);
  assert.match(client, /visibleParticipants\.map\(\(person\)/);
  assert.match(client, /"cgv-participant-directory"/);
  assert.match(client, /Filter participants by position/);
  assert.match(client, /const \[courseSort, setCourseSort\]/);
  assert.match(client, /visibleActiveCourses = sortCourses\(activeCourses\.filter\(matchesCourse\)\)/);
  assert.match(client, /Search title or category/);
  assert.match(client, /Lifecycle status/);
});

test("scoreboard, history, and scheduled quizzes expose local exports", () => {
  assert.match(client, /function exportScoreboard\(\)/);
  assert.match(client, /visibleRows\.map\(\(item\) => \[/);
  assert.match(client, /Export filtered CSV/);
  assert.match(client, /function exportHistory\(\)/);
  assert.match(client, /my-cgv-score-history/);
  assert.match(client, /function downloadEvaluationCalendar\(evaluation: Evaluation\)/);
  assert.match(client, /text\/calendar;charset=utf-8/);
  assert.match(client, /onCalendar=\{addEvaluationToCalendar\}/);
  assert.match(client, /Add to calendar/);
});

test("score trend is accessible and the mobile release stylesheet wins the cascade", () => {
  assert.match(client, /className="score-trend-card" aria-labelledby="score-trend-title"/);
  assert.match(client, /className="score-trend-visual" role="img" aria-label=/);
  assert.match(client, /className="visually-hidden"/);
  assert.match(client, /history\.slice\(0, 8\)\.reverse\(\)/);
  assert.match(css, /\.score-trend-svg/);
  assert.match(css, /\.insights-select-field/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.ok(
    layout.lastIndexOf('import "./productivity-insights-release.css";') >
      layout.lastIndexOf('import "./admin-course-card-mobile-fix.css";'),
  );
});
