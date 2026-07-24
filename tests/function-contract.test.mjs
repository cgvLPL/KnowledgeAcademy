import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const backend = read("google-apps-script/Code.gs");
const layout = read("app/layout.tsx");
const resultSync = read("app/result-sync-enhancer.tsx");
const runtime = read("app/runtime-functionality-enhancer.tsx");
const adminTools = read("app/admin-functionality-enhancer.tsx");
const builder = read("app/course-builder-enhancer.tsx");
const safetyNet = read("app/button-safety-net.tsx");
const settings = read("app/settings-enhancer.tsx");
const settingsCss = read("app/settings-enhancer.css");
const topbarCss = read("app/topbar-polish.css");
const visibility = read("app/visibility-audit.css");

const requiredActions = [
  "health",
  "login",
  "logout",
  "getParticipantHome",
  "startAttempt",
  "submitAttempt",
  "adminGetDashboard",
  "adminGetCourse",
  "adminSaveCourse",
  "adminDuplicateCourse",
  "adminDeleteCourse",
  "adminSetCourseStatus",
  "adminSaveParticipant",
  "adminSaveUser",
  "adminSetUserStatus",
  "adminResetPassword",
];

function cssVariable(name) {
  const match = visibility.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `Missing CSS colour variable ${name}`);
  return match[1];
}

function relativeLuminance(hex) {
  const values = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const linear = values.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("Apps Script registers every participant and administrator action", () => {
  for (const action of requiredActions) {
    assert.match(backend, new RegExp(`\\b${action}:\\s*[A-Za-z0-9_]+_`), `Missing API action ${action}`);
  }
});

test("quiz submissions are durable and safe for concurrent retries", () => {
  assert.match(backend, /function submitAttempt_\(body\)/);
  assert.match(backend, /withScriptLock_\(20000/);
  assert.match(backend, /SpreadsheetApp\.flush\(\)/);
  assert.match(backend, /alreadySubmitted:\s*true/);
  assert.match(backend, /existing.*status === "started"/s);
  assert.match(resultSync, /for \(let attempt = 0; attempt < 3;/);
});

test("quiz timing, exit protection, and duplicate-submit protection are active", () => {
  assert.match(runtime, /remainingSeconds/);
  assert.match(runtime, /clickFinishAndSubmit/);
  assert.match(runtime, /Exit this evaluation\?/);
  assert.match(runtime, /cgvSubmitting/);
  assert.match(layout, /RuntimeFunctionalityEnhancer/);
});

test("course scheduling and publishing values are sent to the backend", () => {
  assert.match(builder, /readPublishingSettings/);
  assert.match(builder, /startAt: publishing\.startAt/);
  assert.match(builder, /endAt: publishing\.endAt/);
  assert.match(builder, /status: publishing\.status/);
  assert.match(runtime, /publish immediately/);
  assert.match(runtime, /attempt policy/);
  assert.match(runtime, /email notification/);
  assert.match(runtime, /assign to/);
});

test("administrator, course, and account management controls are loaded", () => {
  assert.match(layout, /AdminFunctionalityEnhancer/);
  assert.match(adminTools, /Add administrator/);
  for (const action of [
    "adminSaveUser",
    "adminGetCourse",
    "adminDuplicateCourse",
    "adminDeleteCourse",
    "adminSetCourseStatus",
    "adminSetUserStatus",
    "adminResetPassword",
  ]) {
    assert.match(adminTools, new RegExp(action));
  }
  assert.doesNotMatch(adminTools, /window\.location\.reload/);
});

test("remaining global controls have explicit behavior", () => {
  for (const label of [
    "notifications",
    "forgot password?",
    "help centre",
    "export scoreboard",
    "duplicate question",
  ]) {
    assert.match(safetyNet.toLowerCase(), new RegExp(label.replace(/[?]/g, "\\?")));
  }
  assert.match(adminTools, /\.user-chip/);
});

test("settings panel persists and applies real interface preferences", () => {
  assert.match(layout, /SettingsEnhancer/);
  assert.match(layout, /import "\.\/settings-enhancer\.css";/);
  assert.match(settings, /cgv-exams-interface-settings-v1/);
  assert.match(settings, /cgv-exams-auto-refresh/);
  assert.match(settings, /cgv-density-compact/);
  assert.match(settings, /cgv-reduced-motion/);
  assert.match(settings, /cgv-enhanced-contrast/);
  assert.match(settings, /Automatic live refresh/);
  assert.match(settings, /cgv:settings-refresh-now/);
  assert.match(resultSync, /autoRefreshEnabled/);
  assert.match(resultSync, /cgv:settings-refresh-now/);
  for (const selector of [
    "body.cgv-density-compact",
    "body.cgv-reduced-motion",
    "body.cgv-enhanced-contrast",
    ".cgv-settings-row input[type=\"checkbox\"]:checked",
  ]) {
    assert.ok(settingsCss.includes(selector), `Missing settings style ${selector}`);
  }
});

test("topbar controls retain stable desktop and mobile proportions", () => {
  assert.match(layout, /import "\.\/topbar-polish\.css";/);
  for (const selector of [
    ".topbar-actions",
    ".top-search kbd",
    ".topbar .notification",
    ".user-chip .avatar-sm",
    ".user-chip > svg",
    "@media (max-width: 760px)",
  ]) {
    assert.ok(topbarCss.includes(selector), `Missing topbar safeguard for ${selector}`);
  }
  assert.match(topbarCss, /writing-mode:\s*horizontal-tb/);
  assert.match(topbarCss, /white-space:\s*nowrap/);
});

test("visibility safeguards cover every high-risk interface state", () => {
  assert.match(layout, /import "\.\/visibility-audit\.css";/);
  for (const selector of [
    ".confirm-modal",
    ".cgv-function-modal",
    ".cgv-preview-questions li.correct",
    "input::placeholder",
    "button:disabled",
    ".status-draft",
    ".status-upcoming",
    ".status-live",
    ".status-completed",
    ".scoreboard-kpis strong",
    "@media (forced-colors: active)",
  ]) {
    assert.ok(visibility.includes(selector), `Missing visibility safeguard for ${selector}`);
  }
  assert.match(visibility, /\.confirm-modal,[\s\S]*?background:[\s\S]*?linear-gradient/);
  assert.match(visibility, /\.scoreboard-hero select,[\s\S]*?color-scheme:\s*light/);
});

test("audited colour pairs meet WCAG AA normal-text contrast", () => {
  const surface = cssVariable("--cgv-a11y-surface");
  const primary = cssVariable("--cgv-a11y-text");
  const secondary = cssVariable("--cgv-a11y-secondary");
  const muted = cssVariable("--cgv-a11y-muted");
  const lime = cssVariable("--cgv-a11y-lime");

  assert.ok(contrastRatio(primary, surface) >= 4.5, "Primary modal text contrast is below 4.5:1");
  assert.ok(contrastRatio(secondary, surface) >= 4.5, "Secondary modal text contrast is below 4.5:1");
  assert.ok(contrastRatio(muted, surface) >= 4.5, "Muted and placeholder text contrast is below 4.5:1");
  assert.ok(contrastRatio("#10140e", lime) >= 4.5, "Lime button text contrast is below 4.5:1");
});

test("backend health exposes the audited version", () => {
  assert.match(backend, /version:\s*"2026\.07\.24-functional-audit"/);
  assert.match(runtime, /2026\.07\.24-functional-audit/);
});
