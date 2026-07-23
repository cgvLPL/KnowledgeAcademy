/**
 * CGV Exams — Google Sheets backend
 *
 * 1. Create a new Google Spreadsheet.
 * 2. Open Extensions > Apps Script.
 * 3. Replace Code.gs and appsscript.json with the files in this folder.
 * 4. Run setupEvaluationPlatform() once.
 * 5. Deploy as a Web app: execute as yourself, access "Anyone".
 *
 * The web app only accepts application actions defined in API_ACTIONS. Passwords
 * are salted and hashed; sessions are stored as hashes and expire automatically.
 */

const APP = Object.freeze({
  name: "CGV Exams",
  timezone: "Asia/Jakarta",
  sessionHours: 12,
  sheets: {
    settings: "Settings",
    users: "Users",
    courses: "Courses",
    questions: "Questions",
    attempts: "Attempts",
    answers: "Answers",
    sessions: "Sessions",
    dashboard: "Dashboard",
  },
});

const HEADERS = Object.freeze({
  Settings: ["key", "value", "updated_at"],
  Users: [
    "user_id",
    "email",
    "full_name",
    "branch",
    "password_hash",
    "salt",
    "role",
    "status",
    "created_at",
    "last_login",
  ],
  Courses: [
    "course_id",
    "title",
    "description",
    "category",
    "passing_score",
    "time_limit_min",
    "start_at",
    "end_at",
    "status",
    "created_by",
    "created_at",
    "updated_at",
  ],
  Questions: [
    "question_id",
    "course_id",
    "order_no",
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
    "points",
    "explanation",
  ],
  Attempts: [
    "attempt_id",
    "course_id",
    "user_id",
    "started_at",
    "submitted_at",
    "status",
    "score",
    "correct_count",
    "total_questions",
    "duration_seconds",
    "answers_json",
  ],
  Answers: [
    "answer_id",
    "attempt_id",
    "question_id",
    "selected_option",
    "is_correct",
    "points_awarded",
    "answered_at",
  ],
  Sessions: ["token_hash", "user_id", "role", "expires_at", "created_at"],
});

const API_ACTIONS = Object.freeze({
  health: function () {
    return {
      ok: true,
      service: APP.name,
      spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
      now: new Date().toISOString(),
    };
  },
  login: login_,
  logout: logout_,
  getParticipantHome: getParticipantHome_,
  startAttempt: startAttempt_,
  submitAttempt: submitAttempt_,
  adminGetDashboard: adminGetDashboard_,
  adminSaveCourse: adminSaveCourse_,
  adminSaveParticipant: adminSaveParticipant_,
  adminResetPassword: adminResetPassword_,
});

function doGet() {
  return json_({
    ok: true,
    service: APP.name,
    message: "CGV Exams Google Sheets API is online.",
  });
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

function setupEvaluationPlatform() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheet.setSpreadsheetTimeZone(APP.timezone);

    Object.keys(HEADERS).forEach(function (sheetName) {
      ensureDataSheet_(spreadsheet, sheetName, HEADERS[sheetName]);
    });
    ensureSettings_();
    ensurePepper_();
    seedDemoData_();
    buildDashboard_();

    SpreadsheetApp.flush();
    return {
      ok: true,
      spreadsheetId: spreadsheet.getId(),
      sheets: spreadsheet.getSheets().map(function (sheet) {
        return sheet.getName();
      }),
      adminEmail: "admin@cgv.co.id",
      temporaryAdminPassword: "ChangeMe123!",
      participantEmail: "rayhan.ardhana@cgv.co.id",
      temporaryParticipantPassword: "participant123",
    };
  } finally {
    lock.releaseLock();
  }
}

function rebuildDashboard() {
  buildDashboard_();
  return { ok: true };
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

function ensureDataSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeaders = headers.some(function (header, index) {
    return currentHeaders[index] !== header;
  });
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  styleDataSheet_(sheet, headers.length);
  return sheet;
}

