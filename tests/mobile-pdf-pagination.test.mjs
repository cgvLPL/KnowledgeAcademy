import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const controller = read("app/mobile-pdf-pagination.tsx");
const css = read("app/mobile-pdf-pagination.css");
const layout = read("app/layout.tsx");

test("mobile PDFs use app-owned PDF.js pagination instead of Safari iframe navigation", () => {
  assert.match(controller, /PDFJS_VERSION = "5\.4\.296"/);
  assert.match(controller, /pdfjs\.getDocument\(\{ url: active\.url \}\)/);
  assert.match(controller, /const pdf = documentProxy;/);
  assert.match(controller, /pdf\.getPage\(pageNumber\)/);
  assert.match(controller, /aria-label="Previous PDF page"/);
  assert.match(controller, /aria-label="Next PDF page"/);
  assert.match(controller, /pageCount \|\| "…"/);
});

test("mobile PDF zoom is bounded and touch friendly", () => {
  assert.match(controller, /Math\.max\(0\.75,/);
  assert.match(controller, /Math\.min\(2,/);
  assert.match(controller, /aria-label="Zoom out PDF"/);
  assert.match(controller, /aria-label="Zoom in PDF"/);
  assert.match(css, /\.cgv-mobile-pdf-stage[\s\S]*?overflow:\s*auto;[\s\S]*?touch-action:\s*pan-x pan-y;/);
  assert.match(css, /\.cgv-mobile-pdf-control-group > button[\s\S]*?height:\s*44px;[\s\S]*?touch-action:\s*manipulation;[\s\S]*?width:\s*44px;/);
});

test("mobile PDF controls are grouped and readable on narrow screens", () => {
  assert.match(controller, /cgv-mobile-pdf-control-group cgv-mobile-pdf-page-controls/);
  assert.match(controller, /cgv-mobile-pdf-control-group cgv-mobile-pdf-zoom-controls/);
  assert.match(controller, /<small>Page<\/small>/);
  assert.match(controller, /<small>Zoom<\/small>/);
  assert.match(controller, /cgv-mobile-pdf-toolbar-page/);
  assert.match(css, /\.cgv-mobile-pdf-controls[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(css, /\.cgv-mobile-pdf-heading strong[\s\S]*?font-size:\s*13px/);
  assert.match(css, /@media \(max-width: 340px\)[\s\S]*?grid-template-columns:\s*44px minmax\(34px, 1fr\) 44px/);
});

test("mobile PDF stage has document-style framing and clear loading feedback", () => {
  assert.match(controller, /cgv-mobile-pdf-spinner/);
  assert.match(controller, /Math\.max\(240, stage\.clientWidth - 32\)/);
  assert.match(css, /\.cgv-mobile-pdf-stage[\s\S]*?padding:\s*16px/);
  assert.match(css, /\.cgv-mobile-pdf-canvas[\s\S]*?border-radius:\s*6px;[\s\S]*?box-shadow:/);
  assert.match(css, /\.cgv-mobile-pdf-loading[\s\S]*?flex-direction:\s*column/);
  assert.match(css, /\.cgv-mobile-pdf-spinner[\s\S]*?height:\s*28px;[\s\S]*?width:\s*28px/);
});

test("immersive phone PDF reader cannot be covered by app navigation", () => {
  assert.match(css, /body\.cgv-mobile-pdf-open \.topbar/);
  assert.match(css, /body\.cgv-mobile-pdf-open \.mobile-nav/);
  assert.match(css, /visibility:\s*hidden !important/);
  assert.match(css, /z-index:\s*2147483646/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test("mobile PDF controller is mounted after the existing Knowledge Centre reader", () => {
  assert.ok(layout.includes('import MobilePdfPagination from "./mobile-pdf-pagination";'));
  assert.ok(layout.includes('import "./mobile-pdf-pagination.css";'));
  assert.ok(layout.indexOf('import "./mobile-pdf-pagination.css";') > layout.indexOf('import "./knowledge-pdf-reader.css";'));
  assert.ok(layout.includes("<MobilePdfPagination />"));
  assert.match(controller, /iframe\.knowledge-pdf-frame/);
  assert.match(controller, /reader\.setAttribute\("aria-hidden", "true"\)/);
});

test("desktop PDFs remain on the existing embedded viewer path", () => {
  assert.match(controller, /window\.matchMedia\("\(max-width: 760px\)"\)/);
  assert.match(controller, /if \(!media\.matches\) \{[\s\S]*?setActive\(null\)/);
});