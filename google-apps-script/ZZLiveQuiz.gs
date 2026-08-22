// Live quiz monitoring extension.
// Kept in a separate file so existing workbook data and legacy sheet headers remain compatible.

const LIVE_QUIZ = Object.freeze({
  sheet: "LiveActivity",
  activeSeconds: 30,
  idleSeconds: 120,
  heartbeatMinMs: 5000,
  completedRetentionMs: 6 * 3600000,
  disconnectedRetentionMs: 24 * 3600000,
});

const LIVE_QUIZ_HEADERS = Object.freeze([
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

function liveQuizSheet_() {
  return ensureDataSheet_(activeSpreadsheet_(), LIVE_QUIZ.sheet, LIVE_QUIZ_HEADERS);
}

function setupLiveQuizMonitoring() {
  beginRequest_();
  const sheet = liveQuizSheet_();
  const pruned = pruneLiveQuizActivity_(Date.now());
  SpreadsheetApp.flush();
  return {
    ok: true,
    sheet: sheet.getName(),
    headers: LIVE_QUIZ_HEADERS.slice(),
    pruned: pruned,
  };
}

function liveQuizExpectedTotal_(attempt) {
  const counts = questionCountsByCourse_();
  return Math.max(0, Number(counts[String(attempt.course_id || "")] || attempt.total_questions || 0));
}

function liveQuizTimestampMs_(activity, attempt, status) {
  const value = status === "completed" && attempt && attempt.submitted_at
    ? attempt.submitted_at
    : activity.last_activity_at || activity.updated_at || (attempt && attempt.started_at) || 0;
  const timestamp = new Date(value).getTime();
  return isFinite(timestamp) ? timestamp : 0;
}

function liveQuizDerivedStatus_(activity, attempt, nowMs) {
  if (attempt && isSubmittedAttempt_(attempt)) return "completed";
  const explicit = String(activity.client_status || "").toLowerCase();
  if (explicit === "completed") return "completed";
  if (explicit === "disconnected") return "disconnected";
  const lastActivity = new Date(activity.last_activity_at || activity.updated_at || 0).getTime();
  if (!isFinite(lastActivity)) return "disconnected";
  const ageSeconds = Math.max(0, Math.floor((nowMs - lastActivity) / 1000));
  if (ageSeconds <= LIVE_QUIZ.activeSeconds) return "active";
  if (ageSeconds <= LIVE_QUIZ.idleSeconds) return "idle";
  return "disconnected";
}

function pruneLiveQuizActivity_(nowMs) {
  const sheet = liveQuizSheet_();
  const activities = rowsAsObjects_(sheet);
  if (!activities.length) return 0;
  const attemptMap = indexBy_(rowsAsObjects_(getSheet_(APP.sheets.attempts)), "attempt_id");
  const expired = activities.filter(function (activity) {
    const attempt = attemptMap[activity.attempt_id];
    if (!attempt) return true;
    const status = liveQuizDerivedStatus_(activity, attempt, nowMs);
    const timestamp = liveQuizTimestampMs_(activity, attempt, status);
    const ageMs = timestamp ? Math.max(0, nowMs - timestamp) : Number.POSITIVE_INFINITY;
    if (status === "completed") return ageMs > LIVE_QUIZ.completedRetentionMs;
    if (status === "disconnected") return ageMs > LIVE_QUIZ.disconnectedRetentionMs;
    return false;
  }).sort(function (first, second) { return second.__row - first.__row; });

  expired.forEach(function (activity) { sheet.deleteRow(activity.__row); });
  if (expired.length) invalidateSheetCache_(sheet);
  return expired.length;
}

function updateAttemptActivity_(body) {
  const context = requireSession_(body.token, "participant");
  const attemptId = String(body.attemptId || "").trim();
  if (!attemptId) throw new Error("Attempt ID is required.");

  const attempt = findById_(APP.sheets.attempts, "attempt_id", attemptId, true);
  if (!attempt || String(attempt.user_id) !== String(context.user.user_id)) {
    throw new Error("Attempt not found.");
  }

  const courseId = String(attempt.course_id || "");
  const requestedCourseId = String(body.courseId || "").trim();
  if (requestedCourseId && requestedCourseId !== courseId) {
    throw new Error("Attempt does not belong to this evaluation.");
  }

  const submitted = isSubmittedAttempt_(attempt);
  if (!submitted && String(attempt.status || "") !== "started") {
    throw new Error("Attempt is not active.");
  }

  const allowedStatuses = ["active", "idle", "disconnected"];
  let clientStatus = String(body.clientStatus || "active").trim().toLowerCase();
  if (submitted) {
    clientStatus = "completed";
  } else if (allowedStatuses.indexOf(clientStatus) < 0) {
    clientStatus = "active";
  }

  const serverTotalQuestions = liveQuizExpectedTotal_(attempt);
  if (!serverTotalQuestions) throw new Error("Evaluation questions are unavailable.");
  const currentQuestion = clamp_(Math.floor(Number(body.currentQuestion || 0)), 0, serverTotalQuestions);
  const answeredCount = clamp_(Math.floor(Number(body.answeredCount || 0)), 0, serverTotalQuestions);
  const now = new Date();
  const nowMs = now.getTime();

  return withScriptLock_(10000, function () {
    const sheet = liveQuizSheet_();
    const existing = findObjectByExactValue_(sheet, "attempt_id", attemptId, true);
    const wasDisconnected = Boolean(existing) && liveQuizDerivedStatus_(existing, attempt, nowMs) === "disconnected";
    const sameSnapshot = Boolean(existing) &&
      Number(existing.current_question || 0) === currentQuestion &&
      Number(existing.total_questions || 0) === serverTotalQuestions &&
      Number(existing.answered_count || 0) === answeredCount &&
      String(existing.client_status || "") === clientStatus;
    const previousMs = existing
      ? new Date(existing.last_activity_at || existing.updated_at || 0).getTime()
      : 0;

    if (sameSnapshot && isFinite(previousMs) && nowMs - previousMs >= 0 && nowMs - previousMs < LIVE_QUIZ.heartbeatMinMs) {
      return {
        ok: true,
        attemptId: attemptId,
        status: clientStatus,
        throttled: true,
        reconnected: false,
        now: now.toISOString(),
      };
    }

    const values = {
      course_id: courseId,
      user_id: String(context.user.user_id),
      current_question: currentQuestion,
      total_questions: serverTotalQuestions,
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
    return {
      ok: true,
      attemptId: attemptId,
      status: clientStatus,
      throttled: false,
      reconnected: wasDisconnected && clientStatus === "active",
      now: now.toISOString(),
    };
  });
}

function adminGetLiveQuizActivity_(body) {
  requireSession_(body.token, "admin");
  const now = new Date();
  const nowMs = now.getTime();
  const pruned = pruneLiveQuizActivity_(nowMs);
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
      const lastActivityAt = status === "completed"
        ? toIso_(attempt.submitted_at || item.last_activity_at || item.updated_at)
        : toIso_(item.last_activity_at || item.updated_at || attempt.started_at);
      return {
        id: String(participant.user_id || attempt.user_id || item.attempt_id),
        attemptId: String(item.attempt_id),
        courseId: String(attempt.course_id || item.course_id || ""),
        courseTitle: String(course.title || "Evaluation"),
        name: String(participant.full_name || participant.username || "Participant"),
        branch: String(participant.branch || ""),
        position: String(participant.position || ""),
        currentQuestion: Number(item.current_question || 0),
        totalQuestions: Number(item.total_questions || liveQuizExpectedTotal_(attempt) || 0),
        answeredCount: Number(item.answered_count || 0),
        status: status,
        startedAt: toIso_(attempt.started_at),
        lastActivityAt: lastActivityAt,
      };
    })
    .filter(function (item) { return Boolean(item); })
    .sort(function (first, second) {
      const priority = { active: 0, idle: 1, disconnected: 2, completed: 3 };
      return priority[first.status] - priority[second.status] ||
        new Date(second.lastActivityAt || 0) - new Date(first.lastActivityAt || 0);
    });

  return { ok: true, activity: activity, pruned: pruned, now: now.toISOString() };
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
