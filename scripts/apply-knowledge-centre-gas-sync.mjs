import fs from "node:fs";

const path = "google-apps-script/Code.gs";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  "knowledge sync API action",
  '  adminSaveLesson: adminSaveLesson_,\n  adminDeleteLesson: adminDeleteLesson_,',
  '  adminSaveLesson: adminSaveLesson_,\n  adminDeleteLesson: adminDeleteLesson_,\n  adminSyncKnowledgeCentre: adminSyncKnowledgeCentre_,',
);

replaceOnce(
  "knowledge centre response metadata",
  `function getKnowledgeCentre_(body) {
  const context = requireSession_(body.token);
  return {
    ok: true,
    user: publicUser_(context.user),
    lessons: lessonsForUser_(context.user),
  };
}`,
  `function getKnowledgeCentre_(body) {
  const context = requireSession_(body.token);
  return {
    ok: true,
    user: publicUser_(context.user),
    lessons: lessonsForUser_(context.user),
    sync: knowledgeCentreSyncMeta_(),
  };
}`,
);

replaceOnce(
  "participant workspace knowledge sync metadata",
  `    courses: courses,
    lessons: lessonsForUser_(user),
    history: history,`,
  `    courses: courses,
    lessons: lessonsForUser_(user),
    knowledgeCentre: knowledgeCentreSyncMeta_(),
    history: history,`,
);

replaceOnce(
  "admin workspace knowledge sync metadata",
  `    lessons: lessonsForUser_(user),
    participants: participants.map(function (user) {`,
  `    lessons: lessonsForUser_(user),
    knowledgeCentre: knowledgeCentreSyncMeta_(),
    participants: participants.map(function (user) {`,
);

const helperBlock = String.raw`function knowledgeResourceInfo_(value) {
  const url = String(value || "").trim();
  const empty = {
    url: url,
    valid: !url,
    type: "",
    provider: "",
    isPdf: false,
    isFileGarden: false,
    isFileGardenPage: false,
  };
  if (!url) return empty;
  const match = url.match(/^(https?):\/\/([^\/?#]+)([^?#]*)/i);
  if (!match) return Object.assign({}, empty, { valid: false });
  const hostname = String(match[2] || "").toLowerCase().replace(/\.$/, "");
  let pathname = String(match[3] || "");
  try {
    pathname = decodeURIComponent(pathname);
  } catch (error) {
    // Keep the encoded path; PDF detection still works for normal direct URLs.
  }
  const isPdf = /\.pdf$/i.test(pathname);
  const isFileGarden = hostname === "file.garden" || /\.file\.garden$/i.test(hostname);
  const isFileGardenPage = hostname === "filegarden.com" || /\.filegarden\.com$/i.test(hostname);
  return {
    url: url,
    valid: true,
    type: isPdf ? "pdf" : "link",
    provider: isFileGarden ? "filegarden" : "external",
    isPdf: isPdf,
    isFileGarden: isFileGarden,
    isFileGardenPage: isFileGardenPage,
  };
}

function normalizeKnowledgeResourceUrl_(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.length > 2048) throw new Error("Resource links must be 2,048 characters or fewer.");
  const resource = knowledgeResourceInfo_(url);
  if (!resource.valid) throw new Error("Resource links must use http or https.");
  if (resource.isFileGardenPage) {
    throw new Error("For File Garden, use the direct https://file.garden/... file URL instead of the garden page.");
  }
  return resource.url;
}

function knowledgeCentreSyncMeta_() {
  return {
    backend: "google-apps-script",
    sheet: APP.sheets.lessons,
    revision: "2026.08.17-knowledge-centre-filegarden-sync",
    storesResourceTitle: true,
    storesResourceUrl: true,
    fileGardenDirectUrls: true,
    fileGardenUploadsAreManual: true,
  };
}

function syncKnowledgeCentreData_() {
  const sheet = ensureDataSheet_(activeSpreadsheet_(), APP.sheets.lessons, HEADERS.Lessons);
  const lessons = rowsAsObjects_(sheet);
  const invalidLessonIds = [];
  let normalizedResources = 0;
  let fileGardenResources = 0;
  let pdfResources = 0;

  lessons.forEach(function (lesson) {
    const storedUrl = String(lesson.resource_url || "");
    const trimmedUrl = storedUrl.trim();
    if (!trimmedUrl) return;
    const resource = knowledgeResourceInfo_(trimmedUrl);
    if (!resource.valid || resource.isFileGardenPage) {
      invalidLessonIds.push(String(lesson.lesson_id || ""));
      return;
    }
    if (resource.isFileGarden) fileGardenResources += 1;
    if (resource.isPdf) pdfResources += 1;
    if (trimmedUrl !== storedUrl) {
      updateObjectRow_(sheet, lesson.__row, {
        resource_url: trimmedUrl,
        updated_at: new Date(),
      });
      normalizedResources += 1;
    }
  });

  SpreadsheetApp.flush();
  return {
    ok: true,
    lessons: lessons.length,
    normalizedResources: normalizedResources,
    fileGardenResources: fileGardenResources,
    pdfResources: pdfResources,
    invalidLessonIds: invalidLessonIds,
    sync: knowledgeCentreSyncMeta_(),
  };
}

function adminSyncKnowledgeCentre_(body) {
  requireSession_(body.token, "admin");
  return withScriptLock_(30000, syncKnowledgeCentreData_);
}

// Run once from the Apps Script editor after replacing Code.gs if you want an
// immediate audit/normalization of existing lesson resource URLs. Normal app
// traffic also uses the same canonical Lessons sheet and validation helpers.
function syncKnowledgeCentreBackend() {
  beginRequest_();
  return withScriptLock_(30000, syncKnowledgeCentreData_);
}

`;