function styleDataSheet_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  const header = sheet.getRange(1, 1, 1, columnCount);
  header
    .setBackground("#101110")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(10)
    .setHorizontalAlignment("left");
  sheet.setRowHeight(1, 34);
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), columnCount)
    .setFontSize(10)
    .setVerticalAlignment("middle");

  for (let column = 1; column <= columnCount; column += 1) {
    sheet.setColumnWidth(column, column === 2 || column === 3 || column === 4 ? 190 : 130);
  }
}

function ensureSettings_() {
  const sheet = getSheet_(APP.sheets.settings);
  const existing = rowsAsObjects_(sheet);
  const defaults = {
    app_name: APP.name,
    company_name: "CGV",
    timezone: APP.timezone,
    session_hours: String(APP.sessionHours),
    dashboard_course: "",
  };
  Object.keys(defaults).forEach(function (key) {
    if (!existing.some(function (row) { return row.key === key; })) {
      sheet.appendRow([key, defaults[key], new Date()]);
    }
  });
}

function ensurePepper_() {
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("PASSWORD_PEPPER")) {
    properties.setProperty("PASSWORD_PEPPER", Utilities.getUuid() + Utilities.getUuid());
  }
}

function seedDemoData_() {
  const users = rowsAsObjects_(getSheet_(APP.sheets.users));
  if (!users.length) {
    createUserInternal_({
      email: "admin@cgv.co.id",
      fullName: "Alicia Tan",
      branch: "Head Office",
      password: "ChangeMe123!",
      role: "admin",
      status: "active",
    });
    createUserInternal_({
      email: "rayhan.ardhana@cgv.co.id",
      fullName: "Rayhan Ardhana",
      branch: "Grand Indonesia",
      password: "participant123",
      role: "participant",
      status: "active",
    });
    [
      ["nadia.pratama@cgv.co.id", "Nadia Pratama", "Grand Indonesia"],
      ["dimas.arya@cgv.co.id", "Dimas Arya", "Central Park"],
      ["salsa.nabila@cgv.co.id", "Salsa Nabila", "Pacific Place"],
      ["kevin.wijaya@cgv.co.id", "Kevin Wijaya", "FX Sudirman"],
    ].forEach(function (item) {
      createUserInternal_({
        email: item[0],
        fullName: item[1],
        branch: item[2],
        password: "Welcome123!",
        role: "participant",
        status: "active",
      });
    });
  }

  const coursesSheet = getSheet_(APP.sheets.courses);
  if (coursesSheet.getLastRow() === 1) {
    const admin = findUserByEmail_("admin@cgv.co.id");
    const courseId = Utilities.getUuid();
    const now = new Date();
    coursesSheet.appendRow([
      courseId,
      "Operational Excellence 2026",
      "Core operating procedures, service standards, and daily readiness.",
      "Operations",
      75,
      20,
      new Date("2026-07-20T00:00:00+07:00"),
      new Date("2026-07-30T23:59:59+07:00"),
      "live",
      admin.user_id,
      now,
      now,
    ]);
    seedQuestions_(courseId);
    seedAttempts_(courseId);
  }
}

