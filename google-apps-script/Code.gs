const APP = Object.freeze({
  name: "CGV Exams",
  version: "2026.08.10-quiz-archive",
  timezone: "Asia/Jakarta",
  sessionHours: 12,
  capacity: Object.freeze({
    targetSimultaneousParticipants: 30,
    writeLockTimeoutMs: 90000,
    sessionPruneIntervalSeconds: 21600,
  }),
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
    "created_at", "updated_at", "attempt_limit",
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
  adminGetExecutiveReport: adminGetExecutiveReport_,
  adminGetCourse: adminGetCourse_,
  adminSaveCourse: adminSaveCourse_,
  adminDuplicateCourse: adminDuplicateCourse_,
  adminDeleteCourse: adminDeleteCourse_,
  adminSetCourseStatus: adminSetCourseStatus_,
  adminSaveParticipant: adminSaveParticipant_,
  adminSaveUser: adminSaveUser_,
  adminSetUserStatus: adminSetUserStatus_,
  adminResetPassword: adminResetPassword_,
});

let REQUEST_STATE_ = null;

function doGet() {
  beginRequest_();
  return json_(health_());
}

function doPost(event) {
  beginRequest_();
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
    spreadsheetId: activeSpreadsheet_().getId(),
    now: new Date().toISOString(),
  };
}

function setupEvaluationPlatform() {
  beginRequest_();
  return withScriptLock_(30000, function () {
    const spreadsheet = activeSpreadsheet_();
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
      version: APP.version,
      spreadsheetId: spreadsheet.getId(),
      adminUsername: admin.username,
      sheets: spreadsheet.getSheets().map(function (sheet) { return sheet.getName(); }),
    };
  });
}

function resetEvaluationPlatformToAdminOnly() {
  beginRequest_();
  return withScriptLock_(30000, function () {
    const spreadsheet = activeSpreadsheet_();
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
    [
      APP.sheets.courses,
      APP.sheets.questions,
      APP.sheets.attempts,
      APP.sheets.answers,
      APP.sheets.sessions,
    ].forEach(function (name) {
      clearDataRows_(getSheet_(name));
    });
    buildDashboard_();
    SpreadsheetApp.flush();
    return { ok: true, adminUsername: admin.username };
  });
}

