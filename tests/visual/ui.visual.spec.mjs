import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dist = path.join(root, "dist/client");
const fixturePath = path.join(dist, "visual-fixture.html");

const viewports = [
  { name: "phone-320", width: 320, height: 720 },
  { name: "phone-360", width: 360, height: 800 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

function productionStylesheetTags() {
  const index = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  return [...index.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /rel=["']stylesheet["']/i.test(tag))
    .join("\n");
}

function fixtureHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>CGV visual regression fixture</title>
  ${productionStylesheetTags()}
  <style>
    *, *::before, *::after { animation: none !important; transition: none !important; }
    .visual-fixture-logo { font-weight: 900; letter-spacing: -.04em; font-size: 18px; }
    .visual-fixture-logo span { color: #ff6a22; }
    .visual-fixture-icon { align-items: center; display: inline-flex; justify-content: center; font-size: 15px; }
    .visual-fixture-copy { max-width: 62ch; }
  </style>
</head>
<body class="antialiased">
  <div class="app-shell visual-fixture">
    <aside class="sidebar" aria-label="Visual regression sidebar">
      <div class="visual-fixture-logo">CGV <span>Knowledge Academy</span></div>
      <nav class="sidebar-nav" aria-label="Fixture navigation">
        <button class="active" type="button"><span class="visual-fixture-icon">◆</span> Overview</button>
        <button type="button"><span class="visual-fixture-icon">◇</span> Courses</button>
        <button type="button"><span class="visual-fixture-icon">○</span> Knowledge Centre</button>
        <button type="button"><span class="visual-fixture-icon">□</span> Participants</button>
      </nav>
      <div class="sidebar-bottom">
        <button type="button">Help centre</button>
        <button type="button">Settings</button>
        <button type="button">Sign out</button>
      </div>
    </aside>

    <div class="main-shell">
      <header class="topbar">
        <div class="page-title"><h1>Knowledge Academy</h1><p>Visual regression workspace</p></div>
        <div class="topbar-actions"><button class="icon-button" type="button" aria-label="Notifications">●</button></div>
      </header>

      <main class="content">
        <section class="participant-home">
          <div class="welcome-row">
            <div><p class="eyebrow">Participant workspace</p><h2>Welcome back, Cinema Team</h2><p class="visual-fixture-copy">Continue your learning plan, monitor upcoming evaluations, and keep progress visible across every screen size.</p></div>
            <button class="primary-button" type="button">View evaluations</button>
          </div>

          <article class="hero-evaluation">
            <div class="hero-copy"><span class="status-pill status-live">Live</span><h3>Guest Experience Excellence</h3><p>Complete the current evaluation before the closing window.</p><button class="hero-button" type="button">Start quiz</button></div>
          </article>

          <div class="metric-grid">
            <article class="metric-card"><span class="metric-icon visual-fixture-icon">✓</span><div><p>Completed</p><strong>12</strong><span>Evaluations</span></div></article>
            <article class="metric-card"><span class="metric-icon visual-fixture-icon">★</span><div><p>Average score</p><strong>91%</strong><span>Current average</span></div></article>
            <article class="metric-card"><span class="metric-icon visual-fixture-icon">↗</span><div><p>Progress</p><strong>86%</strong><span>Learning plan</span></div></article>
          </div>

          <section class="section-block">
            <div class="section-heading"><div><h3>Available learning</h3><p>Production classes should remain cohesive after CSS consolidation.</p></div><button class="secondary-button" type="button">View all</button></div>
            <div class="course-grid">
              <article class="course-card"><span class="status-pill status-live">Available</span><h3>Operational Readiness</h3><p>Core procedures for safe, consistent cinema operations.</p><div class="course-meta"><span>8 questions</span><span>20 minutes</span></div><div class="course-card-footer"><strong>Due 18 Aug</strong><button class="row-button" type="button">Open</button></div></article>
              <article class="course-card is-scheduled"><span class="status-pill status-scheduled">Upcoming</span><h3>Leadership Essentials</h3><p>People leadership and communication for cinema managers.</p><div class="course-meta"><span>10 questions</span><span>25 minutes</span></div><div class="course-card-footer"><strong>Opens 20 Aug</strong><button class="row-button" type="button" disabled>Not open yet</button></div></article>
            </div>
          </section>

          <section class="admin-participants">
            <div class="table-card participants-table-card">
              <div class="table-card-header"><div><h3>Participant overview</h3><p>Table headers and generated mobile labels must stay readable.</p></div><button class="icon-button" type="button" aria-label="Filter participants">⌕</button></div>
              <div class="responsive-table">
                <table class="participants-management-table">
                  <thead><tr><th>Participant</th><th>Position</th><th>Branch</th><th>Attempts</th><th>Average</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr>
                      <td><div class="participant-cell"><span class="avatar avatar-sm">AR</span><div><strong>Alex Rahman</strong><span>@alex.rahman</span></div></div></td>
                      <td data-label="Position">Stars</td>
                      <td data-label="Branch">Grand Indonesia</td>
                      <td data-label="Attempts">8</td>
                      <td data-label="Average"><strong class="table-score">94%</strong></td>
                      <td data-label="Status"><span class="outcome-pill pass">Active</span></td>
                      <td><button class="icon-button" type="button" aria-label="Manage participant">•••</button></td>
                    </tr>
                    <tr>
                      <td><div class="participant-cell"><span class="avatar avatar-sm">DN</span><div><strong>Dina Nur</strong><span>@dina.nur</span></div></div></td>
                      <td data-label="Position">Cinema Manager</td>
                      <td data-label="Branch">Central Park</td>
                      <td data-label="Attempts">5</td>
                      <td data-label="Average"><strong class="table-score">88%</strong></td>
                      <td data-label="Status"><span class="outcome-pill pass">Active</span></td>
                      <td><button class="icon-button" type="button" aria-label="Manage participant">•••</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>

    <nav class="mobile-nav" aria-label="Fixture mobile navigation">
      <button class="active" type="button">Home</button>
      <button type="button">Courses</button>
      <button type="button">History</button>
      <button type="button">Menu</button>
    </nav>
  </div>
</body>
</html>`;
}

function channelValue(color) {
  const match = String(color).match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/i);
  if (!match) return 0;
  return (Number(match[1]) + Number(match[2]) + Number(match[3])) / 3;
}

test.beforeAll(() => {
  fs.writeFileSync(fixturePath, fixtureHtml());
});

test.afterAll(() => {
  fs.rmSync(fixturePath, { force: true });
});

for (const viewport of viewports) {
  test(`${viewport.name} keeps the production visual system stable`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/CGV.Exams/visual-fixture.html", { waitUntil: "networkidle" });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

    const primaryButton = page.locator(".primary-button").first();
    const primaryBox = await primaryButton.boundingBox();
    expect(primaryBox).not.toBeNull();
    expect(primaryBox.height).toBeGreaterThanOrEqual(viewport.width <= 760 ? 46 : 42);

    const cardRadius = await page.locator(".course-card").first().evaluate((element) => parseFloat(getComputedStyle(element).borderTopLeftRadius));
    expect(cardRadius).toBeGreaterThanOrEqual(14);
    expect(cardRadius).toBeLessThanOrEqual(20);

    const surfaceBorder = await page.locator(".course-card").first().evaluate((element) => getComputedStyle(element).borderTopColor);
    expect(surfaceBorder).not.toBe("rgba(0, 0, 0, 0)");

    const metrics = {
      viewport,
      overflow,
      primaryButtonHeight: primaryBox.height,
      courseCardRadius: cardRadius,
      surfaceBorder,
    };

    if (viewport.width <= 760) {
      await expect(page.locator(".sidebar")).toBeHidden();
      await expect(page.locator(".mobile-nav")).toBeVisible();

      const mobileNavPosition = await page.locator(".mobile-nav").evaluate((element) => getComputedStyle(element).position);
      expect(mobileNavPosition).toBe("fixed");

      const labelStyle = await page.locator('.participants-management-table td[data-label="Position"]').first().evaluate((element) => {
        const style = getComputedStyle(element, "::before");
        return {
          content: style.content,
          color: style.color,
          fontSize: parseFloat(style.fontSize),
          opacity: Number(style.opacity),
        };
      });
      expect(labelStyle.content).not.toBe("none");
      expect(labelStyle.content).not.toBe('""');
      expect(labelStyle.fontSize).toBeGreaterThanOrEqual(10);
      expect(labelStyle.opacity).toBe(1);
      expect(channelValue(labelStyle.color)).toBeGreaterThan(160);
      Object.assign(metrics, { mobileNavPosition, labelStyle });
    } else {
      await expect(page.locator(".sidebar")).toBeVisible();
      await expect(page.locator(".mobile-nav")).toBeHidden();

      const headerStyle = await page.locator(".participants-management-table thead th").first().evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          color: style.color,
          fontWeight: Number(style.fontWeight),
          opacity: Number(style.opacity),
        };
      });
      expect(headerStyle.fontWeight).toBeGreaterThanOrEqual(700);
      expect(headerStyle.opacity).toBe(1);
      expect(channelValue(headerStyle.color)).toBeGreaterThan(150);
      Object.assign(metrics, { headerStyle });
    }

    fs.writeFileSync(testInfo.outputPath(`${viewport.name}.json`), JSON.stringify(metrics, null, 2));
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}.png`),
      fullPage: true,
      animations: "disabled",
    });
  });
}
