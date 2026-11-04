import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "playwright-core";

// Every payment endpoint and checkout script is mocked. This audit never charges money.
const baseURL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const siteOrigin = new URL(baseURL).origin;
const expectedScriptURL = process.env.AUDIT_APPS_SCRIPT_URL
  ? new URL(process.env.AUDIT_APPS_SCRIPT_URL).href
  : null;
const requireConfigured = process.env.AUDIT_REQUIRE_CONFIGURED === "1";
const browser = await chromium.launch({
  executablePath: process.env.AUDIT_BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const sameOriginRequests = [];
const unexpectedExternalRequests = [];
const scriptURLs = new Set();
let redirectedResponses = 0;
let preflightRequests = 0;
const contentResponses = new Map();
const redirectErrors = [];
// Playwright does not re-route automatic redirects. Serve their final response
// locally so the browser exercises a real cross-origin 302 -> GET without
// allowing a redirected request to reach Google's live servers.
const contentServer = createServer((request, response) => {
  const address = new URL(request.url || "/", "http://localhost");
  const responseKey = address.searchParams.get("user_content_key");
  if (request.method !== "GET" || address.pathname !== "/macros/echo" || !contentResponses.has(responseKey)) {
    redirectErrors.push({ method: request.method, url: address.href });
    response.writeHead(400, { "Access-Control-Allow-Origin": "*" });
    response.end("Unexpected ContentService mock request");
    return;
  }
  redirectedResponses++;
  response.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  response.end(JSON.stringify(contentResponses.get(responseKey)));
});
await new Promise((resolve, reject) => {
  contentServer.once("error", reject);
  contentServer.listen(0, "127.0.0.1", resolve);
});
const contentOrigin = `http://127.0.0.1:${contentServer.address().port}`;
const fakeKeyId = "rzp_test_AuditOnly123";
const fakeOrderId = "order_AuditOnly123";
const fakePaymentId = "pay_AuditOnly123";
const fakeToken = "audit-order-token-not-real";
const fakeSignature = "0".repeat(64);
const checkoutMock = `
window.Razorpay = class {
  constructor(options) { this.options = options; this.events = {}; window.__checkoutAudit.options = options; }
  on(name, callback) { this.events[name] = callback; }
  close() { this.options.modal.ondismiss(); }
  open() {
    const audit = window.__checkoutAudit;
    audit.opens++;
    if (audit.mode === 'cancel') { this.options.modal.ondismiss(); return; }
    if (audit.mode === 'failed') {
      this.events['payment.failed']({error:{metadata:{payment_id:'pay_FailedAudit123'}}}); return;
    }
    this.options.handler({razorpay_order_id:'${fakeOrderId}',razorpay_payment_id:'${fakePaymentId}',razorpay_signature:'${fakeSignature}'});
  }
};`;

async function scenario(mode, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  // Google sign-in cookies must not accompany the public, anonymous payment API.
  await context.addCookies([{ name: "payment_audit_cookie", value: "must-not-be-sent", domain: ".google.com", path: "/", secure: true, sameSite: "None" }]);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const orders = [];
  const verifications = [];
  let scriptLoads = 0;
  let configRequests = 0;
  let responseSequence = 0;
  let releaseConfigRetry;
  const configRetryResponse = new Promise((resolve) => { releaseConfigRetry = resolve; });
  page.on("pageerror", (error) => pageErrors.push({ mode, message: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location().url || "";
    // The checkout script retry scenario intentionally creates this failure.
    if (mode === "script-retry" && url.includes("checkout.razorpay.com")) return;
    consoleErrors.push({ mode, message: message.text(), url });
  });
  await page.addInitScript((value) => { window.__checkoutAudit = { mode: value, opens: 0 }; }, mode);
  // Later, specific routes handle all payment traffic. This default blocks any
  // external request that would otherwise escape those mocks.
  await page.route("**/*", async (route) => {
    const address = new URL(route.request().url());
    if (address.origin === siteOrigin) return route.continue();
    if (address.origin === contentOrigin && address.pathname === "/macros/echo") return route.continue();
    unexpectedExternalRequests.push({ mode, method: route.request().method(), url: address.href });
    await route.abort("blockedbyclient");
  });
  await page.route("https://checkout.razorpay.com/v1/checkout.js", async (route) => {
    scriptLoads++;
    if (mode === "script-retry" && scriptLoads === 1) { await route.abort("failed"); return; }
    await route.fulfill({ status: 200, contentType: "application/javascript", body: checkoutMock });
  });
  await page.route("**/api/payments/**", async (route) => {
    sameOriginRequests.push(route.request().url());
    await route.abort("blockedbyclient");
  });
  await page.route("https://script.google.com/**", async (route) => {
    const address = new URL(route.request().url());
    if (address.origin === siteOrigin) {
      sameOriginRequests.push(address.href);
      await route.abort("blockedbyclient");
      return;
    }
    assert.equal(address.origin, "https://script.google.com");
    assert.equal(route.request().headers().authorization, undefined, "No authorization header belongs in a public Apps Script request");
    assert.equal(route.request().headers().cookie, undefined, "Public Apps Script requests must omit Google account cookies");
    assert.match(address.pathname, /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/, "Use a deployed Apps Script /exec URL");
    const scriptURL = `${address.origin}${address.pathname}`;
    scriptURLs.add(scriptURL);
    if (expectedScriptURL) assert.equal(scriptURL, expectedScriptURL, "Every request must use the configured Apps Script deployment");
    assert.deepEqual([...address.searchParams.keys()], ["action"], "Only the action belongs in the public request URL");
    if (route.request().method() === "OPTIONS") {
      preflightRequests++;
      await route.abort("blockedbyclient");
      throw new Error("Apps Script requests must avoid CORS preflights");
    }
    const reply = (data) => {
      const responseKey = `${mode}-${++responseSequence}`;
      contentResponses.set(responseKey, data);
      return route.fulfill({
        status: 302,
        headers: { "Access-Control-Allow-Origin": "*", Location: `${contentOrigin}/macros/echo?user_content_key=${responseKey}&lib=audit` },
        body: "",
      });
    };
    const action = address.searchParams.get("action");
    if (action === "config") {
      assert.equal(route.request().method(), "GET", "Availability checks must use GET only");
      configRequests++;
      if (mode === "config-retry" && configRequests === 1) return reply({ ok: false, error: "Payment service temporarily unavailable" });
      if (mode === "config-retry" && configRequests === 2) await configRetryResponse;
      return reply({ ok: true, configured: mode !== "unconfigured", ...(mode !== "unconfigured" ? { keyId: fakeKeyId } : {}) });
    }
    assert.equal(route.request().method(), "POST");
    assert.match(route.request().headers()["content-type"], /^text\/plain\s*;\s*charset=utf-8$/i, "JSON must be sent as text/plain to avoid unsupported Apps Script preflights");
    const { action: bodyAction, ...body } = route.request().postDataJSON();
    assert.equal(bodyAction, action, "POST action must also be included in the JSON body");
    if (action === "order") {
      orders.push(body);
      if (mode === "order-error") return reply({ ok: false, error: "Payment provider unavailable" });
      return reply({ ok: true, keyId: fakeKeyId, orderId: fakeOrderId, amount: body.amount * 100, currency: "INR", orderToken: fakeToken });
    }
    if (action === "verify") {
      verifications.push(body);
      assert.deepEqual(body, { orderId: fakeOrderId, paymentId: fakePaymentId, signature: fakeSignature, orderToken: fakeToken });
      if (mode === "rejected") return reply({ ok: false, error: "Invalid signature" });
      if (["pending", "reload-pending"].includes(mode) && verifications.length === 1) return reply({ ok: true, verified: false, status: "pending" });
      return reply({ ok: mode !== "error-envelope", verified: true, status: "captured", orderId: fakeOrderId, paymentId: fakePaymentId, amount: orders.at(-1).amount * 100 + (mode === "mismatched-response" ? 100 : 0), currency: "INR", cause: orders.at(-1).cause });
    }
    throw new Error(`Unexpected payment action ${action}`);
  });
  try {
    const response = await page.goto(`${baseURL}/donate/?cause=Animal%20Welfare`, { waitUntil: "networkidle", timeout: 60000 });
    assert.equal(response?.status(), 200);
    await page.locator(".donation-checkout, .static-donation-fallback").first().waitFor();
    assert.deepEqual(sameOriginRequests, [], "Static website must never call same-origin payment API routes");
    const available = await page.locator(".donation-checkout").count() === 1;
    if (mode !== "probe") assert.equal(available, !["unconfigured", "config-retry"].includes(mode), "Checkout availability follows Apps Script configuration");
    await run({ page, orders, verifications, available, scriptLoads: () => scriptLoads, configRequests: () => configRequests, releaseConfigRetry });
    return available;
  } finally {
    releaseConfigRetry();
    await context.close();
  }
}

try {
  const configured = await scenario("probe", async ({ page, available, orders, scriptLoads }) => {
    if (!available) {
      assert.equal(orders.length, 0);
      assert.equal(scriptLoads(), 0);
      assert.equal(await page.locator('.static-donation-fallback a[href="#direct-donation"]').count(), 1);
      assert.equal(await page.getByRole("button", { name: "Try again", exact: true }).count(), 0);
    }
  });
  if (requireConfigured) assert.equal(configured, true, "Build with NEXT_PUBLIC_GOOGLE_APPS_SCRIPT_URL to exercise configured checkout scenarios");
  if (configured) {
  await scenario("success", async ({ page, orders, verifications }) => {
    assert.equal(await page.locator('[name="donation-cause"]').inputValue(), "Animal Welfare");
    await page.locator(".amount-grid button").last().click();
    const amount = page.locator(".custom-amount input");
    await amount.fill("50");
    assert.equal(await page.locator(".donation-checkout").isEnabled(), false);
    assert.equal(orders.length, 0);
    await amount.fill("1500");
    await page.locator('[name="donation-cause"]').selectOption("Education");
    await page.locator(".language-toggle").click();
    await page.waitForFunction(() => document.documentElement.lang === "hi");
    assert.equal(await amount.inputValue(), "1500");
    assert.equal(await page.locator('[name="donation-cause"]').inputValue(), "Education");
    assert.match(await page.locator(".donation-checkout").innerText(), /[\u0900-\u097f]/);
    await page.locator(".donation-checkout").evaluate((button) => { button.click(); button.click(); });
    await page.locator(".payment-confirmation").waitFor();
    assert.deepEqual(orders, [{ amount: 1500, cause: "Education" }]);
    assert.equal(verifications.length, 1);
    const options = await page.evaluate(() => {
      const { key, order_id, amount, currency, config } = window.__checkoutAudit.options;
      return { key, order_id, amount, currency, language: config.display.language, opens: window.__checkoutAudit.opens };
    });
    assert.deepEqual(options, { key: fakeKeyId, order_id: fakeOrderId, amount: 150000, currency: "INR", language: "hi", opens: 1 });
    assert.match(await page.locator(".payment-reference").innerText(), new RegExp(fakePaymentId));
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem("orderToken")), null);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("sjkf:pending-payment:v1")), null);
    checks.push("Valid amount and cause create one server order; Hindi checkout; server-captured verification confirms payment and clears pending session data");
  });

  await scenario("cancel", async ({ page, orders, verifications }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("Checkout was closed. No payment has been confirmed.", { exact: true }).waitFor();
    assert.equal(orders.length, 1);
    assert.equal(verifications.length, 0);
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.equal(await page.locator(".donation-checkout").isEnabled(), true);
    checks.push("Closing checkout reports cancellation without confirmation");
  });

  await scenario("failed", async ({ page, verifications }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("Payment could not be completed. If your account was debited, contact the foundation before trying again.", { exact: true }).waitFor();
    assert.equal(verifications.length, 0);
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.match(await page.locator(".payment-reference").innerText(), /pay_FailedAudit123/);
    checks.push("Provider failure retains payment reference without false success");
  });

  await scenario("rejected", async ({ page, verifications }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("We could not verify your payment yet. Do not pay again; check its status or contact the foundation.", { exact: true }).waitFor();
    assert.equal(verifications.length, 1);
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    assert.equal(await page.getByRole("button", { name: "Check payment status", exact: true }).isVisible(), true);
    checks.push("Rejected verification cannot show success or start another payment");
  });

  await scenario("pending", async ({ page, verifications }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("Your payment is awaiting confirmation. Do not pay again; check its status or contact the foundation.", { exact: true }).waitFor();
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    await page.getByRole("button", { name: "Check payment status", exact: true }).click();
    await page.locator(".payment-confirmation").waitFor();
    assert.equal(verifications.length, 2);
    checks.push("Authorized pending payment is not confirmed; status retry confirms only once captured");
  });

  await scenario("reload-pending", async ({ page, orders, verifications }) => {
    await page.locator(".amount-grid button").filter({ hasText: "2,500" }).click();
    await page.locator('[name="donation-cause"]').selectOption("Education");
    await page.locator(".donation-checkout").click();
    await page.getByText("Your payment is awaiting confirmation. Do not pay again; check its status or contact the foundation.", { exact: true }).waitFor();
    assert.equal(orders.length, 1);
    assert.equal(verifications.length, 1);
    assert.notEqual(await page.evaluate(() => sessionStorage.getItem("sjkf:pending-payment:v1")), null, "Pending verification must survive this tab reloading");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".payment-confirmation").waitFor();
    assert.equal(orders.length, 1, "Reload must not create another order or charge");
    assert.equal(verifications.length, 2, "Reload rechecks the existing completed checkout");
    assert.match(await page.locator(".payment-confirmation").innerText(), /2,500/);
    assert.equal(await page.locator('[name="donation-cause"]').inputValue(), "Education");
    assert.equal(await page.evaluate(() => window.__checkoutAudit.opens), 0, "Restoring status must not reopen checkout");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("sjkf:pending-payment:v1")), null, "Captured confirmation clears the saved pending verification");
    checks.push("Reload restores the pending contribution and verifies capture without creating an order or reopening checkout");
  });

  await scenario("mismatched-response", async ({ page }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("We could not verify your payment yet. Do not pay again; check its status or contact the foundation.", { exact: true }).waitFor();
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    checks.push("Even a captured response cannot confirm a different donation amount");
  });

  await scenario("error-envelope", async ({ page }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("We could not verify your payment yet. Do not pay again; check its status or contact the foundation.", { exact: true }).waitFor();
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    checks.push("An HTTP 200 Apps Script error envelope cannot produce payment confirmation");
  });

  await scenario("script-retry", async ({ page, orders, scriptLoads }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("Payment could not be completed. If your account was debited, contact the foundation before trying again.", { exact: true }).waitFor();
    assert.equal(orders.length, 0);
    await page.locator(".donation-checkout").click();
    await page.locator(".payment-confirmation").waitFor();
    assert.equal(scriptLoads(), 2);
    assert.equal(orders.length, 1);
    checks.push("Checkout script failure is recoverable and creates no premature order");
  });

  await scenario("order-error", async ({ page, verifications }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("Payment could not be completed. If your account was debited, contact the foundation before trying again.", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__checkoutAudit.opens), 0);
    assert.equal(verifications.length, 0);
    checks.push("Failed server order never opens checkout");
  });

  await scenario("unconfigured", async ({ page, orders, scriptLoads }) => {
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    await page.getByText("Razorpay checkout is being configured. You can donate using the UPI QR code or bank details above.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Try again", exact: true }).count(), 1);
    assert.equal(await page.locator('.static-donation-fallback a[href="#direct-donation"]').count(), 1);
    assert.equal(orders.length, 0);
    assert.equal(scriptLoads(), 0);
    checks.push("Missing server credentials preserve UPI and bank donation fallback");
  });

  await scenario("config-retry", async ({ page, orders, scriptLoads, configRequests, releaseConfigRetry }) => {
    await page.getByText("Online payment is temporarily unavailable. Please try again or use UPI/bank transfer.", { exact: true }).waitFor();
    assert.equal(configRequests(), 1);
    assert.equal(orders.length, 0);
    assert.equal(scriptLoads(), 0);
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByText("Checking payment availability…", { exact: true }).waitFor();
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    assert.equal(orders.length, 0);
    assert.equal(scriptLoads(), 0);
    releaseConfigRetry();
    await page.locator(".donation-checkout").waitFor();
    assert.equal(configRequests(), 2);
    assert.equal(orders.length, 0);
    assert.equal(scriptLoads(), 0);
    await page.locator(".donation-checkout").click();
    await page.locator(".payment-confirmation").waitFor();
    assert.equal(orders.length, 1);
    checks.push("A temporary availability failure recovers through a GET retry; checkout creates an order only after Donate is clicked");
  });
  } else {
    checks.push("Missing or invalid Apps Script deployment URL shows UPI fallback without calling payment APIs or loading checkout");
  }

  assert.deepEqual(sameOriginRequests, [], "No same-origin payment API calls from static website");
  assert.deepEqual(unexpectedExternalRequests, [], "Every external request is intercepted by an explicit mock");
  if (configured) {
    assert.equal(scriptURLs.size, 1, "Every payment request uses the same Apps Script deployment");
    assert.ok(redirectedResponses > 0, "Browser follows ContentService response redirects");
    checks.push("Apps Script JSON responses follow Google ContentService redirects; text/plain POSTs avoid preflights and keep payment details out of URLs");
  }
  assert.equal(preflightRequests, 0, "No unsupported Apps Script CORS preflight requests");
  assert.deepEqual(redirectErrors, [], "ContentService redirects must retrieve the matching JSON response with GET");
  assert.deepEqual(pageErrors, [], "No browser runtime errors");
  assert.deepEqual(consoleErrors, [], "No unexpected browser console errors");
  process.stdout.write(`${JSON.stringify({ passed: true, configured, scriptURLs: [...scriptURLs], redirectedResponses, preflightRequests, checks, sameOriginRequests, unexpectedExternalRequests, pageErrors, consoleErrors }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ passed: false, checks, error: error instanceof Error ? error.message : String(error), sameOriginRequests, unexpectedExternalRequests, pageErrors, consoleErrors }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => contentServer.close(resolve));
}