function resetAdminCredentials() {
  beginRequest_();
  return withScriptLock_(30000, function () {
    ensurePepper_();
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
  beginRequest_();
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
  const token = Utilities.getUuid() + Utilities.getUuid();
  const expiresAt = new Date(Date.now() + APP.sessionHours * 3600000);
  let authenticatedUser = null;

  const loginResult = withScriptLock_(APP.capacity.writeLockTimeoutMs, function () {
    const currentUser = findById_(APP.sheets.users, "user_id", user.user_id);
    if (!currentUser || currentUser.status !== "active") {
      throw new Error("Invalid username or password.");
    }
    if (currentUser.salt !== user.salt || currentUser.password_hash !== user.password_hash) {
      throw new Error("Invalid username or password.");
    }
    const loggedInAt = new Date();
    updateObjectRow_(getSheet_(APP.sheets.users), currentUser.__row, { last_login: loggedInAt });
    appendRow_(getSheet_(APP.sheets.sessions), [
      hashToken_(token), currentUser.user_id, currentUser.role, expiresAt, new Date(),
    ]);
    SpreadsheetApp.flush();
    authenticatedUser = Object.assign({}, currentUser, { last_login: loggedInAt });
    return {
      ok: true,
      token: token,
      expiresAt: expiresAt.toISOString(),
      user: publicUser_(authenticatedUser),
    };
  });

  loginResult.workspace = authenticatedUser.role === "admin"
    ? adminDashboardForUser_(authenticatedUser, "")
    : participantHomeForUser_(authenticatedUser);
  return loginResult;
}

function logout_(body) {
  if (!body.token) return { ok: true };
  const tokenHash = hashToken_(String(body.token));
  return withScriptLock_(10000, function () {
    deleteRowsMatching_(getSheet_(APP.sheets.sessions), "token_hash", tokenHash);
    pruneSessionsIfDue_();
    SpreadsheetApp.flush();
    return { ok: true };
  });
}

function getParticipantHome_(body) {
  const context = requireSession_(body.token, "participant");
  return participantHomeForUser_(context.user);
}

function participantHomeForUser_(user) {
  const questionCounts = questionCountsByCourse_();
  const attempts = attemptsForUser_(user.user_id);
  const submittedAttempts = attempts.filter(function (attempt) { return attempt.status === "submitted"; });
  const attemptsByCourse = submittedAttempts.reduce(function (counts, attempt) {
    const courseId = String(attempt.course_id || "");
    counts[courseId] = (counts[courseId] || 0) + 1;
    return counts;
  }, {});
  const courses = rowsAsObjects_(getSheet_(APP.sheets.courses))
    .filter(function (course) {
      const lifecycle = courseLifecycleStatus_(course);
      return lifecycle !== "draft" && lifecycle !== "archived";
    })
    .map(function (course) {
      const publicCourse = publicCourse_(course, questionCounts);
      const attemptsUsed = Number(attemptsByCourse[course.course_id] || 0);
      const attemptLimit = courseAttemptLimit_(course);
      return Object.assign(publicCourse, {
        attemptsUsed: attemptsUsed,
        attemptsRemaining: attemptLimit ? Math.max(0, attemptLimit - attemptsUsed) : null,
        canAttempt: !attemptLimit || attemptsUsed < attemptLimit,
      });
    })
    .sort(function (first, second) {
      const priority = { live: 0, scheduled: 1, completed: 2, draft: 3, archived: 4 };
      return priority[first.status] - priority[second.status] ||
        new Date(first.startAt || first.endAt || 0) - new Date(second.startAt || second.endAt || 0);
    });
  const history = submittedAttempts
    .sort(function (a, b) { return new Date(b.submitted_at) - new Date(a.submitted_at); })
    .map(publicAttempt_);
  return {
    ok: true,
    user: publicUser_(user),
    courses: courses,
    history: history,
    summary: summarizeAttempts_(history),
  };
}

function startAttempt_(body) {
  const context = requireSession_(body.token, "participant");
  const courseId = String(body.courseId || "").trim();
  const course = findById_(APP.sheets.courses, "course_id", courseId);
  if (!course) throw new Error("This evaluation is not available.");
  const now = new Date();
  const lifecycle = courseLifecycleStatus_(course, now);
  if (lifecycle === "scheduled") throw new Error("This evaluation has not opened yet.");
  if (lifecycle === "completed") throw new Error("This evaluation has closed.");
  if (lifecycle !== "live") throw new Error("This evaluation is not available.");
  const questions = questionsForCourse_(courseId);
  if (!questions.length) throw new Error("This evaluation has no published questions.");

  const attemptId = withScriptLock_(APP.capacity.writeLockTimeoutMs, function () {
    const currentCourse = findById_(APP.sheets.courses, "course_id", courseId, true);
    if (!currentCourse) throw new Error("This evaluation is not available.");
    const userAttempts = findObjectsByExactValue_(
      getSheet_(APP.sheets.attempts),
      "user_id",
      context.user.user_id,
    );
    const existing = userAttempts.find(function (attempt) {
      return String(attempt.course_id) === courseId &&
        attempt.status === "started";
    });
    if (existing) return existing.attempt_id;
    assertAttemptLimitAvailable_(currentCourse, userAttempts);
    const id = Utilities.getUuid();
    appendRow_(getSheet_(APP.sheets.attempts), [
      id, courseId, context.user.user_id, now, "", "started", "", "", "", "", "",
    ]);
    SpreadsheetApp.flush();
    return id;
  });
  const questionCounts = {};
  questionCounts[courseId] = questions.length;

  return {
    ok: true,
    attemptId: attemptId,
    startedAt: now.toISOString(),
    course: publicCourse_(course, questionCounts),
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
  const attemptsUsed = submittedAttemptCountForCourse_(findObjectsByExactValue_(
    getSheet_(APP.sheets.attempts),
    "user_id",
    attempt.user_id,
  ), attempt.course_id);
  return {
    ok: true,
    alreadySubmitted: true,
    result: {
      attemptId: attempt.attempt_id,
      score: score,
      correctCount: Number(attempt.correct_count || 0),
      totalQuestions: Number(attempt.total_questions || 0),
      durationSeconds: Number(attempt.duration_seconds || 0),
      attemptsUsed: attemptsUsed,
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
    if (correct) {
      correctCount += 1;
      earned += points;
    }
    return [
      Utilities.getUuid(), attemptId, question.question_id, selected,
      correct, correct ? points : 0, now,
    ];
  });
  const score = total ? Math.round(earned / total * 100) : 0;
  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - new Date(initialAttempt.started_at).getTime()) / 1000),
  );

  return withScriptLock_(APP.capacity.writeLockTimeoutMs, function () {
    const current = findById_(APP.sheets.attempts, "attempt_id", attemptId, true);
    if (!current || String(current.user_id) !== String(context.user.user_id)) {
      throw new Error("Attempt not found.");
    }
    const currentCourse = findById_(APP.sheets.courses, "course_id", current.course_id, true);
    if (!currentCourse) throw new Error("The course for this attempt no longer exists.");
    if (current.status === "submitted") return existingAttemptResult_(current, currentCourse);
    if (current.status !== "started") throw new Error("This attempt cannot be submitted.");
    const userAttempts = findObjectsByExactValue_(
      getSheet_(APP.sheets.attempts),
      "user_id",
      context.user.user_id,
    );
    assertAttemptLimitAvailable_(currentCourse, userAttempts, current.attempt_id);
    const attemptsUsed = submittedAttemptCountForCourse_(
      userAttempts,
      currentCourse.course_id,
      current.attempt_id,
    ) + 1;
    const answersSheet = getSheet_(APP.sheets.answers);
    answersSheet
      .getRange(answersSheet.getLastRow() + 1, 1, answerRows.length, HEADERS.Answers.length)
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
        attemptsUsed: attemptsUsed,
        passed: score >= Number(currentCourse.passing_score || 0),
        passingScore: Number(currentCourse.passing_score || 0),
      },
    };
  });
}

function submittedAttemptCountForCourse_(attempts, courseId, excludedAttemptId) {
  return attempts.filter(function (attempt) {
    return String(attempt.course_id) === String(courseId) &&
      attempt.status === "submitted" &&
      String(attempt.attempt_id) !== String(excludedAttemptId || "");
  }).length;
}

function assertAttemptLimitAvailable_(course, attempts, excludedAttemptId) {
  const attemptLimit = courseAttemptLimit_(course);
  if (!attemptLimit) return;
  const attemptsUsed = submittedAttemptCountForCourse_(attempts, course.course_id, excludedAttemptId);
  if (attemptsUsed >= attemptLimit) {
    throw new Error("You have reached the " + attemptLimit + "-attempt limit for this evaluation.");
  }
}

function adminGetDashboard_(body) {
  const context = requireSession_(body.token, "admin");
  return adminDashboardForUser_(context.user, String(body.courseId || "").trim());
}

