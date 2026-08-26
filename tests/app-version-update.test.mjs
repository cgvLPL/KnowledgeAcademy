import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const layout = read("app/layout.tsx");
const settings = read("app/settings-enhancer.tsx");
const updater = read("app/app-update-enhancer.tsx");
const updaterCss = read("app/app-update-enhancer.css");
const versionScript = read("scripts/prepare-app-version.mjs");
const pagesBuild = read("scripts/build-github-pages.sh");
const sitesBuild = read("scripts/build-verified.sh");
const nextConfig = read("next.config.ts");
const packageJson = JSON.parse(read("package.json"));
const appVersion = read("app/app-version.ts");

test("settings displays the exact running application version", () => {
  assert.equal(packageJson.version, "1.2.0");
  assert.match(appVersion, /1\.2\.0\+development/);
  assert.match(settings, /APP_VERSION_LABEL/);
  assert.match(settings, /App version/);
  assert.match(settings, /checks automatically for a newer release/);
  assert.match(versionScript, /public["',\s]+version\.json/);
  assert.match(versionScript, /GITHUB_SHA/);
  assert.match(pagesBuild, /prepare-app-version\.mjs/);
  assert.match(sitesBuild, /prepare-app-version\.mjs/);
  assert.match(pagesBuild, /NEXT_PUBLIC_APP_VERSION/);
  assert.match(sitesBuild, /NEXT_PUBLIC_APP_VERSION/);
  assert.match(pagesBuild, /find "\$project_dir\/dist\/client\/assets" -type f -name '\*\.css'/);
  assert.match(pagesBuild, /pages_base_path="\$\{NEXT_PUBLIC_BASE_PATH:-\/KnowledgeAcademy\}"/);
  assert.match(pagesBuild, /\$\{basePath\}\/assets\//);
  assert.match(pagesBuild, /grep -qF 'url\(\/assets\/'/);
  assert.match(nextConfig, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(nextConfig, /\/KnowledgeAcademy/);
  assert.doesNotMatch(nextConfig, /CGV\.Exams/);
  assert.doesNotMatch(pagesBuild, /CGV\.Exams/);
});

test("new deployments trigger a mandatory refresh prompt only outside active evaluations", () => {
  assert.match(layout, /AppUpdateEnhancer/);
  assert.match(layout, /import "\.\/app-update-enhancer\.css"/);
  assert.match(updater, /version\.json/);
  assert.match(updater, /cache: "no-store"/);
  assert.match(updater, /latestVersion !== APP_VERSION/);
  assert.match(updater, /window\.addEventListener\("focus", checkForUpdate\)/);
  assert.match(updater, /visibilitychange/);
  assert.match(updater, /document\.querySelector\("\.quiz-layout"\)/);
  assert.match(updater, /MutationObserver/);
  assert.match(updater, /shouldPrompt/);
  assert.match(updater, /window\.location\.replace/);
  assert.match(updater, /aria-modal="true"/);
  assert.match(updater, /Refresh and update/);
  assert.match(updater, /Active evaluations are never interrupted/);
  assert.doesNotMatch(updater, /Your session and saved progress remain on this device/);
  assert.match(updaterCss, /\.cgv-update-screen\s*\{/);
  assert.match(updaterCss, /inset:\s*0/);
  assert.match(updaterCss, /position:\s*fixed/);
  assert.match(updaterCss, /min-height:\s*100dvh/);
  assert.match(updaterCss, /z-index:\s*2147483647/);
});

test("public metadata belongs to the KnowledgeAcademy fork", () => {
  assert.match(layout, /https:\/\/cgvlpl\.github\.io\/KnowledgeAcademy\//);
  assert.match(layout, /NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(layout, /rayhanmawuntu-stack/);
  assert.doesNotMatch(layout, /evalora-quiz\.rayhanmawuntu/);
});