function seedQuestions_(courseId) {
  const sheet = getSheet_(APP.sheets.questions);
  const items = [
    ["A guest reports that their auditorium seat is damaged. What should you do first?", "Ask the guest to return after the movie", "Apologize, relocate the guest, and report the seat", "Offer a refund without checking alternatives", "Tell the guest to choose any available seat", "B"],
    ["Which action best supports a smooth opening shift before guests arrive?", "Wait for the first guest before checking equipment", "Only inspect the lobby", "Complete the readiness checklist and escalate exceptions", "Skip the checklist if the previous shift was quiet", "C"],
    ["What is the most appropriate response when a queue begins to grow quickly?", "Activate the queue support plan and communicate wait times", "Close one service point", "Ask guests to come back later", "Continue working without informing anyone", "A"],
    ["When handling a cash discrepancy, which sequence is correct?", "Replace the amount personally and say nothing", "Recount, document, and notify the authorized supervisor", "Ask another team member to take responsibility", "Record it at the end of the month", "B"],
    ["Which detail is most important when handing over an unresolved operational issue?", "Only the name of the previous shift", "A verbal note with no owner", "Issue status, action taken, evidence, and next owner", "The time the shift ended", "C"],
    ["What should happen immediately after identifying a safety hazard in a guest area?", "Secure the area and follow the reporting procedure", "Wait until the next scheduled inspection", "Post about it in the team group only", "Move it out of sight", "A"],
    ["Why are standard operating procedures reviewed during evaluations?", "To make every task take longer", "To replace supervisor guidance", "To support safe, consistent, and measurable service", "To reduce communication between shifts", "C"],
    ["A system is temporarily unavailable. What is the best operational response?", "Stop serving all guests without explanation", "Use the approved contingency process and log the incident", "Use a personal account to continue", "Ignore the issue if the queue is short", "B"],
  ];
  sheet.getRange(2, 1, items.length, HEADERS.Questions.length).setValues(
    items.map(function (item, index) {
      return [
        Utilities.getUuid(),
        courseId,
        index + 1,
        item[0],
        item[1],
        item[2],
        item[3],
        item[4],
        item[5],
        1,
        "",
      ];
    }),
  );
}

function seedAttempts_(courseId) {
  const users = rowsAsObjects_(getSheet_(APP.sheets.users))
    .filter(function (user) { return user.role === "participant"; });
  const scores = [100, 96, 96, 92, 88];
  const durations = [521, 558, 604, 702, 739];
  const sheet = getSheet_(APP.sheets.attempts);
  users.slice(0, 5).forEach(function (user, index) {
    const submitted = new Date(Date.now() - index * 3600000);
    const started = new Date(submitted.getTime() - durations[index] * 1000);
    sheet.appendRow([
      Utilities.getUuid(),
      courseId,
      user.user_id,
      started,
      submitted,
      "submitted",
      scores[index],
      Math.round(scores[index] / 100 * 8),
      8,
      durations[index],
      "{}",
    ]);
  });
}

function login_(body) {
  const email = normalizeEmail_(body.email);
  const password = String(body.password || "");
  if (!email || !password) throw new Error("Email and password are required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    pruneSessions_();
    const user = findUserByEmail_(email);
    if (!user || user.status !== "active") throw new Error("Invalid email or password.");
    if (hashPassword_(password, user.salt) !== user.password_hash) {
      throw new Error("Invalid email or password.");
    }
    updateObjectRow_(getSheet_(APP.sheets.users), user.__row, { last_login: new Date() });
    const token = Utilities.getUuid() + Utilities.getUuid();
    const expiresAt = new Date(Date.now() + APP.sessionHours * 3600000);
    getSheet_(APP.sheets.sessions).appendRow([
      hashToken_(token),
      user.user_id,
      user.role,
      expiresAt,
      new Date(),
    ]);
    return {
      ok: true,
      token: token,
      expiresAt: expiresAt.toISOString(),
      user: publicUser_(user),
    };
  } finally {
    lock.releaseLock();
  }
}

function logout_(body) {
  if (!body.token) return { ok: true };
  const tokenHash = hashToken_(String(body.token));
  const sheet = getSheet_(APP.sheets.sessions);
  const rows = rowsAsObjects_(sheet);
  rows
    .filter(function (session) { return session.token_hash === tokenHash; })
    .sort(function (a, b) { return b.__row - a.__row; })
    .forEach(function (session) { sheet.deleteRow(session.__row); });
  return { ok: true };
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
  const courseId = String(body.courseId || "");
  const course = findById_(APP.sheets.courses, "course_id", courseId);
  if (!course || course.status !== "live") throw new Error("This evaluation is not available.");
  const now = new Date();
  if (course.start_at && new Date(course.start_at) > now) throw new Error("This evaluation has not opened yet.");
  if (course.end_at && new Date(course.end_at) < now) throw new Error("This evaluation has closed.");

  const attemptId = Utilities.getUuid();
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
  const questions = questionsForCourse_(courseId).map(function (question) {
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
  });
  return {
    ok: true,
    attemptId: attemptId,
    startedAt: now.toISOString(),
    course: publicCourse_(course),
    questions: questions,
  };
}

