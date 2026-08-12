import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: /ui\.visual\.spec\.mjs/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: "../../test-results/visual-artifacts",
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "ln -sfn . dist/client/CGV.Exams && python3 -m http.server 4173 --directory dist/client",
    url: "http://127.0.0.1:4173/CGV.Exams/index.html",
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
