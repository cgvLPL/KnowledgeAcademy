import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const client = read("app/exam-client.tsx");
const knowledge = read("app/knowledge-centre.tsx");
const knowledgeCss = read("app/knowledge-centre.css");
const pdfCss = read("app/knowledge-pdf-reader.css");
const backend = read("google-apps-script/Code.gs");
const proxy = read("app/api/sheets/route.ts");
const layout = read("app/layout.tsx");

test("knowledge centre is available in both role navigation systems", () => {
  assert.match(client, /type ParticipantView = [^;]*"knowledge"/);
  assert.match(client, /type AdminView = [^;]*"knowledge"/);
  assert.match(client, /id: "knowledge", label: "Knowledge centre", icon: GraduationCap/g);
  assert.match(client, /id: "knowledge", icon: GraduationCap, label: "Library"/);
  assert.match(client, /id: "knowledge", icon: GraduationCap, label: "Learn"/);
  assert.match(client, /view === "knowledge" && <KnowledgeCentre/);
  assert.ok(layout.includes('import "./knowledge-centre.css";'));
});

test("administrators can create, edit, publish, and delete persistent lessons", () => {
  for (const action of ["getKnowledgeCentre", "adminSaveLesson", "adminDeleteLesson"]) {
    assert.match(backend, new RegExp(`\\b${action}:\\s*[A-Za-z0-9_]+_`));
    assert.match(proxy, new RegExp(`"${action}"`));
  }
  assert.match(backend, /Lessons:\s*\[/);
  assert.match(backend, /"lesson_id", "title", "summary", "content", "category", "duration_min"/);
  assert.match(backend, /function adminSaveLesson_\(body\)/);
  assert.match(backend, /requireSession_\(body\.token, "admin"\)/);
  assert.match(backend, /function adminDeleteLesson_\(body\)/);
  assert.match(backend, /SpreadsheetApp\.flush\(\)/);
  assert.match(client, /"adminSaveLesson"/);
  assert.match(client, /"adminDeleteLesson"/);
  assert.match(knowledge, /Upload a new lesson/);
  assert.match(knowledge, /Save changes/);
  assert.match(knowledge, /value="published">Published — visible to participants/);
});

test("participants receive published lessons only and can safely review resources", () => {
  assert.match(backend, /user\.role === "admin" \|\| String\(lesson\.status \|\| ""\)\.toLowerCase\(\) === "published"/);
  assert.match(backend, /lessons: lessonsForUser_\(user\)/g);
  assert.match(client, /setLessons\(\(homeData\.lessons \|\| \[\]\)\.map\(apiLessonToLesson\)\)/);
  assert.match(knowledge, /role === "participant" \? lessons\.filter\(\(lesson\) => lesson\.status === "published"\)/);
  assert.match(knowledge, /target="_blank" rel="noreferrer noopener"/);
  assert.doesNotMatch(knowledge, /dangerouslySetInnerHTML/);
  assert.match(knowledge, /knowledge-reader-body/);
  assert.match(knowledge, /Review lesson/);
});

test("File Garden direct PDF links open inside the Knowledge Centre", () => {
  assert.match(knowledge, /hostname === "file\.garden" \|\| hostname\.endsWith\("\.file\.garden"\)/);
  assert.match(knowledge, /decodedPath\.toLowerCase\(\)\.endsWith\("\.pdf"\)/);
  assert.match(knowledge, /#toolbar=1&navpanes=0&view=FitH/);
  assert.match(knowledge, /className="knowledge-resource-button"/);
  assert.match(knowledge, /Read PDF/);
  assert.match(knowledge, /className="knowledge-pdf-frame"/);
  assert.match(knowledge, /src=\{info\.viewerUrl\}/);
  assert.match(knowledge, /referrerPolicy="no-referrer"/);
  assert.match(knowledge, /PDF controls are provided inside the viewer\. The document stays inside CGV Knowledge Academy\./);
});

test("admin guidance rejects File Garden garden-page URLs and keeps uploads manual", () => {
  assert.match(knowledge, /hostname === "filegarden\.com" \|\| hostname\.endsWith\("\.filegarden\.com"\)/);
  assert.match(knowledge, /paste the direct https:\/\/file\.garden\/\.\.\. file link instead of the garden page/);
  assert.match(knowledge, /placeholder="https:\/\/file\.garden\/\.\.\.\/document\.pdf"/);
  assert.match(knowledge, /File Garden PDF detected — it will open inside CGV Knowledge Academy\./);
  assert.match(knowledge, /Upload the PDF manually in File Garden/);
  assert.match(knowledge, /CGV\.Exams does not upload files to File Garden automatically/);
  assert.doesNotMatch(knowledge, /fetch\([^\n]*file\.garden/);
});

test("internal PDF reader stays responsive on desktop and phones", () => {
  assert.ok(layout.includes('import "./knowledge-pdf-reader.css";'));
  assert.ok(layout.indexOf('import "./knowledge-pdf-reader.css";') > layout.indexOf('import "./knowledge-centre.css";'));
  assert.match(pdfCss, /\.knowledge-pdf-reader\s*\{[\s\S]*?height:\s*min\(92dvh, 920px\)/);
  assert.match(pdfCss, /\.knowledge-pdf-frame\s*\{[\s\S]*?height:\s*100%[\s\S]*?width:\s*100%/);
  assert.match(pdfCss, /@media \(max-width: 760px\)[\s\S]*?\.knowledge-pdf-reader\s*\{[\s\S]*?height:\s*100dvh/);
  assert.match(pdfCss, /env\(safe-area-inset-top\)/);
  assert.match(pdfCss, /env\(safe-area-inset-bottom\)/);
  assert.match(pdfCss, /@media \(forced-colors: active\)/);
});

test("lesson uploads and responsive layout follow the existing app conventions", () => {
  assert.match(knowledge, /accept="\.txt,\.md,text\/plain,text\/markdown"/);
  assert.match(knowledge, /MAX_IMPORT_BYTES = 256 \* 1024/);
  assert.match(knowledge, /className="primary-button"/);
  assert.match(knowledge, /className="secondary-button"/);
  assert.match(knowledgeCss, /--knowledge-orange:\s*#ff6a22/);
  assert.match(knowledgeCss, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(knowledgeCss, /@media \(max-width: 760px\)/);
  assert.match(knowledgeCss, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\) !important/);
  assert.match(knowledgeCss, /env\(safe-area-inset-bottom\)/);
});
