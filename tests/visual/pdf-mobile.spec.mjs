import { expect, test } from "@playwright/test";

const participant = {
  id: "pdf-mobile-user",
  username: "pdf.mobile",
  fullName: "PDF Mobile User",
  branch: "Test Cinema",
  position: "Stars",
  role: "participant",
  status: "active",
};

const lesson = {
  id: "pdf-mobile-lesson",
  title: "Mobile operations handbook",
  summary: "PDF viewport usability regression fixture.",
  content: "Open the handbook and verify the immersive mobile reader.",
  category: "Operations",
  duration: 5,
  resourceTitle: "Mobile Operations Handbook.pdf",
  resourceUrl: "https://file.garden/cgv-mobile/Mobile%20Operations%20Handbook.pdf",
  status: "published",
  createdAt: "2026-08-17T00:00:00.000Z",
  updatedAt: "2026-08-17T00:00:00.000Z",
};

async function installBackend(page) {
  await page.addInitScript(() => {
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
    let request = {};
    try {
      request = JSON.parse(route.request().postData() || "{}");
    } catch {
      request = {};
    }
    const response = request.action === "login"
      ? {
          ok: true,
          token: "pdf-mobile-token",
          user: participant,
          workspace: { courses: [], history: [], lessons: [lesson] },
        }
      : request.action === "getAccountLanguage"
        ? { ok: true, language: "en" }
        : { ok: true, user: participant, courses: [], history: [], lessons: [lesson] };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function openPdf(page) {
  await page.goto("/CGV.Exams/", { waitUntil: "networkidle" });
  await page.locator('input[placeholder="Enter your username"]').fill("pdf.mobile");
  await page.locator('input[placeholder="Enter your password"]').fill("testing-only");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.locator(".mobile-nav button").filter({ hasText: "Learn" }).click();
  const card = page.locator(".knowledge-card").filter({ hasText: "Mobile operations handbook" });
  await card.locator(".knowledge-review-button").click();
  await page.getByRole("button", { name: /Read PDF/i }).click();
  await expect(page.getByRole("dialog", { name: "Mobile Operations Handbook.pdf" })).toBeVisible();
}

test("mobile PDF reader gives the document the full phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installBackend(page);
  await openPdf(page);

  const backdrop = page.locator(".knowledge-pdf-backdrop");
  const reader = page.locator(".knowledge-pdf-reader");
  const toolbar = page.locator(".knowledge-pdf-toolbar");
  const stage = page.locator(".knowledge-pdf-stage");
  const footer = page.locator(".knowledge-pdf-footer");

  const backdropBox = await backdrop.boundingBox();
  expect(backdropBox).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

  const readerBox = await reader.boundingBox();
  expect(readerBox).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox?.height || 999).toBeLessThanOrEqual(64);

  const stageBox = await stage.boundingBox();
  expect(stageBox?.height || 0).toBeGreaterThan(770);

  await expect(footer).toBeHidden();
  await expect(page.locator(".knowledge-pdf-frame")).toHaveCSS("touch-action", "pan-x pan-y pinch-zoom");

  await page.getByRole("button", { name: "Close PDF reader" }).click();
  await expect(page.locator(".knowledge-pdf-reader")).toHaveCount(0);
});
