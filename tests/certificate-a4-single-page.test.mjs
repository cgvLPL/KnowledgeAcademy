import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/certificate-a4-single-page.css");
const layout = read("app/layout.tsx");

test("the final certificate print guard loads after the canonical UI foundation", () => {
  const foundation = 'import "./ui-foundation.css";';
  const a4Guard = 'import "./certificate-a4-single-page.css";';
  assert.ok(layout.includes(a4Guard));
  assert.ok(layout.indexOf(a4Guard) > layout.indexOf(foundation));
});

test("certificate print output is one exact A4 portrait sheet", () => {
  assert.match(css, /@page\s*\{[^}]*margin:\s*0;[^}]*size:\s*210mm 297mm;/s);
  assert.match(
    css,
    /html\.cgv-certificate-printing \.completion-certificate\s*\{[^}]*height:\s*297mm !important;[^}]*width:\s*210mm !important;/s,
  );
  assert.match(css, /position:\s*fixed !important;/);
  assert.match(css, /overflow:\s*hidden !important;/);
  assert.match(css, /page-break-inside:\s*avoid !important;/);
  assert.match(css, /break-inside:\s*avoid-page !important;/);
});

test("certificate sections use a bounded grid so content cannot push onto a second page", () => {
  assert.match(css, /display:\s*grid !important;/);
  assert.match(css, /grid-template-rows:\s*auto minmax\(0, 1fr\) auto auto !important;/);
  assert.match(css, /padding:\s*16mm 17mm 14mm !important;/);
  assert.match(css, /\.certificate-copy\s*\{[^}]*max-block-size:\s*128mm !important;[^}]*overflow:\s*hidden !important;/s);
  assert.match(css, /\.certificate-details\s*\{[^}]*min-height:\s*17mm !important;/s);
  assert.match(css, /\.certificate-footer\s*\{[^}]*max-block-size:\s*31mm !important;[^}]*overflow:\s*hidden !important;/s);
});

test("long participant and course names remain bounded inside the physical page", () => {
  assert.match(css, /--certificate-name-print-size/);
  assert.match(css, /max-block-size:\s*25mm !important;/);
  assert.match(css, /--certificate-course-print-size/);
  assert.match(css, /max-block-size:\s*19mm !important;/);
});
