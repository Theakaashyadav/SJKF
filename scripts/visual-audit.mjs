import { chromium } from "playwright-core";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});

const cases = [
  { name: "home-desktop", path: "/", width: 1440, height: 1000 },
  { name: "home-mobile", path: "/", width: 390, height: 844 },
  { name: "donate-desktop", path: "/donate", width: 1440, height: 1000 },
  { name: "donate-mobile", path: "/donate", width: 390, height: 844 },
  { name: "gallery-mobile", path: "/gallery", width: 390, height: 844 },
];

const results = [];
for (const item of cases) {
  const page = await browser.newPage({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => message.type() === "error" && errors.push(`console: ${message.text()}`));
  page.on("response", (response) => response.status() >= 400 && errors.push(`http ${response.status()}: ${response.url()}`));
  const response = await page.goto(`http://localhost:3000${item.path}`, { waitUntil: "networkidle" });
  const metrics = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent?.trim(),
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    imagesWithoutAlt: Array.from(document.images).filter((image) => !image.hasAttribute("alt")).length,
  }));
  await page.screenshot({ path: `audit-${item.name}.png`, fullPage: false });
  results.push({ ...item, status: response?.status(), ...metrics, errors });
  await page.close();
}

const interactionPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await interactionPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await interactionPage.getByRole("button", { name: "Open navigation" }).click();
const focusedAfterOpen = await interactionPage.evaluate(() => document.activeElement?.textContent?.trim());
await interactionPage.screenshot({ path: "audit-mobile-menu.png", fullPage: false });

await interactionPage.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" });
await interactionPage.locator(".gallery-card").first().click();
const galleryDialog = await interactionPage.getByRole("dialog").isVisible();
const galleryFocus = await interactionPage.evaluate(() => document.activeElement?.getAttribute("aria-label"));
await interactionPage.keyboard.press("Escape");
const dialogClosed = await interactionPage.getByRole("dialog").count() === 0;

await browser.close();
process.stdout.write(JSON.stringify({ results, interactions: { focusedAfterOpen, galleryDialog, galleryFocus, dialogClosed } }, null, 2));
