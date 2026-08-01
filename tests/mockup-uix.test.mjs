import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const client = read("app/exam-client.tsx");
const participantCss = read("app/participant-dashboard-refresh.css");
const loginCss = read("app/login-account-switch.css");
const systemCss = read("app/mockup-uix-system.css");
const adminHeaderCss = read("app/admin-header-consistency.css");
const loginSource = client.slice(client.indexOf("function Login("), client.indexOf("function BootScreen("));

test("participant dashboard uses the approved cinematic card system", () => {
  assert.ok(layout.includes('import "./participant-dashboard-refresh.css";'));
  for (const selector of [
    ".participant-section > .participant-page-header",
    ".participant-home .hero-evaluation",
    ".participant-home .metric-grid",
    ".participant-home .evaluation-row",
    ".participant-home .history-preview-grid",
    ".participant-home .score-ring",
    "@media (max-width: 760px)",
  ]) {
    assert.ok(participantCss.includes(selector), `Missing participant UI rule ${selector}`);
  }
  assert.ok(participantCss.includes("aspect-ratio: 1 !important"));
  assert.ok(participantCss.includes("overflow: hidden !important"));
  assert.match(
    participantCss,
    /\.history-summary \.score-ring > div\s*\{[\s\S]*?align-items:\s*center !important;[\s\S]*?justify-content:\s*center !important;/,
  );
  assert.match(
    participantCss,
    /\.history-summary \.score-ring span\s*\{[\s\S]*?line-height:\s*1 !important;[\s\S]*?transform:\s*translateY\(calc\(var\(--ring-size, 88px\) \* 0\.035\)\) !important;/,
  );
});

test("login uses one account form and resolves the workspace after authentication", () => {
  assert.ok(layout.includes('import "./login-account-switch.css";'));
  assert.ok(!loginSource.includes('aria-label="Account type"'));
  assert.ok(!loginSource.includes('role="tablist"'));
  assert.ok(!loginSource.includes("switchRole"));
  assert.ok(loginSource.includes("onLogin(username, password)"));
  assert.ok(!loginSource.includes("Google"));
  assert.ok(!loginSource.includes("SSO"));
  assert.ok(loginCss.includes("Account roles are resolved after authentication"));
  assert.ok(loginCss.includes("display: none !important"));
  assert.ok(loginCss.includes('[data-provider="google"]'));
  assert.ok(loginCss.includes('[data-provider="sso"]'));
});

test("mockup UI palette applies across navigation dashboards quiz and results", () => {
  assert.ok(layout.includes('import "./mockup-uix-system.css";'));
  for (const selector of [
    ".sidebar-nav button.active",
    ".topbar",
    ".admin-overview .welcome-row",
    ".admin-metrics article",
    ".quiz-progress-panel",
    ".question-card",
    ".answer-list button.selected",
    ".result-card",
    ".score-ring",
    ".builder-header",
  ]) {
    assert.ok(systemCss.includes(selector), `Missing mockup UI rule ${selector}`);
  }
  assert.ok(systemCss.includes("#ff6a22"));
  assert.ok(systemCss.includes("#e6322f"));
  assert.ok(systemCss.includes("#ffad21"));
});

test("all administrator section headers use the Overview card treatment", () => {
  assert.ok(layout.includes('import "./admin-header-consistency.css";'));
  assert.equal(
    client.match(/<section className="(?:welcome-row|page-intro) admin-section-header">/g)?.length,
    4,
  );
  assert.equal(client.match(/<div className="admin-header-actions">/g)?.length, 4);
  for (const rule of [
    ".admin-section-header",
    "border-radius: 22px !important",
    "padding: 28px 30px !important",
    ".admin-header-actions",
    ".admin-header-actions .cgv-add-admin-button",
    "@media (max-width: 760px)",
  ]) {
    assert.ok(adminHeaderCss.includes(rule), `Missing administrator header rule ${rule}`);
  }
});