function submitAttempt_(body) {
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
}

function adminGetDashboard_(body) {
  requireSession_(body.token, "admin");
  const courses = rowsAsObjects_(getSheet_(APP.sheets.courses));
  const users = rowsAsObjects_(getSheet_(APP.sheets.users))
    .filter(function (user) { return user.role === "participant"; });
  const selectedCourseId = String(body.courseId || (courses[0] && courses[0].course_id) || "");
  const attempts = rowsAsObjects_(getSheet_(APP.sheets.attempts))
    .filter(function (attempt) {
      return attempt.course_id === selectedCourseId && attempt.status === "submitted";
    });
  const userMap = indexBy_(users, "user_id");
  const scoreboard = attempts
    .map(function (attempt) {
      const user = userMap[attempt.user_id] || {};
      return {
        attemptId: attempt.attempt_id,
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
    })
    .sort(function (a, b) {
      return b.score - a.score || a.durationSeconds - b.durationSeconds;
    })
    .map(function (item, index) {
      item.rank = index + 1;
      return item;
    });
  return {
    ok: true,
    courses: courses.map(publicCourse_),
    participants: users.map(publicUser_),
    scoreboard: scoreboard,
    summary: {
      participants: users.length,
      submitted: scoreboard.length,
      average: scoreboard.length
        ? Math.round(scoreboard.reduce(function (sum, item) { return sum + item.score; }, 0) / scoreboard.length)
        : 0,
      topScore: scoreboard.length ? scoreboard[0].score : 0,
    },
  };
}

function adminSaveCourse_(body) {
  const context = requireSession_(body.token, "admin");
  const course = body.course || {};
  const title = String(course.title || "").trim();
  const questions = Array.isArray(course.questions) ? course.questions : [];
  if (!title) throw new Error("Course title is required.");
  if (!questions.length) throw new Error("Add at least one question.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const coursesSheet = getSheet_(APP.sheets.courses);
    const courseId = String(course.id || Utilities.getUuid());
    const existing = findById_(APP.sheets.courses, "course_id", courseId);
    const now = new Date();
    const record = {
      course_id: courseId,
      title: title,
      description: String(course.description || ""),
      category: String(course.category || "General"),
      passing_score: clamp_(Number(course.passingScore || 75), 1, 100),
      time_limit_min: Math.max(1, Number(course.duration || 20)),
      start_at: course.startAt ? new Date(course.startAt) : "",
      end_at: course.endAt ? new Date(course.endAt) : "",
      status: ["draft", "upcoming", "live", "completed"].indexOf(String(course.status)) >= 0
        ? String(course.status)
        : "draft",
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

    const questionRows = questions.map(function (question, index) {
      const options = Array.isArray(question.options) ? question.options : [];
      const correct = String(question.correct || "A").toUpperCase();
      if (!String(question.prompt || "").trim()) throw new Error("Every question needs a prompt.");
      if (options.length !== 4 || options.some(function (option) { return !String(option).trim(); })) {
        throw new Error("Every question needs four answer choices.");
      }
      if (["A", "B", "C", "D"].indexOf(correct) === -1) throw new Error("Invalid correct answer.");
      return [
        Utilities.getUuid(),
        courseId,
        index + 1,
        String(question.prompt).trim(),
        String(options[0]).trim(),
        String(options[1]).trim(),
        String(options[2]).trim(),
        String(options[3]).trim(),
        correct,
        Math.max(1, Number(question.points || 1)),
        String(question.explanation || ""),
      ];
    });
    const questionsSheet = getSheet_(APP.sheets.questions);
    questionsSheet.getRange(questionsSheet.getLastRow() + 1, 1, questionRows.length, HEADERS.Questions.length)
      .setValues(questionRows);
    buildDashboard_();
    return { ok: true, course: publicCourse_(findById_(APP.sheets.courses, "course_id", courseId)) };
  } finally {
    lock.releaseLock();
  }
}

function adminSaveParticipant_(body) {
  requireSession_(body.token, "admin");
  const participant = body.participant || {};
  const email = normalizeEmail_(participant.email);
  if (!email) throw new Error("Participant email is required.");
  if (!String(participant.fullName || "").trim()) throw new Error("Participant name is required.");
  const existing = findUserByEmail_(email);
  if (existing) {
    updateObjectRow_(getSheet_(APP.sheets.users), existing.__row, {
      full_name: String(participant.fullName).trim(),
      branch: String(participant.branch || ""),
      status: String(participant.status || "active"),
    });
    return { ok: true, user: publicUser_(findUserByEmail_(email)) };
  }
  const temporaryPassword = String(participant.password || "Welcome123!");
  const user = createUserInternal_({
    email: email,
    fullName: String(participant.fullName).trim(),
    branch: String(participant.branch || ""),
    password: temporaryPassword,
    role: "participant",
    status: String(participant.status || "active"),
  });
  return { ok: true, user: publicUser_(user), temporaryPassword: temporaryPassword };
}

function adminResetPassword_(body) {
  requireSession_(body.token, "admin");
  const userId = String(body.userId || "");
  const password = String(body.newPassword || "");
  if (password.length < 8) throw new Error("New password must be at least eight characters.");
  const user = findById_(APP.sheets.users, "user_id", userId);
  if (!user) throw new Error("Participant not found.");
  const salt = makeSalt_();
  updateObjectRow_(getSheet_(APP.sheets.users), user.__row, {
    salt: salt,
    password_hash: hashPassword_(password, salt),
  });
  deleteRowsMatching_(getSheet_(APP.sheets.sessions), "user_id", userId);
  return { ok: true };
}

function createUserInternal_(input) {
  const email = normalizeEmail_(input.email);
  if (!email) throw new Error("A valid email is required.");
  if (findUserByEmail_(email)) throw new Error("An account already exists for this email.");
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
  };
  appendObject_(getSheet_(APP.sheets.users), record);
  return findUserByEmail_(email);
}

function requireSession_(token, requiredRole) {
  if (!token) throw new Error("Authentication required.");
  const tokenHash = hashToken_(String(token));
  const session = rowsAsObjects_(getSheet_(APP.sheets.sessions))
    .find(function (item) {
      return item.token_hash === tokenHash && new Date(item.expires_at) > new Date();
    });
  if (!session) throw new Error("Your session has expired. Please sign in again.");
  if (requiredRole && session.role !== requiredRole) throw new Error("You do not have access to this action.");
  const user = findById_(APP.sheets.users, "user_id", session.user_id);
  if (!user || user.status !== "active") throw new Error("This account is not active.");
  return { session: session, user: user };
}

function pruneSessions_() {
  const sheet = getSheet_(APP.sheets.sessions);
  const now = new Date();
  rowsAsObjects_(sheet)
    .filter(function (session) { return new Date(session.expires_at) <= now; })
    .sort(function (a, b) { return b.__row - a.__row; })
    .forEach(function (session) { sheet.deleteRow(session.__row); });
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
  sheet.getRange("A2").setValue("Live participant results powered by the evaluation records in this workbook.")
    .setFontColor("#747974").setFontSize(10);

  sheet.getRange("A3").setValue("Selected evaluation").setFontWeight("bold").setFontSize(10);
  const titlesRange = getSheet_(APP.sheets.courses).getRange("B2:B");
  const validation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(titlesRange, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B3").setDataValidation(validation).setBackground("#eefbdc").setFontWeight("bold");
  const firstTitle = getSheet_(APP.sheets.courses).getLastRow() > 1
    ? getSheet_(APP.sheets.courses).getRange("B2").getValue()
    : "";
  sheet.getRange("B3").setValue(firstTitle);
  sheet.getRange("A5:H5").setValues([[
    "Participants", "", "Average score", "", "Pass rate", "", "Top score", "",
  ]]).setFontColor("#747974").setFontSize(9).setFontWeight("bold");
  sheet.getRange("A6").setFormula('=IFERROR(COUNTA(UNIQUE(FILTER(Attempts!C2:C,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"))),0)');
  sheet.getRange("C6").setFormula('=IFERROR(AVERAGE(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted")),0)');
  sheet.getRange("E6").setFormula('=IFERROR(COUNTIF(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted"),">="&XLOOKUP($B$3,Courses!B:B,Courses!E:E))/A6,0)');
  sheet.getRange("G6").setFormula('=IFERROR(MAX(FILTER(Attempts!G2:G,Attempts!B2:B=XLOOKUP($B$3,Courses!B:B,Courses!A:A),Attempts!F2:F="submitted")),0)');
  sheet.getRange("A6:H6").setFontSize(24).setFontWeight("bold");
  sheet.getRange("C6").setNumberFormat("0.0");
  sheet.getRange("E6").setNumberFormat("0.0%");
  sheet.getRange("G6").setNumberFormat("0");

  sheet.getRange("A8:G8").setValues([[
    "Rank", "Participant", "Branch", "Score", "Correct", "Time", "Completed",
  ]]).setBackground("#101110").setFontColor("#ffffff").setFontWeight("bold").setFontSize(9);
  sheet.getRange("A9").setFormula(
    '=IFERROR(LET(courseId,XLOOKUP($B$3,Courses!B:B,Courses!A:A),rows,FILTER(Attempts!A2:J,Attempts!B2:B=courseId,Attempts!F2:F="submitted"),sorted,SORT(HSTACK(XLOOKUP(INDEX(rows,,3),Users!A:A,Users!C:C),XLOOKUP(INDEX(rows,,3),Users!A:A,Users!D:D),INDEX(rows,,7),INDEX(rows,,8)&"/"&INDEX(rows,,9),INDEX(rows,,10),INDEX(rows,,5)),3,FALSE,5,TRUE),HSTACK(SEQUENCE(ROWS(sorted)),sorted)),"No submitted attempts yet")',
  );
  sheet.getRange("D9:D").setNumberFormat("0");
  sheet.getRange("F9:F").setNumberFormat('[mm]:ss');
  sheet.getRange("G9:G").setNumberFormat("dd-mmm-yy hh:mm");

  sheet.getRange("J2:K2").setValues([["Score band", "Participants"]])
    .setBackground("#101110").setFontColor("#ffffff").setFontWeight("bold");
  sheet.getRange("J3:J7").setValues([["0–59"], ["60–69"], ["70–79"], ["80–89"], ["90–100"]]);
  [
    '=COUNTIFS(Attempts!G:G,"<60",Attempts!B:B,XLOOKUP($B$3,Courses!B:B,Courses!A:A))',
    '=COUNTIFS(Attempts!G:G,">=60",Attempts!G:G,"<70",Attempts!B:B,XLOOKUP($B$3,Courses!B:B,Courses!A:A))',
    '=COUNTIFS(Attempts!G:G,">=70",Attempts!G:G,"<80",Attempts!B:B,XLOOKUP($B$3,Courses!B:B,Courses!A:A))',
    '=COUNTIFS(Attempts!G:G,">=80",Attempts!G:G,"<90",Attempts!B:B,XLOOKUP($B$3,Courses!B:B,Courses!A:A))',
    '=COUNTIFS(Attempts!G:G,">=90",Attempts!G:G,"<=100",Attempts!B:B,XLOOKUP($B$3,Courses!B:B,Courses!A:A))',
  ].forEach(function (formula, index) {
    sheet.getRange(3 + index, 11).setFormula(formula);
  });
  const chart = sheet.newChart()
    .asColumnChart()
    .addRange(sheet.getRange("J2:K7"))
    .setPosition(9, 9, 0, 0)
    .setOption("title", "Score distribution")
    .setOption("legend", { position: "none" })
    .setOption("colors", ["#63b76f"])
    .setOption("backgroundColor", "#ffffff")
    .setOption("chartArea", { left: 48, top: 42, width: "78%", height: "66%" })
    .build();
  sheet.insertChart(chart);

  [72, 190, 130, 88, 90, 88, 145, 24, 30, 105, 90, 90, 90, 90].forEach(function (width, index) {
    sheet.setColumnWidth(index + 1, width);
  });
  sheet.setRowHeight(1, 42);
  sheet.setRowHeights(5, 2, 34);
  sheet.getRange("A1:N40").setVerticalAlignment("middle");
  sheet.getRange("A9:G200").applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
  sheet.getRange("A1:N40").setFontFamily("Arial");
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Missing sheet "' + name + '". Run setupEvaluationPlatform() first.');
  return sheet;
}

function rowsAsObjects_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .map(function (values, index) {
      const object = { __row: index + 2 };
      headers.forEach(function (header, column) {
        object[header] = values[column];
      });
      return object;
    });
}

function appendObject_(sheet, object) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : "";
  }));
}

