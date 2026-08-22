import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const enhancer = readFileSync(new URL("../app/live-quiz-monitor-enhancer.tsx", import.meta.url), "utf8");
const monitor = readFileSync(new URL("../app/live-quiz-monitor.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../app/api/sheets/route.ts", import.meta.url), "utf8");
const backend = readFileSync(new URL("../google-apps-script/ZZLiveQuiz.gs", import.meta.url), "utf8");

function section(start, end) {
  const startIndex = backend.indexOf(start);
  const endIndex = backend.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `Missing ${start}`);
  assert.ok(endIndex > startIndex, `Missing ${end}`);
  return backend.slice(startIndex, endIndex);
}

test("participant quiz activity is captured from the existing attempt flow", () => {
  assert.match(enhancer, /payload\.action === "startAttempt"/);
  assert.match(enhancer, /action: "updateAttemptActivity"/);
  assert.match(enhancer, /HEARTBEAT_MS = 15000/);
  assert.match(enhancer, /payload\.action === "submitAttempt"/);
  assert.match(enhancer, /sendHeartbeat\("completed"\)/);
  assert.match(enhancer, /\.question-progress-bars button\.current/);
  assert.match(enhancer, /\.question-progress-bars button\.answered/);
  assert.match(enhancer, /\.answer-list button\.selected/);
});

test("participant lifecycle reports idle, disconnect, reconnect, and page exit", () => {
  assert.match(enhancer, /visibilitychange/);
  assert.match(enhancer, /sendHeartbeat\(document\.visibilityState === "visible" \? "active" : "idle"\)/);
  assert.match(enhancer, /pagehide/);
  assert.match(enhancer, /sendHeartbeat\("disconnected", true\)/);
  assert.match(enhancer, /pageshow/);
  assert.match(enhancer, /window\.addEventListener\("offline"/);
  assert.match(enhancer, /window\.addEventListener\("online"/);
  assert.match(enhancer, /keepalive/);
  assert.match(backend, /reconnected: wasDisconnected && clientStatus === "active"/);
});

test("admin monitor is mounted in the existing overview and polls authorized activity", () => {
  assert.match(layout, /LiveQuizMonitorEnhancer/);
  assert.match(layout, /live-quiz-monitor\.css/);
  assert.match(enhancer, /document\.querySelector\("\.admin-overview"\)/);
  assert.match(enhancer, /action: "adminGetLiveQuizActivity"/);
  assert.match(enhancer, /ADMIN_REFRESH_MS = 10000/);
  assert.doesNotMatch(monitor, /Participant One/);
  assert.doesNotMatch(monitor, /demoParticipants/);
});

test("admin live monitor supports practical filtering and sorting", () => {
  assert.match(monitor, /placeholder="Participant, branch, position…"/);
  assert.match(monitor, /All evaluations/);
  assert.match(monitor, /All branches/);
  assert.match(monitor, /All positions/);
  assert.match(monitor, /Most progress/);
  assert.match(monitor, /Longest session/);
  assert.match(monitor, /aria-pressed=\{statusFilter === status\}/);
  assert.match(monitor, /answered/);
  assert.match(monitor, /startedAt/);
  assert.match(monitor, /title=\{exactTimestamp\(participant\.lastActivityAt\)\}/);
});

test("Apps Script live activity routes require the correct session roles and attempt ownership", () => {
  const update = section("function updateAttemptActivity_(body)", "function adminGetLiveQuizActivity_(body)");
  assert.match(update, /requireSession_\(body\.token, "participant"\)/);
  assert.match(update, /String\(attempt\.user_id\) !== String\(context\.user\.user_id\)/);
  assert.match(update, /requestedCourseId && requestedCourseId !== courseId/);
  assert.match(backend, /function liveQuizExpectedTotal_\(attempt\)[\s\S]*questionCountsByCourse_/);
  assert.match(update, /serverTotalQuestions/);
  assert.doesNotMatch(update, /total_questions:\s*Number\(body\.totalQuestions/);
  assert.match(backend, /requireSession_\(body\.token, "admin"\)/);
  assert.match(backend, /action === "updateAttemptActivity"/);
  assert.match(backend, /action === "adminGetLiveQuizActivity"/);
});

test("status boundaries are exact at 30, 31, 120, and 121 seconds", () => {
  const source = section("function liveQuizDerivedStatus_(activity, attempt, nowMs)", "function pruneLiveQuizActivity_(nowMs)");
  const derive = new Function(
    "const LIVE_QUIZ = { activeSeconds: 30, idleSeconds: 120 };\n" + source + "; return liveQuizDerivedStatus_;",
  )();
  const now = Date.parse("2026-08-22T12:00:00.000Z");
  const activityAt = (secondsAgo) => ({
    client_status: "active",
    last_activity_at: new Date(now - secondsAgo * 1000).toISOString(),
  });
  assert.equal(derive(activityAt(30), null, now), "active");
  assert.equal(derive(activityAt(31), null, now), "idle");
  assert.equal(derive(activityAt(120), null, now), "idle");
  assert.equal(derive(activityAt(121), null, now), "disconnected");
  assert.equal(derive({ client_status: "disconnected", last_activity_at: new Date(now).toISOString() }, null, now), "disconnected");
  assert.equal(derive({ client_status: "completed", last_activity_at: new Date(now).toISOString() }, null, now), "completed");
});

test("heartbeat writes are throttled and stale activity is pruned", () => {
  assert.match(backend, /heartbeatMinMs:\s*5000/);
  assert.match(backend, /sameSnapshot/);
  assert.match(backend, /throttled:\s*true/);
  assert.match(backend, /completedRetentionMs:\s*6 \* 3600000/);
  assert.match(backend, /disconnectedRetentionMs:\s*24 \* 3600000/);
  assert.match(backend, /sheet\.deleteRow\(activity\.__row\)/);
  assert.match(backend, /pruneLiveQuizActivity_\(nowMs\)/);
});

test("LiveActivity setup is migration-safe and requires no manual sheet editing", () => {
  assert.match(backend, /function liveQuizSheet_\(\)/);
  assert.match(backend, /ensureDataSheet_\(activeSpreadsheet_\(\), LIVE_QUIZ\.sheet, LIVE_QUIZ_HEADERS\)/);
  assert.match(backend, /function setupLiveQuizMonitoring\(\)/);
  assert.match(backend, /"attempt_id"/);
  assert.match(backend, /"last_activity_at"/);
});

test("live activity responses do not expose quiz answers or question content", () => {
  assert.doesNotMatch(backend, /correct_option/);
  assert.doesNotMatch(backend, /selected_option/);
  assert.doesNotMatch(backend, /answers_json/);
  assert.doesNotMatch(backend, /question_text/);
  assert.match(backend, /startedAt:/);
  assert.match(backend, /answeredCount:/);
});

test("server bridge allows live quiz actions", () => {
  assert.match(bridge, /"updateAttemptActivity"/);
  assert.match(bridge, /"adminGetLiveQuizActivity"/);
});
