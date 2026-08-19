import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const source = fs.readFileSync(path.join(root, "app/knowledge-centre.tsx"), "utf8");

test("admins get an explicit Preview as participant action", () => {
  assert.match(source, /\bEye,\s*\n\s*FileText,/);
  assert.match(source, /data-preview-as-participant=\{role === "admin" \? "true" : undefined\}/);
  assert.match(source, /Preview as participant <Eye size=\{16\} \/>/);
  assert.match(source, /aria-label=\{role === "admin" \? `Preview \$\{lesson\.title\} as participant`/);
});

test("admin preview reuses the exact participant lesson reader", () => {
  assert.match(source, /onClick=\{\(\) => setSelectedLesson\(lesson\)\}/);
  assert.match(source, /\{selectedLesson && <LessonReader lesson=\{selectedLesson\} onClose=\{\(\) => setSelectedLesson\(null\)\} \/>\}/);
  assert.match(source, /function LessonReader\(\{ lesson, onClose \}/);
  assert.match(source, /Read PDF <BookOpen size=\{16\} \/>/);
});

test("draft lessons remain previewable by admins but hidden from participants", () => {
  assert.match(
    source,
    /\(\) => role === "participant" \? lessons\.filter\(\(lesson\) => lesson\.status === "published"\) : lessons/,
  );
  assert.match(source, /data-lesson-status=\{lesson\.status\}/);
});

test("preview does not change lesson visibility or save lesson data", () => {
  const previewButtonStart = source.indexOf('data-preview-as-participant={role === "admin" ? "true" : undefined}');
  const previewButtonEnd = source.indexOf("</button>", previewButtonStart);
  assert.ok(previewButtonStart >= 0 && previewButtonEnd > previewButtonStart);
  const previewButton = source.slice(previewButtonStart, previewButtonEnd);
  assert.doesNotMatch(previewButton, /onSave|setStatus|onDelete|removeLesson/);
});