function adminDashboardForUser_(user, courseId) {
  const courses = rowsAsObjects_(getSheet_(APP.sheets.courses));
  const users = rowsAsObjects_(getSheet_(APP.sheets.users));
  const participants = users.filter(function (user) { return user.role === "participant"; });
  const allSubmitted = rowsAsObjects_(getSheet_(APP.sheets.attempts))
    .filter(function (attempt) { return attempt.status === "submitted"; });
  const attempts = courseId
    ? allSubmitted.filter(function (attempt) { return String(attempt.course_id) === courseId; })
    : allSubmitted;
  const userMap = indexBy_(users, "user_id");
  const courseMap = indexBy_(courses, "course_id");
  const questionCounts = questionCountsByCourse_();
  const participantStats = allSubmitted.reduce(function (stats, attempt) {
    if (!stats[attempt.user_id]) stats[attempt.user_id] = { attempts: 0, scoreTotal: 0 };
    stats[attempt.user_id].attempts += 1;
    stats[attempt.user_id].scoreTotal += Number(attempt.score || 0);
    return stats;
  }, {});
  const courseStats = allSubmitted.reduce(function (stats, attempt) {
    if (!stats[attempt.course_id]) stats[attempt.course_id] = { participants: {}, total: 0, count: 0 };
    stats[attempt.course_id].participants[attempt.user_id] = true;
    stats[attempt.course_id].total += Number(attempt.score || 0);
    stats[attempt.course_id].count += 1;
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
      email: user.email || "",
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
  }).map(function (item, index) {
    item.rank = index + 1;
    return item;
  });
  return {
    ok: true,
    user: publicUser_(user),
    courses: courses.map(function (course) {
      const result = publicCourse_(course, questionCounts);
      const stats = courseStats[course.course_id] || { participants: {}, total: 0, count: 0 };
      result.participants = Object.keys(stats.participants).length;
      result.average = stats.count ? Math.round(stats.total / stats.count) : 0;
      return result;
    }),
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
      average: scoreboard.length
        ? Math.round(scoreboard.reduce(function (sum, item) { return sum + item.score; }, 0) / scoreboard.length)
        : 0,
      topScore: scoreboard.length ? scoreboard[0].score : 0,
    },
  };
}

