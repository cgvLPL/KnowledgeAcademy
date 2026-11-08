// Live quiz monitoring extension.
//
// Heartbeats are stored in the script cache (CacheService), one entry per
// attempt, instead of in a worksheet. That keeps them off the global script
// lock, so a room full of participants sending heartbeats every 15 seconds no
// longer queues in front of submitAttempt (which has a short lock timeout).
// Each entry is written only by the attempt owner's own browser, so
// last-write-wins needs no lock. The admin monitor derives its participant
// list from the Attempts sheet and fetches all matching entries in one call.
//
// Routes are registered through liveQuizApiRoutes_(), which the single doPost
// in Code.gs resolves at request time. Do not define doPost in this file.

const LIVE_QUIZ = Object.freeze({
  legacySheet: "LiveActivity",
  cachePrefix: "live-activity:",
  // CacheService's maximum lifetime. An evicted entry only means the
  // participant shows as disconnected until their next heartbeat.
  cacheSeconds: 21600,
  questionCountCachePrefix: "live-question-count:",
  questionCountCacheSeconds: 120,
  activeSeconds: 30,
  idleSeconds: 120,
  heartbeatMinMs: 5000,
  completedRetentionMs: 6 * 3600000,
  disconnectedRetentionMs: 24 * 3600000,
});

function liveQuizApiRoutes_() {
  return {
    updateAttemptActivity: updateAttemptActivity_,
    adminGetLiveQuizActivity: adminGetLiveQuizActivity_,
  };
}

// Optional one-time cleanup for workbooks that used the older sheet-backed
// monitor. Runs under the script lock and removes data rows in one batched
// delete. Safe to re-run; it never touches attempts or results.
function setupLiveQuizMonitoring() {
  beginRequest_();
  return withScriptLock_(30000, function () {
    const sheet = activeSpreadsheet_().getSheetByName(LIVE_QUIZ.legacySheet);
    let clearedLegacyRows = 0;
    if (sheet && sheet.getLastRow() > 1) {
      clearedLegacyRows = sheet.getLastRow() - 1;
      clearDataRows_(sheet);
      SpreadsheetApp.flush();
    }
    return {
      ok: true,
      storage: "script-cache",
      legacySheet: sheet ? sheet.getName() : "",
      clearedLegacyRows: clearedLegacyRows,
    };
  });
}

function liveQuizCacheKey_(attemptId) {
  return LIVE_QUIZ.cachePrefix + String(attemptId || "");
}

function readLiveQuizEntry_(cache, attemptId) {
  const raw = cache.get(liveQuizCacheKey_(attemptId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function liveQuizQuestionCount_(courseId) {
  const cache = CacheService.getScriptCache();
  const key = LIVE_QUIZ.questionCountCachePrefix + String(courseId || "");
  const cached = Number(cache.get(key));
  if (isFinite(cached) && cached > 0) return cached;
  const count = Number(questionCountsByCourse_()[String(courseId || "")] || 0);
  if (count > 0) cache.put(key, String(count), LIVE_QUIZ.questionCountCacheSeconds);
  return count;
}

function liveQuizExpectedTotal_(attempt) {
  return Math.max(0, liveQuizQuestionCount_(attempt.course_id) || Number(attempt.total_questions || 0));
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

  // No script lock: this entry is written only by this attempt's owner.
  const cache = CacheService.getScriptCache();
  const existing = readLiveQuizEntry_(cache, attemptId);
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

  cache.put(liveQuizCacheKey_(attemptId), JSON.stringify({
    attempt_id: attemptId,
    course_id: courseId,
    user_id: String(context.user.user_id),
    current_question: currentQuestion,
    total_questions: serverTotalQuestions,
    answered_count: answeredCount,
    client_status: clientStatus,
    last_activity_at: now.toISOString(),
    updated_at: now.toISOString(),
  }), LIVE_QUIZ.cacheSeconds);

  return {
    ok: true,
    attemptId: attemptId,
    status: clientStatus,
    throttled: false,
    reconnected: wasDisconnected && clientStatus === "active",
    now: now.toISOString(),
  };
}

// Started attempts from the last 24 hours and submissions from the last
// 6 hours are the only ones that can appear in the monitor.
function liveQuizCandidateAttempts_(attempts, nowMs) {
  return attempts.filter(function (attempt) {
    if (isSubmittedAttempt_(attempt)) {
      const submittedMs = new Date(attempt.submitted_at).getTime();
      return isFinite(submittedMs) && nowMs - submittedMs <= LIVE_QUIZ.completedRetentionMs;
    }
    if (String(attempt.status || "") !== "started") return false;
    const startedMs = new Date(attempt.started_at).getTime();
    return isFinite(startedMs) && nowMs - startedMs <= LIVE_QUIZ.disconnectedRetentionMs;
  });
}

function adminGetLiveQuizActivity_(body) {
  requireSession_(body.token, "admin");
  const now = new Date();
  const nowMs = now.getTime();
  const candidates = liveQuizCandidateAttempts_(rowsAsObjects_(getSheet_(APP.sheets.attempts)), nowMs);
  const userMap = indexBy_(rowsAsObjects_(getSheet_(APP.sheets.users)), "user_id");
  const courseMap = indexBy_(rowsAsObjects_(getSheet_(APP.sheets.courses)), "course_id");
  const questionCounts = questionCountsByCourse_();
  const entries = candidates.length
    ? CacheService.getScriptCache().getAll(candidates.map(function (attempt) {
      return liveQuizCacheKey_(attempt.attempt_id);
    }))
    : {};

  const activity = candidates
    .map(function (attempt) {
      let item = null;
      try {
        item = JSON.parse(entries[liveQuizCacheKey_(attempt.attempt_id)] || "null");
      } catch (error) {
        item = null;
      }
      // A started attempt with no heartbeat yet (or an evicted cache entry)
      // is timed from its server start time.
      if (!item) item = { client_status: "", last_activity_at: attempt.started_at };
      const status = liveQuizDerivedStatus_(item, attempt, nowMs);
      const lastActivityAt = status === "completed"
        ? toIso_(attempt.submitted_at || item.last_activity_at)
        : toIso_(item.last_activity_at || attempt.started_at);
      if (status === "disconnected") {
        const lastMs = new Date(lastActivityAt).getTime();
        if (!isFinite(lastMs) || nowMs - lastMs > LIVE_QUIZ.disconnectedRetentionMs) return null;
      }
      const participant = userMap[attempt.user_id] || {};
      const course = courseMap[attempt.course_id] || {};
      return {
        id: String(participant.user_id || attempt.user_id || attempt.attempt_id),
        attemptId: String(attempt.attempt_id),
        courseId: String(attempt.course_id || ""),
        courseTitle: String(course.title || "Evaluation"),
        name: String(participant.full_name || participant.username || "Participant"),
        branch: String(participant.branch || ""),
        position: String(participant.position || ""),
        currentQuestion: Number(item.current_question || 0),
        totalQuestions: Number(
          item.total_questions || questionCounts[String(attempt.course_id || "")] || attempt.total_questions || 0,
        ),
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

  return { ok: true, activity: activity, pruned: 0, now: now.toISOString() };
}
