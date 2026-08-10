import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/dashboard-card-spacing.css", import.meta.url),
  "utf8",
);
const client = await readFile(new URL("../app/exam-client.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("participant and admin pages share one section spacing system", () => {
  assert.match(css, /\.participant-section,\s*\n\.admin-section\s*\{[\s\S]*?display:\s*grid\s*!important/);
  assert.match(css, /gap:\s*var\(--dashboard-section-gap\)\s*!important/);
  assert.match(css, /\.participant-section > \*,\s*\n\.admin-section > \*\s*\{[\s\S]*?margin-block:\s*0\s*!important/);
});

test("card collections use a consistent inner gutter", () => {
  assert.match(css, /\.participant-home \.metric-grid/);
  assert.match(css, /\.participant-home \.history-preview-grid/);
  assert.match(css, /\.admin-section \.admin-metrics/);
  assert.match(css, /\.admin-overview \.admin-dashboard-grid/);
  assert.match(css, /\.admin-overview \.admin-insight-grid/);
  assert.match(css, /gap:\s*var\(--dashboard-card-gap\)\s*!important/);
});

test("every participant and admin dashboard opts into the shared layout", () => {
  for (const className of [
    "content participant-section participant-home",
    "content participant-section participant-evaluations",
    "content participant-section participant-history",
    "content participant-section participant-profile",
    "content admin-section admin-overview",
    "content admin-section admin-courses",
    "content admin-section admin-participants",
    "content admin-section admin-scoreboard",
  ]) {
    assert.ok(client.includes(`className="${className}"`), `${className} should use shared spacing`);
  }
});

test("the spacing layer follows dashboard layout overrides and includes mobile gutters", () => {
  const spacingImport = layout.indexOf('import "./dashboard-card-spacing.css";');
  const adminMobileImport = layout.indexOf('import "./admin-top-performers-mobile.css";');
  assert.ok(spacingImport > adminMobileImport);
  assert.match(css, /@media \(max-width:\s*760px\)/);
  assert.match(css, /--dashboard-section-gap:\s*16px/);
  assert.match(css, /--dashboard-card-gap:\s*14px/);
});
