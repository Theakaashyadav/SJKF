import assert from "node:assert/strict";
import { chromium } from "playwright-core";

// Every payment endpoint and checkout script is mocked. This audit never charges money.
const baseURL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const siteOrigin = new URL(baseURL).origin;
const expectedApiOrigin = process.env.AUDIT_API_BASE_URL ? new URL(process.env.AUDIT_API_BASE_URL).origin : null;
const requireConfigured = process.env.AUDIT_REQUIRE_CONFIGURED === "1";
const browser = await chromium.launch({
  executablePath: process.env.AUDIT_BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true,
});
const checks = [];
const pageErrors = [];
const consoleErrors = [];
const sameOriginRequests = [];
const apiOrigins = new Set();
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const orders = [];
  const verifications = [];
  let scriptLoads = 0;
  let configRequests = 0;
  let releaseConfigRetry;
  const configRetryResponse = new Promise((resolve) => { releaseConfigRetry = resolve; });
  page.on("pageerror", (error) => pageErrors.push({ mode, message: error.message }));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location().url || "";
    // HTTP failure and script retry scenarios intentionally create these failures.
    if (["rejected", "order-error", "config-retry"].includes(mode) && url.includes("/api/payments/")) return;
    if (mode === "script-retry" && url.includes("checkout.razorpay.com")) return;
    consoleErrors.push({ mode, message: message.text(), url });
  });
  await page.addInitScript((value) => { window.__checkoutAudit = { mode: value, opens: 0 }; }, mode);
  await page.route("https://checkout.razorpay.com/v1/checkout.js", async (route) => {
    scriptLoads++;
    if (mode === "script-retry" && scriptLoads === 1) { await route.abort("failed"); return; }
    await route.fulfill({ status: 200, contentType: "application/javascript", body: checkoutMock });
  });
  await page.route("**/api/payments/**", async (route) => {
    const address = new URL(route.request().url());
    if (address.origin === siteOrigin) {
      sameOriginRequests.push(address.href);
      await route.abort("blockedbyclient");
      return;
    }
    apiOrigins.add(address.origin);
    if (expectedApiOrigin) assert.equal(address.origin, expectedApiOrigin, "All requests must use the configured separate payment service");
    const pathname = address.pathname.replace(/\/+$/, "");
    const corsHeaders = { "Access-Control-Allow-Origin": siteOrigin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: corsHeaders });
    const reply = (data, status = 200) => route.fulfill({ status, contentType: "application/json", headers: corsHeaders, body: JSON.stringify(data) });
    if (pathname.endsWith("/config")) {
      assert.equal(route.request().method(), "GET", "Availability checks must use GET only");
      configRequests++;
      if (mode === "config-retry" && configRequests === 1) return reply({ error: "Payment service waking up" }, 503);
      if (mode === "config-retry" && configRequests === 2) await configRetryResponse;
      return reply({ configured: mode !== "unconfigured", ...(mode !== "unconfigured" ? { keyId: fakeKeyId } : {}) });
    }
    const body = route.request().postDataJSON();
    if (pathname.endsWith("/order")) {
      orders.push(body);
      if (mode === "order-error") return reply({ error: "Payment provider unavailable" }, 502);
      return reply({ keyId: fakeKeyId, orderId: fakeOrderId, amount: body.amount * 100, currency: "INR", orderToken: fakeToken });
    }
    if (pathname.endsWith("/verify")) {
      verifications.push(body);
      assert.deepEqual(body, { orderId: fakeOrderId, paymentId: fakePaymentId, signature: fakeSignature, orderToken: fakeToken });
      if (mode === "rejected") return reply({ error: "Invalid signature" }, 400);
      if (mode === "pending" && verifications.length === 1) return reply({ verified: false, status: "pending" }, 202);
      return reply({ verified: true, status: "captured", orderId: fakeOrderId, paymentId: fakePaymentId, amount: orders.at(-1).amount * 100 + (mode === "mismatched-response" ? 100 : 0), currency: "INR", cause: orders.at(-1).cause });
    }
    throw new Error(`Unexpected payment request ${pathname}`);
  });
  try {
    const response = await page.goto(`${baseURL}/donate/?cause=Animal%20Welfare`, { waitUntil: "networkidle", timeout: 60000 });
    assert.equal(response?.status(), 200);
    await page.locator(".donation-checkout, .static-donation-fallback").first().waitFor();
    assert.deepEqual(sameOriginRequests, [], "Static website must never call same-origin payment API routes");
    const available = await page.locator(".donation-checkout").count() === 1;
    if (mode !== "probe") assert.equal(available, !["unconfigured", "config-retry"].includes(mode), "Checkout availability follows separate API configuration");
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
  if (requireConfigured) assert.equal(configured, true, "Build with NEXT_PUBLIC_RAZORPAY_API_URL to exercise configured checkout scenarios");
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
    checks.push("Valid amount and cause create one server order; Hindi checkout; server-captured verification confirms payment; no token stored");
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

  await scenario("mismatched-response", async ({ page }) => {
    await page.locator(".donation-checkout").click();
    await page.getByText("We could not verify your payment yet. Do not pay again; check its status or contact the foundation.", { exact: true }).waitFor();
    assert.equal(await page.locator(".payment-confirmation").count(), 0);
    assert.equal(await page.locator(".donation-checkout").count(), 0);
    checks.push("Even a captured response cannot confirm a different donation amount");
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
    checks.push("Missing or invalid public API base shows UPI fallback without calling payment APIs or loading checkout");
  }

  assert.deepEqual(sameOriginRequests, [], "No same-origin payment API calls from static website");
  if (configured) assert.equal(apiOrigins.size, 1, "Every payment request uses the same separate service origin");
  assert.deepEqual(pageErrors, [], "No browser runtime errors");
  assert.deepEqual(consoleErrors, [], "No unexpected browser console errors");
  process.stdout.write(`${JSON.stringify({ passed: true, configured, apiOrigins: [...apiOrigins], checks, sameOriginRequests, pageErrors, consoleErrors }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ passed: false, checks, error: error instanceof Error ? error.message : String(error), sameOriginRequests, pageErrors, consoleErrors }, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
