import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dist = path.join(root, "dist/client");
const logoUrl = "/KnowledgeAcademy/brand/cgv-knowledge-academy.svg";
const productionCss = [...fs.readFileSync(path.join(dist, "index.html"), "utf8").matchAll(/<link[^>]*>/gi)]
  .map((match) => match[0])
  .filter((tag) => /rel=["']stylesheet["']/i.test(tag))
  .join(" ");
const fixtureUrl = "/KnowledgeAcademy/brand-centering-fixture.html";
const fixturePath = path.join(dist, "brand-centering-fixture.html");

test.beforeAll(() => {
  fs.writeFileSync(fixturePath, `<!doctype html><html lang="en"><head><meta charset="utf-8"/>${productionCss}</head><body></body></html>`);
});
test.afterAll(() => fs.rmSync(fixturePath, { force: true }));


test("the rendered CGV wordmark has balanced intrinsic margins on its centerline", async ({ page }) => {
  await page.goto(fixtureUrl, { waitUntil: "load" });
  const result = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D canvas unavailable");
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width, maxX = -1, minY = canvas.height, maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (data[(y * canvas.width + x) * 4 + 3] <= 24) continue;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < 0) throw new Error("SVG artwork did not paint");
    return {
      width: canvas.width,
      height: canvas.height,
      left: minX,
      right: canvas.width - 1 - maxX,
      top: minY,
      bottom: canvas.height - 1 - maxY,
    };
  }, logoUrl);
  expect(result.width).toBe(1256);
  expect(result.height).toBe(320);
  expect(Math.abs(result.left - result.right)).toBeLessThanOrEqual(20);
  expect(result.left).toBeGreaterThanOrEqual(20);
  expect(result.right).toBeGreaterThanOrEqual(20);
  expect(Math.abs(result.top - result.bottom)).toBeLessThanOrEqual(35);
});

for (const width of [320, 390, 430, 768]) {
  test(`the ${width}px phone/tablet login and loading logos are centered on the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(fixtureUrl, { waitUntil: "load" });
    await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"/>${productionCss}</head>
      <body><main class="login-page"><section class="login-layout"><form class="login-card">
      <div class="login-brand-row"><div class="brand-lockup"><img class="brand-logo" src="${logoUrl}" width="1256" height="320" alt="CGV Knowledge Academy"/></div><span>Secure portal</span></div>
      <div class="login-card-heading"><h1>Welcome Back!</h1></div></form></section></main></body></html>`);
    await page.locator(".login-brand-row .brand-logo").evaluate((img) => img.decode());
    const login = await page.locator(".login-brand-row .brand-logo").boundingBox();
    expect(login).not.toBeNull();
    expect(Math.abs(login.x + login.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect(login.x).toBeGreaterThanOrEqual(0);
    expect(login.x + login.width).toBeLessThanOrEqual(width + 1);

    await page.setContent(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"/>${productionCss}</head>
      <body><main class="boot-screen"><div class="boot-content"><div class="boot-logo-stage"><div class="boot-logo-reveal"><div class="brand-lockup">
      <img class="brand-logo" src="${logoUrl}" width="1256" height="320" alt="CGV Knowledge Academy"/></div></div></div></div></main></body></html>`);
    await page.locator(".boot-logo-reveal .brand-logo").evaluate((img) => img.decode());
    const splash = await page.locator(".boot-logo-reveal .brand-logo").boundingBox();
    expect(splash).not.toBeNull();
    expect(Math.abs(splash.x + splash.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect(splash.x).toBeGreaterThanOrEqual(0);
    expect(splash.x + splash.width).toBeLessThanOrEqual(width + 1);
  });
}
