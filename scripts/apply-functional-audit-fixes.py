from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "app/exam-client.tsx"
BACKEND = ROOT / "google-apps-script/Code.gs"


def rep(text, old, new, label):
    count = text.count(old)
    if count == 0 and new in text:
        return text
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


client = CLIENT.read_text(encoding="utf-8")
backend = BACKEND.read_text(encoding="utf-8")

backend = backend.replace('version: "2026.07.24-results-sync",', 'version: "2026.07.24-functional-audit",')
backend = rep(backend, "adminSaveUser: adminSaveUser_,\nadminResetPassword: adminResetPassword_,", "adminSaveUser: adminSaveUser_,\nadminGetCourse: adminGetCourse_,\nadminDuplicateCourse: adminDuplicateCourse_,\nadminDeleteCourse: adminDeleteCourse_,\nadminSetCourseStatus: adminSetCourseStatus_,\nadminSetUserStatus: adminSetUserStatus_,\nadminResetPassword: adminResetPassword_,", "API actions")
backend = rep(backend, 'function adminGetDashboard_(body) {\nrequireSession_(body.token, "admin");', 'function adminGetDashboard_(body) {\nconst context = requireSession_(body.token, "admin");', "dashboard context")
backend = rep(backend, "return {\nok: true,\ncourses: courses.map(publicCourse_),", "return {\nok: true,\nuser: publicUser_(context.user),\ncourses: courses.map(publicCourse_),", "dashboard user")

functions = r'''function adminGetCourse_(body) {
requireSession_(body.token, "admin");
const courseId = String(body.courseId || "").trim();
const course = findById_(APP.sheets.courses, "course_id", courseId);
if (!course) throw new Error("Course not found.");
return { ok: true, course: publicCourse_(course), questions: questionsForCourse_(courseId).map(function (question) {
return { id: question.question_id, prompt: question.question_text, options: [question.option_a, question.option_b, question.option_c, question.option_d], correct: String(question.correct_option || "A"), points: Number(question.points || 1), explanation: String(question.explanation || "") };
}) };
}
function adminDuplicateCourse_(body) {
requireSession_(body.token, "admin");
const sourceId = String(body.courseId || "").trim();
const source = findById_(APP.sheets.courses, "course_id", sourceId);
if (!source) throw new Error("Course not found.");
const questions = questionsForCourse_(sourceId);
if (!questions.length) throw new Error("The source course has no questions.");
return adminSaveCourse_({ token: body.token, course: { id: Utilities.getUuid(), title: String(body.title || ("Copy of " + source.title)).trim(), description: source.description, category: source.category, passingScore: Number(source.passing_score || 75), duration: Number(source.time_limit_min || 20), startAt: "", endAt: "", status: "draft", questions: questions.map(function (question) { return { prompt: question.question_text, options: [question.option_a, question.option_b, question.option_c, question.option_d], correct: question.correct_option, points: Number(question.points || 1), explanation: question.explanation }; }) } });
}
function adminSetCourseStatus_(body) {
requireSession_(body.token, "admin");
const courseId = String(body.courseId || "").trim();
const status = String(body.status || "").trim().toLowerCase();
if (["draft", "upcoming", "live", "completed"].indexOf(status) < 0) throw new Error("Invalid course status.");
return withScriptLock_(10000, function () { const course = findById_(APP.sheets.courses, "course_id", courseId); if (!course) throw new Error("Course not found."); updateObjectRow_(getSheet_(APP.sheets.courses), course.__row, { status: status, updated_at: new Date() }); SpreadsheetApp.flush(); return { ok: true, course: publicCourse_(findById_(APP.sheets.courses, "course_id", courseId)) }; });
}
function adminDeleteCourse_(body) {
requireSession_(body.token, "admin");
const courseId = String(body.courseId || "").trim();
return withScriptLock_(15000, function () { const course = findById_(APP.sheets.courses, "course_id", courseId); if (!course) throw new Error("Course not found."); const hasAttempts = rowsAsObjects_(getSheet_(APP.sheets.attempts)).some(function (attempt) { return String(attempt.course_id) === courseId; }); if (hasAttempts) { updateObjectRow_(getSheet_(APP.sheets.courses), course.__row, { status: "completed", updated_at: new Date() }); SpreadsheetApp.flush(); return { ok: true, archived: true, message: "Course has results and was archived instead of deleted." }; } deleteRowsMatching_(getSheet_(APP.sheets.questions), "course_id", courseId); getSheet_(APP.sheets.courses).deleteRow(course.__row); buildDashboard_(); SpreadsheetApp.flush(); return { ok: true, deleted: true }; });
}
function adminSetUserStatus_(body) {
const context = requireSession_(body.token, "admin");
const userId = String(body.userId || "").trim();
const status = String(body.status || "").trim().toLowerCase();
if (["active", "inactive"].indexOf(status) < 0) throw new Error("Invalid account status.");
if (userId === context.user.user_id && status === "inactive") throw new Error("You cannot deactivate your own administrator account.");
return withScriptLock_(10000, function () { const user = findById_(APP.sheets.users, "user_id", userId); if (!user) throw new Error("Account not found."); updateObjectRow_(getSheet_(APP.sheets.users), user.__row, { status: status }); if (status === "inactive") deleteRowsMatching_(getSheet_(APP.sheets.sessions), "user_id", userId); SpreadsheetApp.flush(); return { ok: true, user: publicUser_(findById_(APP.sheets.users, "user_id", userId)) }; });
}
'''
backend = rep(backend, "function adminSaveParticipant_(body) {", functions + "function adminSaveParticipant_(body) {", "admin functions")

