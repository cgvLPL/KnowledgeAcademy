from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one {label} block, found {count}.")
    return text.replace(old, new, 1)


root = Path(__file__).resolve().parents[1]
backend_path = root / "google-apps-script" / "Code.gs"
client_path = root / "app" / "exam-client.tsx"

backend = backend_path.read_text(encoding="utf-8")
client = client_path.read_text(encoding="utf-8")

old_submit = '''function submitAttempt_(body) {
  const context = requireSession_(body.token, "participant");
  const attemptId = String(body.attemptId || "");
  const submittedAnswers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const attempt = findById_(APP.sheets.attempts, "attempt_id", attemptId);
    if (!attempt || attempt.user_id !== context.user.user_id) throw new Error("Attempt not found.");
    if (attempt.status !== "started") throw new Error("This attempt has already been submitted.");

    const course = findById_(APP.sheets.courses, "course_id", attempt.course_id);
    const courseQuestions = questionsForCourse_(attempt.course_id);
    if (!courseQuestions.length) throw new Error("No questions are configured for this course.");

    let correctCount = 0;
    let pointsEarned = 0;
    let totalPoints = 0;
    const now = new Date();
    const answerRows = courseQuestions.map(function (question) {
      const selected = String(submittedAnswers[question.question_id] || "").toUpperCase();
      const correct = selected === String(question.correct_option).toUpperCase();
      const points = Number(question.points || 1);
      totalPoints += points;
      if (correct) {
        correctCount += 1;
        pointsEarned += points;
      }
      return [
        Utilities.getUuid(),
        attemptId,
        question.question_id,
        selected,
        correct,
        correct ? points : 0,
        now,
      ];
    });
    const score = totalPoints ? Math.round(pointsEarned / totalPoints * 100) : 0;
    const durationSeconds = Math.max(0, Math.round((now.getTime() - new Date(attempt.started_at).getTime()) / 1000));
    getSheet_(APP.sheets.answers)
      .getRange(getSheet_(APP.sheets.answers).getLastRow() + 1, 1, answerRows.length, HEADERS.Answers.length)
      .setValues(answerRows);
    updateObjectRow_(getSheet_(APP.sheets.attempts), attempt.__row, {
      submitted_at: now,
      status: "submitted",
      score: score,
      correct_count: correctCount,
      total_questions: courseQuestions.length,
      duration_seconds: durationSeconds,
      answers_json: JSON.stringify(submittedAnswers),
    });
    return {
      ok: true,
      result: {
        attemptId: attemptId,
        score: score,
        correctCount: correctCount,
        totalQuestions: courseQuestions.length,
        durationSeconds: durationSeconds,
        passed: score >= Number(course.passing_score || 0),
        passingScore: Number(course.passing_score || 0),
      },
    };
  } finally {
    lock.releaseLock();
  }
}'''

new_submit = '''function existingAttemptResult_(attempt, course) {
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

  const courseQuestions = questionsForCourse_(initialAttempt.course_id);
  if (!courseQuestions.length) throw new Error("No questions are configured for this course.");

  let correctCount = 0;
  let pointsEarned = 0;
  let totalPoints = 0;
  const normalizedAnswers = {};
  const now = new Date();
  const answerRows = courseQuestions.map(function (question) {
    const rawSelected = String(submittedAnswers[question.question_id] || "").trim().toUpperCase();
    const selected = ["A", "B", "C", "D"].indexOf(rawSelected) >= 0 ? rawSelected : "";
    const correct = selected === String(question.correct_option || "").trim().toUpperCase();
    const points = Math.max(1, Number(question.points || 1));
    normalizedAnswers[question.question_id] = selected;
    totalPoints += points;
    if (correct) {
      correctCount += 1;
      pointsEarned += points;
    }
    return [
      Utilities.getUuid(),
      attemptId,
      question.question_id,
      selected,
      correct,
      correct ? points : 0,
      now,
    ];
  });

  const score = totalPoints ? Math.round(pointsEarned / totalPoints * 100) : 0;
  const startedAt = new Date(initialAttempt.started_at);
  const durationSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const currentAttempt = findById_(APP.sheets.attempts, "attempt_id", attemptId);
    if (!currentAttempt || String(currentAttempt.user_id) !== String(context.user.user_id)) {
      throw new Error("Attempt not found.");
    }
    if (currentAttempt.status === "submitted") return existingAttemptResult_(currentAttempt, course);
    if (currentAttempt.status !== "started") throw new Error("This attempt cannot be submitted.");

    const answersSheet = getSheet_(APP.sheets.answers);
    const answerStartRow = answersSheet.getLastRow() + 1;
    answersSheet
      .getRange(answerStartRow, 1, answerRows.length, HEADERS.Answers.length)
      .setValues(answerRows);
    updateObjectRow_(getSheet_(APP.sheets.attempts), currentAttempt.__row, {
      submitted_at: now,
      status: "submitted",
      score: score,
      correct_count: correctCount,
      total_questions: courseQuestions.length,
      duration_seconds: durationSeconds,
      answers_json: JSON.stringify(normalizedAnswers),
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  return {
    ok: true,
    alreadySubmitted: false,
    result: {
      attemptId: attemptId,
      score: score,
      correctCount: correctCount,
      totalQuestions: courseQuestions.length,
      durationSeconds: durationSeconds,
      passed: score >= Number(course.passing_score || 0),
      passingScore: Number(course.passing_score || 0),
    },
  };
}'''