function adminGetExecutiveReport_(body) {
  requireSession_(body.token, "admin");
  const courseId = String(body.courseId || "").trim();
  if (!courseId) throw new Error("Course ID is required.");
  const course = findById_(APP.sheets.courses, "course_id", courseId);
  if (!course) throw new Error("Course not found.");

  const questions = questionsForCourse_(courseId);
  const questionCounts = {};
  questionCounts[courseId] = questions.length;
  const users = rowsAsObjects_(getSheet_(APP.sheets.users));
  const userMap = indexBy_(users, "user_id");
  const attempts = rowsAsObjects_(getSheet_(APP.sheets.attempts))
    .filter(function (attempt) {
      return String(attempt.course_id) === courseId && attempt.status === "submitted";
    });
  const answersByQuestion = {};
  const attemptsNeedingAnswerRows = {};
  attempts.forEach(function (attempt) {
    let recordedAnswers = null;
    try {
      recordedAnswers = JSON.parse(String(attempt.answers_json || ""));
    } catch (error) {
      recordedAnswers = null;
    }
    if (!recordedAnswers || typeof recordedAnswers !== "object" || !Object.keys(recordedAnswers).length) {
      attemptsNeedingAnswerRows[String(attempt.attempt_id)] = true;
      return;
    }
    Object.keys(recordedAnswers).forEach(function (questionId) {
      if (!answersByQuestion[questionId]) answersByQuestion[questionId] = [];
      answersByQuestion[questionId].push({
        attempt_id: attempt.attempt_id,
        question_id: questionId,
        selected_option: recordedAnswers[questionId],
      });
    });
  });
  if (Object.keys(attemptsNeedingAnswerRows).length) {
    rowsAsObjects_(getSheet_(APP.sheets.answers)).forEach(function (answer) {
      if (!attemptsNeedingAnswerRows[String(answer.attempt_id)]) return;
      const questionId = String(answer.question_id);
      if (!answersByQuestion[questionId]) answersByQuestion[questionId] = [];
      answersByQuestion[questionId].push(answer);
    });
  }

  const participantResults = attempts.map(function (attempt) {
    const user = userMap[attempt.user_id] || {};
    const score = Number(attempt.score || 0);
    return {
      attemptId: String(attempt.attempt_id || ""),
      participantId: String(attempt.user_id || ""),
      name: String(user.full_name || "Unknown participant"),
      branch: String(user.branch || ""),
      score: score,
      correctCount: Number(attempt.correct_count || 0),
      totalQuestions: Number(attempt.total_questions || questions.length),
      durationSeconds: Number(attempt.duration_seconds || 0),
      submittedAt: toIso_(attempt.submitted_at),
      passed: score >= Number(course.passing_score || 0),
    };
  }).sort(function (a, b) {
    return b.score - a.score || a.durationSeconds - b.durationSeconds ||
      new Date(b.submittedAt) - new Date(a.submittedAt);
  }).map(function (item, index) {
    item.rank = index + 1;
    return item;
  });

  const scores = participantResults.map(function (item) { return item.score; })
    .sort(function (a, b) { return a - b; });
  const durations = participantResults.map(function (item) { return item.durationSeconds; });
  const scoreTotal = scores.reduce(function (sum, score) { return sum + score; }, 0);
  const durationTotal = durations.reduce(function (sum, duration) { return sum + duration; }, 0);
  const midpoint = Math.floor(scores.length / 2);
  const median = scores.length
    ? (scores.length % 2
      ? scores[midpoint]
      : Math.round((scores[midpoint - 1] + scores[midpoint]) / 2))
    : 0;
  const uniqueParticipants = attempts.reduce(function (result, attempt) {
    result[String(attempt.user_id)] = true;
    return result;
  }, {});
  const passedCount = participantResults.filter(function (item) { return item.passed; }).length;

  const scoreBands = [
    { label: "Below 50%", min: 0, max: 49 },
    { label: "50-59%", min: 50, max: 59 },
    { label: "60-69%", min: 60, max: 69 },
    { label: "70-79%", min: 70, max: 79 },
    { label: "80-89%", min: 80, max: 89 },
    { label: "90-100%", min: 90, max: 100 },
  ].map(function (band) {
    const count = scores.filter(function (score) { return score >= band.min && score <= band.max; }).length;
    return {
      label: band.label,
      count: count,
      percentage: scores.length ? Math.round(count / scores.length * 100) : 0,
    };
  });

  const questionAnalysis = questions.map(function (question) {
    const questionAnswers = answersByQuestion[String(question.question_id)] || [];
    const optionKeys = ["A", "B", "C", "D"];
    const optionText = [question.option_a, question.option_b, question.option_c, question.option_d];
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    questionAnswers.forEach(function (answer) {
      const selected = String(answer.selected_option || "").trim().toUpperCase();
      if (Object.prototype.hasOwnProperty.call(counts, selected)) counts[selected] += 1;
    });
    const correctOption = String(question.correct_option || "A").trim().toUpperCase();
    const answeredCount = optionKeys.reduce(function (sum, key) { return sum + counts[key]; }, 0);
    const correctCount = counts[correctOption] || 0;
    const wrongCount = Math.max(0, answeredCount - correctCount);
    const totalResponses = attempts.length;
    const mostCommonOption = answeredCount
      ? optionKeys.reduce(function (best, key) { return counts[key] > counts[best] ? key : best; }, "A")
      : "";
    const answerByAttempt = questionAnswers.reduce(function (result, answer) {
      result[String(answer.attempt_id)] = answer;
      return result;
    }, {});
    const participantResponses = participantResults.map(function (participant) {
      const answer = answerByAttempt[participant.attemptId] || {};
      const selectedOption = String(answer.selected_option || "").trim().toUpperCase();
      const selectedIndex = optionKeys.indexOf(selectedOption);
      const status = !selectedOption
        ? "unanswered"
        : selectedOption === correctOption
          ? "correct"
          : "incorrect";
      return {
        attemptId: participant.attemptId,
        participantId: participant.participantId,
        participantName: participant.name,
        branch: participant.branch,
        submittedAt: participant.submittedAt,
        selectedOption: selectedOption,
        selectedAnswer: selectedIndex >= 0 ? String(optionText[selectedIndex] || "") : "",
        status: status,
        isCorrect: status === "correct",
      };
    });
    return {
      id: String(question.question_id),
      order: Number(question.order_no || 0),
      prompt: String(question.question_text || ""),
      correctOption: correctOption,
      correctAnswer: String(optionText[optionKeys.indexOf(correctOption)] || ""),
      totalResponses: totalResponses,
      answeredCount: answeredCount,
      unansweredCount: Math.max(0, totalResponses - answeredCount),
      correctCount: correctCount,
      correctPercentage: totalResponses ? Math.round(correctCount / totalResponses * 100) : 0,
      incorrectPercentage: totalResponses ? Math.round(wrongCount / totalResponses * 100) : 0,
      mostCommonOption: mostCommonOption,
      mostCommonAnswer: mostCommonOption ? String(optionText[optionKeys.indexOf(mostCommonOption)] || "") : "",
      mostCommonCount: mostCommonOption ? counts[mostCommonOption] : 0,
      mostCommonPercentage: totalResponses && mostCommonOption
        ? Math.round(counts[mostCommonOption] / totalResponses * 100)
        : 0,
      options: optionKeys.map(function (key, index) {
        return {
          key: key,
          text: String(optionText[index] || ""),
          count: counts[key],
          percentage: totalResponses ? Math.round(counts[key] / totalResponses * 100) : 0,
          isCorrect: key === correctOption,
        };
      }),
      responses: participantResponses,
    };
  });

  return {
    ok: true,
    report: {
      generatedAt: new Date().toISOString(),
      course: publicCourse_(course, questionCounts),
      summary: {
        submissions: participantResults.length,
        uniqueParticipants: Object.keys(uniqueParticipants).length,
        averageScore: scores.length ? Math.round(scoreTotal / scores.length) : 0,
        medianScore: median,
        passRate: scores.length ? Math.round(passedCount / scores.length * 100) : 0,
        highestScore: scores.length ? Math.max.apply(null, scores) : 0,
        lowestScore: scores.length ? Math.min.apply(null, scores) : 0,
        averageDurationSeconds: durations.length ? Math.round(durationTotal / durations.length) : 0,
      },
      scoreDistribution: scoreBands,
      participants: participantResults,
      questions: questionAnalysis,
    },
  };
}

