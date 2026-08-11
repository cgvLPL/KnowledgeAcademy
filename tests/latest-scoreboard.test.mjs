import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { selectLatestScoreboardEvaluation } from "../app/scoreboard-selection.mjs";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const backend = await readFile(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8");

test("admin scoreboard defaults to the most recently created current test", () => {
  const evaluations = [
    { id: "older", status: "Completed", createdAt: "2026-08-01T08:00:00.000Z" },
    { id: "latest", status: "Live", createdAt: "2026-08-10T08:00:00.000Z" },
    { id: "archived-newer", status: "Archived", createdAt: "2026-08-11T08:00:00.000Z" },
  ];

  assert.equal(selectLatestScoreboardEvaluation(evaluations)?.id, "latest");
  assert.match(client, /selectLatestScoreboardEvaluation\(evaluations\)/);
});

test("legacy course payloads fall back to the last current test", () => {
  const evaluations = [
    { id: "first", status: "Completed" },
    { id: "second", status: "Live" },
  ];

  assert.equal(selectLatestScoreboardEvaluation(evaluations)?.id, "second");
});

test("archived tests remain available when no current test exists", () => {
  const evaluations = [
    { id: "archived-old", status: "Archived", createdAt: "2026-08-01T08:00:00.000Z" },
    { id: "archived-new", status: "Archived", createdAt: "2026-08-02T08:00:00.000Z" },
  ];

  assert.equal(selectLatestScoreboardEvaluation(evaluations)?.id, "archived-new");
});

test("course payloads expose creation time for deterministic recency", () => {
  assert.match(client, /createdAt:\s*String\(course\.createdAt \|\| ""\)/);
  assert.match(backend, /createdAt:\s*toIso_\(course\.created_at\)/);
  assert.match(backend, /version:\s*"2026\.08\.11-account-positions"/);
});
