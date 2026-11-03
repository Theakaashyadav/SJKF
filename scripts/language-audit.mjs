import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({
  executablePath: process.env.AUDIT_BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});
const routes = ["/", "/about", "/our-work", "/gallery", "/documents", "/donate", "/contact", "/payment-success", "/payment-failed", "/privacy-policy", "/terms", "/donation-policy", "/refund-policy"];
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const routeHeadings = [];

function observe(page, label) {
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(30000);
  page.on("pageerror", (error) => pageErrors.push({ label, url: page.url(), message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push({ label, url: page.url(), message: message.text() });
  });
}

async function visit(page, path) {
  const response = await page.goto(new URL(path, baseURL).href, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `Route ${path} must load successfully`);
  await page.locator("main h1").waitFor();
}

async function language(page, expected) {
  await page.waitForFunction((value) => document.documentElement.lang === value, expected);
  const toggle = page.locator(".language-toggle");
  assert.equal(await toggle.count(), 1, "Exactly one language switch is present");
  assert.equal((await toggle.innerText()).trim(), expected === "en" ? "English" : "हिन्दी");
  assert.equal(await toggle.getAttribute("aria-label"), expected === "en" ? "Switch to Hindi" : "अंग्रेज़ी में बदलें");
}

async function toggle(page, next) {
  await page.locator(".language-toggle").click();
  await language(page, next);
  assert.equal(await page.evaluate(() => localStorage.getItem("swabhiman-language")), next, "Chosen language is saved");
}

async function noOverflow(page, label) {
  await page.evaluate(() => document.fonts.ready);
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  assert.ok(dimensions.content <= dimensions.viewport + 1, `${label} overflows horizontally: ${JSON.stringify(dimensions)}`);
  const box = await page.locator(".language-toggle").boundingBox();
  assert.ok(box && box.x >= 0 && box.x + box.width <= dimensions.viewport + 1, `${label} language button must fit in the viewport`);
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  observe(page, "desktop");
  await visit(page, "/");
  await language(page, "en");
  const englishHome = (await page.locator("main h1").innerText()).trim();
  assert.match(englishHome, /Compassion in Action/);
  assert.equal(await page.locator('.desktop-nav a[href^="/about"]').innerText(), "About Us");
  checks.push("Fresh browser defaults to English");

  await toggle(page, "hi");
  const hindiHome = (await page.locator("main h1").innerText()).trim();
  assert.notEqual(hindiHome, englishHome, "Home heading changes immediately");
  assert.match(hindiHome, /[\u0900-\u097f]/);
  assert.equal(await page.locator('.desktop-nav a[href^="/about"]').innerText(), "हमारे बारे में");
  await page.screenshot({ path: "audit-language-hi-desktop.png", fullPage: false });
  checks.push("Header switch updates homepage, navigation, and document language");

  // A marker detects accidental full-page navigation when following a Next link.
  await page.evaluate(() => { window.__languageAuditNavigationMarker = "retained"; });
  await page.locator('.desktop-nav a[href^="/about"]').click();
  await page.waitForURL(/\/about\/?$/);
  await language(page, "hi");
  assert.equal(await page.evaluate(() => window.__languageAuditNavigationMarker), "retained", "Language survives client navigation");
  const ramakant = page.locator('article.team-member:has(img[src*="ramakant.jpeg"])');
  assert.equal((await ramakant.locator(".team-member__designation").innerText()).trim(), "कोषाध्यक्ष");
  await page.reload({ waitUntil: "networkidle" });
  await language(page, "hi");
  assert.equal((await ramakant.locator(".team-member__designation").innerText()).trim(), "कोषाध्यक्ष");
  await toggle(page, "en");
  assert.equal((await ramakant.locator(".team-member__designation").innerText()).trim(), "Treasurer");
  checks.push("Ramakant designation, client navigation, reload persistence, and return to English");

  const languageStates = new Set(["en"]);
  for (const expected of ["hi", "en", "hi", "en"]) {
    await toggle(page, expected);
    languageStates.add(await page.locator("html").getAttribute("lang"));
  }
  assert.deepEqual([...languageStates].sort(), ["en", "hi"], "Switch cycles through only English and Hindi");
  checks.push("Language switch has exactly two states");

  for (const route of routes) {
    await visit(page, route);
    await language(page, "en");
    const english = (await page.locator("main h1").innerText()).trim();
    await toggle(page, "hi");
    const hindi = (await page.locator("main h1").innerText()).trim();
    assert.notEqual(hindi, english, `${route} heading must be translated`);
    assert.match(hindi, /[\u0900-\u097f]/, `${route} heading must contain Hindi`);
    await noOverflow(page, `Hindi ${route} desktop`);
    routeHeadings.push({ route, english, hindi });
    await toggle(page, "en");
  }
  checks.push(`English and Hindi headings verified on all ${routes.length} routes`);

  await visit(page, "/contact?interest=volunteer");
  const form = page.locator("form.contact-form");
  await form.locator('[name="name"]').fill("Language Audit");
  await form.locator('[name="email"]').fill("audit@example.org");
  await form.locator('[name="phone"]').fill("9876543210");
  await form.locator('[name="message"]').fill("This local audit checks language changes without sending a message.");
  assert.equal(await form.locator('[name="subject"]').inputValue(), "Volunteer with us");
  await toggle(page, "hi");
  assert.equal(await form.locator('[name="name"]').inputValue(), "Language Audit", "Switching language preserves typed contact values");
  assert.equal(await form.locator('[name="subject"]').inputValue(), "Volunteer with us", "Translated options retain stable submitted values");
  assert.match(await form.locator('[name="subject"] option:checked').innerText(), /[\u0900-\u097f]/);
  assert.match(await form.locator('[type="submit"]').innerText(), /[\u0900-\u097f]/);
  assert.equal(await form.evaluate((element) => element.checkValidity()), true, "Contact fields remain valid in Hindi");
  await form.locator('[name="phone"]').fill("1234567890");
  assert.equal(await form.locator('[name="phone"]').evaluate((input) => input.checkValidity()), false, "Invalid Indian mobile number is rejected");
  await form.locator('[name="phone"]').fill("9876543210");
  await toggle(page, "en");
  assert.equal(await form.locator('[name="email"]').inputValue(), "audit@example.org");
  checks.push("Contact form translates and preserves valid unsent values and enquiry selection");

  await visit(page, "/donate");
  const presets = page.locator(".amount-grid button");
  await presets.nth(2).click();
  assert.equal(await presets.nth(2).getAttribute("aria-pressed"), "true");
  await presets.last().click();
  const amount = page.locator(".custom-amount input");
  await amount.fill("1500");
  assert.equal(await amount.evaluate((input) => input.checkValidity()), true);
  await toggle(page, "hi");
  assert.equal(await amount.inputValue(), "1500", "Switch preserves custom donation amount");
  assert.match(await page.locator(".custom-amount").innerText(), /[\u0900-\u097f]/);
  await amount.fill("50");
  assert.equal(await amount.evaluate((input) => input.checkValidity()), false, "Donation minimum is retained");
  await amount.fill("500001");
  assert.equal(await amount.evaluate((input) => input.checkValidity()), false, "Donation maximum is retained");
  await amount.fill("1500");
  const fallback = page.locator(".static-donation-fallback");
  let donationMode = "configured Razorpay widget (checkout not opened)";
  if (await fallback.count()) {
    assert.match(await fallback.innerText(), /[\u0900-\u097f]/);
    assert.equal(await fallback.locator("a").getAttribute("href"), "#direct-donation");
    assert.equal(await page.locator("#direct-donation").count(), 1);
    donationMode = "translated UPI and bank fallback";
  }
  await toggle(page, "en");
  assert.equal(await amount.inputValue(), "1500");
  checks.push(`Donation presets, custom amount, limits, and ${donationMode}; no payment initiated`);
  await context.close();

  for (const width of [390, 320]) {
    const mobileContext = await browser.newContext({ viewport: { width, height: 844 } });
    const mobile = await mobileContext.newPage();
    observe(mobile, `mobile-${width}`);
    await visit(mobile, "/");
    await language(mobile, "en");
    await noOverflow(mobile, `English ${width}px header`);
    await mobile.getByRole("button", { name: "Open navigation", exact: true }).click();
    assert.equal(await mobile.locator('#mobile-navigation a[href^="/about"]').innerText(), "About Us");
    await toggle(mobile, "hi");
    assert.equal(await mobile.locator('#mobile-navigation a[href^="/about"]').innerText(), "हमारे बारे में");
    assert.equal(await mobile.getByRole("button", { name: "मेन्यू बंद करें", exact: true }).isVisible(), true);
    await mobile.keyboard.press("Escape");
    await mobile.locator("#mobile-navigation").waitFor({ state: "detached" });
    await noOverflow(mobile, `Hindi ${width}px header`);
    await mobile.screenshot({ path: `audit-language-hi-${width}.png`, fullPage: false });
    await mobile.reload({ waitUntil: "networkidle" });
    await language(mobile, "hi");
    checks.push(`${width}px header toggle visible without overflow; open menu updates; Hindi persists`);
    await mobileContext.close();
  }

  assert.deepEqual(pageErrors, [], "Browser runtime errors must be absent");
  assert.deepEqual(consoleErrors, [], "Browser console errors must be absent");
  process.stdout.write(`${JSON.stringify({ passed: true, baseURL, checks, routeHeadings, pageErrors, consoleErrors }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ passed: false, baseURL, completedChecks: checks, routeHeadings, error: error instanceof Error ? error.message : String(error), pageErrors, consoleErrors }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
