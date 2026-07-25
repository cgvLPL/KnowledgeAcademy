import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

function replaceOnce(file, pattern, replacement, label) {
  const source = read(file);
  if (!pattern.test(source)) {
    throw new Error(`Could not apply ${label} in ${file}`);
  }
  write(file, source.replace(pattern, replacement));
}

const nextVersion = "2026.07.25-upcoming-schedule";

replaceOnce(
  "app/runtime-functionality-enhancer.tsx",
  /import \{ useEffect, useState \} from "react";/,
  'import { useEffect } from "react";',
  "silent health-check import",
);
replaceOnce(
  "app/runtime-functionality-enhancer.tsx",
  /const EXPECTED_BACKEND_VERSION = "[^"]+";/,
  `const EXPECTED_BACKEND_VERSION = "${nextVersion}";`,
  "backend version",
);
replaceOnce(
  "app/runtime-functionality-enhancer.tsx",
  /\s*const \[warning, setWarning\] = useState\(""\);\n/,
  "\n",
  "health warning state",
);
replaceOnce(
  "app/runtime-functionality-enhancer.tsx",
  /if \(!data\.ok \|\| data\.version !== EXPECTED_BACKEND_VERSION\) \{[\s\S]*?setWarning\([\s\S]*?\);\n\s*\}/,
  `if (!data.ok || data.version !== EXPECTED_BACKEND_VERSION) {\n            console.warn(\n              \`CGV Exams backend version mismatch. Expected \${EXPECTED_BACKEND_VERSION}, found \${data.version || "an older version"}.\`,\n            );\n          }`,
  "non-blocking version warning",
);
replaceOnce(
  "app/runtime-functionality-enhancer.tsx",
  /\.catch\(\(\) => setWarning\("The Google Apps Script backend health check could not be completed\."\)\);/,
  `.catch((error) => {\n          console.warn("CGV Exams backend health check skipped.", error);\n        });`,
  "silent health failure",
);
replaceOnce(
  "app/runtime-functionality-enhancer.tsx",
  /return warning \? \([\s\S]*?\) : null;/,
  "return null;",
  "remove health banner",
);

replaceOnce(
  "google-apps-script/Code.gs",
  /version: "[^"]+",/,
  `version: "${nextVersion}",`,
  "Apps Script version",
);
replaceOnce(
  "google-apps-script/Code.gs",
  /  const courses = rowsAsObjects_\(getSheet_\(APP\.sheets\.courses\)\)\n    \.filter\(function \(course\) \{\n      const opens = !course\.start_at \|\| new Date\(course\.start_at\) <= now;\n      const closes = !course\.end_at \|\| new Date\(course\.end_at\) >= now;\n      return course\.status === "live" && opens && closes;\n    \}\)\n    \.map\(publicCourse_\);/,
  `  const courses = rowsAsObjects_(getSheet_(APP.sheets.courses))\n    .filter(function (course) {\n      const status = String(course.status || "").toLowerCase();\n      const closes = !course.end_at || new Date(course.end_at) >= now;\n      return closes && (status === "live" || status === "upcoming");\n    })\n    .map(function (course) {\n      const item = publicCourse_(course);\n      const startsLater = Boolean(course.start_at) && new Date(course.start_at) > now;\n      if (startsLater || String(course.status || "").toLowerCase() === "upcoming") {\n        item.status = "upcoming";\n      }\n      return item;\n    });`,
  "participant upcoming course query",
);

