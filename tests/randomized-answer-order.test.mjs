import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const client = read("app/exam-client.tsx");
const adminTools = read("app/admin-functionality-enhancer.tsx");

test("quiz answer randomization is configurable and persisted per course", () => {
  assert.match(client, /Randomize answer order/);
  assert.match(client, /randomizeAnswers:\s*evaluation\.randomizeAnswers/);
  assert.match(adminTools, /randomizeAnswers:\s*editCourse\.randomizeAnswers === true/);
  assert.match(backend, /"attempt_limit", "randomize_answers"/);
  assert.match(backend, /randomize_answers:\s*input\.randomizeAnswers/);
  assert.match(backend, /randomizeAnswers:\s*courseRandomizesAnswers_\(course\)/);
  assert.match(backend, /randomizeAnswers:\s*courseRandomizesAnswers_\(source\)/);
});

test("answer choices use a stable per-attempt shuffle and retain scoring keys", () => {
  assert.match(client, /function seededShuffle<T>/);
  assert.match(client, /seededShuffle\(question\.options, `\$\{data\.attemptId\}:\$\{question\.id\}`\)/);
  assert.match(client, /optionKeys:\s*options\.map\(\(option\) => option\.key\)/);
  assert.match(client, /question\.optionKeys\?\.\[selectedIndex\]/);
});