backend = replace_once(backend, old_submit, new_submit, "submitAttempt")
backend = replace_once(
    backend,
    '''  const selectedCourseId = String(body.courseId || (courses[0] && courses[0].course_id) || "");
  const attempts = allSubmittedAttempts
    .filter(function (attempt) {
      return attempt.course_id === selectedCourseId;
    });''',
    '''  const selectedCourseId = String(body.courseId || "").trim();
  const attempts = selectedCourseId
    ? allSubmittedAttempts.filter(function (attempt) {
      return String(attempt.course_id) === selectedCourseId;
    })
    : allSubmittedAttempts;''',
    "dashboard course filter",
)
backend = replace_once(
    backend,
    '''  getSheet_(APP.sheets.attempts).appendRow([
    attemptId,
    courseId,
    context.user.user_id,
    now,
    "",
    "started",
    "",
    "",
    "",
    "",
    "",
  ]);''',
    '''  const startLock = LockService.getScriptLock();
  startLock.waitLock(10000);
  try {
    getSheet_(APP.sheets.attempts).appendRow([
      attemptId,
      courseId,
      context.user.user_id,
      now,
      "",
      "started",
      "",
      "",
      "",
      "",
      "",
    ]);
    SpreadsheetApp.flush();
  } finally {
    startLock.releaseLock();
  }''',
    "startAttempt write",
)
backend_path.write_text(backend, encoding="utf-8")

request_helper_anchor = '''async function sheetsRequest<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await sheetsFetch({ action, ...payload });
  const data = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "The Google Sheets backend could not complete this request.");
  }
  return data;
}
'''
request_helper_replacement = request_helper_anchor + '''
async function sheetsRequestWithRetry<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await sheetsRequest<T>(action, payload);
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) break;
      await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("The request could not be completed.");
}
'''
client = replace_once(client, request_helper_anchor, request_helper_replacement, "request retry helper")

old_scoreboard_select = '''  async function selectEvaluation(evaluationId: string) {
    setEvaluation(evaluationId);
    setLoading(true);
    setLoadError("");
    const error = await onEvaluationChange(evaluationId);
    if (error) setLoadError(error);
    setLoading(false);
  }

  return ('''
new_scoreboard_select = '''  async function selectEvaluation(evaluationId: string, silent = false) {
    setEvaluation(evaluationId);
    if (!silent) setLoading(true);
    setLoadError("");
    const error = await onEvaluationChange(evaluationId);
    if (error) setLoadError(error);
    if (!silent) setLoading(false);
  }

  useEffect(() => {
    if (!evaluation) return;
    let cancelled = false;
    const refresh = async () => {
      const error = await onEvaluationChange(evaluation);
      if (!cancelled && error) setLoadError(error);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [evaluation, onEvaluationChange]);

  return ('''
client = replace_once(client, old_scoreboard_select, new_scoreboard_select, "scoreboard refresh")

old_boot_effect = '''  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);
'''
new_boot_effect = old_boot_effect + '''
  useEffect(() => {
    if (role !== "admin" || backendMode !== "sheets" || !sessionToken || view === "scoreboard") return;
    let cancelled = false;
    const refreshDashboard = async () => {
      try {
        const dashboardData = await sheetsRequestWithRetry<{
          ok: boolean;
          courses: Record<string, unknown>[];
          participants: Record<string, unknown>[];
          scoreboard: Record<string, unknown>[];
        }>("adminGetDashboard", { token: sessionToken }, 2);
        if (cancelled) return;
        setEvaluations(dashboardData.courses.map(apiCourseToEvaluation));
        setLeaderboardData(apiScoreboardToLeaderboard(dashboardData.scoreboard));
        setParticipantsData(dashboardData.participants.map((item) => ({
          name: String(item.fullName || "Participant"),
          username: String(item.username || ""),
          branch: String(item.branch || ""),
          attempts: Number(item.attempts || 0),
          average: Number(item.average || 0),
          status: String(item.status || "active") === "active" ? "Active" : "Inactive",
        })));
      } catch {
        // Keep the current dashboard visible and retry on the next interval.
      }
    };
    const timer = window.setInterval(() => void refreshDashboard(), 10000);
    const onFocus = () => void refreshDashboard();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [role, backendMode, sessionToken, view]);
'''
client = replace_once(client, old_boot_effect, new_boot_effect, "admin dashboard polling")

old_submission_call = '''        const submission = await sheetsRequest<{
          ok: boolean;
          result: { score: number; durationSeconds: number };
        }>("submitAttempt", {
          token: sessionToken,
          attemptId: activeAttemptId,
          answers: answerPayload,
        });
        finalScore = submission.result.score;'''
new_submission_call = '''        const submission = await sheetsRequestWithRetry<{
          ok: boolean;
          result: { score: number; durationSeconds: number };
        }>("submitAttempt", {
          token: sessionToken,
          attemptId: activeAttemptId,
          answers: answerPayload,
        }, 3);
        if (!submission.result || !Number.isFinite(Number(submission.result.score))) {
          throw new Error("The result was not confirmed by Google Sheets.");
        }
        finalScore = Number(submission.result.score);'''
client = replace_once(client, old_submission_call, new_submission_call, "participant submission retry")

client_path.write_text(client, encoding="utf-8")
print("Applied result synchronization, idempotency, and dashboard refresh fixes.")
