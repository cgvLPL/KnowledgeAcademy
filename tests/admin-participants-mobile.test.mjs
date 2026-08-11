import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const adminTools = await readFile(new URL("../app/admin-functionality-enhancer.tsx", import.meta.url), "utf8");
const buttonSafetyNet = await readFile(new URL("../app/button-safety-net.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/admin-participants-mobile.css", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("the admin People page exposes responsive layout hooks and labelled values", () => {
  assert.match(client, /className="toolbar participants-toolbar"/);
  assert.match(client, /className="table-card participants-table-card"/);
  assert.match(client, /className="participants-management-table"/);
  assert.match(client, /aria-label="Search participants"/);
  for (const label of ["Position", "Branch", "Attempts", "Average", "Status"]) {
    assert.ok(client.includes(`data-label="${label}"`));
  }
  assert.match(client, /className="participants-action-label">Manage participant/);
  assert.match(client, /data-participant-actions="true"/);
  assert.match(client, /data-participant-id=\{person\.id\}/);
  assert.match(client, /data-participant-position=\{person\.position\}/);
  assert.match(client, /aria-labelledby="add-participant-title"/);
});

test("participant action buttons open the real account controls", () => {
  assert.match(adminTools, /button\.dataset\.participantActions === "true"/);
  assert.match(adminTools, /actionButton\?\.dataset\.participantId/);
  assert.match(adminTools, /const user = await locateUser\(button\);[\s\S]*?setModal\(\{ type: "userActions", user \}\)/);
  assert.match(adminTools, /adminSetUserStatus/);
  assert.match(adminTools, /adminSetUserPosition/);
  assert.match(adminTools, /adminResetPassword/);
  assert.match(buttonSafetyNet, /button\.dataset\.participantActions === "true"\) return/);
  assert.doesNotMatch(adminTools, /button\.querySelector\("\.lucide-more-horizontal"\)/);
});

test("participant status changes synchronize with the People table", () => {
  assert.match(adminTools, /announceParticipantChange\(data\.user\)/);
  assert.match(client, /window\.addEventListener\("cgv:participant-change", onParticipantChange\)/);
  assert.match(client, /setParticipantsData\(\(items\) => items\.map/);
});

test("participant rows become contained touch-friendly cards on phones", () => {
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /\.admin-participants\s*\{[\s\S]*?overflow-x:\s*clip\s*!important/);
  assert.match(css, /\.participants-management-table tbody tr:not\(\.empty-table-row\)\s*\{[\s\S]*?display:\s*grid\s*!important/);
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(css, /content:\s*attr\(data-label\)/);
  assert.match(css, /\.participants-management-table td:last-child \.icon-button\s*\{[\s\S]*?height:\s*44px\s*!important/);
});

test("People summaries, controls, and add-account form scale to the phone viewport", () => {
  assert.match(css, /\.admin-participants \.admin-metrics\.compact\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(css, /\.participants-toolbar \.toolbar-buttons\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(css, /\.admin-participants \.add-participant-modal\s*\{[\s\S]*?max-height:\s*calc\(var\(--cgv-mobile-viewport-height,\s*100svh\)/);
  assert.match(css, /@media \(max-width:\s*360px\)/);
});

test("the People mobile layer is loaded after shared dashboard spacing", () => {
  const spacingIndex = layout.indexOf('import "./dashboard-card-spacing.css";');
  const peopleIndex = layout.indexOf('import "./admin-participants-mobile.css";');
  assert.ok(spacingIndex >= 0);
  assert.ok(peopleIndex > spacingIndex);
});