replaceOnce(
  "knowledge resource helpers",
  "function adminSaveLesson_(body) {",
  helperBlock + "function adminSaveLesson_(body) {",
);

replaceOnce(
  "server-side lesson resource normalization",
  `  const resourceTitle = String(input.resourceTitle || "").trim();
  const resourceUrl = String(input.resourceUrl || "").trim();`,
  `  const resourceTitle = String(input.resourceTitle || "").trim();
  const resourceUrl = normalizeKnowledgeResourceUrl_(input.resourceUrl);`,
);

replaceOnce(
  "remove duplicate resource URL validation",
  `  if (resourceTitle.length > 160) throw new Error("Resource labels must be 160 characters or fewer.");
  if (resourceUrl.length > 2048) throw new Error("Resource links must be 2,048 characters or fewer.");
  if (resourceUrl && !/^https?:\\/\\//i.test(resourceUrl)) {
    throw new Error("Resource links must use http or https.");
  }`,
  `  if (resourceTitle.length > 160) throw new Error("Resource labels must be 160 characters or fewer.");`,
);

replaceOnce(
  "always ensure canonical Lessons schema",
  `function lessonsSheet_() {
  const spreadsheet = activeSpreadsheet_();
  return spreadsheet.getSheetByName(APP.sheets.lessons) ||
    ensureDataSheet_(spreadsheet, APP.sheets.lessons, HEADERS.Lessons);
}`,
  `function lessonsSheet_() {
  return ensureDataSheet_(activeSpreadsheet_(), APP.sheets.lessons, HEADERS.Lessons);
}`,
);

replaceOnce(
  "public lesson resource metadata",
  `function publicLesson_(lesson) {
  return {
    id: lesson.lesson_id,
    title: lesson.title,
    summary: lesson.summary,
    content: lesson.content,
    category: lesson.category || "General",
    duration: Math.max(1, Number(lesson.duration_min || 5)),
    resourceTitle: lesson.resource_title || "",
    resourceUrl: lesson.resource_url || "",
    status: String(lesson.status || "draft").toLowerCase() === "published" ? "published" : "draft",
    createdAt: toIso_(lesson.created_at),
    updatedAt: toIso_(lesson.updated_at),
  };
}`,
  `function publicLesson_(lesson) {
  const resource = knowledgeResourceInfo_(lesson.resource_url);
  return {
    id: lesson.lesson_id,
    title: lesson.title,
    summary: lesson.summary,
    content: lesson.content,
    category: lesson.category || "General",
    duration: Math.max(1, Number(lesson.duration_min || 5)),
    resourceTitle: lesson.resource_title || "",
    resourceUrl: resource.url,
    resourceType: resource.type,
    resourceProvider: resource.provider,
    resourceIsPdf: resource.isPdf,
    resourceIsFileGarden: resource.isFileGarden,
    resourceValid: !resource.url || (resource.valid && !resource.isFileGardenPage),
    status: String(lesson.status || "draft").toLowerCase() === "published" ? "published" : "draft",
    createdAt: toIso_(lesson.created_at),
    updatedAt: toIso_(lesson.updated_at),
  };
}`,
);

fs.writeFileSync(path, source);
console.log("Applied Knowledge Centre + File Garden Google Apps Script sync patch.");
