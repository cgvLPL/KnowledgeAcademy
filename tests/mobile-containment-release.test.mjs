import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const css = read("app/mobile-containment-release.css");
const client = read("app/exam-client.tsx");

test("mobile containment is the final visual layer", () => {
  const glassImport = 'import "./glassmorphism-release.css";';
  const containmentImport = 'import "./mobile-containment-release.css";';

  assert.ok(layout.includes(containmentImport));
  assert.ok(layout.indexOf(containmentImport) > layout.indexOf(glassImport));
});

test("participant panels cannot widen the phone viewport", () => {
  assert.ok(css.includes("@media (max-width: 760px)"));
  assert.ok(css.includes("grid-template-columns: minmax(0, 1fr) !important"));
  assert.ok(css.includes("max-inline-size: 100% !important"));
  assert.ok(css.includes("min-inline-size: 0 !important"));
  assert.ok(css.includes("overflow-wrap: anywhere"));
  assert.ok(css.includes("white-space: normal !important"));
});

test("floating navigation has safe-area clearance without disabling table scrolling", () => {
  assert.ok(css.includes("padding-bottom: calc(128px + env(safe-area-inset-bottom)) !important"));
  assert.ok(css.includes("scroll-padding-bottom: calc(112px + env(safe-area-inset-bottom)) !important"));
  assert.ok(css.includes(".participant-history .responsive-table"));
  assert.ok(css.includes("overflow-x: auto !important"));
  assert.ok(css.includes("-webkit-overflow-scrolling: touch"));
});

test("history results become labelled touch-friendly cards on phones", () => {
  assert.ok(client.includes('className="history-results-table"'));
  for (const label of ["Evaluation", "Completed", "Duration", "Score", "Outcome", "Certificate"]) {
    assert.ok(client.includes(`data-label="${label}"`), `Missing mobile history label: ${label}`);
  }
  assert.ok(client.includes('aria-label="Search evaluation results"'));
  assert.ok(client.includes('aria-label="Filter evaluation results"'));
  assert.ok(css.includes(".history-results-table tbody tr:not(.empty-table-row)"));
  assert.ok(css.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  assert.ok(css.includes("content: attr(data-label)"));
  assert.ok(css.includes("min-block-size: 44px"));
});
