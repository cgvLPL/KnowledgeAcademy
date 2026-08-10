import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const safetyNet = await readFile(new URL("../app/button-safety-net.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/admin-quiz-builder-responsive.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("the builder keeps an explicit active question with accessible outline controls", () => {
  assert.match(client, /const \[activeQuestionIndex, setActiveQuestionIndex\] = useState\(0\)/);
  assert.match(client, /aria-label="Quiz questions"/);
  assert.match(client, /aria-controls=\{`builder-question-\$\{index\}`\}/);
  assert.match(client, /aria-current=\{index === activeQuestionIndex \? "step" : undefined\}/);
  assert.match(client, /id=\{`builder-question-\$\{questionIndex\}`\}/);
});

test("question creation, duplication, deletion, and incomplete-course recovery select the relevant question", () => {
  assert.match(client, /function addQuestion\(\)/);
  assert.match(client, /function duplicateQuestion\(questionIndex: number\)/);
  assert.match(client, /function deleteQuestion\(questionIndex: number\)/);
  assert.match(client, /setActiveQuestionIndex\(incompleteQuestionIndex\)/);
  assert.match(client, /data-native-question-action/);
  assert.match(safetyNet, /hasAttribute\("data-native-question-action"\)/);
});

test("builder answer choices use one visible selector with readable letters", () => {
  assert.match(css, /\.builder-page \.option-editor > label > input\[type="radio"\][\s\S]*?clip-path:\s*inset\(50%\)/);
  assert.match(css, /\.builder-page \.option-editor \.answer-letter[\s\S]*?color:\s*#dfe3df\s*!important/);
  assert.match(css, /\.builder-page \.option-editor > label\.correct \.answer-letter[\s\S]*?linear-gradient/);
  assert.match(css, /grid-template-columns:\s*36px minmax\(0,\s*1fr\) auto/);
});

test("the question outline remains reachable at tablet and phone widths", () => {
  assert.match(css, /\.builder-page \.builder-progress\s*\{[\s\S]*?position:\s*sticky[\s\S]*?top:\s*88px/);
  assert.match(css, /@media \(max-width:\s*980px\)[\s\S]*?\.builder-page \.question-outline[\s\S]*?display:\s*flex\s*!important/);
  assert.match(css, /\.builder-page \.question-outline > div\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.builder-page \.builder-progress[\s\S]*?position:\s*sticky[\s\S]*?top:\s*0/);
});

test("the final builder layer is loaded after the existing responsive releases", () => {
  const existingIndex = layout.indexOf('import "./admin-participants-mobile.css";');
  const builderIndex = layout.indexOf('import "./admin-quiz-builder-responsive.css";');
  assert.ok(existingIndex >= 0);
  assert.ok(builderIndex > existingIndex);
});
