const APP = Object.freeze({
name: "CGV Exams",
version: "2026.07.24-results-sync",
timezone: "Asia/Jakarta",
sessionHours: 12,
sheets: Object.freeze({
settings: "Settings",
users: "Users",
courses: "Courses",
questions: "Questions",
attempts: "Attempts",
answers: "Answers",
sessions: "Sessions",
dashboard: "Dashboard",
}),
});
const HEADERS = Object.freeze({
Settings: ["key", "value", "updated_at"],
Users: [
"user_id", "email", "full_name", "branch", "password_hash", "salt",
"role", "status", "created_at", "last_login", "username",
],
Courses: [
"course_id", "title", "description", "category", "passing_score",
"time_limit_min", "start_at", "end_at", "status", "created_by",
"created_at", "updated_at",
],
Questions: [
"question_id", "course_id", "order_no", "question_text", "option_a",
"option_b", "option_c", "option_d", "correct_option", "points", "explanation",
],
Attempts: [
"attempt_id", "course_id", "user_id", "started_at", "submitted_at",
"status", "score", "correct_count", "total_questions", "duration_seconds",
"answers_json",
],
Answers: [
"answer_id", "attempt_id", "question_id", "selected_option", "is_correct",
"points_awarded", "answered_at",
],
Sessions: ["token_hash", "user_id", "role", "expires_at", "created_at"],
});
const API_ACTIONS = Object.freeze({
health: health_,
login: login_,
logout: logout_,
getParticipantHome: getParticipantHome_,
startAttempt: startAttempt_,
submitAttempt: submitAttempt_,
adminGetDashboard: adminGetDashboard_,
adminSaveCourse: adminSaveCourse_,
adminSaveParticipant: adminSaveParticipant_,
adminSaveUser: adminSaveUser_,
adminResetPassword: adminResetPassword_,
});
function doGet() {
return json_(health_());
}
function doPost(event) {
try {
const body = parseBody_(event);
const action = String(body.action || "");
if (!Object.prototype.hasOwnProperty.call(API_ACTIONS, action)) {
throw new Error("Unsupported action.");
}
return json_(API_ACTIONS[action](body));
} catch (error) {
console.error(error && error.stack ? error.stack : error);
return json_({
ok: false,
error: error && error.message ? error.message : "Unexpected server error.",
});
}
}
function health_() {
return {
ok: true,
service: APP.name,
version: APP.version,
spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
now: new Date().toISOString(),
};
}
function setupEvaluationPlatform() {
return withScriptLock_(30000, function () {
const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
spreadsheet.setSpreadsheetTimeZone(APP.timezone);
Object.keys(HEADERS).forEach(function (name) {
ensureDataSheet_(spreadsheet, name, HEADERS[name]);
});
ensureSettings_();
ensurePepper_();
const admin = ensureInitialAdmin_();
buildDashboard_();
SpreadsheetApp.flush();
return {
ok: true,
spreadsheetId: spreadsheet.getId(),
sheets: spreadsheet.getSheets().map(function (sheet) { return sheet.getName(); }),
adminUsername: admin.username,
version: APP.version,
};
});
}
function resetEvaluationPlatformToAdminOnly() {
return withScriptLock_(30000, function () {
const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
Object.keys(HEADERS).forEach(function (name) {
ensureDataSheet_(spreadsheet, name, HEADERS[name]);
});
ensureSettings_();
ensurePepper_();
const admin = ensureInitialAdmin_();
rowsAsObjects_(getSheet_(APP.sheets.users))
.filter(function (user) { return user.user_id !== admin.user_id; })
.sort(function (a, b) { return b.__row - a.__row; })
.forEach(function (user) { getSheet_(APP.sheets.users).deleteRow(user.__row); });
[APP.sheets.courses, APP.sheets.questions, APP.sheets.attempts,
APP.sheets.answers, APP.sheets.sessions].forEach(function (name) {
clearDataRows_(getSheet_(name));
});
buildDashboard_();
SpreadsheetApp.flush();
return { ok: true, adminUsername: admin.username };
});
}
function resetAdminCredentials() {
return withScriptLock_(30000, function () {
const properties = PropertiesService.getScriptProperties();
const username = normalizeUsername_(properties.getProperty("INITIAL_ADMIN_USERNAME"));
const password = String(properties.getProperty("INITIAL_ADMIN_PASSWORD") || "");
if (!isValidUsername_(username)) throw new Error("Set a valid INITIAL_ADMIN_USERNAME.");
if (password.length < 8) throw new Error("Set INITIAL_ADMIN_PASSWORD to at least eight characters.");
const admin = rowsAsObjects_(getSheet_(APP.sheets.users)).find(function (user) {
return user.role === "admin" && user.status === "active";
});
if (!admin) throw new Error("No active administrator account exists.");
const salt = makeSalt_();
updateObjectRow_(getSheet_(APP.sheets.users), admin.__row, {
username: username,
password_hash: hashPassword_(password, salt),
salt: salt,
last_login: "",
});
clearDataRows_(getSheet_(APP.sheets.sessions));
SpreadsheetApp.flush();
return { ok: true, adminUsername: username };
});
}
function rebuildDashboard() {
buildDashboard_();
SpreadsheetApp.flush();
return { ok: true };
}
function login_(body) {
const username = normalizeUsername_(body.username || body.email);
const password = String(body.password || "");
if (!username || !password) throw new Error("Username and password are required.");
let user = findUserByUsername_(username);
if (!user && username.indexOf("@") !== -1) user = findUserByEmail_(username);
if (!user || user.status !== "active") throw new Error("Invalid username or password.");
if (hashPassword_(password, user.salt) !== user.password_hash) {
throw new Error("Invalid username or password.");
}
return withScriptLock_(10000, function () {
pruneSessions_();
updateObjectRow_(getSheet_(APP.sheets.users), user.__row, { last_login: new Date() });
const token = Utilities.getUuid() + Utilities.getUuid();
const expiresAt = new Date(Date.now() + APP.sessionHours * 3600000);
appendRow_(getSheet_(APP.sheets.sessions), [
hashToken_(token), user.user_id, user.role, expiresAt, new Date(),
]);
SpreadsheetApp.flush();
return {
ok: true,
token: token,
expiresAt: expiresAt.toISOString(),
user: publicUser_(user),
};
});
}
function logout_(body) {
if (!body.token) return { ok: true };
const tokenHash = hashToken_(String(body.token));
return withScriptLock_(10000, function () {
deleteRowsMatching_(getSheet_(APP.sheets.sessions), "token_hash", tokenHash);
SpreadsheetApp.flush();
return { ok: true };
});
}
function getParticipantHome_(body) {
const context = requireSession_(body.token, "participant");
const now = new Date();
const courses = rowsAsObjects_(getSheet_(APP.sheets.courses))
.filter(function (course) {
const opens = !course.start_at || new Date(course.start_at) <= now;
const closes = !course.end_at || new Date(course.end_at) >= now;
return course.status === "live" && opens && closes;
})
.map(publicCourse_);
const history = attemptsForUser_(context.user.user_id)
.filter(function (attempt) { return attempt.status === "submitted"; })
.sort(function (a, b) { return new Date(b.submitted_at) - new Date(a.submitted_at); })
.map(publicAttempt_);
return {
ok: true,
user: publicUser_(context.user),
courses: courses,
history: history,
summary: summarizeAttempts_(history),
};
}
function startAttempt_(body) {
const context = requireSession_(body.token, "participant");
const courseId = String(body.courseId || "").trim();
const course = findById_(APP.sheets.courses, "course_id", courseId);
if (!course || course.status !== "live") throw new Error("This evaluation is not available.");
const now = new Date();
if (course.start_at && new Date(course.start_at) > now) throw new Error("This evaluation has not opened yet.");
if (course.end_at && new Date(course.end_at) < now) throw new Error("This evaluation has closed.");
const questions = questionsForCourse_(courseId);
if (!questions.length) throw new Error("This evaluation has no published questions.");
const attemptId = Utilities.getUuid();
withScriptLock_(10000, function () {
appendRow_(getSheet_(APP.sheets.attempts), [
attemptId, courseId, context.user.user_id, now, "", "started", "", "", "", "", "",
]);
SpreadsheetApp.flush();
});
return {
ok: true,
attemptId: attemptId,
startedAt: now.toISOString(),
course: publicCourse_(course),
questions: questions.map(function (question) {
return {
id: question.question_id,
order: Number(question.order_no),
prompt: question.question_text,
options: [
{ key: "A", text: question.option_a },
{ key: "B", text: question.option_b },
{ key: "C", text: question.option_c },
{ key: "D", text: question.option_d },
],
};
}),
};
}
function existingAttemptResult_(attempt, course) {
const score = Number(attempt.score || 0);
const passingScore = Number((course && course.passing_score) || 0);
return {
ok: true,
alreadySubmitted: true,
result: {
attemptId: attempt.attempt_id,
score: score,
correctCount: Number(attempt.correct_count || 0),
totalQuestions: Number(attempt.total_questions || 0),
durationSeconds: Number(attempt.duration_seconds || 0),
passed: score >= passingScore,
passingScore: passingScore,
},
};
}
function submitAttempt_(body) {
const context = requireSession_(body.token, "participant");
const attemptId = String(body.attemptId || "").trim();
if (!attemptId) throw new Error("Attempt ID is required.");
const submittedAnswers = body.answers && typeof body.answers === "object" ? body.answers : {};
const initialAttempt = findById_(APP.sheets.attempts, "attempt_id", attemptId);
if (!initialAttempt || String(initialAttempt.user_id) !== String(context.user.user_id)) {
throw new Error("Attempt not found.");
}
const course = findById_(APP.sheets.courses, "course_id", initialAttempt.course_id);
if (!course) throw new Error("The course for this attempt no longer exists.");
if (initialAttempt.status === "submitted") return existingAttemptResult_(initialAttempt, course);
if (initialAttempt.status !== "started") throw new Error("This attempt cannot be submitted.");
const questions = questionsForCourse_(initialAttempt.course_id);
if (!questions.length) throw new Error("No questions are configured for this course.");
const now = new Date();
const normalizedAnswers = {};
let correctCount = 0;
let earned = 0;
let total = 0;
const answerRows = questions.map(function (question) {
const raw = String(submittedAnswers[question.question_id] || "").trim().toUpperCase();
const selected = ["A", "B", "C", "D"].indexOf(raw) >= 0 ? raw : "";
const correct = selected === String(question.correct_option || "").trim().toUpperCase();
const points = Math.max(1, Number(question.points || 1));
normalizedAnswers[question.question_id] = selected;
total += points;
if (correct) { correctCount += 1; earned += points; }
return [Utilities.getUuid(), attemptId, question.question_id, selected, correct, correct ? points : 0, now];
});
const score = total ? Math.round(earned / total * 100) : 0;
const durationSeconds = Math.max(0, Math.round((now.getTime() - new Date(initialAttempt.started_at).getTime()) / 1000));
return withScriptLock_(20000, function () {
const current = findById_(APP.sheets.attempts, "attempt_id", attemptId);
if (!current || String(current.user_id) !== String(context.user.user_id)) {
throw new Error("Attempt not found.");
}
if (current.status === "submitted") return existingAttemptResult_(current, course);
if (current.status !== "started") throw new Error("This attempt cannot be submitted.");
const answersSheet = getSheet_(APP.sheets.answers);
answersSheet.getRange(answersSheet.getLastRow() + 1, 1, answerRows.length, HEADERS.Answers.length)
.setValues(answerRows);
updateObjectRow_(getSheet_(APP.sheets.attempts), current.__row, {
submitted_at: now,
status: "submitted",
score: score,
correct_count: correctCount,
total_questions: questions.length,
duration_seconds: durationSeconds,
answers_json: JSON.stringify(normalizedAnswers),
});
SpreadsheetApp.flush();
return {
ok: true,
alreadySubmitted: false,
result: {
attemptId: attemptId,
score: score,
correctCount: correctCount,
totalQuestions: questions.length,
durationSeconds: durationSeconds,
passed: score >= Number(course.passing_score || 0),
passingScore: Number(course.passing_score || 0),
},
};
});
}
function adminGetDashboard_(body) {
requireSession_(body.token, "admin");
const courses = rowsAsObjects_(getSheet_(APP.sheets.courses));
const users = rowsAsObjects_(getSheet_(APP.sheets.users));
const participants = users.filter(function (user) { return user.role === "participant"; });
const allSubmitted = rowsAsObjects_(getSheet_(APP.sheets.attempts))
.filter(function (attempt) { return attempt.status === "submitted"; });
const courseId = String(body.courseId || "").trim();
const attempts = courseId
? allSubmitted.filter(function (attempt) { return String(attempt.course_id) === courseId; })
: allSubmitted;
const userMap = indexBy_(users, "user_id");
const courseMap = indexBy_(courses, "course_id");
const participantStats = allSubmitted.reduce(function (stats, attempt) {
if (!stats[attempt.user_id]) stats[attempt.user_id] = { attempts: 0, scoreTotal: 0 };
stats[attempt.user_id].attempts += 1;
stats[attempt.user_id].scoreTotal += Number(attempt.score || 0);
return stats;
}, {});
const scoreboard = attempts.map(function (attempt) {
const user = userMap[attempt.user_id] || {};
const course = courseMap[attempt.course_id] || {};
return {
attemptId: attempt.attempt_id,
courseId: attempt.course_id,
courseTitle: course.title || "",
participantId: attempt.user_id,
name: user.full_name || "Unknown participant",
branch: user.branch || "",
score: Number(attempt.score || 0),
correctCount: Number(attempt.correct_count || 0),
totalQuestions: Number(attempt.total_questions || 0),
durationSeconds: Number(attempt.duration_seconds || 0),
submittedAt: toIso_(attempt.submitted_at),
};
}).sort(function (a, b) {
return b.score - a.score || a.durationSeconds - b.durationSeconds ||
new Date(b.submittedAt) - new Date(a.submittedAt);
}).map(function (item, index) { item.rank = index + 1; return item; });
return {
ok: true,
courses: courses.map(publicCourse_),
participants: participants.map(function (user) {
const result = publicUser_(user);
const stats = participantStats[user.user_id] || { attempts: 0, scoreTotal: 0 };
result.attempts = stats.attempts;
result.average = stats.attempts ? Math.round(stats.scoreTotal / stats.attempts) : 0;
return result;
}),
admins: users.filter(function (user) { return user.role === "admin"; }).map(publicUser_),
scoreboard: scoreboard,
summary: {
participants: participants.length,
submitted: scoreboard.length,
average: scoreboard.length ? Math.round(scoreboard.reduce(function (sum, item) { return sum + item.score; }, 0) / scoreboard.length) : 0,
topScore: scoreboard.length ? scoreboard[0].score : 0,
},
};
}
function adminSaveCourse_(body) {
const context = requireSession_(body.token, "admin");
const input = body.course || {};
const title = String(input.title || "").trim();
const questions = Array.isArray(input.questions) ? input.questions : [];
if (!title) throw new Error("Course title is required.");
if (!questions.length) throw new Error("Add at least one question.");
const preparedQuestions = questions.map(function (question, index) {
const options = Array.isArray(question.options) ? question.options.map(String) : [];
const correct = String(question.correct || "A").trim().toUpperCase();
if (!String(question.prompt || "").trim()) throw new Error("Every question needs a prompt.");
if (options.length !== 4 || options.some(function (value) { return !value.trim(); })) {
throw new Error("Every question needs four answer choices.");
}
if (["A", "B", "C", "D"].indexOf(correct) < 0) throw new Error("Invalid correct answer.");
return [Utilities.getUuid(), "", index + 1, String(question.prompt).trim(),
options[0].trim(), options[1].trim(), options[2].trim(), options[3].trim(),
correct, Math.max(1, Number(question.points || 1)), String(question.explanation || "")];
});
return withScriptLock_(30000, function () {
const coursesSheet = getSheet_(APP.sheets.courses);
const courseId = String(input.id || Utilities.getUuid());
const existing = findById_(APP.sheets.courses, "course_id", courseId);
const now = new Date();
const record = {
course_id: courseId,
title: title,
description: String(input.description || ""),
category: String(input.category || "General"),
passing_score: clamp_(Number(input.passingScore || 75), 1, 100),
time_limit_min: Math.max(1, Number(input.duration || 20)),
start_at: input.startAt ? new Date(input.startAt) : "",
end_at: input.endAt ? new Date(input.endAt) : "",
status: ["draft", "upcoming", "live", "completed"].indexOf(String(input.status)) >= 0 ? String(input.status) : "draft",
created_by: existing ? existing.created_by : context.user.user_id,
created_at: existing ? existing.created_at : now,
updated_at: now,
};
if (existing) {
updateObjectRow_(coursesSheet, existing.__row, record);
deleteRowsMatching_(getSheet_(APP.sheets.questions), "course_id", courseId);
} else {
appendObject_(coursesSheet, record);
}
preparedQuestions.forEach(function (row) { row[1] = courseId; });
const questionsSheet = getSheet_(APP.sheets.questions);
questionsSheet.getRange(questionsSheet.getLastRow() + 1, 1, preparedQuestions.length, HEADERS.Questions.length)
.setValues(preparedQuestions);
buildDashboard_();
SpreadsheetApp.flush();
return { ok: true, course: publicCourse_(findById_(APP.sheets.courses, "course_id", courseId)) };
});
}
function adminSaveParticipant_(body) {
const participant = Object.assign({}, body.participant || {}, { role: "participant" });
return adminSaveUser_({ token: body.token, user: participant });
}
function adminSaveUser_(body) {
requireSession_(body.token, "admin");
const input = body.user || body.participant || {};
const username = normalizeUsername_(input.username);
const password = String(input.password || "");
const role = input.role === "admin" ? "admin" : "participant";
if (!isValidUsername_(username)) throw new Error("Username must be 3–40 characters using letters, numbers, dots, underscores, or hyphens.");
if (!String(input.fullName || "").trim()) throw new Error("Full name is required.");
if (password.length < 8) throw new Error("Temporary password must be at least eight characters.");
return withScriptLock_(15000, function () {
if (findUserByUsername_(username)) throw new Error("An account already exists for this username.");
const user = createUserInternal_({
username: username,
email: normalizeEmail_(input.email),
fullName: String(input.fullName).trim(),
branch: String(input.branch || ""),
password: password,
role: role,
status: input.status === "inactive" ? "inactive" : "active",
});
SpreadsheetApp.flush();
return { ok: true, user: publicUser_(user) };
});
}
function adminResetPassword_(body) {
requireSession_(body.token, "admin");
const userId = String(body.userId || "");
const password = String(body.newPassword || "");
if (password.length < 8) throw new Error("New password must be at least eight characters.");
return withScriptLock_(10000, function () {
const user = findById_(APP.sheets.users, "user_id", userId);
if (!user) throw new Error("Account not found.");
const salt = makeSalt_();
updateObjectRow_(getSheet_(APP.sheets.users), user.__row, {
salt: salt,
password_hash: hashPassword_(password, salt),
});
deleteRowsMatching_(getSheet_(APP.sheets.sessions), "user_id", userId);
SpreadsheetApp.flush();
return { ok: true };
});
}
function ensureInitialAdmin_() {
ensurePepper_();
const users = rowsAsObjects_(getSheet_(APP.sheets.users));
const existing = users.find(function (user) { return user.role === "admin" && user.status === "active"; });
if (existing) return existing;
const properties = PropertiesService.getScriptProperties();
const username = normalizeUsername_(properties.getProperty("INITIAL_ADMIN_USERNAME"));
const password = String(properties.getProperty("INITIAL_ADMIN_PASSWORD") || "");
if (!isValidUsername_(username) || password.length < 8) {
throw new Error("Set INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD (minimum 8 characters) in Script Properties.");
}
return createUserInternal_({
username: username,
email: normalizeEmail_(properties.getProperty("INITIAL_ADMIN_EMAIL")),
fullName: String(properties.getProperty("INITIAL_ADMIN_NAME") || "Administrator"),
branch: String(properties.getProperty("INITIAL_ADMIN_BRANCH") || ""),
password: password,
role: "admin",
status: "active",
});
}
function createUserInternal_(input) {
const username = normalizeUsername_(input.username);
const email = normalizeEmail_(input.email);
if (!isValidUsername_(username)) throw new Error("A valid username is required.");
if (findUserByUsername_(username)) throw new Error("An account already exists for this username.");
if (email && findUserByEmail_(email)) throw new Error("An account already exists for this email.");
const salt = makeSalt_();
const record = {
user_id: Utilities.getUuid(),
email: email,
full_name: String(input.fullName || "").trim(),
branch: String(input.branch || ""),
password_hash: hashPassword_(String(input.password || ""), salt),
salt: salt,
role: input.role === "admin" ? "admin" : "participant",
status: input.status === "inactive" ? "inactive" : "active",
created_at: new Date(),
last_login: "",
username: username,
};
appendObject_(getSheet_(APP.sheets.users), record);
return findUserByUsername_(username);
}
function requireSession_(token, requiredRole) {
if (!token) throw new Error("Authentication required.");
const tokenHash = hashToken_(String(token));
const session = rowsAsObjects_(getSheet_(APP.sheets.sessions)).find(function (item) {
return item.token_hash === tokenHash && new Date(item.expires_at) > new Date();
});
if (!session) throw new Error("Your session has expired. Please sign in again.");
if (requiredRole && session.role !== requiredRole) throw new Error("You do not have access to this action.");
const user = findById_(APP.sheets.users, "user_id", session.user_id);
if (!user || user.status !== "active") throw new Error("This account is not active.");
return { session: session, user: user };
}
function pruneSessions_() {
const now = new Date();
rowsAsObjects_(getSheet_(APP.sheets.sessions))
.filter(function (session) { return new Date(session.expires_at) <= now; })
.sort(function (a, b) { return b.__row - a.__row; })
.forEach(function (session) { getSheet_(APP.sheets.sessions).deleteRow(session.__row); });
}
function buildDashboard_() {
const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
let sheet = spreadsheet.getSheetByName(APP.sheets.dashboard);
if (!sheet) sheet = spreadsheet.insertSheet(APP.sheets.dashboard, 0);
sheet.clear();
sheet.getCharts().forEach(function (chart) { sheet.removeChart(chart); });
if (sheet.getMaxColumns() < 14) sheet.insertColumnsAfter(sheet.getMaxColumns(), 14 - sheet.getMaxColumns());
sheet.setHiddenGridlines(true);
sheet.setFrozenRows(8);
sheet.getRange("A1:H1").setBackground("#101110").setFontColor("#ffffff");
sheet.getRange("A1").setValue("CGV EXAMS · EVALUATION SCOREBOARD").setFontSize(16).setFontWeight("bold");
sheet.getRange("A2").setValue("Live participant results powered by the evaluation records in this workbook.").setFontColor("#747974");
sheet.getRange("A3").setValue("Selected evaluation").setFontWeight("bold");
const coursesSheet = getSheet_(APP.sheets.courses);
const titlesRange = coursesSheet.getRange("B2:B");
sheet.getRange("B3").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(titlesRange, true).setAllowInvalid(false).build());
sheet.getRange("B3").setValue(coursesSheet.getLastRow() > 1 ? coursesSheet.getRange("B2").getValue() : "").setBackground("#eefbdc");
sheet.getRange("A5:H5").setValues([["Participants", "", "Average score", "", "Pass rate", "", "Top score", ""]]).setFontWeight("bold");
sheet.getRange("A6").setFormula('=IFERROR(COUNTA(UNIQUE(FILTER(Attempts!C2:C,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"))),0)');
sheet.getRange("C6").setFormula('=IFERROR(AVERAGE(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted")),0)');
sheet.getRange("E6").setFormula('=IFERROR(COUNTIF(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"),">="&XLOOKUP($B$3,Courses!B:B,Courses!E:E))/A6,0)');
sheet.getRange("G6").setFormula('=IFERROR(MAX(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted")),0)');
sheet.getRange("A6:H6").setFontSize(24).setFontWeight("bold");
sheet.getRange("E6").setNumberFormat("0.0%");
sheet.getRange("A8:G8").setValues([["Rank", "Participant", "Branch", "Score", "Correct", "Time", "Completed"]]).setBackground("#101110").setFontColor("#ffffff").setFontWeight("bold");
sheet.getRange("A9").setFormula('=IFERROR(LET(courseId,XLOOKUP($B$3,Courses!B:B,Courses!A:A),rows,FILTER(Attempts!A2:J,Attempts!B2:B=courseId,Attempts!F2:F="submitted"),sorted,SORT(HSTACK(XLOOKUP(INDEX(rows,,3),Users!A:A,Users!C:C),XLOOKUP(INDEX(rows,,3),Users!A:A,Users!D:D),INDEX(rows,,7),INDEX(rows,,8)&"/"&INDEX(rows,,9),INDEX(rows,,10),INDEX(rows,,5)),3,FALSE,5,TRUE),HSTACK(SEQUENCE(ROWS(sorted)),sorted)),"No submitted attempts yet")');
[72, 190, 130, 88, 90, 88, 145, 24, 30, 105, 90, 90, 90, 90].forEach(function (width, index) { sheet.setColumnWidth(index + 1, width); });
sheet.getRange("A1:N40").setFontFamily("Arial").setVerticalAlignment("middle");
}
function ensureDataSheet_(spreadsheet, name, headers) {
let sheet = spreadsheet.getSheetByName(name);
if (!sheet) sheet = spreadsheet.insertSheet(name);
if (sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
if (headers.some(function (header, index) { return current[index] !== header; })) {
sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}
sheet.setFrozenRows(1);
sheet.getRange(1, 1, 1, headers.length).setBackground("#101110").setFontColor("#ffffff").setFontWeight("bold");
return sheet;
}
function ensureSettings_() {
const sheet = getSheet_(APP.sheets.settings);
const existing = rowsAsObjects_(sheet);
const defaults = { app_name: APP.name, app_version: APP.version, company_name: "CGV", timezone: APP.timezone, session_hours: String(APP.sessionHours) };
Object.keys(defaults).forEach(function (key) {
const row = existing.find(function (item) { return item.key === key; });
if (row) updateObjectRow_(sheet, row.__row, { value: defaults[key], updated_at: new Date() });
else appendRow_(sheet, [key, defaults[key], new Date()]);
});
}
function ensurePepper_() {
const properties = PropertiesService.getScriptProperties();
if (!properties.getProperty("PASSWORD_PEPPER")) properties.setProperty("PASSWORD_PEPPER", Utilities.getUuid() + Utilities.getUuid());
}
function parseBody_(event) {
if (!event || !event.postData || !event.postData.contents) throw new Error("Request body is required.");
try { return JSON.parse(event.postData.contents); }
catch (error) { throw new Error("Request body must be valid JSON."); }
}
function json_(value) {
return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function withScriptLock_(timeoutMs, callback) {
const lock = LockService.getScriptLock();
lock.waitLock(timeoutMs);
try { return callback(); }
finally { lock.releaseLock(); }
}
function getSheet_(name) {
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
if (!sheet) throw new Error('Missing sheet "' + name + '". Run setupEvaluationPlatform() first.');
return sheet;
}
function rowsAsObjects_(sheet) {
if (sheet.getLastRow() < 2) return [];
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues().map(function (values, index) {
const object = { __row: index + 2 };
headers.forEach(function (header, column) { object[header] = values[column]; });
return object;
});
}
function appendRow_(sheet, values) {
sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
}
function appendObject_(sheet, object) {
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
appendRow_(sheet, headers.map(function (header) { return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : ""; }));
}
function updateObjectRow_(sheet, rowNumber, patch) {
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
const range = sheet.getRange(rowNumber, 1, 1, headers.length);
const values = range.getValues()[0];
headers.forEach(function (header, index) { if (Object.prototype.hasOwnProperty.call(patch, header)) values[index] = patch[header]; });
range.setValues([values]);
}
function clearDataRows_(sheet) {
const count = sheet.getLastRow() - 1;
if (count > 0) sheet.deleteRows(2, count);
}
function deleteRowsMatching_(sheet, key, value) {
rowsAsObjects_(sheet).filter(function (row) { return String(row[key]) === String(value); })
.sort(function (a, b) { return b.__row - a.__row; })
.forEach(function (row) { sheet.deleteRow(row.__row); });
}
function findById_(sheetName, key, value) {
return rowsAsObjects_(getSheet_(sheetName)).find(function (row) { return String(row[key]) === String(value); }) || null;
}
function findUserByEmail_(email) {
const normalized = normalizeEmail_(email);
return rowsAsObjects_(getSheet_(APP.sheets.users)).find(function (user) { return normalizeEmail_(user.email) === normalized; }) || null;
}
function findUserByUsername_(username) {
const normalized = normalizeUsername_(username);
return rowsAsObjects_(getSheet_(APP.sheets.users)).find(function (user) { return normalizeUsername_(user.username) === normalized; }) || null;
}
function questionsForCourse_(courseId) {
return rowsAsObjects_(getSheet_(APP.sheets.questions)).filter(function (question) { return String(question.course_id) === String(courseId); })
.sort(function (a, b) { return Number(a.order_no) - Number(b.order_no); });
}
function attemptsForUser_(userId) {
const courseMap = indexBy_(rowsAsObjects_(getSheet_(APP.sheets.courses)), "course_id");
return rowsAsObjects_(getSheet_(APP.sheets.attempts)).filter(function (attempt) { return String(attempt.user_id) === String(userId); })
.map(function (attempt) { attempt.__course = courseMap[attempt.course_id] || {}; return attempt; });
}
function indexBy_(items, key) {
return items.reduce(function (result, item) { result[item[key]] = item; return result; }, {});
}
function publicUser_(user) {
return { id: user.user_id, username: user.username, email: user.email, fullName: user.full_name, branch: user.branch,
role: user.role, status: user.status, createdAt: toIso_(user.created_at), lastLogin: toIso_(user.last_login) };
}
function publicCourse_(course) {
return { id: course.course_id, title: course.title, description: course.description, category: course.category,
passingScore: Number(course.passing_score || 0), duration: Number(course.time_limit_min || 0),
startAt: toIso_(course.start_at), endAt: toIso_(course.end_at), status: course.status,
questionCount: questionsForCourse_(course.course_id).length };
}
function publicAttempt_(attempt) {
return { id: attempt.attempt_id, courseId: attempt.course_id, title: attempt.__course ? attempt.__course.title : "",
category: attempt.__course ? attempt.__course.category : "", submittedAt: toIso_(attempt.submitted_at),
score: Number(attempt.score || 0), correctCount: Number(attempt.correct_count || 0),
totalQuestions: Number(attempt.total_questions || 0), durationSeconds: Number(attempt.duration_seconds || 0),
passed: Number(attempt.score || 0) >= Number((attempt.__course && attempt.__course.passing_score) || 0) };
}
function summarizeAttempts_(attempts) {
if (!attempts.length) return { completed: 0, passed: 0, average: 0, best: 0 };
const scores = attempts.map(function (attempt) { return Number(attempt.score || 0); });
return { completed: attempts.length, passed: attempts.filter(function (attempt) { return attempt.passed; }).length,
average: Math.round(scores.reduce(function (sum, score) { return sum + score; }, 0) / scores.length),
best: Math.max.apply(null, scores) };
}
function hashPassword_(password, salt) {
const pepper = PropertiesService.getScriptProperties().getProperty("PASSWORD_PEPPER") || "";
return digest_(String(salt) + "|" + String(password) + "|" + pepper);
}
function hashToken_(token) { return digest_("session|" + String(token)); }
function digest_(value) {
return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.newBlob(String(value)).getBytes())
.map(function (byte) { const normalized = byte < 0 ? byte + 256 : byte; return ("0" + normalized.toString(16)).slice(-2); }).join("");
}
function makeSalt_() { return Utilities.getUuid().replace(/-/g, "") + Math.random().toString(36).slice(2); }
function normalizeEmail_(value) { return String(value || "").trim().toLowerCase(); }
function normalizeUsername_(value) { return String(value || "").trim().toLowerCase(); }
function isValidUsername_(value) { return /^[a-z0-9._-]{3,40}$/.test(normalizeUsername_(value)); }
function toIso_(value) { if (!value) return ""; const date = value instanceof Date ? value : new Date(value); return isNaN(date.getTime()) ? "" : date.toISOString(); }
function clamp_(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
