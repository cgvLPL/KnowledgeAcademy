import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const backend = read("google-apps-script/Code.gs");
const proxy = read("app/api/sheets/route.ts");
const knowledge = read("app/knowledge-centre.tsx");

function section(start, end) {
  const startIndex = backend.indexOf(start);
  const endIndex = backend.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0, `Missing ${start}`);
  assert.ok(endIndex > startIndex, `Missing ${end}`);
  return backend.slice(startIndex, endIndex);
}

test("Knowledge Centre lessons and File Garden URLs are persisted by Apps Script", () => {
  const saveLesson = section("function adminSaveLesson_(body)", "function adminDeleteLesson_(body)");
  assert.match(backend, /Lessons:\s*\[[\s\S]*?"resource_title", "resource_url"/);
  assert.match(saveLesson, /normalizeKnowledgeResourceUrl_\(input\.resourceUrl\)/);
  assert.match(saveLesson, /resource_title:\s*resourceTitle/);
  assert.match(saveLesson, /resource_url:\s*resourceUrl/);
  assert.match(saveLesson, /appendObject_\(sheet, record\)/);
  assert.match(saveLesson, /publicLesson_\(record\)/);
});

test("server-side resource validation recognizes direct File Garden PDFs", () => {
  const helperSource = section("function knowledgeResourceInfo_(value)", "function knowledgeCentreSyncMeta_()");
  const helpers = new Function(
    `${helperSource}; return { knowledgeResourceInfo_, normalizeKnowledgeResourceUrl_ };`,
  )();

  const pdf = helpers.knowledgeResourceInfo_(
    "https://file.garden/example-folder/Cinema%20Operations.pdf?download=0",
  );
  assert.equal(pdf.valid, true);
  assert.equal(pdf.isFileGarden, true);
  assert.equal(pdf.isPdf, true);
  assert.equal(pdf.type, "pdf");
  assert.equal(pdf.provider, "filegarden");

  const external = helpers.knowledgeResourceInfo_("https://example.com/guide.html");
  assert.equal(external.provider, "external");
  assert.equal(external.type, "link");

  assert.throws(
    () => helpers.normalizeKnowledgeResourceUrl_("https://filegarden.com/garden/example"),
    /direct https:\/\/file\.garden\/\.\.\. file URL/,
  );
  assert.throws(
    () => helpers.normalizeKnowledgeResourceUrl_("ftp://example.com/manual.pdf"),
    /http or https/,
  );
});

test("all workspace responses expose the canonical Knowledge Centre sync metadata", () => {
  const knowledgeCentre = section("function getKnowledgeCentre_(body)", "function participantHomeForUser_(user)");
  const participantHome = section("function participantHomeForUser_(user)", "function startAttempt_(body)");
  const adminDashboard = section("function adminDashboardForUser_(user, courseId)", "function adminGetExecutiveReport_(body)");

  assert.match(knowledgeCentre, /lessons:\s*lessonsForUser_\(context\.user\)/);
  assert.match(knowledgeCentre, /sync:\s*knowledgeCentreSyncMeta_\(\)/);
  assert.match(participantHome, /lessons:\s*lessonsForUser_\(user\)/);
  assert.match(participantHome, /knowledgeCentre:\s*knowledgeCentreSyncMeta_\(\)/);
  assert.match(adminDashboard, /lessons:\s*lessonsForUser_\(user\)/);
  assert.match(adminDashboard, /knowledgeCentre:\s*knowledgeCentreSyncMeta_\(\)/);
});

test("public lessons return resource metadata used by the internal PDF reader", () => {
  const publicLesson = section("function publicLesson_(lesson)", "function publicCourse_(course, questionCounts)");
  assert.match(publicLesson, /resourceUrl:\s*resource\.url/);
  assert.match(publicLesson, /resourceType:\s*resource\.type/);
  assert.match(publicLesson, /resourceProvider:\s*resource\.provider/);
  assert.match(publicLesson, /resourceIsPdf:\s*resource\.isPdf/);
  assert.match(publicLesson, /resourceIsFileGarden:\s*resource\.isFileGarden/);
  assert.match(publicLesson, /resourceValid:/);
});

test("Apps Script provides an authenticated maintenance sync without changing File Garden upload policy", () => {
  const syncAction = section("function adminSyncKnowledgeCentre_(body)", "function syncKnowledgeCentreBackend()");
  const manualSync = section("function syncKnowledgeCentreBackend()", "function adminSaveLesson_(body)");

  assert.match(backend, /adminSyncKnowledgeCentre:\s*adminSyncKnowledgeCentre_/);
  assert.match(proxy, /"adminSyncKnowledgeCentre"/);
  assert.match(syncAction, /requireSession_\(body\.token, "admin"\)/);
  assert.match(syncAction, /withScriptLock_\(30000, syncKnowledgeCentreData_\)/);
  assert.match(manualSync, /beginRequest_\(\)/);
  assert.match(backend, /revision:\s*"2026\.08\.17-knowledge-centre-filegarden-sync"/);
  assert.match(backend, /fileGardenUploadsAreManual:\s*true/);
  assert.match(knowledge, /Upload the PDF manually in File Garden/);
  assert.doesNotMatch(knowledge, /fetch\([^\n]*file\.garden/);
});

test("Lessons schema is re-checked whenever the Knowledge Centre is accessed", () => {
  const lessonsSheet = section("function lessonsSheet_()", "function lessonsForUser_(user)");
  assert.match(
    lessonsSheet,
    /ensureDataSheet_\(activeSpreadsheet_\(\), APP\.sheets\.lessons, HEADERS\.Lessons\)/,
  );
  assert.match(backend, /function syncKnowledgeCentreData_\(\)/);
  assert.match(backend, /invalidLessonIds/);
  assert.match(backend, /normalizedResources/);
  assert.match(backend, /fileGardenResources/);
  assert.match(backend, /pdfResources/);
});
