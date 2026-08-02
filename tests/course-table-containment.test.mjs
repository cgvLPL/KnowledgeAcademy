import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const layout = read("app/layout.tsx");
const client = read("app/exam-client.tsx");
const css = read("app/course-table-containment.css");
const loginCss = read("app/login-reference-layout.css");
const loginCopyCss = read("app/login-reference-copy.css");

test("course table icons and text remain contained at every breakpoint", () => {
  assert.match(layout, /import "\.\/course-table-containment\.css";/);

  for (const selector of [
    ".evaluation-icon",
    ".evaluation-icon > svg",
    ".table-card .table-title-cell",
    ".table-card .table-title-cell > .evaluation-icon",
    ".table-card .table-title-cell strong",
    ".table-card .table-title-cell span",
    ".course-card .course-meta",
    "@media (max-width: 760px)",
  ]) {
    assert.ok(css.includes(selector), `Missing course containment safeguard for ${selector}`);
  }

  assert.match(css, /grid-template-columns:\s*38px minmax\(0, 1fr\)/);
  assert.match(css, /max-inline-size:\s*42px\s*!important/);
  assert.match(css, /max-block-size:\s*42px\s*!important/);
  assert.match(css, /font-size:\s*12px\s*!important/);
  assert.match(css, /font-size:\s*9px\s*!important/);
  assert.match(css, /text-size-adjust:\s*100%/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test("login keeps the cinematic split layout and centred Knowledge Academy lockup", () => {
  assert.match(layout, /import "\.\/login-reference-layout\.css";/);
  assert.match(layout, /import "\.\/login-reference-copy\.css";/);

  for (const selector of [
    ".login-page .login-layout",
    ".login-page .login-layout::before",
    ".login-page .login-brand-row",
    ".login-page .login-card",
    ".login-page .login-button",
    "@media (max-width: 860px)",
  ]) {
    assert.ok(loginCss.includes(selector), `Missing login reference safeguard for ${selector}`);
  }

  assert.match(loginCss, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(480px, 1fr\)/);
  assert.match(loginCss, /left:\s*25%/);
  assert.match(loginCss, /top:\s*50%/);
  assert.match(loginCss, /transform:\s*translate\(-50%, -50%\)/);
  assert.match(loginCss, /linear-gradient\(100deg, #ffac21 0%, #ff641d 43%, #df2e32 100%\)/);
  assert.match(loginCss, /width:\s*100%\s*!important/);
  assert.match(client, /<h1>Welcome Back!<\/h1>/);
  assert.doesNotMatch(client, /Sign in once and we will open the right workspace/);
  assert.doesNotMatch(loginCopyCss, /right workspace automatically/);
  assert.match(loginCopyCss, /content:\s*"Sign in"/);
});

test("login artwork carries an equal-width Knowledge Academy subtitle", () => {
  assert.match(client, /<div className="login-brand-row">[\s\S]*?<Logo \/>/);
  assert.match(client, /cgv-knowledge-academy\.svg/);
  assert.match(loginCss, /\.login-page \.login-brand-row \.brand-logo/);
  assert.match(loginCss, /width:\s*100%\s*!important/);
});
