const CSV_FORMULA_PREFIX = /^[\u0009\u000d ]*[=+\-@]/;

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (CSV_FORMULA_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Creates an Excel-friendly CSV document while preventing spreadsheet formula
 * execution when an exported value begins with a formula control character.
 */
export function createCsvDocument(headers, rows) {
  const safeHeaders = Array.isArray(headers) ? headers : [];
  const safeRows = Array.isArray(rows) ? rows : [];
  const lines = [safeHeaders, ...safeRows]
    .map((row) => (Array.isArray(row) ? row : [row]).map(csvCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function safeFilename(value, fallback = "cgv-knowledge-academy") {
  const filename = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return filename || fallback;
}

function escapeCalendarText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function calendarTimestamp(value, fieldName) {
  const date = value instanceof Date ? value : new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} is missing or invalid.`);
  }
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  const folded = [];
  let current = "";
  let currentBytes = 0;
  let limit = 75;

  for (const character of String(line)) {
    const characterBytes = encoder.encode(character).length;
    if (current && currentBytes + characterBytes > limit) {
      folded.push(current);
      current = ` ${character}`;
      currentBytes = 1 + characterBytes;
      limit = 75;
    } else {
      current += character;
      currentBytes += characterBytes;
    }
  }
  folded.push(current);
  return folded.join("\r\n");
}

/** Creates an RFC 5545 calendar event for a quiz availability window. */
export function createEvaluationCalendar(evaluation, options = {}) {
  if (!evaluation || typeof evaluation !== "object") {
    throw new Error("Evaluation details are required.");
  }

  const start = new Date(String(evaluation.startAt || ""));
  if (Number.isNaN(start.getTime())) {
    throw new Error("The evaluation opening date is missing or invalid.");
  }

  const suppliedEnd = new Date(String(evaluation.endAt || ""));
  const fallbackDuration = Math.max(1, Number(evaluation.duration || 30));
  const end = !Number.isNaN(suppliedEnd.getTime()) && suppliedEnd > start
    ? suppliedEnd
    : new Date(start.getTime() + fallbackDuration * 60_000);
  const now = options.now || new Date();
  const title = String(evaluation.title || "CGV Knowledge Academy evaluation");
  const descriptionParts = [
    evaluation.category ? `Category: ${evaluation.category}` : "",
    evaluation.description,
    evaluation.due ? `Closing date: ${evaluation.due}` : "",
  ].filter(Boolean);
  const uidSeed = `${evaluation.id || safeFilename(title)}-${start.getTime()}`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CGV Knowledge Academy//Evaluation Portal 1.1.2//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(uidSeed)}@cgv-knowledge-academy`,
    `DTSTAMP:${calendarTimestamp(now, "Calendar creation date")}`,
    `DTSTART:${calendarTimestamp(start, "Evaluation opening date")}`,
    `DTEND:${calendarTimestamp(end, "Evaluation closing date")}`,
    `SUMMARY:${escapeCalendarText(title)}`,
    `DESCRIPTION:${escapeCalendarText(descriptionParts.join("\n"))}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeCalendarText(`${title} opens in 30 minutes`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldCalendarLine).join("\r\n")}\r\n`;
}