replaceOnce(
  "app/exam-client.tsx",
  /  due: string;\n  status:/,
  "  due: string;\n  opens?: string;\n  status:",
  "evaluation open date type",
);
replaceOnce(
  "app/exam-client.tsx",
  /    due: formatApiDate\(course\.endAt\),\n    status:/,
  '    due: formatApiDate(course.endAt),\n    opens: formatApiDate(course.startAt, "Scheduled"),\n    status:',
  "evaluation open date mapping",
);
replaceOnce(
  "app/exam-client.tsx",
  /  const liveEvaluations = evaluations\.filter\(\(item\) => item\.status === "Live"\);\n  const featured = liveEvaluations\[0\] \|\| null;/,
  `  const liveEvaluations = evaluations.filter((item) => item.status === "Live");\n  const upcomingEvaluations = evaluations.filter((item) => item.status === "Upcoming");\n  const visibleEvaluations = [...liveEvaluations, ...upcomingEvaluations];\n  const featured = liveEvaluations[0] || null;`,
  "participant upcoming collections",
);
replaceOnce(
  "app/exam-client.tsx",
  /<p>\{liveEvaluations\.length \? `\$\{liveEvaluations\.length\} evaluation\$\{liveEvaluations\.length === 1 \? "" : "s"\} ready for you\.` : "No evaluations are assigned right now\."\}<\/p>/,
  `<p>{liveEvaluations.length\n            ? \`${'${liveEvaluations.length}'} evaluation${'${liveEvaluations.length === 1 ? "" : "s"}'} ready for you.${'${upcomingEvaluations.length ? ` ${upcomingEvaluations.length} scheduled.` : ""}'}\`\n            : upcomingEvaluations.length\n              ? \`${'${upcomingEvaluations.length}'} scheduled evaluation${'${upcomingEvaluations.length === 1 ? "" : "s"}'} coming up.\`\n              : "No evaluations are assigned right now."}</p>`,
  "participant welcome summary",
);
replaceOnce(
  "app/exam-client.tsx",
  /title="No evaluations assigned"\n            description="New evaluations will appear here when an administrator publishes them\."/,
  `title={upcomingEvaluations.length ? "No evaluation is open yet" : "No evaluations assigned"}\n            description={upcomingEvaluations.length\n              ? "Your scheduled evaluations are listed below and will unlock automatically."\n              : "New evaluations will appear here when an administrator publishes them."}`,
  "participant empty hero messaging",
);
replaceOnce(
  "app/exam-client.tsx",
  /<h3>Ready for you<\/h3>\n            <p>Complete these evaluations before their due dates\.<\/p>/,
  `<h3>{upcomingEvaluations.length ? "Ready and scheduled" : "Ready for you"}</h3>\n            <p>{upcomingEvaluations.length\n              ? "Live evaluations can be started now. Scheduled evaluations unlock automatically."\n              : "Complete these evaluations before their due dates."}</p>`,
  "participant list heading",
);
replaceOnce(
  "app/exam-client.tsx",
  /\{liveEvaluations\.slice\(0, 2\)\.map\(\(evaluation, index\) => \(/,
  "{visibleEvaluations.slice(0, 4).map((evaluation, index) => (",
  "participant visible course list",
);
replaceOnce(
  "app/exam-client.tsx",
  /<article className="evaluation-row" key=\{evaluation\.id\}>/,
  '<article className={`evaluation-row${evaluation.status === "Upcoming" ? " is-upcoming" : ""}`} key={evaluation.id}>',
  "upcoming dashboard row class",
);
replaceOnce(
  "app/exam-client.tsx",
  /<span>Due date<\/span>\n                <strong>\{evaluation\.due\}<\/strong>/,
  `<span>{evaluation.status === "Upcoming" ? "Opens" : "Due date"}</span>\n                <strong>{evaluation.status === "Upcoming" ? evaluation.opens : evaluation.due}</strong>`,
  "upcoming schedule date",
);
replaceOnce(
  "app/exam-client.tsx",
  /<button className="row-button" onClick=\{\(\) => onStart\(evaluation\)\}>\n                Start <ArrowRight size=\{17\} \/>\n              <\/button>/,
  `<button\n                className="row-button"\n                disabled={evaluation.status === "Upcoming"}\n                onClick={() => evaluation.status !== "Upcoming" && onStart(evaluation)}\n              >\n                {evaluation.status === "Upcoming" ? "Not open yet" : <>Start <ArrowRight size={17} /></>}\n              </button>`,
  "upcoming disabled start action",
);
replaceOnce(
  "app/exam-client.tsx",
  /\{!liveEvaluations\.length && \(/,
  "{!visibleEvaluations.length && (",
  "participant empty list",
);
replaceOnce(
  "app/exam-client.tsx",
  /<article className=\{`course-card accent-\$\{item\.color\}`\} key=\{item\.id\}>/,
  '<article className={`course-card accent-${item.color}${item.status === "Upcoming" ? " is-upcoming" : ""}`} key={item.id}>',
  "upcoming library card class",
);

const layoutPath = "app/layout.tsx";
let layout = read(layoutPath);
if (!layout.includes('import "./upcoming-evaluations.css";')) {
  layout = layout.replace(
    'import "./admin-avatar.css";',
    'import "./admin-avatar.css";\nimport "./upcoming-evaluations.css";',
  );
  if (!layout.includes('import "./upcoming-evaluations.css";')) {
    layout = layout.replace(
      'import "./course-table-containment.css";',
      'import "./course-table-containment.css";\nimport "./upcoming-evaluations.css";',
    );
  }
  if (!layout.includes('import "./upcoming-evaluations.css";')) {
    throw new Error("Could not add upcoming evaluation stylesheet import");
  }
  write(layoutPath, layout);
}

write("app/upcoming-evaluations.css", `/* Scheduled participant evaluations remain visible but unavailable until opening. */
.evaluation-row.is-upcoming,
.course-card.is-upcoming {
  background:
    linear-gradient(150deg, rgba(28, 31, 28, 0.9), rgba(15, 17, 15, 0.94)) !important;
  border-color: rgba(210, 216, 207, 0.12) !important;
  box-shadow: none !important;
  filter: grayscale(0.72) saturate(0.5);
  opacity: 0.72;
}

.evaluation-row.is-upcoming:hover,
.course-card.is-upcoming:hover {
  border-color: rgba(210, 216, 207, 0.2) !important;
  transform: none !important;
}

.evaluation-row.is-upcoming .evaluation-icon,
.course-card.is-upcoming .evaluation-icon {
  background: rgba(210, 216, 207, 0.14) !important;
  color: #b7bdb4 !important;
}

.evaluation-row.is-upcoming .row-button,
.course-card.is-upcoming button:disabled {
  background: rgba(255, 255, 255, 0.055) !important;
  border: 1px solid rgba(255, 255, 255, 0.11) !important;
  color: #a5aca2 !important;
  cursor: not-allowed !important;
  opacity: 1 !important;
}

.evaluation-row.is-upcoming .due-block strong,
.course-card.is-upcoming .course-card-footer strong {
  color: #d1d6ce !important;
}

@media (max-width: 760px) {
  .evaluation-row.is-upcoming,
  .course-card.is-upcoming {
    filter: grayscale(0.65) saturate(0.55);
    opacity: 0.76;
  }
}
`);

write("tests/upcoming-evaluations.test.mjs", `import assert from "node:assert/strict";
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
  assert.doesNotMatch(runtime, /health check could not be completed/);
  assert.match(runtime, /backend health check skipped/);
  assert.match(runtime, /return null;/);
});

test("future scheduled tests are returned and cannot start early", () => {
  assert.match(backend, /status === "live" \|\| status === "upcoming"/);
  assert.match(backend, /item\.status = "upcoming"/);
  assert.match(backend, /This evaluation has not opened yet/);
});

test("participant dashboard displays upcoming tests in a muted disabled state", () => {
  assert.match(client, /const upcomingEvaluations/);
  assert.match(client, /const visibleEvaluations/);
  assert.match(client, /evaluation\.status === "Upcoming" \? " is-upcoming"/);
  assert.match(client, /disabled=\{evaluation\.status === "Upcoming"\}/);
  assert.match(client, /Not open yet/);
  assert.match(client, /evaluation\.opens/);
  assert.match(layout, /import "\.\/upcoming-evaluations\.css";/);
  assert.match(css, /\.evaluation-row\.is-upcoming/);
  assert.match(css, /\.course-card\.is-upcoming/);
  assert.match(css, /cursor: not-allowed/);
});
`);

const workflowsDir = path.join(root, ".github", "workflows");
for (const name of fs.readdirSync(workflowsDir)) {
  if (!/\.ya?ml$/i.test(name)) continue;
  const file = path.join(workflowsDir, name);
  const source = fs.readFileSync(file, "utf8");
  const next = source.replaceAll(
    "node --test tests/function-contract.test.mjs",
    "node --test tests/*.test.mjs",
  );
  if (next !== source) fs.writeFileSync(file, next);
}

const contractPath = "tests/function-contract.test.mjs";
let contract = read(contractPath).replace(
  /version:\\s\*"2026\\\.07\\\.24-functional-audit"/g,
  'version:\\s*"2026\\.07\\.25-upcoming-schedule"',
).replace(
  /2026\\\.07\\\.24-functional-audit/g,
  "2026\\.07\\.25-upcoming-schedule",
);
write(contractPath, contract);

for (const temporary of [
  ".github/workflows/apply-upcoming-schedule-fix.yml",
  "scripts/apply-upcoming-schedule-fix.mjs",
]) {
  const target = path.join(root, temporary);
  if (fs.existsSync(target)) fs.rmSync(target);
}

console.log("Applied silent health check and upcoming participant schedule repair.");
