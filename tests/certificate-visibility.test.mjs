import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const layout = read("app/layout.tsx");
const fix = read("app/certificate-visibility-fix.css");
const foundation = read("app/ui-foundation.css");

test("certificate document has an explicit light-surface text palette", () => {
  assert.match(fix, /\.completion-certificate \.certificate-copy h2\s*\{[^}]*color:\s*#2b2d2b !important;[^}]*-webkit-text-fill-color:\s*#2b2d2b !important;/s);
  assert.match(fix, /\.completion-certificate \.certificate-copy h3\s*\{[^}]*color:\s*#252825 !important;[^}]*-webkit-text-fill-color:\s*#252825 !important;/s);
  assert.match(fix, /\.completion-certificate \.certificate-copy h4\s*\{[^}]*color:\s*#292c29 !important;[^}]*-webkit-text-fill-color:\s*#292c29 !important;/s);
  assert.match(fix, /\.completion-certificate \.certificate-intro\s*\{[^}]*color:\s*#656963 !important;/s);
  assert.match(fix, /\.completion-certificate \.certificate-statement\s*\{[^}]*color:\s*#626660 !important;/s);
});

test("certificate colours override the app-wide forced white heading rule", () => {
  assert.match(foundation, /h1,\s*h2,\s*h3,\s*h4,[\s\S]*?color:\s*var\(--cgv-visual-text\) !important;/);
  assert.ok(layout.includes('import "./certificate-visibility-fix.css";'));
  assert.ok(
    layout.indexOf('import "./certificate-visibility-fix.css";') >
      layout.indexOf('import "./certificate.css";'),
  );
  assert.ok(
    layout.indexOf('import "./certificate-visibility-fix.css";') <
      layout.indexOf('import "./ui-foundation.css";'),
  );
  assert.match(fix, /\.completion-certificate \.certificate-copy h[234]/);
  assert.match(fix, /color:\s*#[0-9a-f]{6} !important;/i);
});

test("certificate metadata and verified seal keep intentional contrast", () => {
  assert.match(fix, /\.completion-certificate \.certificate-reference strong,[\s\S]*?color:\s*#292c29 !important;/);
  assert.match(fix, /\.completion-certificate \.certificate-signature strong,[\s\S]*?color:\s*#2d302d !important;/);
  assert.match(fix, /\.completion-certificate \.certificate-seal,[\s\S]*?color:\s*#ffffff !important;/);
});