function adminGetCourse_(body) {
  requireSession_(body.token, "admin");
  const courseId = String(body.courseId || "").trim();
  const course = findById_(APP.sheets.courses, "course_id", courseId);
  if (!course) throw new Error("Course not found.");
  const questions = questionsForCourse_(courseId);
  const questionCounts = {};
  questionCounts[courseId] = questions.length;
  return {
    ok: true,
    course: publicCourse_(course, questionCounts),
    questions: questions.map(function (question) {
      return {
        id: question.question_id,
        prompt: question.question_text,
        options: [question.option_a, question.option_b, question.option_c, question.option_d],
        correct: String(question.correct_option || "A"),
        points: Number(question.points || 1),
        explanation: String(question.explanation || ""),
      };
    }),
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
    return [
      Utilities.getUuid(), "", index + 1, String(question.prompt).trim(),
      options[0].trim(), options[1].trim(), options[2].trim(), options[3].trim(),
      correct, Math.max(1, Number(question.points || 1)), String(question.explanation || ""),
    ];
  });
  return withScriptLock_(30000, function () {
    const coursesSheet = ensureDataSheet_(activeSpreadsheet_(), APP.sheets.courses, HEADERS.Courses);
    const courseId = String(input.id || Utilities.getUuid());
    const existing = findById_(APP.sheets.courses, "course_id", courseId);
    const now = new Date();
    const startAt = input.startAt ? new Date(input.startAt) : "";
    const endAt = input.endAt ? new Date(input.endAt) : "";
    if (startAt && isNaN(startAt.getTime())) throw new Error("Opening date is invalid.");
    if (endAt && isNaN(endAt.getTime())) throw new Error("Closing date is invalid.");
    if (startAt && endAt && endAt <= startAt) {
      throw new Error("Closing date must be after the opening date.");
    }
    const record = {
      course_id: courseId,
      title: title,
      description: String(input.description || ""),
      category: String(input.category || "General"),
      passing_score: clamp_(Number(input.passingScore || 75), 1, 100),
      time_limit_min: Math.max(1, Number(input.duration || 20)),
      start_at: startAt,
      end_at: endAt,
      status: coursePublishingStatus_(input.status),
      created_by: existing ? existing.created_by : context.user.user_id,
      created_at: existing ? existing.created_at : now,
      updated_at: now,
      attempt_limit: input.attemptLimit === undefined && existing
        ? courseAttemptLimit_(existing)
        : clamp_(Math.floor(Number(input.attemptLimit || 0)), 0, 100),
    };
    if (existing) {
      updateObjectRow_(coursesSheet, existing.__row, record);
      deleteRowsMatching_(getSheet_(APP.sheets.questions), "course_id", courseId);
    } else {
      appendObject_(coursesSheet, record);
    }
    preparedQuestions.forEach(function (row) { row[1] = courseId; });
    const questionsSheet = getSheet_(APP.sheets.questions);
    questionsSheet
      .getRange(questionsSheet.getLastRow() + 1, 1, preparedQuestions.length, HEADERS.Questions.length)
      .setValues(preparedQuestions);
    invalidateSheetCache_(questionsSheet);
    if (existing && String(existing.title) !== title) {
      updateDashboardCourseSelection_(existing.title, title);
    }
    SpreadsheetApp.flush();
    const questionCounts = {};
    questionCounts[courseId] = preparedQuestions.length;
    return {
      ok: true,
      course: publicCourse_(record, questionCounts),
    };
  });
}

function adminDuplicateCourse_(body) {
  requireSession_(body.token, "admin");
  const sourceId = String(body.courseId || "").trim();
  const source = findById_(APP.sheets.courses, "course_id", sourceId);
  if (!source) throw new Error("Course not found.");
  const questions = questionsForCourse_(sourceId);
  if (!questions.length) throw new Error("The source course has no questions.");
  return adminSaveCourse_({
    token: body.token,
    course: {
      id: Utilities.getUuid(),
      title: String(body.title || ("Copy of " + source.title)).trim(),
      description: source.description,
      category: source.category,
      passingScore: Number(source.passing_score || 75),
      duration: Number(source.time_limit_min || 20),
      attemptLimit: courseAttemptLimit_(source),
      startAt: "",
      endAt: "",
      status: "draft",
      questions: questions.map(function (question) {
        return {
          prompt: question.question_text,
          options: [question.option_a, question.option_b, question.option_c, question.option_d],
          correct: question.correct_option,
          points: Number(question.points || 1),
          explanation: question.explanation,
        };
      }),
    },
  });
}

function adminSetCourseStatus_(body) {
  requireSession_(body.token, "admin");
  const courseId = String(body.courseId || "").trim();
  const requestedStatus = String(body.status || "").trim().toLowerCase();
  if (["draft", "upcoming", "scheduled", "live", "completed", "archived"].indexOf(requestedStatus) < 0) {
    throw new Error("Invalid course status.");
  }
  const status = coursePublishingStatus_(requestedStatus);
  return withScriptLock_(10000, function () {
    const course = findById_(APP.sheets.courses, "course_id", courseId);
    if (!course) throw new Error("Course not found.");
    updateObjectRow_(getSheet_(APP.sheets.courses), course.__row, {
      status: status,
      updated_at: new Date(),
    });
    SpreadsheetApp.flush();
    return {
      ok: true,
      course: publicCourse_(Object.assign({}, course, { status: status, updated_at: new Date() })),
    };
  });
}

