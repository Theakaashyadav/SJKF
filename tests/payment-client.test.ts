import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { requestPayment } from "../lib/payments/client.ts";

const backend = "https://script.google.com/macros/s/Deployment123/exec";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("config uses anonymous GET, follows ContentService redirects and validates its envelope", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${backend}?action=config`);
    assert.equal(options?.method, "GET");
    assert.equal(options?.body, undefined);
    assert.equal(options?.headers, undefined);
    assert.equal(options?.credentials, "omit");
    assert.equal(options?.redirect, "follow");
    assert.ok(options?.signal instanceof AbortSignal);
    return Response.json({ ok: true, configured: true });
  };
  assert.deepEqual(await requestPayment(backend, "config"), { ok: true, configured: true });
});

test("verification sends a preflight-free body and keeps payment data out of the URL", async () => {
  const details = { orderId: "order_123", paymentId: "pay_123", signature: "a".repeat(64), orderToken: "private-token" };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `${backend}?action=verify`);
    assert.equal(options?.method, "POST");
    assert.deepEqual(options?.headers, { "Content-Type": "text/plain;charset=UTF-8" });
    assert.deepEqual(JSON.parse(String(options?.body)), { ...details, action: "verify" });
    return Response.json({ ok: true, verified: true, status: "captured" });
  };
  assert.equal((await requestPayment<{ verified: boolean }>(backend, "verify", details)).verified, true);
});

test("HTTP 200 errors and missing success envelopes cannot confirm payment", async () => {
  for (const result of [{ ok: false, verified: true }, { verified: true }, null, "success"]) {
    globalThis.fetch = async () => Response.json(result);
    await assert.rejects(requestPayment(backend, "verify", {}), /Payment request unavailable/);
  }
});

test("HTTP failures, sign-in HTML and connection errors remain unconfirmed", async () => {
  globalThis.fetch = async () => Response.json({ ok: true }, { status: 503 });
  await assert.rejects(requestPayment(backend, "order", {}));
  globalThis.fetch = async () => new Response("<html>Sign in</html>");
  await assert.rejects(requestPayment(backend, "order", {}));
  globalThis.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(requestPayment(backend, "verify", {}), /offline/);
});

test("invalid deployment makes no network request", async () => {
  globalThis.fetch = async () => { assert.fail("Invalid URLs must not be fetched"); };
  await assert.rejects(requestPayment("", "order", {}), /not configured/);
});
