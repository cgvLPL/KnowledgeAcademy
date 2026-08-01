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

test("settings displays the exact running application version", () => {
  assert.match(settings, /APP_VERSION_LABEL/);
  assert.match(settings, /App version/);
  assert.match(settings, /checks automatically for a newer release/);
  assert.match(versionScript, /public["',\s]+version\.json/);
  assert.match(versionScript, /GITHUB_SHA/);
  assert.match(pagesBuild, /prepare-app-version\.mjs/);
  assert.match(sitesBuild, /prepare-app-version\.mjs/);
  assert.match(pagesBuild, /NEXT_PUBLIC_APP_VERSION/);
  assert.match(sitesBuild, /NEXT_PUBLIC_APP_VERSION/);
});

test("new deployments trigger a mandatory full-screen refresh prompt", () => {
  assert.match(layout, /AppUpdateEnhancer/);
  assert.match(layout, /import "\.\/app-update-enhancer\.css"/);
  assert.match(updater, /version\.json/);
  assert.match(updater, /cache: "no-store"/);
  assert.match(updater, /latestVersion !== APP_VERSION/);
  assert.match(updater, /window\.addEventListener\("focus", checkForUpdate\)/);
  assert.match(updater, /visibilitychange/);
  assert.match(updater, /window\.location\.replace/);
  assert.match(updater, /aria-modal="true"/);
  assert.match(updater, /Refresh and update/);
  assert.match(updaterCss, /\.cgv-update-screen\s*\{/);
  assert.match(updaterCss, /inset:\s*0/);
  assert.match(updaterCss, /position:\s*fixed/);
  assert.match(updaterCss, /min-height:\s*100dvh/);
  assert.match(updaterCss, /z-index:\s*2147483647/);
});
