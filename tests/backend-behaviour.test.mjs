// Behavioural tests: these execute the real Apps Script sources against an
// in-memory runtime (tests/support/apps-script-harness.mjs) instead of
// pattern-matching the source text.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBackend, createWorkspace, SAMPLE_QUESTIONS } from "./support/apps-script-harness.mjs";

const MINUTE = 60_000;

function createCourse(backend, adminToken, overrides = {}) {
  return backend.ok("adminSaveCourse", {
    token: adminToken,
    course: {
      title: "Projection Safety",
      category: "Operations",
      passingScore: 75,
      duration: 20,
      attemptLimit: 3,
      status: "live",
      questions: SAMPLE_QUESTIONS,
      ...overrides,
    },
  }).course;
}

function allCorrect(questions) {
  // Sample answers are A, B, C, D in order.
  return Object.fromEntries(questions.map((question, index) => [question.id, "ABCD"[index]]));
}

// 1. Time limits and closing dates ------------------------------------------

test("startAttempt returns a server deadline of start + time limit", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken, { duration: 15 });
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  assert.equal(Date.parse(started.deadlineAt) - Date.parse(started.startedAt), 15 * MINUTE);
  assert.ok(started.serverNow);
});

test("reopening an attempt keeps the original deadline instead of restarting the clock", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const first = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.advance(12 * MINUTE);
  const resumed = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  assert.equal(resumed.attemptId, first.attemptId);
  assert.equal(resumed.deadlineAt, first.deadlineAt);
});

test("submissions inside the time limit are scored normally", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.advance(19 * MINUTE);
  const submitted = backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });
  assert.equal(submitted.expired, false);
  assert.equal(submitted.result.score, 100);
});

test("the grace period absorbs network delay right after the deadline", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.advance(20 * MINUTE + 90_000);
  const submitted = backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });
  assert.equal(submitted.expired, false);
  assert.equal(submitted.result.score, 100);
});

test("late submissions are closed unscored and cannot be resubmitted", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.advance(3 * 60 * MINUTE);
  const late = backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });
  assert.equal(late.expired, true);
  assert.equal(late.result.score, 0);
  assert.equal(late.result.correctCount, 0);
  assert.equal(late.result.durationSeconds, 20 * 60, "duration is capped at the allowed time");

  const retry = backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });
  assert.equal(retry.alreadySubmitted, true);
  assert.equal(retry.result.score, 0);
});

test("the course closing date caps the deadline", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const closesAt = new Date(backend.now() + 5 * MINUTE).toISOString();
  const course = createCourse(backend, adminToken, { endAt: closesAt });
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  assert.equal(started.deadlineAt, closesAt);
  backend.advance(5 * MINUTE + 3 * MINUTE);
  const late = backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });
  assert.equal(late.expired, true);
  assert.equal(late.result.score, 0);
});

test("an abandoned, expired attempt is closed and a fresh one is issued", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken, { attemptLimit: 2 });
  const first = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.advance(60 * MINUTE);
  const second = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  assert.notEqual(second.attemptId, first.attemptId);
  const attempts = backend.sheetRows("Attempts");
  assert.equal(attempts.find((row) => row.attempt_id === first.attemptId).status, "submitted");

  // The expired attempt counts toward the limit of two.
  backend.ok("submitAttempt", { token: participantToken, attemptId: second.attemptId, answers: {} });
  const blocked = backend.call("startAttempt", { token: participantToken, courseId: course.id });
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /2-attempt limit/);
});

test("the quiz countdown is driven by the server deadline, not the full duration", () => {
  const client = readFileSync(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(client, /evaluation\.duration \* 60/);
  assert.match(client, /secondsUntil\(deadlineMs\)/);
  assert.match(client, /deviceDeadlineMs\(data, evaluation\.duration, requestedAt\)/);
  assert.match(client, /deadlineMs=\{quizDeadlineMs\}/);
});

// 2. Editing a quiz ---------------------------------------------------------

test("editing a quiz keeps question IDs so in-progress attempts still score", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });

  const editable = backend.ok("adminGetCourse", { token: adminToken, courseId: course.id });
  backend.ok("adminSaveCourse", {
    token: adminToken,
    course: {
      ...editable.course,
      id: course.id,
      status: "live",
      questions: editable.questions.map((question, index) => ({
        ...question,
        prompt: index === 0 ? "Q1 (reworded)" : question.prompt,
      })),
    },
  });

  const after = backend.ok("adminGetCourse", { token: adminToken, courseId: course.id });
  assert.deepEqual(after.questions.map((q) => q.id), editable.questions.map((q) => q.id));
  assert.equal(after.questions[0].prompt, "Q1 (reworded)");

  const submitted = backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });
  assert.equal(submitted.result.score, 100);
});

