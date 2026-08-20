import assert from "node:assert/strict";
import test from "node:test";

import {
  BURST_SPREAD_MS,
  capacityRequestDelayMs,
  fetchSheetsWithRetry,
} from "../app/sheets-request-policy.mjs";

test("healthy login starts immediately instead of waiting for the cohort spread window", async () => {
  const sleeps = [];
  const calls = [];

  const response = await fetchSheetsWithRetry(
    "login",
    async (_signal, requestNumber) => {
      calls.push(requestNumber);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    {
      random: () => 1,
      sleep: async (delay) => sleeps.push(delay),
      timeoutMs: 1_000,
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(calls, [0]);
  assert.deepEqual(sleeps, []);
  assert.equal(capacityRequestDelayMs("login", 0, 0, () => 1), 0);
});

test("login keeps bounded retry backoff when Apps Script is temporarily busy", async () => {
  const sleeps = [];
  let calls = 0;

  const response = await fetchSheetsWithRetry(
    "login",
    async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ ok: false, error: "Too many simultaneous executions" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    {
      random: () => 0,
      sleep: async (delay) => sleeps.push(delay),
      timeoutMs: 1_000,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [1_000]);
});

test("synchronized exam writes keep the production admission spread", () => {
  assert.equal(BURST_SPREAD_MS, 30_000);
  assert.equal(capacityRequestDelayMs("startAttempt", 0, 0, () => 1), BURST_SPREAD_MS);
  assert.equal(capacityRequestDelayMs("submitAttempt", 0, 0, () => 1), BURST_SPREAD_MS);
  assert.equal(capacityRequestDelayMs("adminGetDashboard", 0, 0, () => 1), 0);
});