function adminDeleteCourse_(body) {
  requireSession_(body.token, "admin");
  const courseId = String(body.courseId || "").trim();
  return withScriptLock_(15000, function () {
    const course = findById_(APP.sheets.courses, "course_id", courseId);
    if (!course) throw new Error("Course not found.");
    const hasAttempts = Boolean(findObjectByExactValue_(
      getSheet_(APP.sheets.attempts),
      "course_id",
      courseId,
    ));
    if (hasAttempts) {
      updateObjectRow_(getSheet_(APP.sheets.courses), course.__row, {
        status: "archived",
        updated_at: new Date(),
      });
      SpreadsheetApp.flush();
      return {
        ok: true,
        archived: true,
        message: "Course has results and was archived instead of deleted.",
        course: publicCourse_(Object.assign({}, course, { status: "archived", updated_at: new Date() })),
      };
    }
    deleteRowsMatching_(getSheet_(APP.sheets.questions), "course_id", courseId);
    getSheet_(APP.sheets.courses).deleteRow(course.__row);
    invalidateSheetCache_(getSheet_(APP.sheets.courses));
    updateDashboardCourseSelection_(course.title, "");
    SpreadsheetApp.flush();
    return { ok: true, deleted: true };
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
  if (!isValidUsername_(username)) {
    throw new Error("Username must be 3–40 characters using letters, numbers, dots, underscores, or hyphens.");
  }
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

function adminSetUserStatus_(body) {
  const context = requireSession_(body.token, "admin");
  const userId = String(body.userId || "").trim();
  const status = String(body.status || "").trim().toLowerCase();
  if (["active", "inactive"].indexOf(status) < 0) throw new Error("Invalid account status.");
  if (userId === context.user.user_id && status === "inactive") {
    throw new Error("You cannot deactivate your own administrator account.");
  }
  return withScriptLock_(10000, function () {
    const user = findById_(APP.sheets.users, "user_id", userId);
    if (!user) throw new Error("Account not found.");
    updateObjectRow_(getSheet_(APP.sheets.users), user.__row, { status: status });
    if (status === "inactive") {
      deleteRowsMatching_(getSheet_(APP.sheets.sessions), "user_id", userId);
    }
    SpreadsheetApp.flush();
    return {
      ok: true,
      user: publicUser_(Object.assign({}, user, { status: status })),
    };
  });
}

function adminResetPassword_(body) {
  requireSession_(body.token, "admin");
  const userId = String(body.userId || "").trim();
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
  const existing = users.find(function (user) {
    return user.role === "admin" && user.status === "active";
  });
  if (existing) return existing;
  const properties = PropertiesService.getScriptProperties();
  const username = normalizeUsername_(properties.getProperty("INITIAL_ADMIN_USERNAME"));
  const password = String(properties.getProperty("INITIAL_ADMIN_PASSWORD") || "");
  if (!isValidUsername_(username) || password.length < 8) {
    throw new Error(
      "Set INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD (minimum 8 characters) in Script Properties.",
    );
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
  return record;
}

function requireSession_(token, requiredRole) {
  if (!token) throw new Error("Authentication required.");
  const tokenHash = hashToken_(String(token));
  const session = findObjectByExactValue_(
    getSheet_(APP.sheets.sessions),
    "token_hash",
    tokenHash,
  );
  if (session && new Date(session.expires_at) <= new Date()) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  if (requiredRole && session.role !== requiredRole) {
    throw new Error("You do not have access to this action.");
  }
  const user = findById_(APP.sheets.users, "user_id", session.user_id);
  if (!user || user.status !== "active") throw new Error("This account is not active.");
  return { session: session, user: user };
}

function pruneSessions_() {
  const now = new Date();
  const expired = rowsAsObjects_(getSheet_(APP.sheets.sessions))
    .filter(function (session) { return new Date(session.expires_at) <= now; })
    .sort(function (a, b) { return b.__row - a.__row; });
  expired.forEach(function (session) { getSheet_(APP.sheets.sessions).deleteRow(session.__row); });
  return expired.length;
}

function pruneSessionsIfDue_() {
  const cache = CacheService.getScriptCache();
  const key = "sessions-pruned";
  if (cache.get(key)) return 0;
  cache.put(key, "1", APP.capacity.sessionPruneIntervalSeconds);
  return pruneSessions_();
}

function buildDashboard_() {
  const spreadsheet = activeSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(APP.sheets.dashboard);
  if (!sheet) sheet = spreadsheet.insertSheet(APP.sheets.dashboard, 0);
  sheet.clear();
  sheet.getCharts().forEach(function (chart) { sheet.removeChart(chart); });
  if (sheet.getMaxColumns() < 14) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 14 - sheet.getMaxColumns());
  }
  sheet.setHiddenGridlines(true);
  sheet.setFrozenRows(8);
  sheet.getRange("A1:H1").setBackground("#101110").setFontColor("#ffffff");
  sheet.getRange("A1").setValue("CGV EXAMS · EVALUATION SCOREBOARD").setFontSize(16).setFontWeight("bold");
  sheet.getRange("A2").setValue("Live participant results powered by the evaluation records in this workbook.").setFontColor("#747974");
  sheet.getRange("A3").setValue("Selected evaluation").setFontWeight("bold");
  const coursesSheet = getSheet_(APP.sheets.courses);
  const titlesRange = coursesSheet.getRange("B2:B");
  sheet.getRange("B3").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInRange(titlesRange, true)
      .setAllowInvalid(false)
      .build(),
  );
  sheet.getRange("B3")
    .setValue(coursesSheet.getLastRow() > 1 ? coursesSheet.getRange("B2").getValue() : "")
    .setBackground("#eefbdc");
  sheet.getRange("A5:H5").setValues([[
    "Participants", "", "Average score", "", "Pass rate", "", "Top score", "",
  ]]).setFontWeight("bold");
  sheet.getRange("A6").setFormula('=IFERROR(COUNTA(UNIQUE(FILTER(Attempts!C2:C,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"))),0)');
  sheet.getRange("C6").setFormula('=IFERROR(AVERAGE(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted")),0)');
  sheet.getRange("E6").setFormula('=IFERROR(COUNTIF(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"),">="&XLOOKUP($B$3,Courses!B:B,Courses!E:E))/A6,0)');
  sheet.getRange("G6").setFormula('=IFERROR(MAX(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted")),0)');
  sheet.getRange("A6:H6").setFontSize(24).setFontWeight("bold");
  sheet.getRange("E6").setNumberFormat("0.0%");
  sheet.getRange("A8:G8").setValues([[
    "Rank", "Participant", "Branch", "Score", "Correct", "Time", "Completed",
  ]]).setBackground("#101110").setFontColor("#ffffff").setFontWeight("bold");
  sheet.getRange("A9").setFormula('=IFERROR(LET(courseId,XLOOKUP($B$3,Courses!B:B,Courses!A:A),rows,FILTER(Attempts!A2:J,Attempts!B2:B=courseId,Attempts!F2:F="submitted"),sorted,SORT(HSTACK(XLOOKUP(INDEX(rows,,3),Users!A:A,Users!C:C),XLOOKUP(INDEX(rows,,3),Users!A:A,Users!D:D),INDEX(rows,,7),INDEX(rows,,8)&"/"&INDEX(rows,,9),INDEX(rows,,10),INDEX(rows,,5)),3,FALSE,5,TRUE),HSTACK(SEQUENCE(ROWS(sorted)),sorted)),"No submitted attempts yet")');
  sheet.getRange("D9:D").setNumberFormat("0");
  sheet.getRange("F9:F").setNumberFormat("[mm]:ss");
  sheet.getRange("G9:G").setNumberFormat("dd-mmm-yy hh:mm");
  [72, 190, 130, 88, 90, 88, 145, 24, 30, 105, 90, 90, 90, 90]
    .forEach(function (width, index) { sheet.setColumnWidth(index + 1, width); });
  sheet.getRange("A1:N40").setFontFamily("Arial").setVerticalAlignment("middle");
}

function updateDashboardCourseSelection_(previousTitle, nextTitle) {
  const selection = getSheet_(APP.sheets.dashboard).getRange("B3");
  if (String(selection.getValue() || "") !== String(previousTitle || "")) return;
  if (nextTitle) {
    selection.setValue(nextTitle);
    return;
  }
  const coursesSheet = getSheet_(APP.sheets.courses);
  selection.setValue(coursesSheet.getLastRow() > 1 ? coursesSheet.getRange("B2").getValue() : "");
}

function ensureDataSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (headers.some(function (header, index) { return current[index] !== header; })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#101110")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  return sheet;
}

function ensureSettings_() {
  const sheet = getSheet_(APP.sheets.settings);
  const existing = rowsAsObjects_(sheet);
  const defaults = {
    app_name: APP.name,
    app_version: APP.version,
    company_name: "CGV",
    timezone: APP.timezone,
    session_hours: String(APP.sessionHours),
  };
  Object.keys(defaults).forEach(function (key) {
    const row = existing.find(function (item) { return item.key === key; });
    if (row) {
      updateObjectRow_(sheet, row.__row, {
        value: defaults[key],
        updated_at: new Date(),
      });
    } else {
      appendRow_(sheet, [key, defaults[key], new Date()]);
    }
  });
}

function ensurePepper_() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("PASSWORD_PEPPER")) {
    properties.setProperty("PASSWORD_PEPPER", Utilities.getUuid() + Utilities.getUuid());
  }
}