test("editing a quiz after results exist keeps the executive report linked", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.ok("submitAttempt", {
    token: participantToken,
    attemptId: started.attemptId,
    answers: allCorrect(started.questions),
  });

  const editable = backend.ok("adminGetCourse", { token: adminToken, courseId: course.id });
  backend.ok("adminSaveCourse", {
    token: adminToken,
    course: {
      ...editable.course,
      id: course.id,
      status: "live",
      questions: [...editable.questions, { prompt: "Q5", options: ["a", "b", "c", "d"], correct: "A" }],
    },
  });

  const report = backend.ok("adminGetExecutiveReport", { token: adminToken, courseId: course.id }).report;
  const original = report.questions.slice(0, 4);
  assert.ok(original.every((question) => question.answeredCount === 1 && question.correctCount === 1));
  assert.equal(report.questions[4].answeredCount, 0, "the new question has no recorded answers");
});

test("question IDs from another course or duplicated in one save are not reused", () => {
  const { backend, adminToken } = createWorkspace();
  const first = createCourse(backend, adminToken);
  const second = createCourse(backend, adminToken, { title: "Second" });
  const firstQuestions = backend.ok("adminGetCourse", { token: adminToken, courseId: first.id }).questions;
  const secondQuestions = backend.ok("adminGetCourse", { token: adminToken, courseId: second.id }).questions;

  backend.ok("adminSaveCourse", {
    token: adminToken,
    course: {
      id: second.id,
      title: "Second",
      status: "live",
      questions: [
        { ...secondQuestions[0] },
        { ...secondQuestions[0], prompt: "Copy of Q1" },
        { ...firstQuestions[1] },
      ],
    },
  });
  const saved = backend.ok("adminGetCourse", { token: adminToken, courseId: second.id }).questions;
  assert.equal(saved[0].id, secondQuestions[0].id);
  assert.notEqual(saved[1].id, secondQuestions[0].id);
  assert.ok(!firstQuestions.some((question) => question.id === saved[2].id));
  assert.equal(new Set(saved.map((question) => question.id)).size, 3);
});

test("the admin edit form sends question IDs back to the backend", () => {
  const source = readFileSync(new URL("../app/admin-functionality-enhancer.tsx", import.meta.url), "utf8");
  assert.match(source, /questions: editQuestions\.map\(\(question\) => \(\{\s*\/\/[^\n]*\n[^\n]*\n\s*id: question\.id \|\| ""/);
});

// 3 & 5. Live monitoring ------------------------------------------------------

test("heartbeats use the script cache and never take the script lock", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });

  const locksBefore = backend.stats.lockAcquisitions;
  for (let beat = 0; beat < 20; beat += 1) {
    backend.advance(15_000);
    backend.ok("updateAttemptActivity", {
      token: participantToken,
      attemptId: started.attemptId,
      courseId: course.id,
      currentQuestion: (beat % 4) + 1,
      answeredCount: beat % 4,
    });
  }
  assert.equal(backend.stats.lockAcquisitions, locksBefore, "heartbeats must not queue on the lock");
  assert.equal(backend.spreadsheet.getSheetByName("LiveActivity"), null, "no worksheet writes");
  assert.ok(backend.cache.has(`live-activity:${started.attemptId}`));
});

test("repeated identical heartbeats within five seconds are throttled", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  const beat = { token: participantToken, attemptId: started.attemptId, currentQuestion: 1, answeredCount: 0 };
  assert.equal(backend.ok("updateAttemptActivity", beat).throttled, false);
  backend.advance(2_000);
  assert.equal(backend.ok("updateAttemptActivity", beat).throttled, true);
  backend.advance(5_000);
  assert.equal(backend.ok("updateAttemptActivity", beat).throttled, false);
});

