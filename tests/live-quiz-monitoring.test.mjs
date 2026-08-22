import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const enhancer = readFileSync(new URL("../app/live-quiz-monitor-enhancer.tsx", import.meta.url), "utf8");
const monitor = readFileSync(new URL("../app/live-quiz-monitor.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const bridge = readFileSync(new URL("../app/api/sheets/route.ts", import.meta.url), "utf8");
const backend = readFileSync(new URL("../google-apps-script/ZZLiveQuiz.gs", import.meta.url), "utf8");

test("participant quiz activity is captured from the existing attempt flow", () => {
  assert.match(enhancer, /payload\.action === "startAttempt"/);
  assert.match(enhancer, /action: "updateAttemptActivity"/);
  assert.match(enhancer, /HEARTBEAT_MS = 15000/);
  assert.match(enhancer, /payload\.action === "submitAttempt"/);
  assert.match(enhancer, /sendHeartbeat\("completed"\)/);
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

test("Apps Script live activity routes require the correct session roles", () => {
  assert.match(backend, /requireSession_\(body\.token, "participant"\)/);
  assert.match(backend, /requireSession_\(body\.token, "admin"\)/);
  assert.match(backend, /ageSeconds <= 30/);
  assert.match(backend, /ageSeconds <= 120/);
  assert.match(backend, /return "disconnected"/);
  assert.match(backend, /action === "updateAttemptActivity"/);
  assert.match(backend, /action === "adminGetLiveQuizActivity"/);
});

test("server bridge allows live quiz actions", () => {
  assert.match(bridge, /"updateAttemptActivity"/);
  assert.match(bridge, /"adminGetLiveQuizActivity"/);
});