function parseBody_(event) {
  if (!event || !event.postData || !event.postData.contents) {
    throw new Error("Request body is required.");
  }
  try {
    return JSON.parse(event.postData.contents);
  } catch (error) {
    throw new Error("Request body must be valid JSON.");
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function withScriptLock_(timeoutMs, callback) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(timeoutMs)) {
    throw new Error("The exam service is temporarily busy. Please try again.");
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function beginRequest_() {
  REQUEST_STATE_ = {
    spreadsheet: null,
    sheets: {},
    rows: {},
    lookups: {},
  };
}

function requestState_() {
  if (!REQUEST_STATE_) beginRequest_();
  return REQUEST_STATE_;
}

function activeSpreadsheet_() {
  const state = requestState_();
  if (!state.spreadsheet) state.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return state.spreadsheet;
}

function getSheet_(name) {
  const state = requestState_();
  if (state.sheets[name]) return state.sheets[name];
  const sheet = activeSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet "' + name + '". Run setupEvaluationPlatform() first.');
  state.sheets[name] = sheet;
  return sheet;
}

function rowsAsObjects_(sheet) {
  const state = requestState_();
  const name = sheet.getName();
  if (Object.prototype.hasOwnProperty.call(state.rows, name)) return state.rows[name];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    state.rows[name] = [];
    return state.rows[name];
  }
  const headers = headersForSheet_(sheet);
  state.rows[name] = sheet
    .getRange(2, 1, lastRow - 1, headers.length)
    .getValues()
    .map(function (values, index) {
      const object = { __row: index + 2 };
      headers.forEach(function (header, column) { object[header] = values[column]; });
      return object;
    });
  return state.rows[name];
}

function headersForSheet_(sheet) {
  return HEADERS[sheet.getName()] ||
    sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function objectFromRow_(sheet, rowNumber) {
  const headers = headersForSheet_(sheet);
  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const object = { __row: rowNumber };
  headers.forEach(function (header, column) { object[header] = values[column]; });
  return object;
}

function findObjectByExactValue_(sheet, key, value, fresh) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const state = requestState_();
  const lookupKey = JSON.stringify([sheet.getName(), key, String(value)]);
  if (!fresh && Object.prototype.hasOwnProperty.call(state.lookups, lookupKey)) {
    return state.lookups[lookupKey];
  }
  const headers = headersForSheet_(sheet);
  const columnIndex = headers.indexOf(key);
  if (columnIndex < 0) throw new Error('Missing column "' + key + '" in sheet "' + sheet.getName() + '".');
  const match = sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findNext();
  state.lookups[lookupKey] = match ? objectFromRow_(sheet, match.getRow()) : null;
  return state.lookups[lookupKey];
}

function findObjectsByExactValue_(sheet, key, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const headers = headersForSheet_(sheet);
  const columnIndex = headers.indexOf(key);
  if (columnIndex < 0) throw new Error('Missing column "' + key + '" in sheet "' + sheet.getName() + '".');
  return sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findAll()
    .map(function (match) { return objectFromRow_(sheet, match.getRow()); });
}

function invalidateSheetCache_(sheet) {
  const state = requestState_();
  const name = sheet.getName();
  delete state.rows[name];
  Object.keys(state.lookups).forEach(function (lookupKey) {
    if (lookupKey.indexOf('["' + name + '",') === 0) delete state.lookups[lookupKey];
  });
}

function appendRow_(sheet, values) {
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
  invalidateSheetCache_(sheet);
}

function appendObject_(sheet, object) {
  const headers = headersForSheet_(sheet);
  appendRow_(sheet, headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  }));
}

function updateObjectRow_(sheet, rowNumber, patch) {
  const headers = headersForSheet_(sheet);
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const values = range.getValues()[0];
  headers.forEach(function (header, index) {
    if (Object.prototype.hasOwnProperty.call(patch, header)) values[index] = patch[header];
  });
  range.setValues([values]);
  invalidateSheetCache_(sheet);
}

function deleteRowsMatching_(sheet, key, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const headers = headersForSheet_(sheet);
  const columnIndex = headers.indexOf(key);
  if (columnIndex < 0) throw new Error('Missing column "' + key + '" in sheet "' + sheet.getName() + '".');
  sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .useRegularExpression(false)
    .findAll()
    .map(function (match) { return match.getRow(); })
    .sort(function (a, b) { return b - a; })
    .forEach(function (rowNumber) { sheet.deleteRow(rowNumber); });
  invalidateSheetCache_(sheet);
}

