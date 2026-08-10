import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const client = read("app/exam-client.tsx");
const css = read("app/certificate.css");
const layout = read("app/layout.tsx");

test("every completed participant result exposes a certificate", () => {
  assert.match(client, /function CertificateModal\(/);
  assert.match(client, /onCertificate=\{setCertificateItem\}/);
  assert.match(client, /history\.map\(\(item\) =>/);
  assert.match(client, /onClick=\{\(\) => onCertificate\(item\)\}/);
  assert.match(client, /View certificate/);
  assert.match(client, /Certificate of Completion/);
  assert.doesNotMatch(client, /item\.status === "Passed"\s*&&\s*<CertificateModal/);
});

test("certificate uses participant and submitted-attempt data", () => {
  for (const value of [
    "participantName",
    "item.title",
    "item.category",
    "item.score",
    "item.date",
    "item.duration",
    "certificateIdFor(item)",
  ]) {
    assert.ok(client.includes(value), `Missing certificate value ${value}`);
  }

  assert.match(client, /completedAttemptId = String\(submission\.result\.attemptId/);
  assert.match(client, /completedDurationSeconds = Number\(submission\.result\.durationSeconds/);
  assert.match(
    client,
    /setHistory\(\(items\) => \[completion, \.\.\.items\.filter\(\(item\) => item\.id !== completion\.id\)\]\)/,
  );
});

test("certificate follows the CGV brand and prints as an A4 PDF-ready page", () => {
  assert.ok(layout.includes('import "./certificate.css";'));
  assert.ok(
    layout.indexOf('import "./certificate.css";') >
      layout.indexOf('import "./brand-visibility-polish.css";'),
  );
  assert.match(client, /<div className="certificate-logo-panel">\s*<CertificateLogo \/>/);
  assert.match(client, /className="certificate-cgv-mark"/);
  assert.match(client, /className="certificate-logo-text"/);
  assert.match(client, /CGV Knowledge Academy/);
  assert.match(client, /Print \/ save PDF/);
  assert.match(client, /window\.print\(\)/);
  assert.match(client, /createPortal\(/);
  assert.match(client, /document\.body/);
  assert.match(client, /data-print-format="a4"/);
  assert.ok(css.includes("@media print"));
  assert.ok(css.includes("size: A4 portrait"));
  assert.ok(css.includes("height: 297mm !important"));
  assert.ok(css.includes("width: 210mm !important"));
  assert.ok(css.includes("print-color-adjust: exact"));
  assert.ok(css.includes(".certificate-orbit"));
});

test("certificate export and dialog lifecycle remain reliable", () => {
  assert.match(client, /const closeButtonRef = useRef<HTMLButtonElement>\(null\)/);
  assert.match(client, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(client, /previousFocus\?\.isConnected/);
  assert.match(client, /window\.removeEventListener\("afterprint", restoreTitle\)/);
  assert.match(client, /restorePrintTitleRef\.current = null/);
  assert.match(client, /window\.requestAnimationFrame\(\(\) => window\.print\(\)\)/);
  assert.match(client, /classList\.add\("cgv-certificate-printing"\)/);
  assert.match(client, /classList\.remove\("cgv-certificate-printing"\)/);
  assert.match(client, /aria-describedby="certificate-dialog-description"/);
});

test("long certificate content and mobile printing stay inside one A4 page", () => {
  assert.match(client, /certificate-name-very-long/);
  assert.match(client, /certificate-course-title-very-long/);
  assert.match(css, /\.certificate-copy h3\.certificate-name-very-long/);
  assert.match(css, /\.certificate-copy h4\.certificate-course-title-very-long/);
  assert.match(css, /break-inside:\s*avoid !important/);
  assert.match(css, /page-break-inside:\s*avoid !important/);
  assert.match(css, /\.certificate-copy\s*\{[^}]*margin-top:\s*36mm !important;[^}]*max-width:\s*70% !important;/s);
  assert.match(client, /--certificate-name-print-size/);
  assert.match(client, /--certificate-course-print-size/);
  assert.match(css, /font-size:\s*var\(--certificate-name-print-size, 12mm\) !important/);
  assert.match(css, /font-size:\s*var\(--certificate-course-print-size, 7\.5mm\) !important/);
});

test("certificate print root cannot spill onto a second page", () => {
  assert.match(css, /body > :not\(\.certificate-backdrop\)\s*\{\s*display:\s*none !important;/s);
  assert.match(css, /html\.cgv-certificate-printing \.certificate-backdrop\s*\{[^}]*height:\s*297mm !important;[^}]*overflow:\s*hidden !important;[^}]*width:\s*210mm !important;/s);
  assert.match(css, /html\.cgv-certificate-printing \.certificate-dialog,\s*html\.cgv-certificate-printing \.certificate-scroll\s*\{[^}]*height:\s*297mm !important;[^}]*overflow:\s*hidden !important;[^}]*width:\s*210mm !important;/s);
  assert.match(css, /html\.cgv-certificate-printing \.completion-certificate\s*\{[^}]*height:\s*297mm !important;[^}]*overflow:\s*hidden !important;[^}]*width:\s*210mm !important;/s);
  assert.match(css, /contain:\s*layout paint style !important/);
  assert.match(css, /max-block-size:\s*27mm !important/);
  assert.match(css, /max-block-size:\s*22mm !important/);
});
