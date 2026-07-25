import fs from "node:fs";
import { execFileSync } from "node:child_process";

const testPath = "tests/upcoming-evaluations.test.mjs";
let testSource = fs.readFileSync(testPath, "utf8");
testSource = testSource.replace(
  'assert.match(layout, /import "./upcoming-evaluations.css";/);',
  'assert.ok(layout.includes(\'import "./upcoming-evaluations.css";\'));',
);
fs.writeFileSync(testPath, testSource);

execFileSync("git", ["checkout", "--", ".github/workflows", "scripts/apply-upcoming-schedule-fix.mjs"], {
  stdio: "inherit",
});

if (fs.existsSync("scripts/finalize-upcoming-schedule-fix.mjs")) {
  fs.rmSync("scripts/finalize-upcoming-schedule-fix.mjs");
}

console.log("Finalized repair without workflow-file changes.");