function clearDataRows_(sheet) {
  const count = sheet.getLastRow() - 1;
  if (count > 0) sheet.deleteRows(2, count);
  invalidateSheetCache_(sheet);
}

function findById_(sheetName, key, value, fresh) {
  return findObjectByExactValue_(getSheet_(sheetName), key, value, fresh);
}

function findUserByEmail_(email) {
  const normalized = normalizeEmail_(email);
  return findObjectByExactValue_(getSheet_(APP.sheets.users), "email", normalized);
}

function findUserByUsername_(username) {
  const normalized = normalizeUsername_(username);
  return findObjectByExactValue_(getSheet_(APP.sheets.users), "username", normalized);
}

function questionsForCourse_(courseId) {
  return rowsAsObjects_(getSheet_(APP.sheets.questions))
    .filter(function (question) { return String(question.course_id) === String(courseId); })
    .sort(function (a, b) { return Number(a.order_no) - Number(b.order_no); });
}

function questionCountsByCourse_() {
  return rowsAsObjects_(getSheet_(APP.sheets.questions)).reduce(function (counts, question) {
    const courseId = String(question.course_id || "");
    counts[courseId] = (counts[courseId] || 0) + 1;
    return counts;
  }, {});
}

function attemptsForUser_(userId) {
  const courseMap = indexBy_(rowsAsObjects_(getSheet_(APP.sheets.courses)), "course_id");
  return findObjectsByExactValue_(getSheet_(APP.sheets.attempts), "user_id", userId)
    .map(function (attempt) {
      return Object.assign({}, attempt, { __course: courseMap[attempt.course_id] || {} });
    });
}

function indexBy_(items, key) {
  return items.reduce(function (result, item) {
    result[item[key]] = item;
    return result;
  }, {});
}

function publicUser_(user) {
  return {
    id: user.user_id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    branch: user.branch,
    role: user.role,
    status: user.status,
    createdAt: toIso_(user.created_at),
    lastLogin: toIso_(user.last_login),
  };
}

function publicCourse_(course, questionCounts) {
  return {
    id: course.course_id,
    title: course.title,
    description: course.description,
    category: course.category,
    passingScore: Number(course.passing_score || 0),
    duration: Number(course.time_limit_min || 0),
    attemptLimit: courseAttemptLimit_(course),
    startAt: toIso_(course.start_at),
    endAt: toIso_(course.end_at),
    status: courseLifecycleStatus_(course),
    questionCount: questionCounts
      ? Number(questionCounts[course.course_id] || 0)
      : questionsForCourse_(course.course_id).length,
  };
}

function courseAttemptLimit_(course) {
  const value = Math.floor(Number(course && course.attempt_limit || 0));
  return isFinite(value) ? clamp_(value, 0, 100) : 0;
}

function coursePublishingStatus_(value) {
  const status = String(value || "").trim().toLowerCase();
  if (status === "archived") return "archived";
  if (status === "completed") return "completed";
  if (["live", "upcoming", "scheduled"].indexOf(status) >= 0) return "live";
  return "draft";
}

function courseLifecycleStatus_(course, now) {
  const storedStatus = String(course.status || "").trim().toLowerCase();
  if (storedStatus === "archived") return "archived";
  if (storedStatus === "draft") return "draft";
  if (storedStatus === "completed") return "completed";

  const nowMs = now instanceof Date ? now.getTime() : Number(now || Date.now());
  const startAt = course.start_at ? new Date(course.start_at).getTime() : NaN;
  const endAt = course.end_at ? new Date(course.end_at).getTime() : NaN;
  if (!isNaN(endAt) && endAt < nowMs) return "completed";
  if (!isNaN(startAt) && startAt > nowMs) return "scheduled";
  if (["live", "upcoming", "scheduled"].indexOf(storedStatus) >= 0) return "live";
  return "draft";
}

function publicAttempt_(attempt) {
  return {
    id: attempt.attempt_id,
    courseId: attempt.course_id,
    title: attempt.__course ? attempt.__course.title : "",
    category: attempt.__course ? attempt.__course.category : "",
    submittedAt: toIso_(attempt.submitted_at),
    score: Number(attempt.score || 0),
    correctCount: Number(attempt.correct_count || 0),
    totalQuestions: Number(attempt.total_questions || 0),
    durationSeconds: Number(attempt.duration_seconds || 0),
    passed: Number(attempt.score || 0) >= Number(
      (attempt.__course && attempt.__course.passing_score) || 0,
    ),
  };
}

function summarizeAttempts_(attempts) {
  if (!attempts.length) return { completed: 0, passed: 0, average: 0, best: 0 };
  const scores = attempts.map(function (attempt) { return Number(attempt.score || 0); });
  return {
    completed: attempts.length,
    passed: attempts.filter(function (attempt) { return attempt.passed; }).length,
    average: Math.round(scores.reduce(function (sum, score) { return sum + score; }, 0) / scores.length),
    best: Math.max.apply(null, scores),
  };
}

function hashPassword_(password, salt) {
  const pepper = PropertiesService.getScriptProperties().getProperty("PASSWORD_PEPPER") || "";
  return digest_(String(salt) + "|" + String(password) + "|" + pepper);
}

function hashToken_(token) {
  return digest_("session|" + String(token));
}

function digest_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.newBlob(String(value)).getBytes(),
  );
  return bytes.map(function (byte) {
    const normalized = byte < 0 ? byte + 256 : byte;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
}

function makeSalt_() {
  return Utilities.getUuid().replace(/-/g, "") + Math.random().toString(36).slice(2);
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUsername_(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername_(value) {
  return /^[a-z0-9._-]{3,40}$/.test(normalizeUsername_(value));
}

function toIso_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? "" : date.toISOString();
}

function clamp_(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
