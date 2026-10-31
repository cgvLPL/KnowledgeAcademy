import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  userId: text("user_id").primaryKey(),
  email: text("email"),
  fullName: text("full_name").notNull(),
  branch: text("branch"),
  passwordHash: text("password_hash"),
  salt: text("salt"),
  role: text("role").notNull().default("participant"),
  status: text("status").notNull().default("active"),
  createdAt: createdAt(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  username: text("username"),
  position: text("position"),
  excludedFromReporting: boolean("excluded_from_reporting").notNull().default(false),
}, (table) => [
  uniqueIndex("users_username_lower_uq").on(table.username),
  uniqueIndex("users_email_lower_uq").on(table.email),
  index("users_status_role_idx").on(table.status, table.role),
]);

export const courses = pgTable("courses", {
  courseId: text("course_id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  passingScore: numeric("passing_score", { precision: 7, scale: 2 }),
  timeLimitMin: integer("time_limit_min"),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => users.userId, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  attemptLimit: integer("attempt_limit"),
  randomizeAnswers: boolean("randomize_answers").notNull().default(false),
}, (table) => [index("courses_status_dates_idx").on(table.status, table.startAt, table.endAt)]);

export const lessons = pgTable("lessons", {
  lessonId: text("lesson_id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content"),
  category: text("category"),
  durationMin: integer("duration_min"),
  resourceTitle: text("resource_title"),
  resourceUrl: text("resource_url"),
  status: text("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => users.userId, { onDelete: "set null" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("lessons_status_category_idx").on(table.status, table.category)]);

export const questions = pgTable("questions", {
  questionId: text("question_id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.courseId, { onDelete: "cascade" }),
  orderNo: integer("order_no").notNull().default(0),
  questionText: text("question_text").notNull(),
  optionA: text("option_a"),
  optionB: text("option_b"),
  optionC: text("option_c"),
  optionD: text("option_d"),
  correctOption: text("correct_option"),
  points: numeric("points", { precision: 8, scale: 2 }).notNull().default("1"),
  explanation: text("explanation"),
}, (table) => [index("questions_course_order_idx").on(table.courseId, table.orderNo)]);

export const attempts = pgTable("attempts", {
  attemptId: text("attempt_id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.courseId, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  status: text("status").notNull().default("in_progress"),
  score: numeric("score", { precision: 8, scale: 2 }),
  correctCount: integer("correct_count"),
  totalQuestions: integer("total_questions"),
  durationSeconds: integer("duration_seconds"),
  answersJson: jsonb("answers_json").notNull().default({}),
}, (table) => [
  index("attempts_course_user_idx").on(table.courseId, table.userId),
  index("attempts_user_submitted_idx").on(table.userId, table.submittedAt),
  index("attempts_status_started_idx").on(table.status, table.startedAt),
]);

export const answers = pgTable("answers", {
  answerId: text("answer_id").primaryKey(),
  attemptId: text("attempt_id").notNull().references(() => attempts.attemptId, { onDelete: "cascade" }),
  questionId: text("question_id").notNull().references(() => questions.questionId, { onDelete: "cascade" }),
  selectedOption: text("selected_option"),
  isCorrect: boolean("is_correct"),
  pointsAwarded: numeric("points_awarded", { precision: 8, scale: 2 }).notNull().default("0"),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("answers_attempt_question_uq").on(table.attemptId, table.questionId),
  index("answers_attempt_idx").on(table.attemptId),
]);

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  role: text("role").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
}, (table) => [
  index("sessions_user_idx").on(table.userId),
  index("sessions_expiry_idx").on(table.expiresAt),
]);

export const liveActivity = pgTable("live_activity", {
  attemptId: text("attempt_id").primaryKey().references(() => attempts.attemptId, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => courses.courseId, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.userId, { onDelete: "cascade" }),
  currentQuestion: integer("current_question").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
  answeredCount: integer("answered_count").notNull().default(0),
  clientStatus: text("client_status").notNull().default("active"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
}, (table) => [
  index("live_activity_course_updated_idx").on(table.courseId, table.updatedAt),
  index("live_activity_user_idx").on(table.userId),
]);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => users.userId, { onDelete: "cascade" }),
  language: text("language").notNull().default("en"),
  updatedAt: updatedAt(),
});