client = rep(client, '  passingScore: number;\n  color: "green" | "orange" | "blue" | "violet";', '  passingScore: number;\n  startAt?: string;\n  endAt?: string;\n  color: "green" | "orange" | "blue" | "violet";', "evaluation schedule")
client = rep(client, 'const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";', 'const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "";\nconst sessionTokenKey = "cgv-exams-session-token";\nconst sessionRoleKey = "cgv-exams-session-role";', "session keys")
client = rep(client, '    passingScore: Number(course.passingScore || 75),\n    color: colors[index % colors.length],', '    passingScore: Number(course.passingScore || 75),\n    startAt: String(course.startAt || ""),\n    endAt: String(course.endAt || ""),\n    color: colors[index % colors.length],', "schedule mapping")

client = rep(client, '  const [showSubmit, setShowSubmit] = useState(false);\n  const current = questionsData[index];', '  const [showSubmit, setShowSubmit] = useState(false);\n  const [submitting, setSubmitting] = useState(false);\n  const [secondsRemaining, setSecondsRemaining] = useState(Math.max(1, evaluation.duration * 60));\n  const current = questionsData[index];', "quiz state")
client = rep(client, '  const progress = questionsData.length\n    ? Math.round(((index + 1) / questionsData.length) * 100)\n    : 0;\n\n  if (!current) {', '  const progress = questionsData.length\n    ? Math.round(((index + 1) / questionsData.length) * 100)\n    : 0;\n  const timerLabel = `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}`;\n\n  useEffect(() => {\n    if (secondsRemaining <= 0 || submitting) return;\n    const timer = window.setInterval(() => {\n      setSecondsRemaining((value) => { if (value <= 1) { window.clearInterval(timer); setShowSubmit(true); return 0; } return value - 1; });\n    }, 1000);\n    return () => window.clearInterval(timer);\n  }, [secondsRemaining, submitting]);\n\n  if (!current) {', "quiz timer")
client = rep(client, '  async function submitQuiz() {\n    const scorable = questionsData.every((question) => question.correct !== undefined);', '  async function submitQuiz() {\n    if (submitting) return;\n    setSubmitting(true);\n    const scorable = questionsData.every((question) => question.correct !== undefined);', "submit guard")
client = rep(client, '    await onComplete(localScore, answers);\n  }', '    try { await onComplete(localScore, answers); } finally { setSubmitting(false); }\n  }', "submit finalizer")
client = rep(client, '<span className="timer"><Clock3 size={18} /><strong>{evaluation.duration} min limit</strong></span>\n          <button className="icon-button" onClick={onExit} aria-label="Exit evaluation"><X size={20} /></button>', '<span className={`timer ${secondsRemaining <= 60 ? "timer-warning" : ""}`}><Clock3 size={18} /><strong>{timerLabel}</strong></span>\n          <button className="icon-button" onClick={() => { if (window.confirm("Exit this evaluation? Your current answers will not be submitted.")) onExit(); }} aria-label="Exit evaluation"><X size={20} /></button>', "timer display")
client = rep(client, '<span><i className="current" /> Current <strong>1</strong></span>', '<span><i className="current" /> Current <strong>{index + 1}</strong></span>', "current question")
client = rep(client, '<button className="secondary-button" onClick={() => setShowSubmit(false)}>Review answers</button>\n              <button className="primary-button" onClick={submitQuiz}>Submit evaluation <ArrowRight size={18} /></button>', '<button className="secondary-button" disabled={secondsRemaining === 0 || submitting} onClick={() => setShowSubmit(false)}>Review answers</button>\n              <button className="primary-button" disabled={submitting} onClick={() => void submitQuiz()}>{submitting ? "Submitting…" : "Submit evaluation"} {!submitting && <ArrowRight size={18} />}</button>', "submit modal")

