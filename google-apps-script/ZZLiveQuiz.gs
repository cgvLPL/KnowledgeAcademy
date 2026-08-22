// Live quiz monitoring extension.
// Kept in a separate file so existing workbook data and legacy sheet headers remain compatible.

function liveQuizSheet_() {
  return ensureDataSheet_(activeSpreadsheet_(), "LiveActivity", [
    "attempt_id",
    "course_id",
    "user_id",
    "current_question",
    "total_questions",
    "answered_count",
    "client_status",
    "last_activity_at",
    "updated_at",
  ]);
}

function updateAttemptActivity_(body) {
  const context = requireSession_(body.token, "participant");
  const attemptId = String(body.attemptId || "").trim();
  if (!attemptId) throw new Error("Attempt ID is required.");

  const attempt = findById_(APP.sheets.attempts, "attempt_id", attemptId, true);
  if (!attempt || String(attempt.user_id) !== String(context.user.user_id)) {
    throw new Error("Attempt not found.");
  }

  const allowedStatuses = ["active", "idle", "disconnected", "completed"];
  let clientStatus = String(body.clientStatus || "active").trim().toLowerCase();
  if (allowedStatuses.indexOf(clientStatus) < 0) clientStatus = "active";
  if (isSubmittedAttempt_(attempt)) clientStatus = "completed";

  const currentQuestion = clamp_(Math.floor(Number(body.currentQuestion || 0)), 0, 10000);
  const totalQuestions = clamp_(Math.floor(Number(body.totalQuestions || 0)), 0, 10000);
  const answeredCount = clamp_(Math.floor(Number(body.answeredCount || 0)), 0, 10000);
  const now = new Date();

  return withScriptLock_(10000, function () {
    const sheet = liveQuizSheet_();
    const existing = findObjectByExactValue_(sheet, "attempt_id", attemptId, true);
    const values = {
      course_id: String(attempt.course_id || body.courseId || ""),
      user_id: String(context.user.user_id),
      current_question: currentQuestion,
      total_questions: totalQuestions,
      answered_count: answeredCount,
      client_status: clientStatus,
      last_activity_at: now,
      updated_at: now,
    };

    if (existing) {
      updateObjectRow_(sheet, existing.__row, values);
    } else {
      appendRow_(sheet, [
        attemptId,
        values.course_id,
        values.user_id,
        values.current_question,
        values.total_questions,
        values.answered_count,
        values.client_status,
        values.last_activity_at,
        values.updated_at,
      ]);
    }
    SpreadsheetApp.flush();
    return { ok: true, attemptId: attemptId, status: clientStatus, now: now.toISOString() };
  });
}

function liveQuizDerivedStatus_(activity, attempt, nowMs) {
  if (attempt && isSubmittedAttempt_(attempt)) return "completed";
  const explicit = String(activity.client_status || "").toLowerCase();
  if (explicit === "completed") return "completed";
  if (explicit === "disconnected") return "disconnected";
  const lastActivity = new Date(activity.last_activity_at || activity.updated_at || 0).getTime();
  if (!isFinite(lastActivity)) return "disconnected";
  const ageSeconds = Math.max(0, Math.floor((nowMs - lastActivity) / 1000));
  if (ageSeconds <= 30) return "active";
  if (ageSeconds <= 120) return "idle";
  return "disconnected";
}

function adminGetLiveQuizActivity_(body) {
  requireSession_(body.token, "admin");
  const now = new Date();
  const nowMs = now.getTime();
  const activities = rowsAsObjects_(liveQuizSheet_());
  const attempts = rowsAsObjects_(getSheet_(APP.sheets.attempts));
  const users = rowsAsObjects_(getSheet_(APP.sheets.users));
  const courses = rowsAsObjects_(getSheet_(APP.sheets.courses));
  const attemptMap = indexBy_(attempts, "attempt_id");
  const userMap = indexBy_(users, "user_id");
  const courseMap = indexBy_(courses, "course_id");

  const activity = activities
    .map(function (item) {
      const attempt = attemptMap[item.attempt_id];
      if (!attempt) return null;
      const participant = userMap[attempt.user_id] || {};
      const course = courseMap[attempt.course_id] || {};
      const status = liveQuizDerivedStatus_(item, attempt, nowMs);
      const lastActivityAt = toIso_(item.last_activity_at || item.updated_at || attempt.submitted_at || attempt.started_at);
      const lastActivityMs = new Date(lastActivityAt || 0).getTime();
      if (status === "completed" && isFinite(lastActivityMs) && nowMs - lastActivityMs > 6 * 3600000) return null;
      return {
        id: String(participant.user_id || attempt.user_id || item.attempt_id),
        attemptId: String(item.attempt_id),
        courseId: String(attempt.course_id || item.course_id || ""),
        courseTitle: String(course.title || "Evaluation"),
        name: String(participant.full_name || participant.username || "Participant"),
        branch: String(participant.branch || ""),
        position: String(participant.position || ""),
        currentQuestion: Number(item.current_question || 0),
        totalQuestions: Number(item.total_questions || attempt.total_questions || 0),
        answeredCount: Number(item.answered_count || 0),
        status: status,
        lastActivityAt: lastActivityAt,
      };
    })
    .filter(function (item) { return Boolean(item); })
    .sort(function (first, second) {
      const priority = { active: 0, idle: 1, disconnected: 2, completed: 3 };
      return priority[first.status] - priority[second.status] ||
        new Date(second.lastActivityAt || 0) - new Date(first.lastActivityAt || 0);
    });

  return { ok: true, activity: activity, now: now.toISOString() };
}

// Final POST router. Apps Script evaluates server files into one global scope;
// this extension preserves legacy routes and the account-language compatibility routes.
function doPost(event) {
  beginRequest_();
  try {
    const body = parseBody_(event);
    const action = String(body.action || "").trim();
    let result;
    if (action === "updateAttemptActivity") {
      result = updateAttemptActivity_(body);
    } else if (action === "adminGetLiveQuizActivity") {
      result = adminGetLiveQuizActivity_(body);
    } else if (action === "getAccountLanguage") {
      result = getAccountLanguage_(body);
    } else if (action === "setAccountLanguage") {
      result = setAccountLanguage_(body);
    } else {
      if (!Object.prototype.hasOwnProperty.call(API_ACTIONS, action)) {
        throw new Error("Unsupported action.");
      }
      result = API_ACTIONS[action](body);
    }
    return json_(withResponseMeta_(result));
  } catch (error) {
    logRequestError_(error);
    return json_(errorResponse_(error));
  }
}
