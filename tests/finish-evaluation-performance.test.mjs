import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  capacityRequestDelayMs,
  fetchSheetsWithRetry,
} from "../app/sheets-request-policy.mjs";

const root = path.resolve(import.meta.dirname, "..");
const backend = fs.readFileSync(path.join(root, "google-apps-script/Code.gs"), "utf8");

test("finish evaluation submits immediately on the first request", async () => {
  assert.equal(capacityRequestDelayMs("submitAttempt", 0, 0, () => 1), 0);
  const sleeps = [];
  const response = await fetchSheetsWithRetry(
    "submitAttempt",
    async () => Response.json({ ok: true, result: { score: 100 } }),
    {
      random: () => 1,
      sleep: async (delay) => sleeps.push(delay),
      timeoutMs: 1_000,
    },
  );
  assert.equal((await response.json()).ok, true);
  assert.deepEqual(sleeps, []);
});

test("finish evaluation retries temporary backend pressure", async () => {
  const sleeps = [];
  let calls = 0;
  const response = await fetchSheetsWithRetry(
    "submitAttempt",
    async () => {
      calls += 1;
      if (calls === 1) {
        return Response.json(
          { ok: false, error: "The exam service is temporarily busy. Please try again." },
          { status: 503 },
        );
      }
      return Response.json({ ok: true, alreadySubmitted: true, result: { score: 88 } });
    },
    {
      random: () => 0,
      sleep: async (delay) => sleeps.push(delay),
      timeoutMs: 1_000,
    },
  );
  assert.equal((await response.json()).ok, true);
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1_000]);
});

test("backend submission path fails fast under lock pressure and keeps retry-safe writes", () => {
  const timeout = Number(backend.match(/submissionLockTimeoutMs:\s*(\d+)/)?.[1]);
  assert.ok(timeout > 0 && timeout <= 10_000, "submission lock should release busy executions quickly");
  assert.match(
    backend,
    /function submitAttempt_\(body\)[\s\S]*?withScriptLock_\(APP\.capacity\.submissionLockTimeoutMs/,
  );
  assert.match(backend, /if \(current\.status === "submitted"\) return existingAttemptResult_/);
  assert.match(backend, /deleteRowsMatching_\(answersSheet, "attempt_id", attemptId\)/);
  assert.match(backend, /answersSheet[\s\S]*?\.setValues\(answerRows\)/);
  assert.match(
    backend,
    /function deleteRowsMatching_[\s\S]*?sheet\.deleteRows\(runLow, runHigh - runLow \+ 1\)/,
  );
});