client = rep(client, '  const [passingScore, setPassingScore] = useState(75);\n  const [builderError, setBuilderError] = useState("");', '  const [passingScore, setPassingScore] = useState(75);\n  const [startAt, setStartAt] = useState("");\n  const [endAt, setEndAt] = useState("");\n  const [publishImmediately, setPublishImmediately] = useState(true);\n  const [savingCourse, setSavingCourse] = useState(false);\n  const [builderError, setBuilderError] = useState("");', "builder state")
client = rep(client, '  function saveCourse() {\n    if (!title.trim()) {', '  async function saveCourse() {\n    if (savingCourse) return;\n    if (!title.trim()) {', "async course save")
client = rep(client, '    setBuilderError("");\n    onSave({', '    if (startAt && endAt && new Date(endAt) < new Date(startAt)) { setBuilderError("The closing date cannot be earlier than the opening date."); setStep(3); return; }\n    setBuilderError("");\n    setSavingCourse(true);\n    const now = Date.now();\n    const startTime = startAt ? new Date(`${startAt}T00:00:00`).getTime() : 0;\n    const endTime = endAt ? new Date(`${endAt}T23:59:59`).getTime() : 0;\n    const status: Evaluation["status"] = publishImmediately ? (endTime && endTime < now ? "Completed" : "Live") : (startTime > now ? "Upcoming" : "Draft");\n    await onSave({', "course status")
client = rep(client, '      due: "Not scheduled",\n      status: "Draft",', '      due: formatApiDate(endAt),\n      status,\n      startAt: startAt ? new Date(`${startAt}T00:00:00`).toISOString() : "",\n      endAt: endAt ? new Date(`${endAt}T23:59:59`).toISOString() : "",', "course payload")
client = rep(client, '    }, draftQuestions);\n  }', '    }, draftQuestions);\n    setSavingCourse(false);\n  }', "course completion")
client = rep(client, '<button className="primary-button" onClick={saveCourse}><Save size={17} /> Save course</button>', '<button className="primary-button" disabled={savingCourse} onClick={() => void saveCourse()}><Save size={17} /> {savingCourse ? "Saving…" : "Save course"}</button>', "header save")
client = rep(client, '<label className="field-label">Attempt policy<select><option>One attempt</option><option>Unlimited attempts</option><option>Two attempts</option></select></label>', '', "attempt policy")
client = rep(client, '<label className="field-label">Opens on<input type="date" /></label>\n              <label className="field-label">Closes on<input type="date" /></label>\n              <label className="field-label full">Assign to<select><option>All active participants</option><option>Selected branches</option><option>Selected participants</option></select></label>\n              <label className="toggle-row full"><div><strong>Publish immediately</strong><span>Make the course visible when saved.</span></div><input type="checkbox" /></label>\n              <label className="toggle-row full"><div><strong>Email notification</strong><span>Notify assigned participants after publishing.</span></div><input type="checkbox" defaultChecked /></label>', '<label className="field-label">Opens on<input type="date" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>\n              <label className="field-label">Closes on<input type="date" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>\n              <div className="field-label full"><span>Assignment</span><strong>All active participants</strong></div>\n              <label className="toggle-row full"><div><strong>Publish immediately</strong><span>Make the course visible when saved.</span></div><input type="checkbox" checked={publishImmediately} onChange={(event) => setPublishImmediately(event.target.checked)} /></label>', "schedule controls")
client = rep(client, '<button className="primary-button" onClick={saveCourse}><Save size={18} /> Save quiz course</button>', '<button className="primary-button" disabled={savingCourse} onClick={() => void saveCourse()}><Save size={18} /> {savingCourse ? "Saving…" : "Save quiz course"}</button>', "final save")
client = rep(client, '          status: evaluation.status.toLowerCase(),\n          questions: draftQuestions.map((question) => ({', '          status: evaluation.status.toLowerCase(),\n          startAt: evaluation.startAt || "",\n          endAt: evaluation.endAt || "",\n          questions: draftQuestions.map((question) => ({', "save schedule")

