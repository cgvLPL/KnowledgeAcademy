import { expect, test } from "@playwright/test";

const participant = {
  id: "qa-participant",
  username: "qa.participant",
  fullName: "QA Participant",
  branch: "Test Cinema",
  position: "Stars",
  role: "participant",
  status: "active",
};

const knowledgeLesson = {
  id: "qa-lesson-pdf",
  title: "Cinema operations handbook",
  summary: "A test lesson with an internally rendered PDF resource.",
  content: "Review the operating standards before opening the attached handbook.",
  category: "Operations",
  duration: 7,
  resourceTitle: "Cinema Operations Handbook.pdf",
  resourceUrl: "https://file.garden/qa-cgv-academy/Cinema%20Operations%20Handbook.pdf",
  status: "published",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-12T00:00:00.000Z",
};

async function installBackendStub(page) {
  await page.addInitScript(() => {
    window.__cgvOpenedUrls = [];
    window.open = (url) => {
      window.__cgvOpenedUrls.push(String(url));
      return null;
    };
    window.localStorage.setItem("cgv-exams-auto-refresh", "false");
    window.localStorage.setItem("cgv-exams-interface-settings-v1", JSON.stringify({
      compact: false,
      reducedMotion: false,
      enhancedContrast: false,
      autoRefresh: false,
      language: "en",
    }));
  });

  await page.route("https://file.garden/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF",
    });
  });

  await page.route("**/exec", async (route) => {
    let payload = {};
    try {
      payload = JSON.parse(route.request().postData() || "{}");
    } catch {
      payload = {};
    }

    let response = {
      ok: true,
      courses: [],
      history: [],
      lessons: [knowledgeLesson],
      user: participant,
    };
    if (payload.action === "login") {
      response = {
        ok: true,
        token: "qa-session-token",
        user: participant,
        workspace: {
          courses: [],
          history: [],
          lessons: [knowledgeLesson],
        },
      };
    } else if (payload.action === "getAccountLanguage") {
      response = { ok: true, language: "en" };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function signIn(page) {
  await page.goto("/CGV.Exams/", { waitUntil: "networkidle" });
  await page.locator('input[placeholder="Enter your username"]').fill("qa.participant");
  await page.locator('input[placeholder="Enter your password"]').fill("testing-only");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator(".page-title h1")).toHaveText("Overview");
}

async function openMobileMenu(page) {
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.locator("body")).toHaveClass(/cgv-mobile-menu-open/);
  await expect(page.locator(".sidebar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
}

async function openPdfFromKnowledgeCentre(page) {
  const centre = page.locator('.knowledge-centre[data-knowledge-centre-role="participant"]');
  await expect(centre).toBeVisible();
  const card = centre.locator(".knowledge-card").filter({ hasText: "Cinema operations handbook" });
  await expect(card).toBeVisible();
  await card.locator(".knowledge-review-button").click();
  await expect(page.getByRole("dialog", { name: "Cinema operations handbook" })).toBeVisible();
  await page.getByRole("button", { name: /Read PDF/i }).click();
  await expect(page.getByRole("dialog", { name: "Cinema Operations Handbook.pdf" })).toBeVisible();
  const frame = page.locator(".knowledge-pdf-frame");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("src", /https:\/\/file\.garden\/qa-cgv-academy\/Cinema%20Operations%20Handbook\.pdf#toolbar=1&navpanes=0&view=FitH/);
}

test("mobile menu settings help navigation and sign out stay synchronized", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installBackendStub(page);
  await signIn(page);

  await expect(page.locator(".sidebar")).toBeHidden();

  await openMobileMenu(page);
  await page.locator(".sidebar-bottom button").filter({ hasText: "Settings" }).click();
  await expect(page.locator("body")).not.toHaveClass(/cgv-mobile-menu-open/);
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close settings" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);

  await openMobileMenu(page);
  await page.locator(".sidebar-bottom button").filter({ hasText: "Help centre" }).click();
  await expect(page.locator("body")).not.toHaveClass(/cgv-mobile-menu-open/);
  await expect.poll(() => page.evaluate(() => window.__cgvOpenedUrls.at(-1) || "")).toContain(
    "rayhanmawuntu-stack/CGV.Exams#google-sheets-connection",
  );

  await openMobileMenu(page);
  await page.locator(".sidebar-nav button").filter({ hasText: "Evaluations" }).click();
  await expect(page.locator("body")).not.toHaveClass(/cgv-mobile-menu-open/);
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".page-title h1")).toHaveText("Evaluations");

  await page.evaluate(() => {
    for (const key of ["cgv-exams-session-token", "cgv-exams-session-role", "cgv-exams-session-user"]) {
      window.sessionStorage.setItem(key, "stale");
      window.localStorage.setItem(key, "stale");
    }
  });

  await openMobileMenu(page);
  await page.locator(".sidebar-bottom button").filter({ hasText: "Sign out" }).click();
  await expect(page.locator(".login-page")).toBeVisible();
  await expect(page.locator("body")).not.toHaveClass(/cgv-mobile-menu-open/);

  const persisted = await page.evaluate(() => ({
    sessionToken: window.sessionStorage.getItem("cgv-exams-session-token"),
    localToken: window.localStorage.getItem("cgv-exams-session-token"),
    sessionRole: window.sessionStorage.getItem("cgv-exams-session-role"),
    localUser: window.localStorage.getItem("cgv-exams-session-user"),
  }));
  expect(persisted).toEqual({ sessionToken: null, localToken: null, sessionRole: null, localUser: null });
});

test("desktop sidebar actions use the same interaction controller", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installBackendStub(page);
  await signIn(page);

  await expect(page.locator(".sidebar")).toBeVisible();
  await page.locator(".sidebar-bottom button").filter({ hasText: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);

  await page.locator(".sidebar-bottom button").filter({ hasText: "Help centre" }).click();
  await expect.poll(() => page.evaluate(() => window.__cgvOpenedUrls.length)).toBe(1);

  await page.locator(".sidebar-bottom button").filter({ hasText: "Sign out" }).click();
  await expect(page.locator(".login-page")).toBeVisible();
});

test("File Garden PDF is usable as an immersive reader on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installBackendStub(page);
  await signIn(page);

  await page.locator(".mobile-nav button").filter({ hasText: "Learn" }).click();
  await openPdfFromKnowledgeCentre(page);

  const backdrop = page.locator(".knowledge-pdf-backdrop");
  const reader = page.locator(".knowledge-pdf-reader");
  const toolbar = page.locator(".knowledge-pdf-toolbar");
  const stage = page.locator(".knowledge-pdf-stage");
  const frame = page.locator(".knowledge-pdf-frame");

  const backdropBox = await backdrop.boundingBox();
  expect(backdropBox).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

  const readerBox = await reader.boundingBox();
  expect(readerBox).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox?.height || 999).toBeLessThanOrEqual(64);

  const stageBox = await stage.boundingBox();
  expect(stageBox?.height || 0).toBeGreaterThan(770);

  await expect(page.locator(".knowledge-pdf-footer")).toBeHidden();
  await expect(frame).toHaveCSS("touch-action", "pan-x pan-y pinch-zoom");
  await page.getByRole("button", { name: "Close PDF reader" }).click();
  await expect(frame).toHaveCount(0);
});

test("File Garden PDF stays inside the Knowledge Centre on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await installBackendStub(page);
  await signIn(page);

  await page.locator(".sidebar-nav button").filter({ hasText: "Knowledge centre" }).click();
  await openPdfFromKnowledgeCentre(page);
  await expect(page.getByText("The document stays inside CGV Knowledge Academy.", { exact: false })).toBeVisible();
  const reader = page.locator(".knowledge-pdf-reader");
  await expect(reader).toBeVisible();
  const box = await reader.boundingBox();
  expect(box?.width || 0).toBeLessThanOrEqual(1180);
  expect(box?.height || 0).toBeLessThanOrEqual(920);
  await page.keyboard.press("Escape");
  await expect(page.locator(".knowledge-pdf-frame")).toHaveCount(0);
});