function updateObjectRow_(sheet, rowNumber, patch) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const values = range.getValues()[0];
  headers.forEach(function (header, index) {
    if (Object.prototype.hasOwnProperty.call(patch, header)) values[index] = patch[header];
  });
  range.setValues([values]);
}

function deleteRowsMatching_(sheet, key, value) {
  rowsAsObjects_(sheet)
    .filter(function (row) { return row[key] === value; })
    .sort(function (a, b) { return b.__row - a.__row; })
    .forEach(function (row) { sheet.deleteRow(row.__row); });
}

function findById_(sheetName, key, value) {
  return rowsAsObjects_(getSheet_(sheetName))
    .find(function (row) { return String(row[key]) === String(value); }) || null;
}

function findUserByEmail_(email) {
  const normalized = normalizeEmail_(email);
  return rowsAsObjects_(getSheet_(APP.sheets.users))
    .find(function (user) { return normalizeEmail_(user.email) === normalized; }) || null;
}

function questionsForCourse_(courseId) {
  return rowsAsObjects_(getSheet_(APP.sheets.questions))
    .filter(function (question) { return question.course_id === courseId; })
    .sort(function (a, b) { return Number(a.order_no) - Number(b.order_no); });
}

function attemptsForUser_(userId) {
  const courseMap = indexBy_(rowsAsObjects_(getSheet_(APP.sheets.courses)), "course_id");
  return rowsAsObjects_(getSheet_(APP.sheets.attempts))
    .filter(function (attempt) { return attempt.user_id === userId; })
    .map(function (attempt) {
      attempt.__course = courseMap[attempt.course_id] || {};
      return attempt;
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
    email: user.email,
    fullName: user.full_name,
    branch: user.branch,
    role: user.role,
    status: user.status,
    createdAt: toIso_(user.created_at),
    lastLogin: toIso_(user.last_login),
  };
}

function publicCourse_(course) {
  return {
    id: course.course_id,
    title: course.title,
    description: course.description,
    category: course.category,
    passingScore: Number(course.passing_score || 0),
    duration: Number(course.time_limit_min || 0),
    startAt: toIso_(course.start_at),
    endAt: toIso_(course.end_at),
    status: course.status,
    questionCount: questionsForCourse_(course.course_id).length,
  };
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
    passed: Number(attempt.score || 0) >= Number((attempt.__course && attempt.__course.passing_score) || 0),
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

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function toIso_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? "" : date.toISOString();
}

function clamp_(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
