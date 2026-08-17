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

async function installBackendStub(page) {
  await page.addInitScript(() => {
    window.__cgvOpenedUrls = [];
    window.open = (url) => {
      window.__cgvOpenedUrls.push(String(url));
      return null;
    };
  });

  await page.route("**/exec", async (route) => {
    let payload = {};
    try {
      payload = JSON.parse(route.request().postData() || "{}");
    } catch {
      payload = {};
    }

    let response = { ok: true };
    if (payload.action === "login") {
      response = {
        ok: true,
        token: "qa-session-token",
        user: participant,
        workspace: {
          courses: [],
          history: [],
          lessons: [],
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