client = rep(client, '  useEffect(() => {\n    const timer = window.setTimeout(() => setBooting(false), 3200);\n    return () => window.clearTimeout(timer);\n  }, []);', '  useEffect(() => {\n    const timer = window.setTimeout(() => setBooting(false), 900);\n    return () => window.clearTimeout(timer);\n  }, []);\n\n  useEffect(() => {\n    const token = window.sessionStorage.getItem(sessionTokenKey);\n    const savedRole = window.sessionStorage.getItem(sessionRoleKey) as Role | null;\n    if (!token || (savedRole !== "admin" && savedRole !== "participant")) return;\n    let cancelled = false;\n    void (async () => {\n      try {\n        if (savedRole === "participant") {\n          const data = await sheetsRequest<{ user: Record<string, unknown>; courses: Record<string, unknown>[]; history: Record<string, unknown>[] }>("getParticipantHome", { token });\n          if (cancelled) return; setEvaluations(data.courses.map(apiCourseToEvaluation)); setHistory(data.history.map((item, index) => ({ id: String(item.id || `history-${index}`), title: String(item.title || "Evaluation"), category: String(item.category || "General"), date: formatApiDate(item.submittedAt), score: Number(item.score || 0), status: item.passed ? "Passed" : "Needs review", duration: formatDuration(Number(item.durationSeconds || 0)) }))); const user = data.user || {}; setCurrentUser({ id: String(user.id || ""), username: String(user.username || ""), fullName: String(user.fullName || "Participant"), branch: String(user.branch || ""), role: "participant", status: String(user.status || "active") }); setView("home");\n        } else {\n          const data = await sheetsRequest<{ user: Record<string, unknown>; courses: Record<string, unknown>[]; participants: Record<string, unknown>[]; scoreboard: Record<string, unknown>[] }>("adminGetDashboard", { token });\n          if (cancelled) return; setEvaluations(data.courses.map(apiCourseToEvaluation)); setLeaderboardData(apiScoreboardToLeaderboard(data.scoreboard)); setParticipantsData(data.participants.map((item) => ({ name: String(item.fullName || "Participant"), username: String(item.username || ""), branch: String(item.branch || ""), attempts: Number(item.attempts || 0), average: Number(item.average || 0), status: String(item.status || "active") === "active" ? "Active" : "Inactive" }))); const user = data.user || {}; setCurrentUser({ id: String(user.id || ""), username: String(user.username || ""), fullName: String(user.fullName || "Administrator"), branch: String(user.branch || ""), role: "admin", status: String(user.status || "active") }); setView("overview");\n        }\n        setSessionToken(token); setBackendMode("sheets"); setRole(savedRole);\n      } catch { window.sessionStorage.removeItem(sessionTokenKey); window.sessionStorage.removeItem(sessionRoleKey); }\n    })();\n    return () => { cancelled = true; };\n  }, []);', "session restore")
client = rep(client, '      setSessionToken(loginData.token);\n      setBackendMode("sheets");', '      window.sessionStorage.setItem(sessionTokenKey, loginData.token);\n      window.sessionStorage.setItem(sessionRoleKey, authenticatedRole);\n      setSessionToken(loginData.token);\n      setBackendMode("sheets");', "login session")
client = rep(client, '    setRole(null);\n    setSessionToken(null);', '    window.sessionStorage.removeItem(sessionTokenKey);\n    window.sessionStorage.removeItem(sessionRoleKey);\n    setRole(null);\n    setSessionToken(null);', "logout session")

CLIENT.write_text(client, encoding="utf-8")
BACKEND.write_text(backend, encoding="utf-8")
print("functional audit fixes applied")
