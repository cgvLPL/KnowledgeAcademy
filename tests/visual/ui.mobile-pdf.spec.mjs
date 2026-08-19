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

const lesson = {
  id: "qa-mobile-pdf",
  title: "Safety, K3, and Leadership",
  summary: "Three-page mobile PDF navigation fixture.",
  content: "Review every page of the attached safety material.",
  category: "Safety",
  duration: 6,
  resourceTitle: "Safety, K3, and Leadership",
  resourceUrl: "https://file.garden/qa-cgv-academy/safety-k3-leadership.pdf",
  status: "published",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
};

async function installBackendStub(page) {
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

  await page.route("https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.min.mjs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/javascript",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: `
        export const GlobalWorkerOptions = { workerSrc: "" };
        export function getDocument() {
          return {
            destroy() {},
            promise: Promise.resolve({
              numPages: 3,
              destroy() {},
              async getPage(pageNumber) {
                return {
                  getViewport({ scale }) {
                    return { width: 612 * scale, height: 792 * scale };
                  },
                  render({ canvasContext, viewport }) {
                    canvasContext.fillStyle = "#ffffff";
                    canvasContext.fillRect(0, 0, viewport.width, viewport.height);
                    canvasContext.fillStyle = "#111111";
                    canvasContext.font = "24px sans-serif";
                    canvasContext.fillText("Page " + pageNumber, 28, 42);
                    return { promise: Promise.resolve(), cancel() {} };
                  },
                };
              },
            }),
          };
        }
      `,
    });
  });

  await page.route("https://file.garden/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/pdf", body: "%PDF-1.4\n%%EOF" });
  });

  await page.route("**/exec", async (route) => {
    let payload = {};
    try {
      payload = JSON.parse(route.request().postData() || "{}");
    } catch {
      payload = {};
    }

    let response = { ok: true, courses: [], history: [], lessons: [lesson], user: participant };
    if (payload.action === "login") {
      response = {
        ok: true,
        token: "qa-session-token",
        user: participant,
        workspace: { courses: [], history: [], lessons: [lesson] },
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
}

test("iPhone-sized reader can navigate every PDF page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installBackendStub(page);
  await signIn(page);

  await page.locator(".mobile-nav button").filter({ hasText: "Learn" }).click();
  const card = page.locator(".knowledge-card").filter({ hasText: "Safety, K3, and Leadership" });
  await card.locator(".knowledge-review-button").click();
  await page.getByRole("button", { name: /Read PDF/i }).click();

  const enhanced = page.locator(".cgv-mobile-pdf-reader");
  const canvas = page.locator(".cgv-mobile-pdf-canvas");
  await expect(enhanced).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(page.locator(".knowledge-pdf-reader")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".mobile-nav")).toBeHidden();
  await expect(page.locator(".cgv-mobile-pdf-page")).toContainText("1 / 3");
  await expect(canvas).toHaveAttribute("aria-label", "PDF page 1 of 3");

  const overlayBox = await page.locator(".cgv-mobile-pdf-overlay").boundingBox();
  expect(overlayBox).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });

  await page.getByRole("button", { name: "Next PDF page" }).click();
  await expect(page.locator(".cgv-mobile-pdf-page")).toContainText("2 / 3");
  await expect(canvas).toHaveAttribute("aria-label", "PDF page 2 of 3");

  await page.getByRole("button", { name: "Next PDF page" }).click();
  await expect(page.locator(".cgv-mobile-pdf-page")).toContainText("3 / 3");
  await expect(canvas).toHaveAttribute("aria-label", "PDF page 3 of 3");
  await expect(page.getByRole("button", { name: "Next PDF page" })).toBeDisabled();

  await page.getByRole("button", { name: "Previous PDF page" }).click();
  await expect(page.locator(".cgv-mobile-pdf-page")).toContainText("2 / 3");

  await page.getByRole("button", { name: "Zoom in PDF" }).click();
  await expect(page.locator(".cgv-mobile-pdf-zoom")).toHaveText("125%");
  await page.getByRole("button", { name: "Zoom out PDF" }).click();
  await expect(page.locator(".cgv-mobile-pdf-zoom")).toHaveText("100%");

  await page.getByRole("button", { name: "Close PDF reader" }).click();
  await expect(enhanced).toHaveCount(0);
  await expect(page.locator(".knowledge-pdf-frame")).toHaveCount(0);
  await expect(page.locator(".mobile-nav")).toBeVisible();
});
