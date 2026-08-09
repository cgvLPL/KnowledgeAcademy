import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  EXAM_CAPACITY_TARGET,
  RETRY_DELAYS_MS,
  fetchSheetsWithRetry,
} from "../app/sheets-request-policy.mjs";

const root = path.resolve(import.meta.dirname, "..");
const backend = fs.readFileSync(path.join(root, "google-apps-script/Code.gs"), "utf8");

test("backend reserves a safe write queue for 30 simultaneous participants", () => {
  const target = Number(backend.match(/targetSimultaneousParticipants:\s*(\d+)/)?.[1]);
  const lockTimeout = Number(backend.match(/writeLockTimeoutMs:\s*(\d+)/)?.[1]);

  assert.equal(EXAM_CAPACITY_TARGET, 30);
  assert.equal(target, EXAM_CAPACITY_TARGET);
  assert.ok(lockTimeout >= target * 2_500, "write queue allows less than 2.5 seconds per participant");
  assert.match(backend, /withScriptLock_\(APP\.capacity\.writeLockTimeoutMs/);
  assert.match(backend, /lock\.tryLock\(timeoutMs\)/);
  assert.match(backend, /findObjectByExactValue_\([\s\S]*?createTextFinder/);
  assert.match(backend, /SpreadsheetApp\.flush\(\)/);
});

test("30 virtual participants recover from burst throttling without duplicate results", async () => {
  const participantIds = Array.from(
    { length: EXAM_CAPACITY_TARGET },
    (_, index) => `participant-${index + 1}`,
  );
  const savedResults = new Set();
  const calls = new Map();

  async function runPhase(action) {
    return Promise.all(participantIds.map(async (participantId, participantIndex) => {
      const response = await fetchSheetsWithRetry(
        action,
        async (_signal, requestNumber) => {
          const key = `${action}:${participantId}`;
          calls.set(key, (calls.get(key) || 0) + 1);

          // Model quota pressure on the first request from the final ten users.
          if (requestNumber === 0 && participantIndex >= 20) {
            return Response.json({ ok: false, error: "The exam service is temporarily busy." });
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
  }

  for (const action of ["login", "startAttempt", "submitAttempt"]) {
    const results = await runPhase(action);
    assert.equal(results.length, EXAM_CAPACITY_TARGET);
  }

  assert.equal(savedResults.size, EXAM_CAPACITY_TARGET);
  assert.ok(RETRY_DELAYS_MS.length >= 5);
  assert.ok(Array.from(calls.values()).some((count) => count > 1));
});
