export type QuizLifecycleStatus = "Live" | "Scheduled" | "Completed" | "Draft" | "Archived";

type QuizLifecycleInput = {
  status?: unknown;
  startAt?: unknown;
  endAt?: unknown;
};

function normalizedStatus(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function timestamp(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Returns the effective state shown throughout the app. Draft and Completed
 * are explicit terminal states; published courses move automatically from
 * Scheduled to Live to Completed as their availability window changes.
 */
export function deriveQuizLifecycle(
  course: QuizLifecycleInput,
  now = Date.now(),
): QuizLifecycleStatus {
  const storedStatus = normalizedStatus(course.status);
  if (storedStatus === "archived") return "Archived";
  if (storedStatus === "draft") return "Draft";
  if (storedStatus === "completed") return "Completed";

  const startAt = timestamp(course.startAt);
  const endAt = timestamp(course.endAt);
  if (endAt !== null && endAt < now) return "Completed";
  if (startAt !== null && startAt > now) return "Scheduled";

  if (["live", "upcoming", "scheduled"].includes(storedStatus)) return "Live";
  return "Draft";
}

/** Scheduled is a date-derived published state, not a separate authoring mode. */
export function courseAuthoringStatus(value: unknown): "draft" | "live" | "completed" {
  const status = normalizedStatus(value);
  if (status === "completed") return "completed";
  if (["live", "upcoming", "scheduled"].includes(status)) return "live";
  return "draft";
}