test("heartbeats still enforce session role and attempt ownership", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  const asAdmin = backend.call("updateAttemptActivity", { token: adminToken, attemptId: started.attemptId });
  assert.equal(asAdmin.ok, false);
  const wrongCourse = backend.call("updateAttemptActivity", {
    token: participantToken,
    attemptId: started.attemptId,
    courseId: "another-course",
  });
  assert.equal(wrongCourse.ok, false);
});

test("the admin monitor reports active, idle, disconnected and completed from cache", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  const status = () => backend.ok("adminGetLiveQuizActivity", { token: adminToken }).activity
    .find((item) => item.attemptId === started.attemptId);

  assert.equal(status().status, "active", "a just-started attempt shows before its first heartbeat");
  backend.ok("updateAttemptActivity", {
    token: participantToken, attemptId: started.attemptId, currentQuestion: 3, answeredCount: 2,
  });
  const active = status();
  assert.equal(active.status, "active");
  assert.equal(active.currentQuestion, 3);
  assert.equal(active.answeredCount, 2);
  assert.equal(active.totalQuestions, 4);
  assert.equal(active.name, "Budi Participant");

  backend.advance(60_000);
  assert.equal(status().status, "idle");
  backend.advance(90_000);
  assert.equal(status().status, "disconnected");

  backend.ok("submitAttempt", { token: participantToken, attemptId: started.attemptId, answers: allCorrect(started.questions) });
  assert.equal(status().status, "completed");
  backend.advance(7 * 60 * MINUTE);
  assert.equal(status(), undefined, "completed attempts drop off after six hours");
});

test("the monitor never exposes answers or question content", () => {
  const { backend, adminToken, participantToken } = createWorkspace();
  const course = createCourse(backend, adminToken);
  const started = backend.ok("startAttempt", { token: participantToken, courseId: course.id });
  backend.ok("updateAttemptActivity", { token: participantToken, attemptId: started.attemptId, currentQuestion: 1 });
  const serialized = JSON.stringify(backend.ok("adminGetLiveQuizActivity", { token: adminToken }));
  assert.doesNotMatch(serialized, /Q1|correct|selected/i);
});

test("legacy LiveActivity rows are cleared in one batch under the script lock", () => {
  const backend = createBackend();
  backend.context.setupEvaluationPlatform();
  const legacy = backend.spreadsheet.insertSheet("LiveActivity");
  legacy.rows = [["attempt_id"], ["a"], ["b"], ["c"]];
  const locksBefore = backend.stats.lockAcquisitions;
  const result = backend.context.setupLiveQuizMonitoring();
  assert.equal(result.clearedLegacyRows, 3);
  assert.equal(legacy.getLastRow(), 1);
  assert.equal(backend.stats.lockAcquisitions, locksBefore + 1);
  assert.equal(backend.context.setupLiveQuizMonitoring().clearedLegacyRows, 0, "safe to re-run");
});

// 4. One router ---------------------------------------------------------------

test("there is exactly one doPost across the Apps Script project", () => {
  const files = ["Code.gs", "ZZLiveQuiz.gs"].map((name) =>
    readFileSync(new URL(`../google-apps-script/${name}`, import.meta.url), "utf8"));
  const definitions = files.join("\n").match(/^function doPost\s*\(/gm) || [];
  assert.equal(definitions.length, 1);
});

for (const order of [["code", "liveQuiz"], ["liveQuiz", "code"]]) {
  test(`every route works when files load in ${order.join(" → ")} order`, () => {
    const backend = createBackend({ order });
    backend.context.setupEvaluationPlatform();
    const admin = backend.ok("login", { username: "admin", password: "admin-password" });
    assert.equal(backend.ok("health").ready, true);
    assert.equal(backend.ok("setAccountLanguage", { token: admin.token, language: "id" }).language, "id");
    assert.equal(backend.ok("getAccountLanguage", { token: admin.token }).language, "id");
    assert.ok(Array.isArray(backend.ok("adminGetLiveQuizActivity", { token: admin.token }).activity));
    assert.match(backend.call("notARealAction").error, /Unsupported action/);
  });
}

test("legacy routes keep working if the live-quiz file is missing", () => {
  const backend = createBackend({ order: ["code"] });
  backend.context.setupEvaluationPlatform();
  const admin = backend.ok("login", { username: "admin", password: "admin-password" });
  assert.ok(backend.ok("adminGetDashboard", { token: admin.token }).courses);
  assert.match(backend.call("adminGetLiveQuizActivity", { token: admin.token }).error, /Unsupported action/);
});
