import fs from "node:fs";

function replaceOnce(path, before, after, label) {
  const source = fs.readFileSync(path, "utf8");
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label} in ${path}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Non-unique ${label} in ${path}`);
  }
  fs.writeFileSync(path, source.slice(0, first) + after + source.slice(first + before.length));
}

const knowledgePath = "app/knowledge-centre.tsx";
replaceOnce(
  knowledgePath,
  'import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";\n',
  'import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";\nimport { createPortal } from "react-dom";\n',
  "React portal import",
);

replaceOnce(
  knowledgePath,
  `      {pdfOpen && (\n        <PdfReader\n          title={lesson.resourceTitle || lesson.title}\n          url={lesson.resourceUrl}\n          onClose={() => setPdfOpen(false)}\n        />\n      )}`,
  `      {pdfOpen && typeof document !== "undefined" && createPortal(\n        <PdfReader\n          title={lesson.resourceTitle || lesson.title}\n          url={lesson.resourceUrl}\n          onClose={() => setPdfOpen(false)}\n        />,\n        document.body,\n      )}`,
  "nested PDF reader render",
);

const cssPath = "app/knowledge-pdf-reader.css";
replaceOnce(
  cssPath,
  `  /* PdfReader is rendered inside the lesson modal. Lift that parent stacking\n     context above the normal app topbar/mobile navigation so neither can steal\n     taps from the immersive reader's close button. */\n  .knowledge-modal-backdrop:has(.knowledge-pdf-backdrop) {\n    overflow: hidden;\n    padding: 0;\n    z-index: 2190;\n  }\n\n`,
  "",
  "obsolete nested stacking workaround",
);

const testPath = "tests/knowledge-centre.test.mjs";
const portalTest = `\n\ntest("PDF reader is portaled above app chrome instead of nesting inside the lesson modal", () => {\n  assert.match(knowledge, /import \\{ createPortal \\} from \\"react-dom\\"/);\n  assert.match(knowledge, /pdfOpen && typeof document !== \\"undefined\\" && createPortal\\(/);\n  assert.match(knowledge, /document\\.body,/);\n  assert.doesNotMatch(pdfCss, /knowledge-modal-backdrop:has\\(\\.knowledge-pdf-backdrop\\)/);\n});\n`;
let tests = fs.readFileSync(testPath, "utf8");
if (!tests.includes('test("PDF reader is portaled above app chrome')) {
  tests += portalTest;
  fs.writeFileSync(testPath, tests);
}

const changelogPath = "updates/2026-08-17-knowledge-centre-gas-sync.md";
let changelog = fs.readFileSync(changelogPath, "utf8");
const marker = "- The mobile PDF footer is removed in favor of the compact close toolbar, giving the document substantially more vertical reading space.\n";
const addition = marker + "- The PDF reader is rendered through a body-level React portal so app headers/navigation cannot intercept its mobile controls.\n";
if (!changelog.includes("body-level React portal")) {
  if (!changelog.includes(marker)) throw new Error("Missing changelog mobile PDF marker");
  changelog = changelog.replace(marker, addition);
  fs.writeFileSync(changelogPath, changelog);
}

console.log("Applied body-level PDF reader portal patch.");
