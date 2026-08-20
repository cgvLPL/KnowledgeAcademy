import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  BACKEND_EXECUTION_TARGET,
  BURST_SPREAD_MS,
  EXAM_CAPACITY_TARGET,
  RETRY_DELAYS_MS,
  capacityRequestDelayMs,
  fetchSheetsWithRetry,
} from "../app/sheets-request-policy.mjs";

const root = path.resolve(import.meta.dirname, "..");
const backend = fs.readFileSync(path.join(root, "google-apps-script/Code.gs"), "utf8");

test("frontend supports a 50-participant event while preserving the 30-slot backend contract", () => {
  const target = Number(backend.match(/targetSimultaneousParticipants:\s*(\d+)/)?.[1]);
  const lockTimeout = Number(backend.match(/writeLockTimeoutMs:\s*(\d+)/)?.[1]);

  assert.equal(EXAM_CAPACITY_TARGET, 50);
  assert.equal(BACKEND_EXECUTION_TARGET, 30);
  assert.equal(target, BACKEND_EXECUTION_TARGET);
  assert.ok(lockTimeout >= target * 2_500, "write queue allows less than 2.5 seconds per backend slot");
  assert.match(backend, /withScriptLock_\(APP\.capacity\.writeLockTimeoutMs/);
  assert.match(backend, /lock\.tryLock\(timeoutMs\)/);
  assert.match(backend, /findObjectByExactValue_\([\s\S]*?createTextFinder/);
  assert.match(backend, /findById_\(APP\.sheets\.attempts, "attempt_id", attemptId, true\)/);
  assert.match(backend, /SpreadsheetApp\.flush\(\)/);
});

test("capacity-sensitive requests are spread across a 30-second admission window", () => {
  const delays = Array.from({ length: EXAM_CAPACITY_TARGET }, (_, index) => (
    capacityRequestDelayMs(
      "login",
      0,
      0,
      () => index / (EXAM_CAPACITY_TARGET - 1),
    )
  ));

  assert.equal(delays[0], 0);
  assert.equal(delays.at(-1), BURST_SPREAD_MS);
  assert.ok(BURST_SPREAD_MS >= 30_000);

  const oneSecondBuckets = new Map();
  delays.forEach((delay) => {
    const bucket = Math.floor(delay / 1_000);
    oneSecondBuckets.set(bucket, (oneSecondBuckets.get(bucket) || 0) + 1);
  });
  assert.ok(
    Math.max(...oneSecondBuckets.values()) <= 2,
    "evenly distributed participants should not bunch into large one-second bursts",
  );

  assert.equal(
    capacityRequestDelayMs("adminGetDashboard", 0, 0, () => 1),
    0,
    "admin dashboard reads should not be intentionally delayed",
  );
});

test("50 virtual participants plus one admin recover from burst throttling without duplicate results", async () => {
  const participantIds = Array.from(
    { length: EXAM_CAPACITY_TARGET },
    (_, index) => `participant-${index + 1}`,
  );
  const savedResults = new Set();
  const calls = new Map();
  let adminReads = 0;

  async function runAdminRead() {
    const response = await fetchSheetsWithRetry(
      "adminGetDashboard",
      async (_signal, requestNumber) => {
        adminReads += 1;
        if (requestNumber === 0) {
          return Response.json(
            { ok: false, error: "Too many simultaneous executions." },
            { status: 503 },
          );
        }
        return Response.json({ ok: true, scoreboard: [] });
      },
      {
        random: () => 0,
        sleep: async () => undefined,
        timeoutMs: 1_000,
      },
    );
    const data = await response.json();
    assert.equal(data.ok, true);
  }

  async function runParticipantPhase(action) {
    const results = await Promise.all(participantIds.map(async (participantId, participantIndex) => {
      const response = await fetchSheetsWithRetry(
        action,
        async (_signal, requestNumber) => {
          const key = `${action}:${participantId}`;
          calls.set(key, (calls.get(key) || 0) + 1);

          // Model the Apps Script deployer's documented 30-execution boundary:
          // users beyond that first wave see transient pressure and retry.
          if (requestNumber === 0 && participantIndex >= BACKEND_EXECUTION_TARGET) {
            return Response.json(
              { ok: false, error: "Too many simultaneous executions." },
              { status: 503 },
            );
          }

          // Model an ambiguous submission: the write committed but the response failed.
          if (action === "submitAttempt" && requestNumber === 0 && participantIndex % 7 === 0) {
            savedResults.add(participantId);
            return Response.json(
              { ok: false, error: "Service temporarily unavailable." },
              { status: 503 },
            );
          }

          if (action === "submitAttempt") savedResults.add(participantId);
          return Response.json({
            ok: true,
            alreadySubmitted: action === "submitAttempt" && requestNumber > 0,
            result: { attemptId: participantId, score: 100 },
          });
        },
        {
          random: () => 0,
          sleep: async () => undefined,
          timeoutMs: 1_000,
        },
      );
      const data = await response.json();
      assert.equal(data.ok, true);
      return data;
    }));
    assert.equal(results.length, EXAM_CAPACITY_TARGET);
  }

  for (const action of ["login", "startAttempt", "submitAttempt"]) {
    await Promise.all([runAdminRead(), runParticipantPhase(action)]);
  }

  assert.equal(savedResults.size, EXAM_CAPACITY_TARGET);
  assert.equal(adminReads, 6);
  assert.ok(RETRY_DELAYS_MS.length >= 7);
  assert.ok(Array.from(calls.values()).some((count) => count > 1));
});
