import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");

test("quiz navigation uses the same book icon for participants and administrators", () => {
  assert.match(client, /id: "evaluations", label: "Evaluations", icon: BookOpen/);
  assert.match(client, /id: "courses", label: "Quiz courses", icon: BookOpen/);
  assert.match(client, /id: "courses", icon: BookOpen, label: "Courses"/);
  assert.doesNotMatch(client, /Layers3/);
});

test("quiz cards and course tables use one consistent evaluation icon", () => {
  assert.match(client, /function EvaluationIcon\(\{ color \}: \{ color: Evaluation\["color"\] \}\)/);
  assert.match(client, /<BookOpen size=\{22\} \/>/);
  assert.doesNotMatch(client, /<EvaluationIcon[^>]+icon=/);
});
